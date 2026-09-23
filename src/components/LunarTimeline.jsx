import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  getSynodicCycle,
  getCyclePhasePosition,
  getDateAtCyclePhase,
  getPhaseSummary,
  getAdjacentQuarterPhase
} from '../utils/lunarCalc';
import MoonIcon from './MoonIcon';

// The track is measured by phase angle, not elapsed time, so the principal phases sit
// on fixed marks: New Moon at both ends, First Quarter a quarter of the way, Full Moon
// at the centre, Last Quarter at three quarters. By elapsed time they drifted a few
// percent from cycle to cycle with the Moon's uneven orbital speed. That speed now
// shows in the day ticks instead, which bunch where the Moon moves slowly.
const LunarTimeline = ({ currentDate, setCurrentDate, timeZone }) => {
  const railRef = useRef(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // getSynodicCycle memoises internally, so a drag does not re-solve the cycle
  const cycle = useMemo(() => getSynodicCycle(currentDate), [currentDate]);

  const currentPosition = getCyclePhasePosition(cycle, currentDate);

  // Measured against the drawn rail, while the pointer is caught by the full-width
  // track around it: a touch in the side margin clamps to that end of the cycle, so
  // a thumb never has to reach the edge of the screen to get there.
  const getPositionFromEvent = useCallback((e) => {
    if (!railRef.current) return null;
    const rect = railRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  // The right end of the track is the next New Moon, which already belongs to the
  // next cycle. Landing on it rebuilt the track one cycle on, so a drag held past the
  // end kept jumping a month a frame. Stop a second short, as End does.
  const scrubTo = useCallback((position) => {
    const lastMs = cycle.startMs + cycle.durationMs - 1000;
    const date = getDateAtCyclePhase(cycle, position);
    setCurrentDate(date.getTime() > lastMs ? new Date(lastMs) : date);
  }, [cycle, setCurrentDate]);

  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = getPositionFromEvent(e);
    if (p !== null) scrubTo(p);
  }, [getPositionFromEvent, scrubTo]);

  const handlePointerMove = useCallback((e) => {
    const p = getPositionFromEvent(e);
    if (p === null) return;
    setHoverPosition(p);
    if (isDragging) scrubTo(p);
  }, [getPositionFromEvent, isDragging, scrubTo]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const handlePointerLeave = useCallback(() => setHoverPosition(null), []);

  // Keyboard: a day at a time, the cycle's ends, and with Shift the exact next or
  // previous principal phase. That is what Shift+arrow does everywhere else; here it
  // used to step a quarter of the cycle, which lands near a phase but not on it.
  const handleKeyDown = (e) => {
    const DAY = 86400000;
    let next;

    if (e.key === 'ArrowLeft') next = e.shiftKey ? getAdjacentQuarterPhase(currentDate, -1) : new Date(currentDate.getTime() - DAY);
    else if (e.key === 'ArrowRight') next = e.shiftKey ? getAdjacentQuarterPhase(currentDate, 1) : new Date(currentDate.getTime() + DAY);
    else if (e.key === 'Home') next = new Date(cycle.startMs);
    else if (e.key === 'End') next = new Date(cycle.startMs + cycle.durationMs - 1000);
    else return;

    // Claim the key so the global shortcut handler does not apply it a second time
    e.preventDefault();
    e.stopPropagation();
    setCurrentDate(next);
  };

  // On the place's clock, so the labels agree with the header and the sky chart
  const formatShortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });

  const hovered = useMemo(() => {
    if (hoverPosition === null) return null;
    const date = getDateAtCyclePhase(cycle, hoverPosition);
    return { date, ...getPhaseSummary(date) };
  }, [hoverPosition, cycle]);

  const currentSummary = useMemo(() => getPhaseSummary(currentDate), [currentDate]);

  // The two bounding New Moons and the three quarters, each on its fixed mark and
  // labelled with the date it falls on this cycle
  const milestones = useMemo(() => ([
    { name: 'New Moon', phase: 0, position: 0, date: cycle.start },
    ...cycle.quarters.map((q) => ({ ...q, position: q.phase })),
    { name: 'New Moon', phase: 1, position: 1, date: cycle.end }
  ]), [cycle]);

  // One tick per day from the opening New Moon, placed by the phase it reached
  const ticks = useMemo(
    () => cycle.ticks.map((tick) => ({ ...tick, position: getCyclePhasePosition(cycle, tick.date) })),
    [cycle]
  );

  return (
    <div className="lunar-timeline">
      <div className="timeline-header">
        <h2 className="utility-label timeline-title">
          Lunar Cycle &middot; {cycle.durationDays.toFixed(2)} days
        </h2>
        <span className="utility-label timeline-hint">
          Drag / Scrub Timeline
        </span>
      </div>

      {/* Interactive track: full width, so its side margins catch a thumb too */}
      <div
        className={`timeline-track${isDragging ? ' is-dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Position within the lunar cycle"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(currentPosition * 100)}
        aria-valuetext={`${formatShortDate(currentDate)}, ${currentSummary.name}, ${Math.round(currentPosition * 100)} percent through the phase cycle`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <div className="timeline-rail" ref={railRef}>
          <div className="timeline-line" />

          <div
            className="timeline-progress"
            style={{ width: `${currentPosition * 100}%` }}
          />

          {/* Day ticks, placed by the phase each day reached */}
          {ticks.map((tick, idx) => (
            <div
              className="timeline-tick"
              key={idx}
              style={{
                left: `${tick.position * 100}%`,
                width: isMobile ? '2px' : '4px',
                height: isMobile ? '6px' : '4px',
                borderRadius: isMobile ? '1px' : '50%',
                background: `rgba(255,255,255, ${0.18 + tick.illumination * 0.55})`
              }}
            />
          ))}

          {/* Principal phases, on their fixed marks */}
          {milestones.map((milestone, idx) => (
            <div
              className="timeline-milestone"
              key={`milestone-${idx}`}
              title={`${milestone.name} — ${formatShortDate(milestone.date)}`}
              style={{ left: `${milestone.position * 100}%` }}
            >
              <MoonIcon phase={milestone.phase} size={16} />
            </div>
          ))}

          {/* Selected-position thumb */}
          <div className="timeline-thumb" style={{ left: `${currentPosition * 100}%` }}>
            <MoonIcon phase={currentSummary.phase} size={24} />
            <div className="timeline-thumb-ring" />
          </div>

          {/* Readout for the point under the pointer, or under the finger mid-drag */}
          {hovered && (
            <div
              className="timeline-tooltip"
              style={{
                // Clamped so the readout stays on screen at either end of the rail
                left: `clamp(7rem, ${hoverPosition * 100}%, calc(100% - 7rem))`
              }}
            >
              <MoonIcon phase={hovered.phase} size={15} />
              <span className="font-serif timeline-tooltip-name">{hovered.name}</span>
              <span className="timeline-tooltip-date">{formatShortDate(hovered.date)}</span>
              <span className="font-mono timeline-tooltip-fraction">
                {parseFloat(hovered.fraction).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* The date each principal phase falls on this cycle, under its mark */}
      <div className="timeline-labels" aria-hidden="true">
        {milestones.map((milestone, idx) => (
          <span
            key={`label-${idx}`}
            className="utility-label timeline-label"
            style={{ left: `${milestone.position * 100}%` }}
          >
            {formatShortDate(milestone.date)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LunarTimeline;
