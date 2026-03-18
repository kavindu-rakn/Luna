import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const DateControls = ({ currentDate, setCurrentDate }) => {
  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };
  
  const resetToToday = () => {
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
        <button className="glass-button" onClick={() => changeDate(-7)}>
          <ChevronLeft size={18} /> -1 Week
        </button>
        <button className="glass-button" onClick={() => changeDate(-1)}>
          <ChevronLeft size={18} /> -1 Day
        </button>
        <button className="glass-button" onClick={() => setCurrentDate(new Date())} style={{ borderColor: 'var(--color-accent)'}}>
          <RefreshCw size={18} /> Today
        </button>
        <button className="glass-button" onClick={() => changeDate(1)}>
          +1 Day <ChevronRight size={18} />
        </button>
        <button className="glass-button" onClick={() => changeDate(7)}>
          +1 Week <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default DateControls;
