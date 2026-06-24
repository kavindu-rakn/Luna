import React, { useState, useEffect, useRef, useMemo } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SkyPosition from './components/SkyPosition';
import { getLunarDetails, getSkyData } from './utils/lunarCalc';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Default location: Greenwich Observatory
  const DEFAULT_LOCATION = { lat: 51.4769, lon: -0.0005, name: 'Greenwich, UK (default)' };
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  
  const containerRef = useRef();

  // Request geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: null // will be reverse-geocoded below
          });
        },
        () => {
          // Permission denied: keep the default
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Reverse geocode the location name (lightweight, no API key needed)
  useEffect(() => {
    if (location && location.name === null) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lon}&format=json&zoom=10`)
        .then(res => res.json())
        .then(data => {
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const country = data.address?.country || '';
          setLocation(prev => ({ ...prev, name: city ? `${city}, ${country}` : country }));
        })
        .catch(() => {
          setLocation(prev => ({ ...prev, name: `${prev.lat.toFixed(2)}°, ${prev.lon.toFixed(2)}°` }));
        });
    }
  }, [location]);

  // Derive lunar details and sky data from current state (no setState-in-effect)
  const lunarDetails = useMemo(() => getLunarDetails(currentDate), [currentDate]);
  const computedSkyData = useMemo(() => {
    if (location) return getSkyData(currentDate, location.lat, location.lon);
    return null;
  }, [currentDate, location]);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Initial state setup to avoid flash of unstyled content
    gsap.set('.gsap-reveal', { autoAlpha: 0, y: 30 });
    
    // Staggered entrance choreography
    tl.to('.hero-title', { autoAlpha: 1, y: 0, duration: 1.2, ease: 'power3.out' })
      .to('.hero-subtitle', { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.9')
      .to('.moon-container', { autoAlpha: 1, y: 0, duration: 1.5, ease: 'power2.out' }, '-=0.6')
      .to('.data-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=1')
      .to('.sky-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.timeline-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.controls-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.footer-text', { autoAlpha: 1, y: 0, duration: 1 }, '-=0.8');
      
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <CustomCursor />
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

      {computedSkyData && (
        <div className="gsap-reveal sky-panel" style={{ width: '100%', marginBottom: '2rem' }}>
          <SkyPosition skyData={computedSkyData} locationName={location?.name} />
        </div>
      )}
      
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

