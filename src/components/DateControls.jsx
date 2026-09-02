import React, { useState, useRef, useEffect } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Calendar as CalendarIcon, X, Sparkles } from 'lucide-react';
import { getNextMajorPhases } from '../utils/lunarCalc';

const DateControls = ({ currentDate, setCurrentDate }) => {
  const [hoveredBtn, setHoveredBtn] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarModalRef = useRef(null);

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const changeMonth = (months) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + months);
    setCurrentDate(newDate);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalendarOpen]);

  const nextPhases = getNextMajorPhases(new Date());

  const handleDateInput = (e) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      const newD = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(newD.getTime())) {
        setCurrentDate(newD);
        setIsCalendarOpen(false);
      }
    }
  };

  const toInputFormat = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
      
      {/* Date Display (Clickable for Calendar Dropdown) */}
      <button
        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
        className="glass-button"
        style={{
          background: isCalendarOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
          border: isCalendarOpen ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '0.4rem 1rem',
          cursor: 'pointer'
        }}
        title="Click to jump to a specific date"
        aria-label={`Current Date: ${formatDate(currentDate)}. Click to open calendar.`}
        aria-expanded={isCalendarOpen}
      >
        <CalendarIcon size={15} color="var(--accent-light)" />
        <span className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
          {formatDate(currentDate)}
        </span>
      </button>

      {/* Calendar Quick-Jump Popover */}
      {isCalendarOpen && (
        <div
          ref={calendarModalRef}
          style={{
            position: 'absolute',
            top: '3.25rem',
            background: 'var(--bg-surface-elevated)',
            backdropFilter: 'blur(30px)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            padding: '1.25rem',
            width: '320px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="utility-label" style={{ color: 'var(--text-accent)' }}>Select Date</span>
            <button
              onClick={() => setIsCalendarOpen(false)}
              className="ghost-control-btn"
              style={{ minWidth: '28px', minHeight: '28px', padding: 0 }}
              aria-label="Close calendar"
            >
              <X size={15} />
            </button>
          </div>

          {/* Native HTML5 Date Picker */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="date"
              value={toInputFormat(currentDate)}
              onChange={handleDateInput}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(5, 7, 15, 0.8)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Astronomical Presets */}
          <div className="utility-label" style={{ marginBottom: '0.5rem', opacity: 0.8 }}>Quick Astronomical Jumps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              className="glass-button"
              onClick={() => { setCurrentDate(new Date()); setIsCalendarOpen(false); }}
              style={{ padding: '0.4rem 0.75rem', justifyContent: 'space-between', fontSize: '0.8rem', minHeight: '34px' }}
            >
              <span>Today (Realtime)</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Now</span>
            </button>

            {nextPhases?.nextFullMoon && (
              <button
                className="glass-button"
                onClick={() => { setCurrentDate(nextPhases.nextFullMoon.date); setIsCalendarOpen(false); }}
                style={{ padding: '0.4rem 0.75rem', justifyContent: 'space-between', fontSize: '0.8rem', minHeight: '34px' }}
              >
                <span>🌕 Next Full Moon</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-accent)' }}>{nextPhases.nextFullMoon.formatted}</span>
              </button>
            )}

            {nextPhases?.nextNewMoon && (
              <button
                className="glass-button"
                onClick={() => { setCurrentDate(nextPhases.nextNewMoon.date); setIsCalendarOpen(false); }}
                style={{ padding: '0.4rem 0.75rem', justifyContent: 'space-between', fontSize: '0.8rem', minHeight: '34px' }}
              >
                <span>🌑 Next New Moon</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-accent)' }}>{nextPhases.nextNewMoon.formatted}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Control Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
        
        {/* Helper Tooltip */}
        <div
          style={{
            position: 'absolute',
            top: '-1.4rem',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-accent)',
              opacity: hoveredBtn ? 1 : 0,
              transition: 'opacity 0.2s ease'
            }}
          >
            {hoveredBtn || ' '}
          </span>
        </div>

        {/* -1 Month */}
        <button
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Previous Month (Shift+←)')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeMonth(-1)}
          aria-label="Previous Month"
        >
          <ChevronsLeft size={18} />
        </button>

        {/* -1 Day */}
        <button
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Yesterday (←)')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeDate(-1)}
          aria-label="Yesterday"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Today Pill */}
        <button
          className="glass-button"
          onMouseEnter={() => setHoveredBtn('Reset to Today (T)')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => setCurrentDate(new Date())}
          aria-label="Jump to Current Date (Today)"
          style={{
            padding: '0.35rem 0.85rem',
            minHeight: '32px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          Today
        </button>

        {/* +1 Day */}
        <button
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Tomorrow (→)')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeDate(1)}
          aria-label="Tomorrow"
        >
          <ChevronRight size={18} />
        </button>

        {/* +1 Month */}
        <button
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Next Month (Shift+→)')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeMonth(1)}
          aria-label="Next Month"
        >
          <ChevronsRight size={18} />
        </button>

      </div>
    </div>
  );
};

export default DateControls;
