import React, { useState, useEffect, useRef, useMemo } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SkyPosition from './components/SkyPosition';
import OrbitalView from './components/OrbitalView';
import { getLunarDetails, getSkyData, reverseGeocodeCached } from './utils/lunarCalc';
import { Layers, X, BarChart3 } from 'lucide-react';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const DEFAULT_LOCATION = { lat: 51.4769, lon: -0.0005, name: 'Greenwich, UK' };
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const containerRef = useRef();
  const mainViewRef = useRef();
  const drawerRef = useRef();

  // Safe geolocation on mount with cached reverse geocoding
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const geoResult = await reverseGeocodeCached(lat, lon);
          setLocation(geoResult);
        },
        () => {
          // Default to Greenwich on permission denial
        },
        { timeout: 6000 }
      );
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keystrokes inside input fields
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        const step = e.shiftKey ? 30 : 1;
        setCurrentDate(d => new Date(d.getTime() - step * 24 * 60 * 60 * 1000));
      } else if (e.key === 'ArrowRight') {
        const step = e.shiftKey ? 30 : 1;
        setCurrentDate(d => new Date(d.getTime() + step * 24 * 60 * 60 * 1000));
      } else if (e.key.toLowerCase() === 't') {
        setCurrentDate(new Date());
      } else if (e.key.toLowerCase() === 'd') {
        setIsDrawerOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Derive lunar details and 24-hour sky transit data
  const lunarDetails = useMemo(() => getLunarDetails(currentDate, location?.lat, location?.lon), [currentDate, location]);
  const computedSkyData = useMemo(() => {
    if (location) return getSkyData(currentDate, location.lat, location.lon);
    return null;
  }, [currentDate, location]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Screen Reader Live Region */}
      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        Selected date: {currentDate.toDateString()}. Moon Phase: {lunarDetails.name}, {lunarDetails.fraction} percent illuminated.
      </div>

      <CustomCursor />
      <Starfield />
      <div className="nebula" />
      <div className="noise" />

      {/* ═══ MAIN IMMERSIVE VIEW ═══ */}
      <main
        ref={mainViewRef}
        className={`main-view-container ${isDrawerOpen ? 'drawer-open' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transformOrigin: 'center center'
        }}
      >
        {/* Top Header: Logo + Date Controls + Deep Dive Toggle */}
        <header className="app-header">
          {/* Left: Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 className="text-gradient hero-title" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', margin: 0, lineHeight: 1 }}>
              Luna
            </h1>
          </div>

          {/* Center: DateControls */}
          <div className="controls-panel">
            <DateControls currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </div>

          {/* Right: Deep Dive Action Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              className="toggle-btn glass-button"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              style={{
                background: isDrawerOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-2)',
                border: isDrawerOpen ? '1px solid var(--accent-light)' : '1px solid var(--border-medium)',
                boxShadow: '0 4px 16px var(--accent-glow)',
                zIndex: 40,
                cursor: 'pointer'
              }}
              aria-label={isDrawerOpen ? 'Close telemetry details' : 'Open telemetry details (D)'}
              aria-expanded={isDrawerOpen}
            >
              <Layers size={15} color="var(--accent-light)" />
              <span className="utility-label" style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                {isDrawerOpen ? 'Close Details' : 'Deep Dive (D)'}
              </span>
            </button>
          </div>
        </header>

        {/* Center Canvas Area: 3D Moon & Hero Phase Name */}
        <div className="main-canvas-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2.5rem' }}>
          <div className="moon-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <MoonVisualization lunarDetails={lunarDetails} />
          </div>

          <div className="hero-phase-name">
            <span className="font-serif">
              {lunarDetails.name}
            </span>
          </div>
        </div>

        {/* Bottom Bar: Timeline */}
        <div style={{ width: '100%', zIndex: 20 }}>
          <div className="timeline-panel" style={{ width: '100%' }}>
            <LunarTimeline currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </div>
        </div>
      </main>

      {/* ═══ TELEMETRY DATA DRAWER / BOTTOM SHEET ═══ */}
      <aside
        ref={drawerRef}
        className={`data-drawer ${isDrawerOpen ? 'is-open' : ''}`}
        aria-label="Lunar Telemetry Inspector"
      >
        {/* Mobile Drag Indicator Handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.25)',
            borderRadius: '2px',
            margin: '0 auto 1rem auto',
            display: 'block'
          }}
        />

        {/* Drawer Header & Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="var(--accent-light)" />
            <span className="utility-label" style={{ color: 'var(--text-accent)', fontSize: '0.8rem', margin: 0 }}>
              ASTRONOMICAL TELEMETRY
            </span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="ghost-control-btn"
            style={{
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-medium)',
              borderRadius: '50%',
              minWidth: '36px',
              minHeight: '36px',
              padding: 0
            }}
            aria-label="Close details (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Telemetry Cards Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <LunarData lunarDetails={lunarDetails} />

          {computedSkyData && (
            <SkyPosition skyData={computedSkyData} locationName={location?.name} />
          )}

          <OrbitalView lunarDetails={lunarDetails} />

          <footer
            style={{
              marginTop: '1.5rem',
              marginBottom: '1rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              lineHeight: 1.5
            }}
          >
            Astronomical calculations powered by SunCalc ephemeris algorithms.
          </footer>
        </div>
      </aside>
    </div>
  );
}

export default App;
