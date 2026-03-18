import React from 'react';
import { Info, Moon, Orbit } from 'lucide-react';

const LunarData = ({ lunarDetails }) => {
  const { name, fraction, phase, age } = lunarDetails;

  return (
    <div className="glass-panel" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <Moon size={18} />
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase Name</span>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          {name}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <Info size={18} />
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Illumination</span>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          {fraction}%
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <Orbit size={18} />
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moon Age</span>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          {age} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>Days</span>
        </div>
      </div>
    </div>
  );
};

export default LunarData;
