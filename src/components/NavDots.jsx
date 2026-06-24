import React, { useState, useEffect } from 'react';

const sections = [
  { id: 'hero', label: 'Luna' },
  { id: 'data', label: 'Data' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'orbital', label: 'Orbit' },
];

const NavDots = () => {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav style={{
      position: 'fixed',
      right: '1.5rem',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      alignItems: 'flex-end'
    }}>
      {sections.map(({ id, label }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            title={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Label (visible only on active) */}
            <span style={{
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: isActive ? 'var(--color-accent)' : 'transparent',
              transition: 'color 0.3s ease, transform 0.3s ease',
              transform: isActive ? 'translateX(0)' : 'translateX(5px)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}>
              {label}
            </span>

            {/* Dot */}
            <div style={{
              width: isActive ? '10px' : '6px',
              height: isActive ? '10px' : '6px',
              borderRadius: '50%',
              background: isActive ? 'var(--color-accent)' : 'rgba(255,255,255,0.25)',
              boxShadow: isActive ? '0 0 10px var(--color-accent-glow)' : 'none',
              transition: 'all 0.3s ease',
              flexShrink: 0
            }} />
          </button>
        );
      })}
    </nav>
  );
};

export default NavDots;
