import React, { useState } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

const DateControls = ({ currentDate, setCurrentDate }) => {
  const [hoveredBtn, setHoveredBtn] = useState('');

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', position: 'relative' }}>
      
      {/* Centralized Tooltip */}
      <div style={{
        position: 'absolute',
        top: '-1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        height: '1rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none'
      }}>
        <span style={{
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)',
          opacity: hoveredBtn ? 1 : 0,
          transition: 'opacity 0.2s ease',
          whiteSpace: 'nowrap'
        }}>
          {hoveredBtn || ' '}
        </span>
      </div>

      {/* Left Controls */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Last Week')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeDate(-7)}
          aria-label="Last Week"
        >
          <ChevronsLeft size={20} strokeWidth={1.5} />
        </button>

        <button 
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Yesterday')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeDate(-1)}
          aria-label="Yesterday"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Center: Date & Today Dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '220px' }}>
        <h2 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 400, margin: 0, color: 'var(--color-text-primary)', letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1 }}>
          {formatDate(currentDate)}
        </h2>
        <button 
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Today')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => setCurrentDate(new Date())}
          aria-label="Today"
          style={{ padding: '0.25rem' }} 
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.6 }}>
            <circle cx="3" cy="3" r="3" />
          </svg>
        </button>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Tomorrow')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeDate(1)}
          aria-label="Tomorrow"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>

        <button 
          className="ghost-control-btn"
          onMouseEnter={() => setHoveredBtn('Next Week')}
          onMouseLeave={() => setHoveredBtn('')}
          onClick={() => changeDate(7)}
          aria-label="Next Week"
        >
          <ChevronsRight size={20} strokeWidth={1.5} />
        </button>
      </div>

    </div>
  );
};

export default DateControls;

