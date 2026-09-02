import React, { useState, useRef, useEffect } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { getAdjacentQuarterPhase } from '../utils/lunarCalc';

const DateControls = ({ currentDate, setCurrentDate }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(currentDate));
  const calendarModalRef = useRef(null);

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const jumpQuarterPhase = (direction) => {
    const targetDate = getAdjacentQuarterPhase(currentDate, direction);
    setCurrentDate(targetDate);
  };

  const formatDateDesktop = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateMobile = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Close calendar on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCalendarOpen) {
        setIsCalendarOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (calendarModalRef.current && !calendarModalRef.current.contains(e.target) && !e.target.closest('.date-display-btn')) {
        setIsCalendarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day) => {
    const selected = new Date(year, month, day, 12, 0, 0);
    setCurrentDate(selected);
    setIsCalendarOpen(false);
  };

  const isToday = (day) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const isSelectedDay = (day) => {
    return currentDate.getFullYear() === year && currentDate.getMonth() === month && currentDate.getDate() === day;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
      
      {/* Date Display Pill (Clickable to open custom dark calendar) */}
      <button
        onClick={() => {
          if (!isCalendarOpen) {
            setViewDate(new Date(currentDate));
          }
          setIsCalendarOpen(!isCalendarOpen);
        }}
        className="glass-button date-display-btn"
        style={{
          background: isCalendarOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
          border: isCalendarOpen ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '0.35rem 0.9rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          minHeight: '34px'
        }}
        title="Click to open calendar (or press T for Today)"
        aria-label="Current Date. Click to open calendar."
        aria-expanded={isCalendarOpen}
      >
        <CalendarIcon size={14} color="var(--accent-light)" />
        <span className="font-serif date-text-desktop" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
          {formatDateDesktop(currentDate)}
        </span>
        <span className="font-serif date-text-mobile" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
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
            width: '310px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Header: Month/Year Navigator & Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button
                onClick={handlePrevMonth}
                className="ghost-control-btn"
                style={{ minWidth: '28px', minHeight: '28px', padding: 0 }}
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: '130px', textAlign: 'center' }}>
                {monthNames[month]} {year}
              </span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {/* Leading days from previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`prev-${i}`}
                style={{
                  height: '34px',
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

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '34px',
                    width: '34px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: selected ? 700 : today ? 600 : 400,
                    color: selected ? '#ffffff' : today ? 'var(--accent-light)' : 'var(--text-primary)',
                    background: selected ? 'var(--accent-primary)' : 'transparent',
                    border: today && !selected ? '1px solid var(--accent-light)' : 'none',
                    borderRadius: '50%',
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
                  {day}
                </button>
              );
            })}
          </div>

          {/* Bottom Action: Jump to Today */}
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
            <button
              className="glass-button"
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setViewDate(now);
                setIsCalendarOpen(false);
              }}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                minHeight: '32px',
                borderRadius: '12px'
              }}
            >
              Jump to Today
            </button>
          </div>
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
          onClick={() => setCurrentDate(new Date())}
          aria-label="Reset to Today"
          style={{
            padding: '0.25rem 0.75rem',
            minHeight: '28px',
            borderRadius: '14px',
            fontSize: '0.75rem',
            fontWeight: 600
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
