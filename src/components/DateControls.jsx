import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X } from 'lucide-react';
import {
  getAdjacentQuarterPhase,
  getZonedDay,
  getNoonInZone,
  formatPhaseStamp,
  formatShortTime
} from '../utils/lunarCalc';
import { getMonthPhases } from '../utils/calendar';
import MoonIcon from './MoonIcon';

// Month arithmetic in UTC: pure calendar maths, untouched by any clock change
const utcDate = (year, month, day) => new Date(Date.UTC(year, month, day));

// The year picker spans the two centuries around today, where the ephemeris is at
// its best. A year outside them, arriving in a shared link, is added so it can show.
const FIRST_YEAR = 1900;
const LAST_YEAR = 2100;

// Every date here is a date on the observing place's clock, like the rest of the
// app. Reading them off the viewer's device instead put the header a day away from
// the sky chart, and a click on the 26th could select the 25th at the place.
const DateControls = ({ currentDate, setCurrentDate, onToday, isCalendarOpen, setIsCalendarOpen, timeZone, clock }) => {
  // The month on show, as { year, month }
  const [view, setView] = useState(() => getZonedDay(currentDate, timeZone));
  const calendarModalRef = useRef(null);
  const toggleButtonRef = useRef(null);
  const wasCalendarOpen = useRef(false);

  // The grid is one Tab stop. Arrow keys move between days, as in any native date
  // picker; before this every day was its own stop, 33 presses to get past.
  const [focusedDay, setFocusedDay] = useState(1);
  const dayRefs = useRef({});
  const pendingFocus = useRef(false);

  // Send focus back to the toggle when the calendar closes, so a keyboard user
  // pressing Escape is not dropped at the top of the document.
  useEffect(() => {
    if (wasCalendarOpen.current && !isCalendarOpen) {
      toggleButtonRef.current?.focus();
    }
    wasCalendarOpen.current = isCalendarOpen;
  }, [isCalendarOpen]);

  // Functional updates: computing from the currentDate captured at render meant
  // presses landing faster than React re-rendered all stepped from the same day,
  // and were silently dropped.
  const changeDate = (days) => {
    setCurrentDate((previous) => {
      const next = new Date(previous);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const jumpQuarterPhase = (direction) => {
    setCurrentDate((previous) => getAdjacentQuarterPhase(previous, direction));
  };

  const formatDateDesktop = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone
    });
  };

  const formatDateMobile = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone
    });
  };

  // Close calendar on Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarModalRef.current && !calendarModalRef.current.contains(e.target)) {
        // Only close if the click was not on the toggle button itself
        if (toggleButtonRef.current?.contains(e.target)) return;
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen, setIsCalendarOpen]);

  useEffect(() => {
    if (!isCalendarOpen || !pendingFocus.current) return;
    pendingFocus.current = false;
    dayRefs.current[focusedDay]?.focus();
  }, [isCalendarOpen, focusedDay, view]);

  // Monthly Calendar Math
  const { year, month } = view;

  // The Moon for every day of the month on show, worked out only while it is open
  const monthPhases = useMemo(
    () => (isCalendarOpen ? getMonthPhases(year, month, timeZone) : null),
    [isCalendarOpen, year, month, timeZone]
  );

  const yearOptions = useMemo(() => {
    const from = Math.min(FIRST_YEAR, year);
    const to = Math.max(LAST_YEAR, year);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [year]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = utcDate(year, month, 1).getUTCDay();
  const daysInMonth = utcDate(year, month + 1, 0).getUTCDate();
  const daysInPrevMonth = utcDate(year, month, 0).getUTCDate();

  const showMonth = (y, m) => {
    const first = utcDate(y, m, 1);
    setView({ year: first.getUTCFullYear(), month: first.getUTCMonth() });
  };

  const handlePrevMonth = () => showMonth(year, month - 1);
  const handleNextMonth = () => showMonth(year, month + 1);

  const handleSelectDay = (day) => {
    setCurrentDate(getNoonInZone(year, month, day, timeZone));
    setIsCalendarOpen(false);
  };

  // A phase in the list lands on its exact instant, not on noon of its day
  const handleSelectEvent = (event) => {
    setCurrentDate(event.date);
    setIsCalendarOpen(false);
  };

  // Today and the selected day, as the place's clock reads them
  const todayAtPlace = getZonedDay(new Date(), timeZone);
  const selectedAtPlace = getZonedDay(currentDate, timeZone);
  const isSameDay = (p, day) => p.year === year && p.month === month && p.day === day;
  const isToday = (day) => isSameDay(todayAtPlace, day);
  const isSelectedDay = (day) => isSameDay(selectedAtPlace, day);

  // Clamp for months shorter than the one we arrived from, so a tab stop always exists
  const activeDay = Math.min(focusedDay, daysInMonth);

  // Arrows by day and week, Home and End to the ends of the week, Page Up and Down
  // by month. Crossing a month boundary turns the page and keeps focus moving.
  const handleGridKeyDown = (e) => {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const from = utcDate(year, month, activeDay);
    let target;

    if (e.key in deltas) target = utcDate(year, month, activeDay + deltas[e.key]);
    else if (e.key === 'Home') target = utcDate(year, month, activeDay - from.getUTCDay());
    else if (e.key === 'End') target = utcDate(year, month, activeDay + (6 - from.getUTCDay()));
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const step = e.key === 'PageUp' ? -1 : 1;
      const lastDay = utcDate(year, month + step + 1, 0).getUTCDate();
      target = utcDate(year, month + step, Math.min(activeDay, lastDay));
    } else return;

    e.preventDefault();
    e.stopPropagation();
    if (target.getUTCMonth() !== month || target.getUTCFullYear() !== year) {
      showMonth(target.getUTCFullYear(), target.getUTCMonth());
    }
    setFocusedDay(target.getUTCDate());
    pendingFocus.current = true;
  };

  // A bare "12" tells a screen reader nothing about which month it is in
  const dayLabel = (day) => {
    const text = utcDate(year, month, day).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    });
    const event = monthPhases?.days[day - 1]?.event;
    const phase = event ? `, ${event.name} at ${formatShortTime(event.date, timeZone, clock)}` : '';
    return `${text}${phase}${isSelectedDay(day) ? ', selected' : ''}${isToday(day) ? ', today' : ''}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
      
      {/* Date Display Pill (Clickable to open custom dark calendar) */}
      <button
        ref={toggleButtonRef}
        onClick={() => {
          if (!isCalendarOpen) {
            // Open onto the selected day, with focus already on it
            const selected = getZonedDay(currentDate, timeZone);
            setView({ year: selected.year, month: selected.month });
            setFocusedDay(selected.day);
            pendingFocus.current = true;
          }
          setIsCalendarOpen(!isCalendarOpen);
        }}
        className="glass-button date-display-btn"
        style={{
          background: isCalendarOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
          border: isCalendarOpen ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '0.35rem 1rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          minHeight: '34px'
        }}
        title="Click to open calendar (or press T for Today)"
        aria-label="Current Date. Click to open calendar."
        aria-expanded={isCalendarOpen}
      >
        <span className="font-serif date-text-desktop" style={{ fontSize: '1.15rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          {formatDateDesktop(currentDate)}
        </span>
        <span className="font-serif date-text-mobile" style={{ fontSize: '1.05rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
          {formatDateMobile(currentDate)}
        </span>
      </button>

      {/* ═══ CUSTOM CELESTIAL DARK CALENDAR ═══ */}
      {isCalendarOpen && (
        <div
          ref={calendarModalRef}
          style={{
            position: 'absolute',
            top: '3rem',
            background: 'rgba(9, 12, 28, 0.96)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid var(--border-medium)',
            borderRadius: '18px',
            padding: '1.25rem',
            width: '320px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Header: Month/Year Navigator & Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              <button
                onClick={handlePrevMonth}
                className="ghost-control-btn"
                style={{ minWidth: '28px', minHeight: '28px', padding: 0 }}
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Native selects: the keyboard, screen readers and type-to-jump all
                  work as anywhere else, so typing 1969 on the year goes straight there */}
              <select
                className="calendar-select"
                aria-label="Month"
                value={month}
                onChange={(e) => showMonth(year, Number(e.target.value))}
              >
                {monthNames.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
              <select
                className="calendar-select"
                aria-label="Year"
                value={year}
                onChange={(e) => showMonth(Number(e.target.value), month)}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handleNextMonth}
                className="ghost-control-btn"
                style={{ minWidth: '28px', minHeight: '28px', padding: 0 }}
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setIsCalendarOpen(false)}
              className="ghost-control-btn"
              style={{ minWidth: '28px', minHeight: '28px', padding: 0 }}
              aria-label="Close calendar"
            >
              <X size={15} />
            </button>
          </div>

          {/* Weekday Names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '0.5rem' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div
            role="group"
            aria-label={`${monthNames[month]} ${year}`}
            data-date-grid
            onKeyDown={handleGridKeyDown}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}
          >
            {/* Leading days from previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`prev-${i}`}
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  color: 'rgba(255, 255, 255, 0.15)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {daysInPrevMonth - firstDayOfMonth + i + 1}
              </div>
            ))}

            {/* Days in active month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelectedDay(day);
              const today = isToday(day);
              const info = monthPhases?.days[i];

              return (
                <button
                  key={`day-${day}`}
                  ref={(el) => { dayRefs.current[day] = el; }}
                  tabIndex={day === activeDay ? 0 : -1}
                  aria-label={dayLabel(day)}
                  aria-current={today ? 'date' : undefined}
                  onFocus={() => setFocusedDay(day)}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '42px',
                    width: '100%',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    lineHeight: 1,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: selected ? 700 : today ? 600 : 400,
                    color: selected ? '#ffffff' : today ? 'var(--accent-light)' : 'var(--text-primary)',
                    background: selected ? 'var(--accent-strong)' : 'transparent',
                    border: today && !selected ? '1px solid var(--accent-light)' : '1px solid transparent',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: selected ? '0 0 12px var(--accent-glow)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span>{day}</span>
                  {/* The day's Moon at local noon. A ring marks the day a principal
                      phase falls on, matching the list of exact phases below. */}
                  <span
                    style={{
                      display: 'block',
                      borderRadius: '50%',
                      boxShadow: info?.event ? `0 0 0 1.5px ${selected ? '#ffffff' : 'var(--accent-light)'}` : 'none'
                    }}
                  >
                    <MoonIcon phase={info?.phase ?? 0} size={12} />
                  </span>
                </button>
              );
            })}

            {/* Trailing days, padding the matrix to a fixed six rows so the modal
                keeps one height whether a month spans four rows or six */}
            {Array.from({ length: Math.max(0, 42 - firstDayOfMonth - daysInMonth) }).map((_, i) => (
              <div
                key={`next-${i}`}
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  color: 'rgba(255, 255, 255, 0.15)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* The month's principal phases, each one a jump to its exact instant */}
          {monthPhases && monthPhases.events.length > 0 && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.7rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div id="calendar-phases-label" className="utility-label" style={{ fontSize: '0.68rem', margin: '0 0 0.35rem 0.45rem' }}>
                Exact phases
              </div>
              <ul className="calendar-phases" aria-labelledby="calendar-phases-label">
                {monthPhases.events.map((event) => {
                  const stamp = formatPhaseStamp(event.date, timeZone, clock);
                  return (
                    <li key={`${event.key}-${event.day}`}>
                      <button
                        type="button"
                        className="calendar-phase"
                        onClick={() => handleSelectEvent(event)}
                        aria-label={`${event.name}, ${stamp}`}
                      >
                        <MoonIcon phase={event.target} size={14} />
                        <span>{event.name}</span>
                        <span className="calendar-phase-time">{stamp}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Control Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {/* Previous Major Phase (New, 1st Q, Full, Last Q) */}
        <button
          className="ghost-control-btn"
          title="Previous Major Phase (Shift+←)"
          onClick={() => jumpQuarterPhase(-1)}
          aria-label="Previous Major Phase"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* -1 Day */}
        <button
          className="ghost-control-btn"
          title="Previous Day (←)"
          onClick={() => changeDate(-1)}
          aria-label="Previous Day"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Today Pill */}
        <button
          className="glass-button"
          title="Jump to Today (T)"
          onClick={onToday ?? (() => setCurrentDate(new Date()))}
          aria-label="Reset to Today"
          style={{
            padding: '0.22rem 0.75rem',
            minHeight: '26px',
            borderRadius: '13px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-secondary)',
            lineHeight: 1
          }}
        >
          Today
        </button>

        {/* +1 Day */}
        <button
          className="ghost-control-btn"
          title="Next Day (→)"
          onClick={() => changeDate(1)}
          aria-label="Next Day"
        >
          <ChevronRight size={16} />
        </button>

        {/* Next Major Phase (New, 1st Q, Full, Last Q) */}
        <button
          className="ghost-control-btn"
          title="Next Major Phase (Shift+→)"
          onClick={() => jumpQuarterPhase(1)}
          aria-label="Next Major Phase"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default DateControls;
