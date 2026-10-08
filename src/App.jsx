import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import DateControls from './components/DateControls';
import LunarTimeline from './components/LunarTimeline';
import CustomCursor from './components/CustomCursor';
import SceneBoundary from './components/SceneBoundary';
import MoonDisc from './components/MoonDisc';
import { hasWebGLApi } from './utils/webgl';
import { getMoonView } from './utils/moonView';
import { glowStyle } from './utils/moonPath';
import { useTilt } from './hooks/useTilt';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { installPressBloom } from './utils/pressBloom';

// The 3D Moon's component starts the scene; three.js itself loads inside the
// scene's worker (or on the main thread where workers can't draw WebGL). Even the
// component waits for first paint, so the entry stays within its budget.
const MoonScene = lazy(() => import('./components/MoonScene'));

// Without WebGL the sky is drawn once, flat, from the same catalogue
const SkyFallback = lazy(() => import('./components/SkyFallback'));

// Deep Dive's panels, and GSAP with them, are only needed once the drawer opens.
// They load after first paint and are mounted, hidden, once the page is idle, so
// the drawer still opens instantly.
const loadDeepDive = () => import('./components/DeepDiveContent');
const DeepDiveContent = lazy(loadDeepDive);

// A photographic flat Moon at the right phase. It is what the prerendered page shows
// first, it holds the stage while the 3D Moon loads, and it stays if WebGL is
// unavailable, so the view is never simply empty. The 3D Moon fades in over it.
// The glow off the lit limb, behind the flat Moon (see glowStyle). The 3D scene
// draws its own, in its sky, so this one fades out as the scene fades in.
const MoonGlow = ({ view, hidden }) => (
  <div className={`moon-glow${hidden ? ' is-hidden' : ''}`} aria-hidden="true" style={glowStyle(view)} />
);

const MoonFallback = ({ view, hidden }) => (
  <div className={`moon-viz-wrapper moon-viz-fallback${hidden ? ' is-hidden' : ''}`} aria-hidden="true">
    <div className="moon-fallback-disc">
      <MoonDisc view={view} />
    </div>
  </div>
);
import LocationPicker from './components/LocationPicker';
import Icon from './components/icons/Icon';
import ShareToast from './components/ShareToast';
import AppMenu from './components/AppMenu';
import BrandMark from './components/BrandMark';
import { useShare } from './hooks/useShare';
import UpdatePrompt from './components/UpdatePrompt';
import ShortcutsDialog from './components/ShortcutsDialog';
import PrivacyDialog from './components/PrivacyDialog';
import { usePreferences } from './hooks/usePreferences';
import { getLunarDetails, getAdjacentQuarterPhase } from './utils/lunarCalc';
import { DEFAULT_LOCATION, loadStoredLocation, storeLocation, resolveTimeZone, roundPlace } from './utils/location';
import { readSharedState, buildSharedSearch } from './utils/shareUrl';

// Keys that controls like the timeline and the calendar grid use to move around
const NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

// `prerender` is set only by the build, which renders the app to HTML once so the
// page can paint before any JavaScript arrives. That render leaves out everything
// that needs a browser or would only be hidden anyway: the 3D Moon, Deep Dive's
// panels, the dialogs and the service worker.
function App({ prerender = false }) {
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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const closeShortcuts = useCallback(() => setIsShortcutsOpen(false), []);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const showPrivacy = useCallback(() => setIsPrivacyOpen(true), []);
  const closePrivacy = useCallback(() => setIsPrivacyOpen(false), []);

  // The sky's canvas sits behind the whole interface; the scene draws into it
  const [skyHost, setSkyHost] = useState(null);
  const moonAreaRef = useRef(null);

  // "Tilt to look around": the phone's motion sensor moves the sky's depth layers
  const tilt = useTilt(!prerender);
  const reducedMotion = usePrefersReducedMotion();

  // The light bloom on every pressed control (decision D7)
  useEffect(() => (prerender ? undefined : installPressBloom()), [prerender]);

  // 12- or 24-hour clock, km or miles. How this viewer reads, not what they are
  // looking at, so these stay on the device and out of the URL.
  const [preferences, setPreference] = usePreferences();
  const { clock } = preferences;

  // A browser with no WebGL API gets the flat Moon and no Three.js download. One
  // whose context can't be created (disabled, blocklisted) finds out when the 3D
  // Moon tries: it never draws a frame, so the flat Moon simply stays.
  const [hasWebGL] = useState(() => !prerender && hasWebGLApi());
  useEffect(() => {
    if (!hasWebGL) console.warn('WebGL unavailable, showing the 2D Moon');
  }, [hasWebGL]);

  // shell -> scene -> ready, or failed. The 3D Moon fades in over the flat one only
  // once its texture is drawn, so the stage never shows an untextured sphere.
  // Without WebGL there is nothing to wait for, so it starts out finished.
  const [loadStage, setLoadStage] = useState(hasWebGL ? 'shell' : 'failed');
  const markScene = useCallback(() => setLoadStage((s) => (s === 'shell' ? 'scene' : s)), []);
  const markReady = useCallback(() => setLoadStage('ready'), []);
  const markFailed = useCallback(() => setLoadStage((s) => (s === 'ready' ? s : 'failed')), []);
  // A lost WebGL context brings the flat Moon back until the scene draws again
  const markLost = useCallback(() => setLoadStage('scene'), []);
  const moonReady = loadStage === 'ready';

  // Deep Dive's contents mount the first time the drawer opens and stay mounted
  // after, so closing the drawer does not make its contents jump mid-slide.
  const [hasOpenedDrawer, setHasOpenedDrawer] = useState(false);
  if (isDrawerOpen && !hasOpenedDrawer) setHasOpenedDrawer(true);

  // Deep Dive's panels are downloaded once the page has settled, so opening the
  // drawer never waits on the network, but only mounted the first time it opens:
  // mounting them is real work, and the drawer's slide-in covers it. Waiting for
  // the Moon (or eight seconds) keeps the download out of the way of the first
  // paint and the 3D scene.
  const [isSettled, setIsSettled] = useState(false);
  if (!isSettled && (moonReady || loadStage === 'failed')) setIsSettled(true);
  useEffect(() => {
    if (prerender) return undefined;
    const timer = setTimeout(() => setIsSettled(true), 8000);
    return () => clearTimeout(timer);
  }, [prerender]);
  useEffect(() => {
    if (prerender || !isSettled) return undefined;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = idle(() => { loadDeepDive().catch(() => {}); }, { timeout: 4000 });
    return () => cancel(handle);
  }, [prerender, isSettled]);
  const mountDeepDive = !prerender && hasOpenedDrawer;

  const { share, status: shareStatus } = useShare(currentDate, location);

  // The constellation behind the Moon, so the label can say what the sky shows.
  // Its boundary table loads once the page has settled.
  const [constellationOf, setConstellationOf] = useState(null);
  useEffect(() => {
    if (prerender || !isSettled) return undefined;
    let cancelled = false;
    import('./sky/constellations')
      .then((module) => { if (!cancelled) setConstellationOf(() => module.constellationOfDate); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [prerender, isSettled]);

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
    // A searched address is as personal as a located one, so it is held to the same
    // kilometre. isSamePlace allows for exactly that much, so saved places still match.
    const place = roundPlace(next);
    setLocation(place);
    storeLocation(place);
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
      // The dialogs are modal, so nothing behind them reacts to keys. Esc is closed
      // here as well as natively: the browser's close request keys off the hardware
      // key code, and an Esc that arrives without one would otherwise leave a dialog
      // stuck open. Closing one twice is harmless.
      if (isShortcutsOpen || isPrivacyOpen) {
        if (e.key === 'Escape') {
          setIsShortcutsOpen(false);
          setIsPrivacyOpen(false);
        }
        return;
      }

      // Escape comes first, wherever focus is. The search box and the calendar
      // grid both hold focus while their popups are open, and are exactly where
      // someone reaches for Escape; behind the exemption below it did nothing.
      if (e.key === 'Escape') {
        // An open option list (the calendar's month and year pickers) closes itself
        // on Escape, and that should be all Escape does. Without this, closing the
        // year list also slammed the whole calendar shut.
        const select = e.target instanceof Element ? e.target.closest('select') : null;
        if (select) {
          try {
            if (select.matches(':open')) return;
          } catch {
            // Browsers without :open show a native list, whose keys never reach the page
          }
        }
        // Dismiss the innermost surface first, then the drawer behind it.
        if (isMenuOpen) setIsMenuOpen(false);
        else if (isCalendarOpen) setIsCalendarOpen(false);
        else if (isLocationOpen) setIsLocationOpen(false);
        else setIsDrawerOpen(false);
        return;
      }

      // Never hijack typing: in a text field or a select every key belongs to it.
      // Controls that move with the arrow keys (the timeline, the calendar grid,
      // radio buttons) keep those, so an arrow is not applied twice, but letters
      // still reach the shortcuts. The timeline used to swallow every key while
      // focused, so ?, T and D did nothing from there.
      if (e.target instanceof Element) {
        if (e.target.closest('input:not([type="radio"]), select, textarea, [contenteditable="true"]')) return;
        if (NAVIGATION_KEYS.has(e.key) &&
          e.target.closest('[role="slider"], [data-date-grid], input[type="radio"]')) return;
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
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, isCalendarOpen, isLocationOpen, isShortcutsOpen, isPrivacyOpen, selectDate, goLive]);

  // Derive lunar details. The 24-hour sky data is worked out inside Deep Dive,
  // which is the only place it is shown.
  const lunarDetails = useMemo(() => getLunarDetails(currentDate, location?.lat, location?.lon, location?.timeZone, clock), [currentDate, location, clock]);

  // How the Moon stands in this observer's sky: its tilt, libration and lighting,
  // for the 3D Moon and the flat one alike
  const moonView = useMemo(() => getMoonView(currentDate, location?.lat ?? 0, location?.lon ?? 0), [currentDate, location]);
  const constellation = useMemo(
    () => constellationOf?.(moonView.ra, moonView.dec, moonView.time) ?? null,
    [constellationOf, moonView]
  );

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

      {/* Atmospheric Space Gradients */}
      <div className="nebula" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      {/* The real sky around the Moon, and the 3D Moon itself, on one canvas
          behind the interface. Without WebGL, a flat drawing of the same sky. */}
      <div ref={setSkyHost} className="sky" aria-hidden="true">
        {skyHost && loadStage === 'failed' && !prerender && (
          <SceneBoundary name="Flat sky" fallback={null}>
            <Suspense fallback={null}>
              <SkyFallback view={moonView} skyHost={skyHost} areaRef={moonAreaRef} />
            </Suspense>
          </SceneBoundary>
        )}
      </div>

      {!prerender && (
        <>
          {/* Offline readiness and update notices from the service worker */}
          <UpdatePrompt />

          {/* Every keyboard shortcut, on ? or the keyboard button */}
          <ShortcutsDialog isOpen={isShortcutsOpen} onClose={closeShortcuts} />

          {/* What is sent, what stays on the device, and a way to forget it */}
          <PrivacyDialog isOpen={isPrivacyOpen} onClose={closePrivacy} />

          {/* Custom Particle Comet Cursor */}
          <CustomCursor />
        </>
      )}

      {/* ═══ MAIN APPLICATION VIEWPORT ═══ */}
      <main
        ref={mainViewRef}
        className={`main-view-container${isDrawerOpen ? ' drawer-open' : ''}`}
      >
        {/* The header (decision D2): the wordmark, the date block and one menu.
            Raised while one of its popovers is open, so the calendar, the location
            picker or the menu opens above the Deep Dive sheet, not beneath it. */}
        <header className={`app-header${isCalendarOpen || isLocationOpen || isMenuOpen ? ' has-popover' : ''}`}>
          <div className="app-brand">
            <BrandMark />
            <h1 className="text-gradient hero-title">
              Luna
            </h1>
          </div>

          {/* When and where: the date block */}
          <div className="controls-panel">
            <DateControls
              currentDate={currentDate}
              setCurrentDate={selectDate}
              onToday={goLive}
              isLive={isLive}
              isCalendarOpen={isCalendarOpen}
              setIsCalendarOpen={setIsCalendarOpen}
              timeZone={location.timeZone}
              clock={clock}
            >
              <LocationPicker
                location={location}
                setLocation={chooseLocation}
                isOpen={isLocationOpen}
                setIsOpen={setIsLocationOpen}
                onShowPrivacy={showPrivacy}
              />
            </DateControls>
          </div>

          <div className="app-header-actions">
            <AppMenu
              isOpen={isMenuOpen}
              setIsOpen={setIsMenuOpen}
              onDeepDive={() => setIsDrawerOpen(true)}
              onShare={share}
              tilt={tilt}
              showTilt={tilt.supported && !reducedMotion}
              onShortcuts={() => setIsShortcutsOpen(true)}
              onPrivacy={showPrivacy}
              preferences={preferences}
              setPreference={setPreference}
            />
          </div>
        </header>

        {/* Center Canvas Area: 3D Moon & Hero Phase Name */}
        <div className="main-canvas-area observatory-stage">
          {/* One accessible name for whichever Moon is showing, 3D or the 2D stand-in.
              Dragging to rotate is exploration, not information: the phase and
              illumination it shows are all available as text. */}
          <div
            ref={moonAreaRef}
            className="moon-container"
            role="img"
            aria-label={`The Moon: ${lunarDetails.name}, ${lunarDetails.fraction} percent illuminated${constellation ? `, in ${constellation}` : ''}`}
          >
            <MoonGlow view={moonView} hidden={moonReady} />
            <MoonFallback view={moonView} hidden={moonReady} />
            {hasWebGL && skyHost && (
              <SceneBoundary name="Moon scene" onError={markFailed} fallback={null}>
                <Suspense fallback={null}>
                  <MoonScene
                    view={moonView}
                    isReady={moonReady}
                    skyHost={skyHost}
                    tilt={tilt.on}
                    onScene={markScene}
                    onReady={markReady}
                    onFail={markFailed}
                    onLost={markLost}
                  />
                </Suspense>
              </SceneBoundary>
            )}
          </div>

          {/* The phase name: the one line of type on the stage, and the way into
              Deep Dive, as a quiet link (D2, settled in chat) */}
          <button
            type="button"
            className="hero-phase-name"
            onClick={() => setIsDrawerOpen(true)}
            aria-expanded={isDrawerOpen}
            aria-controls="telemetry-drawer"
            aria-describedby="phase-name-hint"
          >
            <span className="font-serif">
              {lunarDetails.name}
            </span>
          </button>
          <span id="phase-name-hint" className="sr-only">Opens Deep Dive</span>
        </div>

        {/* Bottom Bar: Timeline */}
        <div className="timeline-dock">
          <LunarTimeline currentDate={currentDate} setCurrentDate={selectDate} timeZone={location.timeZone} isLive={isLive} />
        </div>
      </main>

      {!prerender && <ShareToast status={shareStatus} />}

      {/* ═══ TELEMETRY DATA DRAWER / BOTTOM SHEET ═══ */}
      <aside
        ref={drawerRef}
        id="telemetry-drawer"
        className={`data-drawer ${isDrawerOpen ? 'is-open' : ''}`}
        aria-labelledby="telemetry-heading"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="drawer-handle" aria-hidden="true" />

        {/* Drawer Header & Close Button */}
        <div className="drawer-header">
          <div className="drawer-heading">
            <h2
              id="telemetry-heading"
              ref={drawerHeadingRef}
              tabIndex={-1}
              className="drawer-title"
            >
              Deep Dive
            </h2>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="glass-button icon-button drawer-close"
            aria-label="Close Deep Dive (Esc)"
            title="Close (Esc)"
          >
            <Icon name="close" />
          </button>
        </div>

        {mountDeepDive && (
          <Suspense fallback={null}>
            <DeepDiveContent
              currentDate={currentDate}
              location={location}
              lunarDetails={lunarDetails}
              preferences={preferences}
              onShowPrivacy={showPrivacy}
            />
          </Suspense>
        )}
      </aside>
    </div>
  );
}

export default App;
