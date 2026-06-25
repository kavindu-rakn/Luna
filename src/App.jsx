import React, { useState, useEffect, useRef, useMemo } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SkyPosition from './components/SkyPosition';
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const containerRef = useRef();
  const mainViewRef = useRef();
  const drawerRef = useRef();

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

  // Reverse geocode the location name
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

  // Derive lunar details and sky data
  const lunarDetails = useMemo(() => getLunarDetails(currentDate), [currentDate]);
  const computedSkyData = useMemo(() => {
    if (location) return getSkyData(currentDate, location.lat, location.lon);
    return null;
  }, [currentDate, location]);

  // Initial Entrance Animation
  useGSAP(() => {
    const tl = gsap.timeline();
    gsap.set('.gsap-reveal', { autoAlpha: 0, y: 40 });
    
    tl.to('.hero-title', { autoAlpha: 1, y: 0, duration: 1.8, ease: 'expo.out' })
      .to('.moon-container', { autoAlpha: 1, y: 0, duration: 2, ease: 'power2.out' }, '-=1.4')
      .to('.hero-phase-name', { autoAlpha: 1, y: 0, duration: 1.5, ease: 'expo.out' }, '-=1.5')
      .to('.timeline-panel', { autoAlpha: 1, y: 0, duration: 1.5, ease: 'expo.out' }, '-=1.2')
      .to('.controls-panel', { autoAlpha: 1, y: 0, duration: 1.5, ease: 'expo.out' }, '-=1.3')
      .to('.toggle-btn', { autoAlpha: 1, y: 0, duration: 1.5, ease: 'expo.out' }, '-=1.2');
  }, { scope: containerRef });

  // Drawer Toggle Animation
  useGSAP(() => {
    const isDesktop = window.innerWidth >= 900;
    
    if (isDrawerOpen) {
      // Open Drawer
      gsap.to(drawerRef.current, {
        x: 0,
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: 'power3.out'
      });
      // Shift Main View
      gsap.to(mainViewRef.current, {
        x: isDesktop ? '-225px' : 0,
        y: isDesktop ? 0 : '-10vh',
        duration: 0.8,
        ease: 'power3.out'
      });
    } else {
      // Close Drawer
      gsap.to(drawerRef.current, {
        x: isDesktop ? '100%' : 0,
        y: isDesktop ? 0 : '100%',
        autoAlpha: 0,
        duration: 0.6,
        ease: 'power3.inOut'
      });
      // Reset Main View
      gsap.to(mainViewRef.current, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'power3.inOut'
      });
    }
  }, { dependencies: [isDrawerOpen], scope: containerRef });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CustomCursor />
      <Starfield />
      <div className="nebula"></div>
      <div className="noise"></div>

      {/* ═══ MAIN IMMERSIVE VIEW ═══ */}
      <div ref={mainViewRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Top Bar with Title and Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '2rem 3rem', zIndex: 20 }}>
          <div>
            <h1 className="text-gradient gsap-reveal hero-title" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: 0, lineHeight: 1 }}>Luna</h1>
          </div>
          <button 
            className="gsap-reveal toggle-btn glass-button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <span className="utility-label" style={{ margin: 0 }}>
              {isDrawerOpen ? 'Close Details' : 'Deep Dive'}
            </span>
          </button>
        </div>

        {/* Center: 3D Moon & Phase Name */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '-4rem' }}>
          <div className="gsap-reveal moon-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <MoonVisualization lunarDetails={lunarDetails} />
          </div>
          
          <div className="gsap-reveal hero-phase-name" style={{ textAlign: 'center', marginTop: '-1rem', zIndex: 10 }}>
            <span className="font-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--color-text-primary)', lineHeight: 1 }}>
              {lunarDetails.name}
            </span>
            <span className="utility-label" style={{ display: 'block', marginTop: '0.75rem', opacity: 0.7 }}>
              {lunarDetails.fraction}% illuminated
            </span>
          </div>
        </div>

        {/* Bottom: Timeline and Controls */}
        <div style={{ padding: '0 2rem 2rem 2rem', zIndex: 20 }}>
          <div className="gsap-reveal timeline-panel" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <LunarTimeline currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </div>
          <div className="gsap-reveal controls-panel" style={{ width: '100%', maxWidth: '800px', margin: '2rem auto 0 auto' }}>
            <DateControls currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </div>
        </div>
      </div>

      {/* ═══ DATA DRAWER ═══ */}
      <div ref={drawerRef} className="data-drawer" style={{ visibility: 'hidden' }}>
        {/* Drawer Close Button */}
        <button 
          onClick={() => setIsDrawerOpen(false)}
          className="glass-button drawer-close-btn"
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
          aria-label="Close details"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2.5rem' }}>
          <div>
            <LunarData lunarDetails={lunarDetails} />
          </div>
          
          {computedSkyData && (
            <div>
              <SkyPosition skyData={computedSkyData} locationName={location?.name} />
            </div>
          )}
          
          <div>
            <OrbitalView lunarDetails={lunarDetails} />
          </div>

          <footer style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
            Data calculated astronomically. Moon texture represented stylistically.
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;

