import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { getCyclePhases } from '../utils/lunarCalc';
import gsap from 'gsap';

// Small SVG moon icon that visually represents a phase
const MoonIcon = ({ phase, size = 20 }) => {
  // phase 0 = new moon (dark), 0.5 = full moon (bright)
  const illumination = Math.abs(phase <= 0.5 ? phase * 2 : 2 - phase * 2);
  const isWaxing = phase <= 0.5;

  // We draw a circle and an ellipse to create the terminator
  const r = size / 2;
  // rx of the terminator ellipse: 1 = full circle edge, 0 = straight line
  const terminatorRx = Math.abs(illumination * 2 - 1) * r;
  const brightSide = illumination > 0.5;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Dark base circle */}
      <circle cx={r} cy={r} r={r - 0.5} fill="#1a1a2e" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Bright half */}
      <path
        d={`M ${r},${0.5}
            A ${r - 0.5},${r - 0.5} 0 0 ${isWaxing ? 0 : 1} ${r},${size - 0.5}
            A ${brightSide ? terminatorRx : terminatorRx},${r - 0.5} 0 0 ${(isWaxing && brightSide) || (!isWaxing && !brightSide) ? 1 : 0} ${r},${0.5}
            Z`}
        fill="#d4d4dc"
      />
    </svg>
  );
};

const LunarTimeline = ({ currentDate, setCurrentDate }) => {
  const trackRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const tooltipRef = useRef(null);

  const cyclePhases = useMemo(() => getCyclePhases(currentDate), [currentDate]);

  const handleDayClick = useCallback((dayDate) => {
    setCurrentDate(new Date(dayDate));
  }, [setCurrentDate]);

  // Drag / scrub logic
  const getIndexFromEvent = useCallback((e) => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(fraction * (cyclePhases.length - 1));
  }, [cyclePhases]);

  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    const idx = getIndexFromEvent(e);
    if (idx !== null && cyclePhases[idx]) {
      handleDayClick(cyclePhases[idx].date);
    }
    e.preventDefault();
  }, [getIndexFromEvent, cyclePhases, handleDayClick]);

  const handlePointerMove = useCallback((e) => {
    const idx = getIndexFromEvent(e);
    if (idx !== null) {
      setHoveredIndex(idx);
      if (isDragging && cyclePhases[idx]) {
        handleDayClick(cyclePhases[idx].date);
      }
    }
  }, [getIndexFromEvent, isDragging, cyclePhases, handleDayClick]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredIndex(null);
    setIsDragging(false);
  }, []);

  // Animate tooltip on hover change
  const lastHoveredRef = useRef(null);
  useEffect(() => {
    if (hoveredIndex !== null && hoveredIndex !== lastHoveredRef.current && tooltipRef.current) {
      gsap.fromTo(tooltipRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
      );
    }
    lastHoveredRef.current = hoveredIndex;
  }, [hoveredIndex]);

  const currentIdx = cyclePhases.findIndex(p => p.isCurrent);

  // Format short date label
  const formatShortDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-panel" style={{ width: '100%', padding: '1.5rem 2rem', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-secondary)' }}>
          Lunar Cycle Timeline
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', opacity: 0.6 }}>
          Drag to explore
        </span>
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && cyclePhases[hoveredIndex] && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: '-3rem',
            left: `calc(${(hoveredIndex / (cyclePhases.length - 1)) * 100}% + 1rem)`,
            transform: 'translateX(-50%)',
            background: 'rgba(10, 11, 26, 0.95)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <MoonIcon phase={cyclePhases[hoveredIndex].phase} size={16} />
          <span style={{ fontWeight: 600 }}>{cyclePhases[hoveredIndex].name}</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {formatShortDate(cyclePhases[hoveredIndex].date)}
          </span>
          <span style={{ color: 'var(--color-accent)' }}>
            {cyclePhases[hoveredIndex].fraction.toFixed(0)}%
          </span>
        </div>
      )}

      {/* Timeline Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'relative',
          width: '100%',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none'
        }}
      >
        {/* Background track line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 10%, rgba(255,255,255,0.08) 90%, transparent 100%)',
          transform: 'translateY(-50%)'
        }} />

        {/* Progress fill up to current day */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          width: `${(currentIdx / (cyclePhases.length - 1)) * 100}%`,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, var(--color-accent) 100%)',
          transform: 'translateY(-50%)',
          transition: 'width 0.5s ease'
        }} />

        {/* Day markers */}
        {cyclePhases.map((day, idx) => {
          const isActive = day.isCurrent;
          const isHovered = idx === hoveredIndex;
          const isMajorPhase = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'].includes(day.name);

          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${(idx / (cyclePhases.length - 1)) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: isActive ? 3 : isHovered ? 2 : 1
              }}
            >
              {/* Moon icon for major phases / active / hovered */}
              {(isActive || isMajorPhase || isHovered) ? (
                <div style={{
                  transition: 'transform 0.2s ease',
                  transform: (isActive || isHovered) ? 'scale(1.4)' : 'scale(1)',
                  filter: isActive ? 'drop-shadow(0 0 6px var(--color-accent))' : 'none'
                }}>
                  <MoonIcon phase={day.phase} size={isActive ? 24 : 18} />
                </div>
              ) : (
                <div style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: `rgba(255,255,255, ${0.15 + day.fraction / 200})`,
                  transition: 'transform 0.15s ease',
                  transform: isHovered ? 'scale(2)' : 'scale(1)'
                }} />
              )}

              {/* Glow ring behind current day */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1.5px solid var(--color-accent)',
                  opacity: 0.5,
                  animation: 'pulse-ring 2s ease-in-out infinite'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Date labels row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '0.5rem',
        fontSize: '0.7rem',
        color: 'var(--color-text-secondary)',
        opacity: 0.6
      }}>
        <span>{formatShortDate(cyclePhases[0].date)}</span>
        <span style={{ color: 'var(--color-accent)', opacity: 1, fontWeight: 600 }}>
          {formatShortDate(currentDate)}
        </span>
        <span>{formatShortDate(cyclePhases[cyclePhases.length - 1].date)}</span>
      </div>
    </div>
  );
};

export default LunarTimeline;
