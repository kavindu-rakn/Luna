import React, { useState, useEffect, useRef } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import { getLunarDetails } from './utils/lunarCalc';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lunarDetails, setLunarDetails] = useState(getLunarDetails(currentDate));
  
  const containerRef = useRef();

  useEffect(() => {
    setLunarDetails(getLunarDetails(currentDate));
  }, [currentDate]);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Initial state setup to avoid flash of unstyled content
    gsap.set('.gsap-reveal', { autoAlpha: 0, y: 30 });
    
    // Staggered entrance choreography
    tl.to('.hero-title', { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' })
      .to('.hero-subtitle', { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.9')
      .to('.moon-container', { autoAlpha: 1, y: 0, duration: 1.5, ease: 'power2.out' }, '-=0.6')
      .to('.data-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=1')
      .to('.timeline-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.controls-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.footer-text', { autoAlpha: 1, y: 0, duration: 1 }, '-=0.8');
      
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Starfield />
      <div className="nebula"></div>
      
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 className="text-gradient gsap-reveal hero-title" style={{ fontSize: '3.5rem', marginBottom: '0.5rem', marginTop: '2rem' }}>Luna</h1>
        <p className="gsap-reveal hero-subtitle" style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem', fontWeight: 300 }}>
          Interactive Lunar Cycle Explorer
        </p>
      </div>

      <div className="gsap-reveal moon-container" style={{ width: '100%' }}>
        <MoonVisualization lunarDetails={lunarDetails} />
      </div>
      
      <div className="gsap-reveal data-panel" style={{ width: '100%', marginBottom: '2rem' }}>
        <LunarData lunarDetails={lunarDetails} />
      </div>
      
      <div className="gsap-reveal timeline-panel" style={{ width: '100%', marginBottom: '2rem' }}>
        <LunarTimeline currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>

      <div className="gsap-reveal controls-panel" style={{ width: '100%' }}>
        <DateControls currentDate={currentDate} setCurrentDate={setCurrentDate} />
      </div>
      
      <footer className="gsap-reveal footer-text" style={{ marginTop: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
        Data calculated astronomically. Moon texture represented stylistically.
      </footer>
    </div>
  );
}

export default App;
