import React, { useState, useEffect, useRef, useMemo } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SkyPosition from './components/SkyPosition';
import OrbitalView from './components/OrbitalView';
import LoadingScreen from './components/LoadingScreen';
import LocationPicker from './components/LocationPicker';
import { getLunarDetails, getSkyData, getAdjacentQuarterPhase } from './utils/lunarCalc';
import { DEFAULT_LOCATION, loadStoredLocation, storeLocation } from './utils/location';
import { X, BarChart3 } from 'lucide-react';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Restore whatever was chosen last. Geolocation is no longer requested at first
  // paint: that put a permission prompt in front of someone who had not yet seen
  // what the app was, and a denial dropped them silently onto Greenwich. It is now
  // asked for only when they press "Use my location" in the picker.
  const [location, setLocation] = useState(() => loadStoredLocation() || DEFAULT_LOCATION);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const containerRef = useRef();
  const mainViewRef = useRef();
  const drawerRef = useRef();

  useEffect(() => {
    storeLocation(location);
  }, [location]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Never hijack a keystroke aimed at a text field, or at a control that
      // already handles arrow keys itself. The timeline slider does, so each
      // press used to move the date twice.
      if (e.target instanceof Element &&
        e.target.closest('input, select, textarea, [contenteditable="true"], [role="slider"]')) {
        return;
      }

      // Leave browser and OS chords alone: Ctrl/Cmd+T, Ctrl/Cmd+D, Alt+Arrow.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Escape') {
        // Dismiss the innermost surface first, then the drawer behind it.
        if (isCalendarOpen) setIsCalendarOpen(false);
        else if (isLocationOpen) setIsLocationOpen(false);
        else setIsDrawerOpen(false);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentDate(d => e.shiftKey
          ? getAdjacentQuarterPhase(d, -1)
          : new Date(d.getTime() - 24 * 60 * 60 * 1000));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentDate(d => e.shiftKey
          ? getAdjacentQuarterPhase(d, 1)
          : new Date(d.getTime() + 24 * 60 * 60 * 1000));
      } else if (e.key.toLowerCase() === 't') {
        setCurrentDate(new Date());
      } else if (e.key.toLowerCase() === 'd') {
        setIsDrawerOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalendarOpen, isLocationOpen]);

  // Derive lunar details and 24-hour sky transit data
  const lunarDetails = useMemo(() => getLunarDetails(currentDate, location?.lat, location?.lon, location?.timeZone), [currentDate, location]);
  const computedSkyData = useMemo(() => {
    if (location) return getSkyData(currentDate, location.lat, location.lon, location.timeZone);
    return null;
  }, [currentDate, location]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite">
        Current Moon Phase: {lunarDetails.name}, Illumination: {lunarDetails.fraction} percent
      </div>

      {/* Background Starfield Canvas with Mouse Parallax */}
      <Starfield />

      {/* Atmospheric Space Gradients */}
      <div className="nebula" />
      <div className="vignette" />

      {/* Cinematic Asset Loading Screen */}
      <LoadingScreen />

      {/* Custom Particle Comet Cursor */}
      <CustomCursor />

      {/* ═══ MAIN APPLICATION VIEWPORT ═══ */}
      <main
        ref={mainViewRef}
        className={`main-view-container ${isDrawerOpen ? 'drawer-open' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Header Bar */}
        <header className="app-header">
          {/* Left: Brand / Title */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 className="text-gradient hero-title" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', margin: 0, lineHeight: 1 }}>
              Luna
            </h1>
          </div>

          {/* Center: DateControls */}
          <div className="controls-panel">
            <DateControls
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isCalendarOpen={isCalendarOpen}
              setIsCalendarOpen={setIsCalendarOpen}
            />
          </div>

          {/* Right: Location & Deep Dive */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
            <LocationPicker
              location={location}
              setLocation={setLocation}
              isOpen={isLocationOpen}
              setIsOpen={setIsLocationOpen}
            />
            <button
              className="glass-button"
              onClick={() => setIsDrawerOpen(prev => !prev)}
              style={{
                padding: '0.35rem 1.05rem',
                minHeight: '32px',
                borderRadius: '16px',
                background: isDrawerOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
                border: isDrawerOpen ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
                boxShadow: isDrawerOpen ? '0 0 16px var(--accent-glow)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Toggle telemetry details"
              aria-expanded={isDrawerOpen}
            >
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                  lineHeight: 1
                }}
              >
                Deep Dive
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
