import React, { useRef, useEffect } from 'react';
import { Info, Moon, Orbit } from 'lucide-react';
import gsap from 'gsap';

// A specialized component that smoothly animates number changes
const AnimatedNumber = ({ value, isPercent = false }) => {
  const numRef = useRef();
  const valRef = useRef({ val: 0 }); // hold the animating value

  useEffect(() => {
    const targetValue = parseFloat(value);
    
    gsap.to(valRef.current, {
      val: targetValue,
      duration: 1,
      ease: 'power3.out',
      onUpdate: function() {
        if (numRef.current) {
          numRef.current.innerText = valRef.current.val.toFixed(1) + (isPercent ? '%' : '');
        }
      }
    });
  }, [value, isPercent]);

  return <span ref={numRef}>0.0{isPercent ? '%' : ''}</span>;
};

const LunarData = ({ lunarDetails }) => {
  const { name, fraction, age } = lunarDetails;
  
  // Create a ref for phase name to fade out/in on change
  const nameRef = useRef();
  
  useEffect(() => {
    // Simple fade effect when phase name changes
    gsap.fromTo(nameRef.current, 
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, [name]);

  return (
    <div className="glass-panel" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <Moon size={18} />
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phase Name</span>
        </div>
        <div ref={nameRef} style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          {name}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <Info size={18} />
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Illumination</span>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          <AnimatedNumber value={fraction} isPercent={true} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)' }}>
          <Orbit size={18} />
          <span style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moon Age</span>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
          <AnimatedNumber value={age} /> <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>Days</span>
        </div>
      </div>
    </div>
  );
};

export default LunarData;
