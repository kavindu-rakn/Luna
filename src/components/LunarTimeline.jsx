import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import {
  getSynodicCycle,
  getCyclePhasePosition,
  getDateAtCyclePhase,
  getPhaseSummary,
  getAdjacentQuarterPhase
} from '../utils/lunarCalc';
import { settleTarget, crossesMark } from '../utils/timelineDetents';
import MoonIcon from './MoonIcon';

const DAY_MS = 86400000;

// Released near an exact phase, the thumb eases into it over this long
const SETTLE_MS = 260;
const easeOut = (t) => 1 - (1 - t) ** 3;

// On a first visit the thumb nudges once, to show it moves (decision H1); that it
// has stays on this device
const NUDGE_KEY = 'luna_timeline_hint';
const readNudged = () => {
  try {
    return localStorage.getItem(NUDGE_KEY) === 'seen';
  } catch {
    return false;
  }
};
const storeNudged = () => {
  try {
    localStorage.setItem(NUDGE_KEY, 'seen');
  } catch {
    // Storage unavailable: it nudges again next visit
  }
};

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// A short tick on Android as the thumb crosses or settles into an exact phase
// (decision H4). iOS browsers have no haptics; elsewhere this does nothing.
const buzz = (ms) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not allowed here
  }
};

// The track is measured by phase angle, not elapsed time, so the principal phases sit
// on fixed marks: New Moon at both ends, First Quarter a quarter of the way, Full Moon
// at the centre, Last Quarter at three quarters. By elapsed time they drifted a few
// percent from cycle to cycle with the Moon's uneven orbital speed. That speed now
// shows in the day ticks instead, which bunch where the Moon moves slowly.
//
// Drawn in the hairline language (decisions H1 to H4): no caption, a thumb that
// nudges once on a first visit and pulses only while live, soft detents that ease
// it into an exact phase when it is let go nearby, so a tap on a phase icon lands
// on that phase, and on a mouse a readout of the point under the pointer.
const LunarTimeline = ({ currentDate, setCurrentDate, timeZone, isLive = false, settled = false }) => {
  const railRef = useRef(null);
  const [hoverPosition, setHoverPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const lastPosition = useRef(null);
  const settleFrame = useRef(0);

  // getSynodicCycle memoises internally, so a drag does not re-solve the cycle
  const cycle = useMemo(() => getSynodicCycle(currentDate), [currentDate]);

  const currentPosition = getCyclePhasePosition(cycle, currentDate);

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

  // The first visit's nudge, once the page has settled, unless asked for less motion
  useEffect(() => {
    if (!settled || readNudged() || reducedMotion()) return undefined;
    const timer = setTimeout(() => {
      storeNudged();
      setIsNudging(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [settled]);

  const stopSettling = useCallback(() => {
    cancelAnimationFrame(settleFrame.current);
    settleFrame.current = 0;
    setIsSettling(false);
  }, []);
  useEffect(() => () => cancelAnimationFrame(settleFrame.current), []);

  // Measured against the drawn rail, while the pointer is caught by the full-width
  // track around it: a touch in the side margin clamps to that end of the cycle, so
  // a thumb never has to reach the edge of the screen to get there.
  const getPositionFromEvent = useCallback((e) => {
    if (!railRef.current) return null;
    const rect = railRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  // The right end of the track is the next New Moon, which already belongs to the
  // next cycle. Landing on it rebuilt the track one cycle on, so a drag held past the
  // end kept jumping a month a frame. Stop a second short, as End does.
  const lastMs = cycle.startMs + cycle.durationMs - 1000;
  const dateAt = useCallback((position) => {
    const date = getDateAtCyclePhase(cycle, position);
    return date.getTime() > lastMs ? new Date(lastMs) : date;
  }, [cycle, lastMs]);

  const scrubTo = useCallback((position) => setCurrentDate(dateAt(position)), [dateAt, setCurrentDate]);

  // Let go near an exact phase, the thumb eases into it (and the Moon with it)
  const settleNear = useCallback((position) => {
    if (position === null || !railRef.current) return;
    const width = railRef.current.getBoundingClientRect().width;
    const target = settleTarget(position, milestones, width, cycle.durationMs / DAY_MS);
    if (!target) return;
    const toMs = Math.min(target.date.getTime(), lastMs);
    const fromMs = dateAt(position).getTime();
    buzz(12);
    if (reducedMotion() || Math.abs(toMs - fromMs) < 60000) {
      setCurrentDate(new Date(toMs));
      return;
    }
    const start = performance.now();
    setIsSettling(true);
    const step = (now) => {
      const t = Math.min(1, (now - start) / SETTLE_MS);
      setCurrentDate(new Date(fromMs + (toMs - fromMs) * easeOut(t)));
      if (t < 1) settleFrame.current = requestAnimationFrame(step);
      else stopSettling();
    };
    settleFrame.current = requestAnimationFrame(step);
  }, [milestones, cycle, lastMs, dateAt, setCurrentDate, stopSettling]);

  const handlePointerDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button > 0) return;
    stopSettling();
    storeNudged();
    setIsDragging(true);
    setHoverPosition(null);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = getPositionFromEvent(e);
    lastPosition.current = p;
    if (p !== null) scrubTo(p);
  }, [getPositionFromEvent, scrubTo, stopSettling]);

  const handlePointerMove = useCallback((e) => {
    const p = getPositionFromEvent(e);
    if (p === null) return;
    if (!isDragging) {
      // Only a mouse hovers; a finger shows its place with the thumb itself
      if (e.pointerType === 'mouse') setHoverPosition(p);
      return;
    }
    if (crossesMark(lastPosition.current, p, milestones)) buzz(8);
    lastPosition.current = p;
    scrubTo(p);
  }, [getPositionFromEvent, isDragging, milestones, scrubTo]);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const p = e.type === 'pointercancel' ? lastPosition.current : getPositionFromEvent(e) ?? lastPosition.current;
    lastPosition.current = null;
    settleNear(p);
  }, [isDragging, getPositionFromEvent, settleNear]);

  const handlePointerLeave = useCallback(() => setHoverPosition(null), []);

  // Keyboard: a day at a time, the cycle's ends, and with Shift the exact next or
  // previous principal phase. That is what Shift+arrow does everywhere else; here it
  // used to step a quarter of the cycle, which lands near a phase but not on it.
  const handleKeyDown = (e) => {
    let next;

    if (e.key === 'ArrowLeft') next = e.shiftKey ? getAdjacentQuarterPhase(currentDate, -1) : new Date(currentDate.getTime() - DAY_MS);
    else if (e.key === 'ArrowRight') next = e.shiftKey ? getAdjacentQuarterPhase(currentDate, 1) : new Date(currentDate.getTime() + DAY_MS);
    else if (e.key === 'Home') next = new Date(cycle.startMs);
    else if (e.key === 'End') next = new Date(lastMs);
    else return;

    // Claim the key so the global shortcut handler does not apply it a second time
    e.preventDefault();
    e.stopPropagation();
    stopSettling();
    storeNudged();
    setCurrentDate(next);
  };

  // On the place's clock, so the labels agree with the header and the sky chart
  const formatShortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });

  const hovered = useMemo(() => {
    if (hoverPosition === null) return null;
    const date = dateAt(hoverPosition);
    return { date, ...getPhaseSummary(date) };
  }, [hoverPosition, dateAt]);

  const currentSummary = useMemo(() => getPhaseSummary(currentDate), [currentDate]);

  return (
    <div className="lunar-timeline">
      {/* Interactive track: full width, so its side margins catch a thumb too */}
      <div
        className={`timeline-track${isDragging || isSettling ? ' is-dragging' : ''}`}
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
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <div className="timeline-rail" ref={railRef}>
          <div className="timeline-line" />

          <div
            className="timeline-progress"
            style={{ width: `${currentPosition * 100}%` }}
          />

          {/* Day ticks, placed by the phase each day reached, brighter the more of
              the Moon was lit */}
          {ticks.map((tick, idx) => (
            <div
              className="timeline-tick"
              key={idx}
              style={{ left: `${tick.position * 100}%`, opacity: 0.25 + tick.illumination * 0.6 }}
            />
          ))}

          {/* Principal phases, on their fixed marks. A tap on one lands on its
              exact moment: the detent around it catches the release. */}
          {milestones.map((milestone, idx) => (
            <div
              className="timeline-milestone"
              key={`milestone-${idx}`}
              style={{ left: `${milestone.position * 100}%` }}
            >
              <MoonIcon phase={milestone.phase} size={16} />
            </div>
          ))}

          {/* Selected-position thumb */}
          <div
            className={`timeline-thumb${isNudging ? ' is-nudging' : ''}`}
            style={{ left: `${currentPosition * 100}%` }}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) setIsNudging(false);
            }}
          >
            <MoonIcon phase={currentSummary.phase} size={22} />
            {/* The pulse means "now", so it only runs while the view follows the clock */}
            {isLive && <div className="timeline-thumb-ring" />}
          </div>

          {/* With a mouse, the point under the pointer before it is pressed */}
          {hovered && (
            <div
              className="timeline-tooltip"
              style={{
                // Clamped so the readout stays on screen at either end of the rail
                left: `clamp(5rem, ${hoverPosition * 100}%, calc(100% - 5rem))`
              }}
            >
              <MoonIcon phase={hovered.phase} size={14} />
              <span className="timeline-tooltip-name">{hovered.name}</span>
              <span className="timeline-tooltip-date">{formatShortDate(hovered.date)}</span>
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
