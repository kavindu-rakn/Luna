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

// The scrollbar inside the styled month and year lists (see .calendar-select in
// index.css): a slim rounded thumb with no track and no arrow buttons. The standard
// scrollbar-width: thin still draws arrows on Windows, and setting either standard
// property makes Chrome ignore these rules, so they are left unset. These live here
// rather than in index.css because the CSS minifier cannot parse a pseudo-element
// chained onto ::picker(select), and fails the build. Only Chromium supports
// base-select, and it reads them.
const PICKER_SCROLLBAR_CSS = `
@supports (appearance: base-select) {
  @media (hover: hover) and (pointer: fine) {
    .calendar-select::picker(select)::-webkit-scrollbar { width: 6px; }
    .calendar-select::picker(select)::-webkit-scrollbar-button { display: none; }
    .calendar-select::picker(select)::-webkit-scrollbar-track { background: transparent; }
    .calendar-select::picker(select)::-webkit-scrollbar-thumb { border-radius: 3px; background: rgba(129, 140, 248, 0.5); }
  }
}`;

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
    <div className="date-controls">
      
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
        className={`glass-button date-display-btn ${isCalendarOpen ? 'is-open' : ''}`}
        title="Click to open calendar (or press T for Today)"
        aria-label="Current Date. Click to open calendar."
        aria-expanded={isCalendarOpen}
      >
        <span className="font-serif date-text-desktop">
          {formatDateDesktop(currentDate)}
        </span>
        <span className="font-serif date-text-mobile">
          {formatDateMobile(currentDate)}
        </span>
      </button>

      {/* ═══ CUSTOM CELESTIAL DARK CALENDAR ═══ */}
      {isCalendarOpen && (
        <div
          ref={calendarModalRef}
          className="calendar-panel"
        >
          {/* React hoists this into <head> once, however often the calendar opens */}
          <style href="luna-calendar-picker-scrollbar" precedence="default">{PICKER_SCROLLBAR_CSS}</style>

          {/* Header: Month/Year Navigator & Close Button */}
          <div className="calendar-header">
            <div className="calendar-month-navigation">
              <button
                onClick={handlePrevMonth}
                className="ghost-control-btn"
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Native selects: the keyboard, screen readers and type-to-jump all
                  work as anywhere else, so typing 1969 on the year goes straight there */}
              <select
                className="calendar-select calendar-select-month"
                aria-label="Month"
                value={month}
                onChange={(e) => showMonth(year, Number(e.target.value))}
              >
                {monthNames.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
              <select
                className="calendar-select calendar-select-year"
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
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={() => setIsCalendarOpen(false)}
              className="ghost-control-btn calendar-close"
              aria-label="Close calendar"
            >
              <X size={15} />
            </button>
          </div>

          {/* Weekday Names */}
          <div className="calendar-weekdays" aria-hidden="true">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div
            role="group"
            aria-label={`${monthNames[month]} ${year}`}
            className="calendar-grid"
            data-date-grid
            onKeyDown={handleGridKeyDown}
          >
            {/* Leading days from previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`prev-${i}`}
                className="calendar-day-outside"
                aria-hidden="true"
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
              const dayClassName = [
                'calendar-day',
                selected && 'is-selected',
                today && 'is-today',
                info?.event && 'has-phase'
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  ref={(el) => { dayRefs.current[day] = el; }}
                  className={dayClassName}
                  tabIndex={day === activeDay ? 0 : -1}
                  aria-label={dayLabel(day)}
                  aria-current={today ? 'date' : undefined}
                  onFocus={() => setFocusedDay(day)}
                  onClick={() => handleSelectDay(day)}
                >
                  <span>{day}</span>
                  {/* The day's Moon at local noon. A ring marks the day a principal
                      phase falls on, matching the list of exact phases below. */}
                  <span
                    className={`calendar-day-moon${info?.event ? ' has-phase' : ''}`}
                  >
                    <MoonIcon phase={info?.phase ?? 0} size={12} />
                  </span>
                </button>
              );
            })}

            {/* Trailing days, finishing the month's last week only. A fixed six rows
                kept the popup one height, but left a whole row of next month's days
                under any month that fits in five. The month arrows sit at the top,
                so they stay put under the pointer either way. */}
            {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
              <div
                key={`next-${i}`}
                className="calendar-day-outside"
                aria-hidden="true"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* The month's principal phases, each one a jump to its exact instant */}
          {monthPhases && monthPhases.events.length > 0 && (
            <div className="calendar-events">
              <div id="calendar-phases-label" className="utility-label calendar-events-label">
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

      {/* Control Navigation Bar. What the eye compares is the drawn chevrons, not the
          38px buttons around them: with a uniform gap, the pairs of chevrons sat 35px
          apart but only 21px from the Today pill. The icon buttons now touch, so their
          touch targets never overlap, and the pill's margin makes up the difference:
          every glyph-to-glyph gap is the same 31px. */}
      <div className="date-nav">
        {/* Previous Major Phase (New, 1st Q, Full, Last Q) */}
        <button
          className="ghost-control-btn"
          title="Previous Major Phase (Shift+←)"
          onClick={() => jumpQuarterPhase(-1)}
          aria-label="Previous Major Phase"
          aria-keyshortcuts="Shift+ArrowLeft"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* -1 Day */}
        <button
          className="ghost-control-btn"
          title="Previous Day (←)"
          onClick={() => changeDate(-1)}
          aria-label="Previous Day"
          aria-keyshortcuts="ArrowLeft"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Today Pill */}
        <button
          className="glass-button today-button"
          title="Jump to Today (T)"
          onClick={onToday ?? (() => setCurrentDate(new Date()))}
          aria-label="Reset to Today"
          aria-keyshortcuts="T"
        >
          Today
        </button>

        {/* +1 Day */}
        <button
          className="ghost-control-btn"
          title="Next Day (→)"
          onClick={() => changeDate(1)}
          aria-label="Next Day"
          aria-keyshortcuts="ArrowRight"
        >
          <ChevronRight size={16} />
        </button>

        {/* Next Major Phase (New, 1st Q, Full, Last Q) */}
        <button
          className="ghost-control-btn"
          title="Next Major Phase (Shift+→)"
          onClick={() => jumpQuarterPhase(1)}
          aria-label="Next Major Phase"
          aria-keyshortcuts="Shift+ArrowRight"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default DateControls;
