import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import Starfield from './components/Starfield';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SkyPosition from './components/SkyPosition';
import LoadingScreen from './components/LoadingScreen';
import SceneBoundary from './components/SceneBoundary';
import MoonIcon from './components/MoonIcon';

// Three.js, fiber and drei are 60% of the bundle and nothing but these two scenes
// needs them. Loading them on demand lets the header, date, phase name and
// timeline paint after roughly half the JavaScript.
const MoonVisualization = lazy(() => import('./components/MoonVisualization'));
const OrbitalView = lazy(() => import('./components/OrbitalView'));

// Shown while the 3D Moon loads, and in its place if WebGL is unavailable: a flat
// Moon drawn at the right phase, so the view is never simply empty.
const MoonFallback = ({ phase }) => (
  <div className="moon-viz-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 'min(38vh, 320px)', aspectRatio: '1' }}>
      <MoonIcon phase={phase} size={200} style={{ width: '100%', height: '100%' }} />
    </div>
  </div>
);
import LocationPicker from './components/LocationPicker';
import ShareButton from './components/ShareButton';
import UpdatePrompt from './components/UpdatePrompt';
import DisplayPreferences from './components/DisplayPreferences';
import { usePreferences } from './hooks/usePreferences';
import { getLunarDetails, getSkyData, getAdjacentQuarterPhase } from './utils/lunarCalc';
import { DEFAULT_LOCATION, loadStoredLocation, storeLocation, resolveTimeZone } from './utils/location';
import { readSharedState, buildSharedSearch } from './utils/shareUrl';
import { X, BarChart3 } from 'lucide-react';

function App() {
  // Read once. A link someone sent opens exactly the view they were looking at.
  const [shared] = useState(() => readSharedState());

  const [currentDate, setCurrentDate] = useState(() => shared.date || new Date());

  // Live means following the real clock. Once the viewer steps, scrubs or jumps,
  // the view is pinned to that instant, and only then does the date go in the URL.
  const [isLive, setIsLive] = useState(() => !shared.date);

  // A link's location wins, then whatever was chosen last, then Greenwich.
  // Geolocation is not requested at first paint: it is asked for only when the
  // viewer presses "Use my location" in the picker.
  const [location, setLocation] = useState(() => {
    if (shared.location) {
      // Provisional zone until it is resolved from the coordinates below. Links the
      // app writes always carry a valid tz; this only covers hand-edited ones.
      return { ...shared.location, timeZone: shared.location.timeZone || 'UTC' };
    }
    return loadStoredLocation() || DEFAULT_LOCATION;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // 12- or 24-hour clock, km or miles. How this viewer reads, not what they are
  // looking at, so these stay on the device and out of the URL.
  const [preferences, setPreference] = usePreferences();
  const { clock, distanceUnit } = preferences;

  // shell -> scene -> ready, or failed. Drives the loading screen from what has
  // actually arrived rather than from a texture byte counter.
  const [loadStage, setLoadStage] = useState('shell');
  const markScene = useCallback(() => setLoadStage((s) => (s === 'shell' ? 'scene' : s)), []);
  const markReady = useCallback(() => setLoadStage('ready'), []);
  const markFailed = useCallback(() => setLoadStage((s) => (s === 'ready' ? s : 'failed')), []);

  // The orbit diagram loads the first time the drawer opens and stays mounted
  // after, so closing the drawer does not make its contents jump mid-slide.
  const [hasOpenedDrawer, setHasOpenedDrawer] = useState(false);
  if (isDrawerOpen && !hasOpenedDrawer) setHasOpenedDrawer(true);

  const containerRef = useRef();
  const mainViewRef = useRef();
  const drawerRef = useRef();
  const drawerHeadingRef = useRef(null);
  const drawerOpenerRef = useRef(null);
  const wasDrawerOpen = useRef(false);

  // Move focus into the drawer when it opens and hand it back when it closes.
  // Opening by keyboard used to leave focus on the button, so the panel appeared
  // with no way to reach it short of tabbing through the rest of the page.
  useEffect(() => {
    if (isDrawerOpen && !wasDrawerOpen.current) {
      wasDrawerOpen.current = true;
      drawerOpenerRef.current = document.activeElement;
      drawerHeadingRef.current?.focus({ preventScroll: true });
    } else if (!isDrawerOpen && wasDrawerOpen.current) {
      wasDrawerOpen.current = false;
      // Only reclaim focus if it was inside the drawer, or has fallen to <body>
      // because the element holding it just became hidden
      const active = document.activeElement;
      if (!active || active === document.body || drawerRef.current?.contains(active)) {
        drawerOpenerRef.current?.focus?.({ preventScroll: true });
      }
    }
  }, [isDrawerOpen]);

  // Only places the viewer picks are remembered. A place that arrived in someone
  // else's link is shown but not persisted, so opening a friend's link does not
  // quietly replace your own default.
  const chooseLocation = useCallback((next) => {
    setLocation(next);
    storeLocation(next);
  }, []);

  // Resolve the zone for a shared location that arrived without a usable one
  useEffect(() => {
    if (!shared.location || shared.location.timeZone) return undefined;
    let cancelled = false;
    resolveTimeZone(shared.location.lat, shared.location.lon).then((timeZone) => {
      if (cancelled) return;
      // Leave it alone if the viewer has already moved somewhere else
      setLocation((current) =>
        current.lat === shared.location.lat && current.lon === shared.location.lon
          ? { ...current, timeZone }
          : current
      );
    });
    return () => { cancelled = true; };
  }, [shared]);

  const selectDate = useCallback((next) => {
    setIsLive(false);
    setCurrentDate(next);
  }, []);

  const goLive = useCallback(() => {
    setIsLive(true);
    setCurrentDate(new Date());
  }, []);

  // Keep the address bar describing the view, so copying it shares what you see.
  // replaceState rather than pushState: a drag would otherwise bury the back button
  // under hundreds of entries. Debounced, because Safari throws once a page calls
  // it more than a hundred times in thirty seconds.
  useEffect(() => {
    const timer = setTimeout(() => {
      const search = buildSharedSearch(isLive ? null : currentDate, location);
      const { pathname, hash } = window.location;
      const next = `${pathname}${search}${hash}`;
      if (next === `${pathname}${window.location.search}${hash}`) return;
      try {
        window.history.replaceState(window.history.state, '', next);
      } catch {
        // Rate-limited; the next change will write it
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [currentDate, location, isLive]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape comes first, wherever focus is. The search box and the calendar
      // grid both hold focus while their popups are open, and are exactly where
      // someone reaches for Escape; behind the exemption below it did nothing.
      if (e.key === 'Escape') {
        // Dismiss the innermost surface first, then the drawer behind it.
        if (isCalendarOpen) setIsCalendarOpen(false);
        else if (isLocationOpen) setIsLocationOpen(false);
        else setIsDrawerOpen(false);
        return;
      }

      // Never hijack a keystroke aimed at a text field, or at a control that
      // already handles arrow keys itself. The timeline slider does, so each
      // press used to move the date twice.
      if (e.target instanceof Element &&
        e.target.closest('input, select, textarea, [contenteditable="true"], [role="slider"], [data-date-grid]')) {
        return;
      }

      // Leave browser and OS chords alone: Ctrl/Cmd+T, Ctrl/Cmd+D, Alt+Arrow.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectDate(d => e.shiftKey
          ? getAdjacentQuarterPhase(d, -1)
          : new Date(d.getTime() - 24 * 60 * 60 * 1000));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectDate(d => e.shiftKey
          ? getAdjacentQuarterPhase(d, 1)
          : new Date(d.getTime() + 24 * 60 * 60 * 1000));
      } else if (e.key.toLowerCase() === 't') {
        goLive();
      } else if (e.key.toLowerCase() === 'd') {
        setIsDrawerOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalendarOpen, isLocationOpen, selectDate, goLive]);

  // Derive lunar details and 24-hour sky transit data
  const lunarDetails = useMemo(() => getLunarDetails(currentDate, location?.lat, location?.lon, location?.timeZone, clock), [currentDate, location, clock]);
  const computedSkyData = useMemo(() => {
    if (location) return getSkyData(currentDate, location.lat, location.lon, location.timeZone, clock);
    return null;
  }, [currentDate, location, clock]);

  // What a screen reader hears when the view changes. It names the date and place,
  // which the old announcement left out, and waits for the view to settle: a drag
  // across the timeline would otherwise queue an announcement for every step.
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      let when;
      try {
        when = new Intl.DateTimeFormat('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: location.timeZone
        }).format(currentDate);
      } catch {
        when = currentDate.toDateString();
      }
      setAnnouncement(`${when}, ${location.name}: ${lunarDetails.name}, ${lunarDetails.fraction} percent illuminated.`);
    }, 700);
    return () => clearTimeout(timer);
  }, [currentDate, location, lunarDetails]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Background Starfield Canvas with Mouse Parallax */}
      <Starfield />

      {/* Atmospheric Space Gradients */}
      <div className="nebula" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      {/* Cinematic Asset Loading Screen */}
      <LoadingScreen stage={loadStage} />

      {/* Offline readiness and update notices from the service worker */}
      <UpdatePrompt />

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
              setCurrentDate={selectDate}
              onToday={goLive}
              isCalendarOpen={isCalendarOpen}
              setIsCalendarOpen={setIsCalendarOpen}
              timeZone={location.timeZone}
            />
          </div>

          {/* Right: Location & Deep Dive */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
            <LocationPicker
              location={location}
              setLocation={chooseLocation}
              isOpen={isLocationOpen}
              setIsOpen={setIsLocationOpen}
            />
            <ShareButton date={currentDate} location={location} />
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
              aria-controls="telemetry-drawer"
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
          {/* One accessible name for whichever Moon is showing, 3D or the 2D stand-in.
              Dragging to rotate is exploration, not information: the phase and
              illumination it shows are all available as text. */}
          <div
            className="moon-container"
            role="img"
            aria-label={`The Moon: ${lunarDetails.name}, ${lunarDetails.fraction} percent illuminated`}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <SceneBoundary name="Moon scene" onError={markFailed} fallback={<MoonFallback phase={lunarDetails.phase} />}>
              <Suspense fallback={<MoonFallback phase={lunarDetails.phase} />}>
                <MoonVisualization lunarDetails={lunarDetails} onScene={markScene} onReady={markReady} />
              </Suspense>
            </SceneBoundary>
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
            <LunarTimeline currentDate={currentDate} setCurrentDate={selectDate} timeZone={location.timeZone} />
          </div>
        </div>
      </main>

      {/* ═══ TELEMETRY DATA DRAWER / BOTTOM SHEET ═══ */}
      <aside
        ref={drawerRef}
        id="telemetry-drawer"
        className={`data-drawer ${isDrawerOpen ? 'is-open' : ''}`}
        aria-labelledby="telemetry-heading"
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="var(--accent-light)" />
            <h2
              id="telemetry-heading"
              ref={drawerHeadingRef}
              tabIndex={-1}
              className="utility-label"
              style={{ color: 'var(--text-accent)', fontSize: '0.8rem', margin: 0, outline: 'none' }}
            >
              Astronomical Telemetry
            </h2>
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

        {/* Every time and distance on this panel follows these */}
        <DisplayPreferences preferences={preferences} setPreference={setPreference} />

        {/* Telemetry Cards Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <LunarData lunarDetails={lunarDetails} distanceUnit={distanceUnit} />

          {computedSkyData && (
            <SkyPosition skyData={computedSkyData} locationName={location?.name} />
          )}

          {hasOpenedDrawer && (
            <SceneBoundary name="Orbital diagram">
              <Suspense fallback={null}>
                <OrbitalView lunarDetails={lunarDetails} active={isDrawerOpen} distanceUnit={distanceUnit} />
              </Suspense>
            </SceneBoundary>
          )}

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
