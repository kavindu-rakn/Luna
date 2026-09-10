import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  getSynodicCycle,
  getCycleFraction,
  getDateAtCycleFraction,
  getPhaseSummary
} from '../utils/lunarCalc';
import MoonIcon from './MoonIcon';



const LunarTimeline = ({ currentDate, setCurrentDate }) => {
  const trackRef = useRef(null);
  const [hoverFraction, setHoverFraction] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // getSynodicCycle memoises internally, so a drag does not re-solve the cycle
  const cycle = useMemo(() => getSynodicCycle(currentDate), [currentDate]);

  const currentFraction = getCycleFraction(cycle, currentDate);

  const getFractionFromEvent = useCallback((e) => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const scrubTo = useCallback((fraction) => {
    setCurrentDate(getDateAtCycleFraction(cycle, fraction));
  }, [cycle, setCurrentDate]);

  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    trackRef.current?.setPointerCapture?.(e.pointerId);
    const f = getFractionFromEvent(e);
    if (f !== null) scrubTo(f);
  }, [getFractionFromEvent, scrubTo]);

  const handlePointerMove = useCallback((e) => {
    const f = getFractionFromEvent(e);
    if (f === null) return;
    setHoverFraction(f);
    if (isDragging) scrubTo(f);
  }, [getFractionFromEvent, isDragging, scrubTo]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    trackRef.current?.releasePointerCapture?.(e.pointerId);
  }, []);

  const handlePointerLeave = useCallback(() => setHoverFraction(null), []);

  // Keyboard: a day at a time, a quarter-cycle with Shift, and the cycle's ends
  const handleKeyDown = (e) => {
    const DAY = 86400000;
    let next;

    if (e.key === 'ArrowLeft') next = new Date(currentDate.getTime() - (e.shiftKey ? cycle.durationMs / 4 : DAY));
    else if (e.key === 'ArrowRight') next = new Date(currentDate.getTime() + (e.shiftKey ? cycle.durationMs / 4 : DAY));
    else if (e.key === 'Home') next = new Date(cycle.startMs);
    else if (e.key === 'End') next = new Date(cycle.startMs + cycle.durationMs - 1000);
    else return;

    // Claim the key so the global shortcut handler does not apply it a second time
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(next);
  };

  const formatShortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const hovered = useMemo(() => {
    if (hoverFraction === null) return null;
    const date = getDateAtCycleFraction(cycle, hoverFraction);
    return { date, ...getPhaseSummary(date) };
  }, [hoverFraction, cycle]);

  const currentSummary = useMemo(() => getPhaseSummary(currentDate), [currentDate]);

  // The two bounding New Moons plus the three interior quarters, each at its solved
  // instant. The spacing is uneven because the Moon's angular speed varies, and the
  // timeline should show that rather than hide it behind an even grid.
  const milestones = useMemo(() => ([
    { name: 'New Moon', phase: 0, fraction: 0, date: cycle.start },
    ...cycle.quarters,
    { name: 'New Moon', phase: 1, fraction: 1, date: cycle.end }
  ]), [cycle]);

  return (
    <div className="bottom-bar" style={{ padding: '1rem 1.5rem', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span className="utility-label" style={{ color: 'var(--text-muted)' }}>
          Lunar Cycle &middot; {cycle.durationDays.toFixed(2)} days
        </span>
        <span className="utility-label" style={{ opacity: 0.7 }}>
          Drag / Scrub Timeline
        </span>
      </div>

      {/* Floating hover tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: '-2.8rem',
            // Clamped so the tooltip stays inside the panel at either extreme
            left: `clamp(7rem, calc(${hoverFraction * 100}% + 1.5rem), calc(100% - 7rem))`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: '10px',
            padding: '0.4rem 0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 30,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backdropFilter: 'blur(16px)'
          }}
        >
          <MoonIcon phase={hovered.phase} size={15} />
          <span className="font-serif" style={{ fontSize: '1.05rem', lineHeight: 1 }}>{hovered.name}</span>
          <span style={{ color: 'var(--text-muted)' }}>{formatShortDate(hovered.date)}</span>
          <span className="font-mono" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
            {parseFloat(hovered.fraction).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Interactive track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Position within the lunar cycle"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(currentFraction * 100)}
        aria-valuetext={`${formatShortDate(currentDate)}, ${currentSummary.name}, ${Math.round(currentFraction * 100)} percent through the cycle`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'relative',
          width: '100%',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          outline: 'none'
        }}
      >
        {/* Track line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(255,255,255,0.1)',
            transform: 'translateY(-50%)'
          }}
        />

        {/* Progress fill, which now genuinely travels from 0 to 100 across the cycle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: `${currentFraction * 100}%`,
            height: '2px',
            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-light))',
            boxShadow: '0 0 10px var(--accent-glow)',
            transform: 'translateY(-50%)',
            transition: isDragging ? 'none' : 'width 0.3s ease'
          }}
        />

        {/* Day ticks, placed by their true position in time */}
        {cycle.ticks.map((tick, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${tick.fraction * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '2px' : '4px',
              height: isMobile ? '6px' : '4px',
              borderRadius: isMobile ? '1px' : '50%',
              background: `rgba(255,255,255, ${0.18 + tick.illumination * 0.55})`,
              pointerEvents: 'none'
            }}
          />
        ))}

        {/* Primary phases */}
        {milestones.map((milestone, idx) => (
          <div
            key={`milestone-${idx}`}
            title={`${milestone.name} — ${formatShortDate(milestone.date)}`}
            style={{
              position: 'absolute',
              left: `${milestone.fraction * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
              pointerEvents: 'none'
            }}
          >
            <MoonIcon phase={milestone.phase} size={16} />
          </div>
        ))}

        {/* Selected-position thumb */}
        <div
          style={{
            position: 'absolute',
            left: `${currentFraction * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            filter: 'drop-shadow(0 0 10px var(--accent-light))',
            transition: isDragging ? 'none' : 'left 0.3s ease',
            pointerEvents: 'none'
          }}
        >
          <MoonIcon phase={currentSummary.phase} size={24} />
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              right: '-3px',
              bottom: '-3px',
              borderRadius: '50%',
              border: '1.5px solid var(--accent-light)',
              opacity: 0.6,
              animation: 'pulse-ring 2.4s ease-in-out infinite',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      {/* The cycle's own bounds, rather than a window that follows the selection */}
      <div
        className="utility-label"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.4rem',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}
      >
        <span>{formatShortDate(cycle.start)}</span>
        <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
          {formatShortDate(currentDate)}
        </span>
        <span>{formatShortDate(cycle.end)}</span>
      </div>
    </div>
  );
};

export default LunarTimeline;
