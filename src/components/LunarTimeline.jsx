import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { getCyclePhases } from '../utils/lunarCalc';

// SVG Moon Icon with mathematically correct terminator ellipse
const MoonIcon = ({ phase, size = 20 }) => {
  const r = size / 2;
  const illumination = phase <= 0.5 ? phase * 2 : 2 - phase * 2;
  const isWaxing = phase <= 0.5;
  const sweepOuter = isWaxing ? 1 : 0;
  const rx = Math.max(0.01, Math.abs(illumination * 2 - 1) * (r - 0.5));
  const sweepInner = illumination > 0.5 ? (isWaxing ? 1 : 0) : (isWaxing ? 0 : 1);

  const pathData = `M ${r},0.5 A ${r - 0.5},${r - 0.5} 0 0 ${sweepOuter} ${r},${size - 0.5} A ${rx},${r - 0.5} 0 0 ${sweepInner} ${r},0.5 Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={r} cy={r} r={r - 0.5} fill="#111428" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />
      <path d={pathData} fill="#e2e8f0" />
    </svg>
  );
};

const LunarTimeline = ({ currentDate, setCurrentDate }) => {
  const trackRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const tooltipRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cyclePhases = useMemo(() => getCyclePhases(currentDate, 30), [currentDate]);

  const handleDayClick = useCallback((dayDate) => {
    setCurrentDate(new Date(dayDate));
  }, [setCurrentDate]);

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

  const handlePointerUp = useCallback(() => setIsDragging(false), []);
  const handlePointerLeave = useCallback(() => {
    setHoveredIndex(null);
    setIsDragging(false);
  }, []);

  // Keyboard navigation on track focus
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() - 1);
      setCurrentDate(newD);
    } else if (e.key === 'ArrowRight') {
      const newD = new Date(currentDate);
      newD.setDate(newD.getDate() + 1);
      setCurrentDate(newD);
    }
  };

  const currentIdx = cyclePhases.findIndex(p => p.isCurrent);

  const formatShortDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bottom-bar" style={{ padding: '1rem 1.5rem', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span className="utility-label" style={{ color: 'var(--text-muted)' }}>
          30-Day Lunar Cycle
        </span>
        <span className="utility-label" style={{ opacity: 0.7 }}>
          Drag / Scrub Timeline
        </span>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredIndex !== null && cyclePhases[hoveredIndex] && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: '-2.8rem',
            left: `calc(${(hoveredIndex / (cyclePhases.length - 1)) * 100}% + 1.5rem)`,
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
          <MoonIcon phase={cyclePhases[hoveredIndex].phase} size={15} />
          <span className="font-serif" style={{ fontSize: '1.05rem', lineHeight: 1 }}>{cyclePhases[hoveredIndex].name}</span>
          <span style={{ color: 'var(--text-muted)' }}>
            {formatShortDate(cyclePhases[hoveredIndex].date)}
          </span>
          <span className="font-mono" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
            {cyclePhases[hoveredIndex].fraction.toFixed(0)}%
          </span>
        </div>
      )}

      {/* Interactive Track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Lunar Cycle Day Slider"
        aria-valuemin={0}
        aria-valuemax={cyclePhases.length - 1}
        aria-valuenow={currentIdx !== -1 ? currentIdx : 15}
        aria-valuetext={`${formatShortDate(currentDate)} - ${cyclePhases[currentIdx]?.name || ''}`}
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
        {/* Track Line */}
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

        {/* Progress Fill */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: `${(currentIdx / (cyclePhases.length - 1)) * 100}%`,
            height: '2px',
            background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-light))',
            boxShadow: '0 0 10px var(--accent-glow)',
            transform: 'translateY(-50%)',
            transition: isDragging ? 'none' : 'width 0.3s ease'
          }}
        />

        {/* Day Markers with Adaptive Downsampling for Mobile */}
        {cyclePhases.map((day, idx) => {
          const isActive = day.isCurrent;
          const isHovered = idx === hoveredIndex;
          // On mobile, only display major quarter phases to prevent collisions
          const showIcon = isMobile ? (isActive || day.isMajor) : (isActive || day.isMajor || isHovered);

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
                zIndex: isActive ? 5 : isHovered ? 4 : 2
              }}
            >
              {showIcon ? (
                <div
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: isActive ? 'scale(1.3)' : isHovered ? 'scale(1.2)' : 'scale(0.95)',
                    filter: isActive ? 'drop-shadow(0 0 8px var(--accent-light))' : 'none'
                  }}
                >
                  <MoonIcon phase={day.phase} size={isActive ? 22 : 16} />
                </div>
              ) : (
                <div
                  style={{
                    width: isMobile ? '2px' : '4px',
                    height: isMobile ? '6px' : '4px',
                    borderRadius: isMobile ? '1px' : '50%',
                    background: `rgba(255,255,255, ${0.18 + day.fraction / 180})`,
                    transition: 'transform 0.15s ease',
                    transform: isHovered ? 'scale(2)' : 'scale(1)'
                  }}
                />
              )}

              {/* Active Pulse Ring */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    margin: '-16px 0 0 -16px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1.5px solid var(--accent-light)',
                    opacity: 0.6,
                    animation: 'pulse-ring 2.4s ease-in-out infinite',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Date Labels Row */}
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
        <span>{formatShortDate(cyclePhases[0].date)}</span>
        <span style={{ color: 'var(--text-accent)', fontWeight: 700 }}>
          {formatShortDate(currentDate)} (Selected)
        </span>
        <span>{formatShortDate(cyclePhases[cyclePhases.length - 1].date)}</span>
      </div>
    </div>
  );
};

export default LunarTimeline;
