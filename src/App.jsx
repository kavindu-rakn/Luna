import React, { useState, useEffect, useRef, useMemo } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SkyPosition from './components/SkyPosition';
import NavDots from './components/NavDots';
import OrbitalView from './components/OrbitalView';
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

  // Derive lunar details and sky data from current state
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
      .to('.hero-phase-name', { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.8')
      .to('.scroll-hint', { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.6')
      .to('.data-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.4')
      .to('.sky-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.timeline-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.6')
      .to('.controls-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.8')
      .to('.orbital-panel', { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, '-=0.6')
      .to('.footer-text', { autoAlpha: 1, y: 0, duration: 1 }, '-=0.8');
      
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <CustomCursor />
      <Starfield />
      <NavDots />
      <div className="nebula"></div>

      {/* ═══ HERO SECTION ═══ */}
      <section id="hero" className="section section-hero">
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <h1 className="text-gradient gsap-reveal hero-title" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', marginBottom: '0.5rem' }}>Luna</h1>
          <p className="gsap-reveal hero-subtitle" style={{ color: 'var(--color-text-secondary)', fontSize: 'clamp(1rem, 2vw, 1.35rem)', fontWeight: 300 }}>
            Interactive Lunar Cycle Explorer
          </p>
        </div>

        <div className="gsap-reveal moon-container" style={{ width: '100%', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MoonVisualization lunarDetails={lunarDetails} />
        </div>

        {/* Phase name floating below the moon */}
        <div className="gsap-reveal hero-phase-name" style={{ textAlign: 'center', marginTop: '-1rem' }}>
          <span style={{
            fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '0.04em'
          }}>
            {lunarDetails.name}
          </span>
          <span style={{
            display: 'block',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            marginTop: '0.25rem'
          }}>
            {lunarDetails.fraction}% illuminated
          </span>
        </div>

        {/* Scroll indicator */}
        <div className="gsap-reveal scroll-hint" style={{
          position: 'absolute',
          bottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'scroll-bounce 2s ease-in-out infinite'
        }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-text-secondary)', opacity: 0.5 }}>
            Explore
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </section>

      {/* ═══ DATA SECTION ═══ */}
      <section id="data" className="section section-content">
        <div className="data-grid">
          <div className="gsap-reveal data-panel">
            <LunarData lunarDetails={lunarDetails} />
          </div>
          {computedSkyData && (
            <div className="gsap-reveal sky-panel">
              <SkyPosition skyData={computedSkyData} locationName={location?.name} />
            </div>
          )}
        </div>
      </section>

      {/* ═══ TIMELINE SECTION ═══ */}
      <section id="timeline" className="section section-content">
        <div className="gsap-reveal timeline-panel" style={{ width: '100%' }}>
          <LunarTimeline currentDate={currentDate} setCurrentDate={setCurrentDate} />
        </div>

        <div className="gsap-reveal controls-panel" style={{ width: '100%', marginTop: '2rem' }}>
          <DateControls currentDate={currentDate} setCurrentDate={setCurrentDate} />
        </div>
      </section>

      {/* ═══ ORBITAL SECTION ═══ */}
      <section id="orbital" className="section section-content">
        <div className="gsap-reveal orbital-panel" style={{ width: '100%' }}>
          <OrbitalView lunarDetails={lunarDetails} />
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="gsap-reveal footer-text" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
        Data calculated astronomically. Moon texture represented stylistically.
      </footer>
    </div>
  );
}

export default App;

