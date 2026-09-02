# Luna S-Tier Overhaul: Comprehensive Implementation Plan

Transform **Luna** from a visually flawed, scientifically broken prototype into an award-winning, astronomically accurate, WCAG 2.2 AA compliant, hyper-responsive, and performant web application.

---

## User Review Required

> [!IMPORTANT]
> **Asset Strategy:** We will download high-resolution local textures (2048px lunar surface map, elevation bump map, Earth day map, and Earth night lights map) into `public/assets/textures/` to eliminate un-cached remote GitHub dependencies and support offline operation.
> 
> **Interactive View Modes:** In the 3D Moon visualizer, we will implement two distinct modes:
> 1. **Earth View (Default):** Tidally locked to Earth where the Moon's prime meridian faces the viewer and true lunar phase lighting advances realistically across near-side features.
> 2. **Free Exploration (Globe):** Full 360° interactive orbit/drag with inertia and a "Reset to Earth View" button.

---

## Proposed Changes

The overhaul will be executed in 8 sequential phases:

### Phase 1: Astronomical & Mathematical Engine Overhaul
#### [MODIFY] [lunarCalc.js](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/utils/lunarCalc.js)
- Implement continuous ephemeris and quarter calculations using standard Jean Meeus astronomical algorithms.
- Add physical ephemeris: true synodic age, Earth-Moon distance (km), sub-solar coordinates, astrological zodiac sign.
- Replace the hardcoded 6 PM – 6 AM sky loop with a dynamic 24-hour step sampler (48 half-hour points) displaying realistic Moonrise, Moonset, Transit/Culmination, Sunrise, and Sunset.
- Implement a safe, cached reverse-geocoding utility with graceful offline fallbacks to avoid Nominatim rate-limit violations.

---

### Phase 2: Localized Asset Pipeline & Textures
#### [NEW] Local textures in `public/assets/textures/`
- Download and place optimized lunar surface map, elevation/bump map, and Earth day/night textures in `public/assets/textures/`.
- Add progressive loading states and procedurally textured fallbacks if assets are slow to load.

---

### Phase 3: High-Fidelity 3D Visualizer & Accurate Orbital Engine
#### [MODIFY] [MoonVisualization.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/MoonVisualization.jsx)
- Remove auto-spinning Y rotation to respect tidal locking in Earth View.
- Add View Mode toggle: **[Earth View (Tidally Locked) | Free 3D Globe]**.
- Implement physically-based directional sunlight vectors derived from exact phase angle, coupled with realistic earthshine ambient lighting.
- Remove all direct DOM element querying (`document.getElementById`).

#### [MODIFY] [OrbitalView.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/OrbitalView.jsx)
- Correct the orbital geometry so Earth is at origin, sunlight arrives from a consistent sun vector, and the Moon orbits according to its true synodic phase angle.
- Add clear telemetry: Lunar Phase %, Earth-Moon Distance in km, and orbital position.
- Add interactive orbit scrubbing along the orbital track.

---

### Phase 4: Design System, WCAG 2.2 AA Contrast & Typography Harmony
#### [MODIFY] [index.css](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/index.css)
- Establish an accessible, unified design token system (`--bg-deep-space`, `--text-primary`, `--text-secondary`, `--accent-primary`).
- Replace low-contrast micro-labels (2.2:1 contrast) with accessible, high-contrast typography meeting WCAG AA (≥4.5:1) standards.
- Harmonize font hierarchy: `Outfit` for brand headers/metrics, `Cormorant Garamond` for poetic phase titles, `Inter` for UI controls, and tabular numerals for numbers.

#### [MODIFY] [LunarData.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/LunarData.jsx)
- Restructure into modular glass telemetry cards: Phase Overview, Celestial Distance (Apogee/Perigee bar), and Constellation/Ephemeris with upcoming phase countdowns.

---

### Phase 5: Interactive Navigation, Date Picker & Timeline Scrubber Overhaul
#### [MODIFY] [DateControls.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/DateControls.jsx)
- Add interactive calendar dropdown modal allowing direct date selection, year/month jumps, and astronomical presets ("Next Full Moon", "Next New Moon").
- Replace the 6px dot with an accessible, high-contrast "Today" pill button with ≥44px touch bounding box.
- Provide accessible tooltips and clear arrow-key hints.

#### [MODIFY] [LunarTimeline.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/LunarTimeline.jsx)
- Implement viewport-adaptive node downsampling to prevent icon collision and smearing on mobile screens (`< 768px`).
- Add smooth step-snapping, live hover/touch tooltip, and full keyboard slider accessibility (`role="slider"`, `aria-valuenow`).

---

### Phase 6: 24-Hour Continuous Sky Position & Ephemeris Horizon Chart
#### [MODIFY] [SkyPosition.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/SkyPosition.jsx)
- Build a full 24-hour horizon diagram with clear day/night zones and horizon threshold line.
- Plot live Moon and Sun markers with dynamic altitude/azimuth badges.
- Present Moonrise, Moonset, Peak Culmination, Sunrise, and Sunset in a clean, legible grid.

---

### Phase 7: Mobile-First Adaptive Viewport & Gesture-Driven Bottom Sheet
#### [MODIFY] [App.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/App.jsx)
- Desktop: Implement balanced split-screen docking when "Deep Dive" is active (60% 3D canvas, 40% telemetry inspector) instead of shifting the whole canvas off-screen.
- Mobile: Implement an ergonomic, gesture-driven bottom sheet with 3 peek heights (`12vh` Peek, `50vh` Half, `90vh` Full), drag handles, safe-area inset padding, and sticky close button.

---

### Phase 8: Cursor Fixes, Keyboard Shortcuts, a11y & Performance
#### [MODIFY] [CustomCursor.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/CustomCursor.jsx)
- Remove `cursor: none !important;` from global CSS to restore native OS pointer.
- Turn `CustomCursor` into a subtle, non-blocking cosmetic trailing accent; completely disable on touchscreens and when reduced motion is preferred.

#### [MODIFY] [Starfield.jsx](file:///c:/Users/User/OneDrive/Documents/MyProjects/Luna/src/components/Starfield.jsx)
- Cap canvas pixel ratio, pause rendering when tab is hidden, and use delta-time physics for shooting stars.

#### [MODIFY] Keyboard Shortcuts & ARIA Live Regions
- Add global keyboard navigation: `Left`/`Right` (step day), `Shift + Left`/`Right` (step week), `T`/`Space` (today), `D` (deep dive drawer), `Esc` (close modal).
- Add `aria-live="polite"` announcements for date/phase changes.

---

## Verification Plan

### Automated Tests & Builds
- Run `npm run build` to verify clean bundle compilation with zero TypeScript/ESLint warnings.
- Run `npm run lint` to enforce formatting and React best practices.

### Manual & Visual Verification
1. **Astronomy Verification:** Verify Moon in Earth View is tidally locked (Prime Meridian facing user) and lighting matches exact phase angle without far-side rotation.
2. **24-Hour Ephemeris:** Test Daytime Moon / Crescent phases to confirm the altitude graph displays daytime transits accurately.
3. **Mobile & Touch Testing:** Verify timeline on 375px viewport has zero icon collisions; verify bottom sheet gestures smoothly across Peek, Half, and Full states.
4. **Contrast & a11y:** Verify all text passes WCAG AA contrast (≥4.5:1) and native mouse pointer is fully visible.
5. **Offline & Performance:** Verify application loads local textures without remote network dependencies.
