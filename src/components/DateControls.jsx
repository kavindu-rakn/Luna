import React, { useRef, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import gsap from 'gsap';

// Standard button with ripple effect
const RippleButton = ({ children, onClick, style = {} }) => {
  const btnRef = useRef(null);

  const handleClick = useCallback((e) => {
    // Create ripple element
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    if (onClick) onClick(e);
  }, [onClick]);

  return (
    <button
      ref={btnRef}
      className="glass-button"
      onClick={handleClick}
      style={style}
    >
      {children}
    </button>
  );
};

const DateControls = ({ currentDate, setCurrentDate }) => {
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
    <div className="glass-panel" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <CalendarDays size={20} style={{ color: 'var(--color-accent)' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{formatDate(currentDate)}</h2>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
        <RippleButton onClick={() => changeDate(-7)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <ChevronLeft size={18} /> -1 Week
        </RippleButton>
        <RippleButton onClick={() => changeDate(-1)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <ChevronLeft size={16} /> -1 Day
        </RippleButton>
        <RippleButton onClick={() => setCurrentDate(new Date())} style={{ borderColor: 'var(--color-accent)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <RefreshCw size={16} /> Today
        </RippleButton>
        <RippleButton onClick={() => changeDate(1)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          +1 Day <ChevronRight size={16} />
        </RippleButton>
        <RippleButton onClick={() => changeDate(7)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          +1 Week <ChevronRight size={16} />
        </RippleButton>
      </div>
    </div>
  );
};

export default DateControls;

