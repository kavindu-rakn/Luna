import React, { useRef, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import gsap from 'gsap';

// Magnetic button wrapper — subtly pulls toward the cursor on hover
const MagneticButton = ({ children, onClick, style = {} }) => {
  const btnRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  }, []);

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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
    <div className="glass-panel" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <CalendarDays size={24} style={{ color: 'var(--color-accent)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{formatDate(currentDate)}</h2>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
        <MagneticButton onClick={() => changeDate(-7)}>
          <ChevronLeft size={18} /> -1 Week
        </MagneticButton>
        <MagneticButton onClick={() => changeDate(-1)}>
          <ChevronLeft size={18} /> -1 Day
        </MagneticButton>
        <MagneticButton onClick={() => setCurrentDate(new Date())} style={{ borderColor: 'var(--color-accent)' }}>
          <RefreshCw size={18} /> Today
        </MagneticButton>
        <MagneticButton onClick={() => changeDate(1)}>
          +1 Day <ChevronRight size={18} />
        </MagneticButton>
        <MagneticButton onClick={() => changeDate(7)}>
          +1 Week <ChevronRight size={18} />
        </MagneticButton>
      </div>
    </div>
  );
};

export default DateControls;

