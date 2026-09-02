# 🌌 PROMPT: FULL ARCHITECTURAL & DESIGN OVERHAUL OF LUNA INTO AN S-TIER ASTRONOMICAL WEB APPLICATION

---

## 1. MISSION OBJECTIVE & SYSTEM ROLE
You are an elite Principal Full-Stack Engineer, 3D Graphics Specialist (Three.js/WebGL/R3F), and Principal Design Technologist. 
Your objective is to execute a complete, rigorous, zero-compromise reconstruction of **Luna**—an interactive web application for lunar cycle exploration, astronomical visualization, and celestial ephemeris tracking.

You will transform Luna from a visually flawed, scientifically broken prototype into an award-winning, astronomically accurate, WCAG 2.2 compliant, hyper-responsive, and performant web application that rivals NASA Eyes, Apple Dark Sky, and Google Earth.

---

## 2. AUDIT FINDINGS & FORENSIC PROBLEM STATEMENT

A comprehensive audit of the codebase (`c:/Users/User/OneDrive/Documents/MyProjects/Luna`) and real-world screenshots revealed critical deficiencies across all layers:

### A. Astronomical & Mathematical Inaccuracies
1. **Tidal Locking Violation (`MoonVisualization.jsx`):** The Moon continuously auto-rotates around its Y-axis (`moonRef.current.rotation.y += 0.001`), displaying the heavily cratered lunar far side (Farside Highlands) facing Earth while labeling it as a standard Earth-bound lunar phase. In reality, the Moon is tidally locked to Earth.
2. **Phase vs Orbital Angle Disconnect (`OrbitalView.jsx`):** Both the Moon and the Sun indicator vector share the exact same orbital coordinate calculation (`Math.sin(theta)*distance`), causing the Moon to be permanently locked in a New Moon / Solar Eclipse position while incorrectly rendering internal lighting.
3. **Hardcoded 6 PM – 6 AM Sky Transit (`lunarCalc.js`):** `getSkyData` hardcodes the Moon’s sky path to a 12-hour nighttime window (18:00 to 06:00). For half the lunar cycle (Crescents, First Quarter, New Moon), the Moon is in the sky during morning, afternoon, or midday, rendering the arc diagram blank, truncated, or completely incorrect.
4. **Coarse Phase Tolerance Window:** `TOLERANCE = 0.03` creates a ~1.8-day dead zone where a 95% illuminated Waxing Gibbous is incorrectly labeled as an exact "Full Moon".
5. **Ambiguous Metrics (`OrbitalView.jsx`):** Displays "Earth Phase: 67.5%" and "Illumination: 72.8%" side by side with zero explanation, confusing users.

### B. Mobile Responsiveness & Viewport Breakdowns
1. **Timeline Node Collision (`LunarTimeline.jsx`):** On screens `< 768px`, 30 day markers collide. Major phase SVG icons overlap each other (e.g., New Moon icon renders directly on top of Waxing Crescent), creating severe visual artifacts.
2. **Broken Bottom Sheet & Content Clipping (`App.jsx`, `index.css`):** On mobile, the details drawer acts as a fixed `75vh` bottom sheet without a sticky header or safe-area inset support. Scrolling clips the top cards (`19.9 DAYS` is isolated while the phase name is chopped off). The close button floats directly on top of the Moon canvas.
3. **Mystery Meat Navigation & Illegal Touch Targets (`DateControls.jsx`):** The "Today" button is an unlabelled 6px SVG circle (`<circle cx="3" cy="3" r="3" />`) with an effective touch target far below the 44×44px Apple HIG / Android accessibility minimum.

### C. Visual Identity & Typography Dissonance
1. **Type Hierarchy Clashing:** Three disparate font systems fight for dominance without harmonious scale: `Outfit` (bold tech geometric sans), `Cormorant Garamond` (ultra-delicate 19th-century editorial italic), and `Inter` (neutral data sans).
2. **WCAG Contrast Violations:** `.utility-label` uses `#9ea1c2` at `0.65rem` (10.4px) with `opacity: 0.6` on a `#03040a` background, yielding a catastrophic **2.2:1 contrast ratio** (fails WCAG AA 4.5:1 minimum).
3. **Overuse of Muddy Glows:** Excessive `rgba(142, 155, 242, 0.4)` bloom on borders and cards washes out deep celestial blacks.

### D. Architecture, Performance & Web Quality Flaws
1. **Native Cursor Hijacking (`index.css`, `CustomCursor.jsx`):** `*, *::before, *::after { cursor: none !important; }` hides the OS cursor globally. When the main thread drops frames or Three.js compiles shaders, the user experiences complete pointer loss. Moreover, the custom cursor spawns ghost artifacts on touchscreens and during layout shifts.
2. **Imperative DOM Bypasses in WebGL:** `MoonVisualization.jsx` uses `document.getElementById('custom-cursor-dot')` and `document.querySelectorAll` inside canvas pointer events, breaking React state cycles and leaking memory.
3. **Uncached Remote CDN Assets:** Textures are fetched from raw un-versioned GitHub URLs (`raw.githubusercontent.com/mrdoob/three.js/...`) with no offline fallback, caching strategy, or low-res placeholders.
4. **OpenStreetMap Nominatim TOS Violation (`App.jsx`):** Direct unauthenticated client-side fetches to Nominatim API on every position change without a custom `User-Agent` or caching layer risk client IP bans.

---

## 3. MASTER IMPLEMENTATION PLAN (PHASED EXECUTION)

You must execute the complete overhaul in 8 distinct, strictly sequential phases. Do not move to the next phase until all acceptance criteria of the current phase are verified.

┌────────────────────────────────────────────────────────────────────────┐ 
│ 8-PHASE RECONSTRUCTION 												 │ 
├────────────────────────────────────────────────────────────────────────┤ 
│ PHASE 1: Astronomical & Mathematical Calculation Engine Overhaul		 │ 
│ PHASE 2: Localized Asset Pipeline, Textures & Offline Fallbacks		 │ 
│ PHASE 3: High-Fidelity 3D Visualizer & Accurate Orbital Engine 	     │ 
│ PHASE 4: Design System, WCAG 2.2 AA Contrast & Typography Harmony      │ 
│ PHASE 5: Interactive Date Navigation, Time Travel & Calendar Picker    │ 
│ PHASE 6: 24-Hour Continuous Sky Position & Ephemeris Horizon Chart     │ 
│ PHASE 7: Mobile-First Adaptive Viewport & Gesture-Driven Bottom Sheet  │ 
│ PHASE 8: Cursor Fixes, Keyboard Shortcuts, a11y & Performance Budgets  │ 
└────────────────────────────────────────────────────────────────────────┘


---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 1: ASTRONOMICAL & MATHEMATICAL CALCULATION ENGINE OVERHAUL
### Target File: `src/utils/lunarCalc.js`
### ═══════════════════════════════════════════════════════════════════════════

#### 1.1 Objectives
Replace naive approximations with robust, continuous ephemeris and lunar calculation methods utilizing `suncalc` combined with standard astronomical algorithms (Jean Meeus Astronomical Algorithms standard).

#### 1.2 Required Functionality
1. **Precise Phase Classification:**
   - Differentiate between continuous phase state and exact primary astronomical quarter events.
   - Primary phases (New Moon: phase ≈ 0, First Quarter: phase ≈ 0.25, Full Moon: phase ≈ 0.5, Last Quarter: phase ≈ 0.75) must only be designated as such within a realistic astronomical window (±0.01 phase / ~7 hours), otherwise designate intermediate phases (`Waxing Crescent`, `Waxing Gibbous`, `Waning Gibbous`, `Waning Crescent`).
   - Add helper `isExactPhase: boolean` and calculate the exact timestamp of the upcoming and previous primary quarter events.
2. **Lunar Physical & Topocentric Coordinates:**
   - Calculate:
     - `illumination`: 0.0% to 100.0%
     - `phaseValue`: 0.0 to 1.0 (0=New, 0.25=First Quarter, 0.5=Full, 0.75=Last Quarter)
     - `age`: True synodic age in days (0.0 to 29.53059 days)
     - `distanceKm`: Earth-Moon distance in kilometers (ranging from ~356,500 km at perigee to ~406,700 km at apogee)
     - `subSolarLatitude` & `subSolarLongitude` for true terminator orientation
     - `parallacticAngle` & `positionAngle`
     - `zodiacSign`: Current astrological/astronomical constellation sign of the Moon
3. **True 24-Hour Sky Transit & Horizon Arc (`getSkyData`):**
   - Eliminate the hardcoded `18:00 to 06:00` loop.
   - Implement a dynamic 24-hour step sampler centered around the current solar or lunar day (from 00:00 to 23:59 or dynamic Moonrise to Moonset transit).
   - Sample altitude and azimuth every 30 minutes (48 data points).
   - Accurately determine:
     - `moonrise`, `moonset`, `moonTransit` (culmination / peak altitude)
     - `sunrise`, `sunset`, `solarNoon`, `civilDusk`, `civilDawn`
     - `isMoonAboveHorizon`: true boolean based on current observer latitude/longitude and timestamp
     - `nextTransitTime` and `peakAltitudeDegrees`
4. **Resilient Geocoding & Local Cache:**
   - Provide a safe reverse geocoding utility with `localStorage` caching keyed by rounded coordinates (`lat.toFixed(2), lon.toFixed(2)`).
   - Fallback gracefully to offline timezone-based names or raw coordinates if network fails, without breaking OpenStreetMap rate limits.

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 2: LOCALIZED ASSET PIPELINE, TEXTURES & OFFLINE FALLBACKS
### Target Directories: `public/assets/textures/`, `src/assets/`
### ═══════════════════════════════════════════════════════════════════════════

#### 2.1 Objectives
Eliminate all external raw GitHub asset dependencies. Bundle optimized, high-fidelity lunar, planetary, and starry assets locally with progressive loading and offline service worker compatibility.

#### 2.2 Required Actions
1. **Asset Migration:**
   - Download or generate high-resolution, royalty-free textures:
     - `public/assets/textures/moon_map_2048.jpg` (Albedo / Color)
     - `public/assets/textures/moon_displacement_1024.jpg` (Elevation / Bump map for crater depth)
     - `public/assets/textures/earth_day_2048.jpg` (Earth daytime surface)
     - `public/assets/textures/earth_night_2048.jpg` (Earth city lights for night hemisphere)
     - `public/assets/textures/earth_clouds_1024.jpg` (Optional cloud layer)
2. **Texture Loading & Progressive Fallback Strategy:**
   - Create a centralized asset loader hook (`useAstronomicalTextures`) with:
     - Low-res placeholder/canvas gradient while WebGL textures decode.
     - Graceful error boundary that switches to procedural Three.js shader material if image textures fail to load.
     - Pre-caching in browser CacheStorage.

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 3: HIGH-FIDELITY 3D VISUALIZER & ACCURATE ORBITAL ENGINE
### Target Files: `src/components/MoonVisualization.jsx`, `src/components/OrbitalView.jsx`
### ═══════════════════════════════════════════════════════════════════════════

#### 3.1 `MoonVisualization.jsx` Reconstruction
1. **Tidal Locking Default (Earth View):**
   - By default, the Moon must display the true near side facing the viewer (Prime Meridian centered `rotation.y = 0` or exact libration angle).
   - Eliminate the unprompted continuous `rotation.y += 0.001` auto-spin during phase inspection.
2. **View Mode Toggle:**
   - Provide two distinct view modes:
     - **Mode A: Earth Observation View (Default):** Fixed tidal perspective matching real sky viewing. The terminator line smoothly moves across the familiar near-side surface features (Mare Tranquillitatis, Oceanus Procellarum, Tycho Crater) based on the exact phase angle.
     - **Mode B: Free Exploration Globe:** Allows full 360° interactive orbit/drag with inertia/damping (using `@react-three/drei`'s `OrbitControls` or custom gesture math). Include a "Reset to Earth View" button.
3. **Physically-Based Lighting & Terminator Shader:**
   - Set up an astronomically accurate Sun directional light:
     - Position vector derived directly from `phase` angle: `x = -sin(phase * 2π) * R`, `z = -cos(phase * 2π) * R`.
     - Subdued ambient Earthshine light (`color: #3b4262`, `intensity: 0.08`) illuminating the unlit portion of the lunar disk with realistic subtle detail.
   - Enhance the lunar surface material:
     - Custom roughness map or displacement map for realistic grazing shadows along the terminator line where crater rims catch sunlight.
4. **Clean Interactive Architecture:**
   - Completely remove all direct DOM querying (`document.getElementById`).
   - Use standard React Three Fiber pointer event handlers and pass state through React props/context.

#### 3.2 `OrbitalView.jsx` Reconstruction
1. **Astronomically Sound Earth-Moon-Sun Diagram:**
   - In the top-down/isometric orbital schematic:
     - Place Earth at origin `[0, 0, 0]`.
     - Directional sunlight arrives from a fixed direction (e.g. `+X` or `+Z`), illuminating the sunlit hemisphere of both Earth and Moon.
     - Position the Moon along its elliptical orbit at angle $\theta = \text{phase} \times 2\pi$.
     - Show Earth's day/night terminator aligned with the incoming sunlight vector.
2. **Clear Labeling & Explanatory Telemetry:**
   - Clearly delineate:
     - **Lunar Phase:** Percentage of illuminated lunar disk visible from Earth.
     - **Earth-Moon Distance:** Current orbital distance (e.g., `384,400 km`).
     - **Orbital Position:** Angle in degrees relative to the Vernal Equinox / Sun-Earth line.
3. **Interactive Orbit Scrubbing:**
   - Allow clicking or dragging anywhere along the orbital ring to scrub through the synodic month with instant real-time synchronization across all UI components.

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 4: DESIGN SYSTEM, WCAG 2.2 AA CONTRAST & TYPOGRAPHY HARMONY
### Target Files: `src/index.css`, `src/App.css`, `src/components/LunarData.jsx`
### ═══════════════════════════════════════════════════════════════════════════

#### 4.1 Unified Design System & Typography Scale
1. **Design Tokens (`index.css`):**
   - Define a disciplined, coherent design system with CSS custom properties:
     ```css
     :root {
       /* Typography Scale */
       --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
       --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
       --font-display: 'Outfit', 'Inter', sans-serif;
       --font-editorial: 'Cormorant Garamond', Georgia, serif;

       /* Color Palette - Deep Space & High Contrast */
       --bg-deep-space: #05070e;
       --bg-surface-1: rgba(13, 16, 32, 0.7);
       --bg-surface-2: rgba(22, 27, 54, 0.75);
       --border-subtle: rgba(255, 255, 255, 0.08);
       --border-highlight: rgba(142, 155, 242, 0.35);

       /* Accessible Text Colors (WCAG AAA / AA Tested) */
       --text-primary: #f8fafc;        /* 17.5:1 contrast against deep space */
       --text-secondary: #c5c9e2;      /* 9.2:1 contrast */
       --text-muted: #9499be;          /* 5.1:1 contrast (WCAG AA compliant for all sizes) */
       --text-accent: #a5b4fc;         /* Indigo light accent */
       --accent-primary: #6366f1;
       --accent-glow: rgba(99, 102, 241, 0.25);
     }
     ```
2. **Typography Rules:**
   - Reserve `Cormorant Garamond` exclusively for poetic / editorial headlines (e.g. the large phase title: *Waning Gibbous*).
   - Use `Outfit` for display brand headers and main metrics.
   - Use `Inter` for all UI controls, button labels, descriptions, and metadata.
   - Use `JetBrains Mono` or tabular numerals for timestamps, percentages, coordinates, and astronomical countdowns (`font-variant-numeric: tabular-nums`).
   - Eliminate all font sizes smaller than `0.75rem` (12px). Ensure all uppercase micro-labels have `letter-spacing: 0.1em` and `font-weight: 600`.

#### 4.2 Restructured `LunarData.jsx`
1. Build a clean, modular glass telemetry grid featuring:
   - **Phase Overview Card:** Phase name, illumination percentage badge, and Moon age counter.
   - **Celestial Distance & Orbit Card:** Distance to Earth in km, visual bar comparing apogee vs perigee.
   - **Constellation & Ephemeris Card:** Current Zodiac/Constellation, Sub-solar point, and Next Major Phase Countdown (e.g., *"Full Moon in 4 days, 6 hours"*).

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 5: INTERACTIVE DATE NAVIGATION, TIME TRAVEL & CALENDAR PICKER
### Target Files: `src/components/DateControls.jsx`, `src/components/LunarTimeline.jsx`
### ═══════════════════════════════════════════════════════════════════════════

#### 5.1 `DateControls.jsx` Overhaul
1. **Interactive Calendar Dropdown & Date Picker:**
   - Clicking the date header (`Wednesday, September 2, 2026`) opens an accessible calendar popup with:
     - Direct jump to any year, month, or date (past or future).
     - Mini moon phase glyphs embedded directly on each calendar day.
     - Presets: "Today", "Next Full Moon", "Next New Moon", "Next Lunar Eclipse".
2. **Ergonomic Control Bar:**
   - Replace ambiguous icon buttons with clear, accessible controls:
     - `[ -1 Month ]` `[ -1 Day ]` `[ Today ]` `[ +1 Day ]` `[ +1 Month ]`
   - The "Today" button must be a legible, accessible pill button with `aria-label="Jump to Current Date"` and minimum `44px` touch bounding box.
   - Include quick navigation tooltips with keyboard shortcuts displayed (e.g. `←` / `→` arrow keys).

#### 5.2 `LunarTimeline.jsx` Responsive Scrubber
1. **Collision-Free Day Markers & Adaptive Downsampling:**
   - Implement dynamic node culling based on viewport width:
     - Desktop (`> 1024px`): Render 30-day timeline with full phase progression.
     - Tablet (`768px - 1023px`): Render 15-day timeline or major quarter phases + every second day.
     - Mobile (`< 768px`): Render a continuous scrubber rail with only the 4 primary quarter phases labeled with icons (New, First Quarter, Full, Last Quarter), preventing any icon collision.
2. **Fluid Drag & Scrub Mechanics:**
   - Smooth gesture scrubbing with step-snapping to the nearest day.
   - Live hovering indicator showing date, phase name, and illumination in a floating tooltip.
   - Keyboard accessible: Add `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `tabIndex={0}`, and support for `ArrowLeft`, `ArrowRight`, `Home`, `End` keys.

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 6: 24-HOUR CONTINUOUS SKY POSITION & EPHEMERIS HORIZON CHART
### Target File: `src/components/SkyPosition.jsx`
### ═══════════════════════════════════════════════════════════════════════════

#### 6.1 Interactive 24-Hour Horizon Diagram
1. **Full 24-Hour Day/Night Sky Trajectory:**
   - Render a continuous sinusoidal altitude curve from 00:00 to 24:00 (or sunrise to next sunrise).
   - Display distinct visual zones:
     - **Day Sky (Above Horizon + Sun Up):** Faint golden sky wash.
     - **Night Sky (Sun Down):** Deep celestial blue with stars.
     - **Horizon Line ($0^\circ$ Altitude):** Clear dashed divider with Cardinal Directions (East / South / West).
2. **Live Moon & Sun Positions:**
   - Plot both the **Moon's current position** and the **Sun's current position** along their respective arcs.
   - If the Moon is currently below the horizon, show it in a muted "Below Horizon" state with a clear altitude degree badge (e.g., `-14.2°`).
3. **Telemetry Indicators:**
   - Moonrise time & azimuth bearing (e.g., `10:10 PM • 82° ENE`).
   - Peak Culmination / Transit (e.g., `05:00 AM • 72.7° S`).
   - Moonset time & azimuth bearing (e.g., `10:06 AM • 284° WNW`).
   - Sunrise & Sunset times for complete observational context.

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 7: MOBILE-FIRST ADAPTIVE VIEWPORT & GESTURE-DRIVEN BOTTOM SHEET
### Target Files: `src/App.jsx`, `src/index.css`
### ═══════════════════════════════════════════════════════════════════════════

#### 7.1 Desktop Split-Screen Dashboard vs Mobile Sheet
1. **Desktop (`>= 1024px`):**
   - Replace the awkward left-shift animation (`x: -225px`) with an elegant, responsive side-docked telemetry inspector:
     - When "Deep Dive" is active, the 3D Moon smoothly transitions into a balanced focal point on the left $60\%$ of the screen, while the data panels slide in to occupy the right $40\%$.
     - Preserves full canvas interactivity and composition without cropping or horizontal scrollbars.
2. **Mobile / Tablet (`< 1024px`):**
   - Implement a native-feeling gesture-driven Bottom Sheet (using Framer Motion, GSAP Draggable, or custom touch handlers):
     - **Collapsed Peek State (`12vh`):** Displays current phase name, illumination, and drag handle pill without blocking the 3D Moon.
     - **Half Expanded State (`50vh`):** Shows core lunar data and sky rise/set times.
     - **Full Expanded State (`90vh`):** Smooth scrollable deep dive through orbital mechanics and ephemeris tables.
   - Sticky header with drag indicator handle and accessible tap-to-close button.
   - Safe-area inset padding support for iPhone notch/home bar (`env(safe-area-inset-bottom)`).

---

### ═══════════════════════════════════════════════════════════════════════════
### PHASE 8: CURSOR FIXES, KEYBOARD SHORTCUTS, A11Y & PERFORMANCE
### Target Files: `src/components/CustomCursor.jsx`, `src/components/Starfield.jsx`, `src/App.jsx`
### ═══════════════════════════════════════════════════════════════════════════

#### 8.1 Custom Cursor Remediation
1. **Restore Native OS Pointer:**
   - Completely remove `cursor: none !important;` from global CSS.
   - Keep the native system cursor visible and active at all times.
2. **Subtle Interactive Cursor Glow (Desktop Only):**
   - Turn `CustomCursor` into a purely cosmetic, non-intrusive trailing particle/glow effect that follows the cursor using hardware-accelerated CSS transforms.
   - Immediately disable and unmount the cursor effect if:
     - `window.matchMedia('(pointer: coarse)').matches` is true.
     - User prefers reduced motion (`prefers-reduced-motion: reduce`).
     - Window loses focus (`blur` event).

#### 8.2 Background Starfield & Particle Performance
1. **Optimized Canvas Rendering:**
   - In `Starfield.jsx`, cap canvas pixel ratio to `Math.min(window.devicePixelRatio, 2)`.
   - Pause the `requestAnimationFrame` render loop when `document.hidden` is true (Page Visibility API) or when the canvas is scrolled out of view.
   - Implement shooting stars with delta-time physics so animation speed remains constant on 60Hz, 120Hz (ProMotion), and 240Hz monitors.

#### 8.3 Accessibility (a11y) & Keyboard Shortcuts
1. **Keyboard Shortcuts:**
   - `Space` / `T`: Reset to Today.
   - `ArrowLeft` / `ArrowRight`: Step day backward / forward.
   - `Shift + ArrowLeft` / `Shift + ArrowRight`: Step week backward / forward.
   - `D`: Toggle Deep Dive Data Drawer.
   - `Escape`: Close open drawers, modals, or calendar pickers.
2. **Screen Reader Support:**
   - Add a hidden live region (`aria-live="polite"`) that announces date and phase changes to screen readers (e.g., *"Selected date: September 2, 2026. Phase: Waning Gibbous, 72.8 percent illuminated."*).

---

## 4. VERIFICATION & ACCEPTANCE CRITERIA MATRIX

Before declaring the project complete, you must rigorously test and verify every item in this matrix:

| Component / Feature | Test Condition | Expected Result |
| :--- | :--- | :--- |
| **Tidal Locking** | Rotate/Inspect Moon in Earth View | Prime Meridian (near-side craters) is always oriented towards the viewer. No far side visible in Earth View. |
| **Illumination Accuracy** | Select New Moon date | Disks are 0% illuminated. Sun position matches 0° angle. No light leaks. |
| **24-Hour Sky Transit** | Test Waxing Crescent & Daytime Moon | Arc reflects daytime sky transit. Moonrise/Moonset times match official astronomical ephemeris. |
| **Mobile Timeline** | View on 375px viewport (iPhone SE) | Zero overlapping icons. No horizontal page blowout. Clean, legible labels. |
| **Bottom Sheet** | Swipe up and down on touch device | Smooth sheet transitions between Peek, Half, and Full states without stuck scrolling. |
| **Contrast Compliance** | Run Chrome Lighthouse Accessibility Audit | Score = **100/100**. All text elements meet WCAG AA (≥4.5:1) or AAA (≥7:1) ratios. |
| **Cursor & Pointer** | Test with mouse, touch, and trackpad | Native pointer is never hidden. No ghost circles on touch devices. |
| **Offline / Network Loss** | Disable network in DevTools | App loads all 3D textures from local bundle without console errors. |

---

## 5. EXECUTION PROTOCOL

1. Proceed through the phases in exact numerical order (Phase 1 → Phase 8).
2. For each phase:
   - Identify all files to be modified or created.
   - Implement clean, modern, modular ES6+ / React code with defensive error boundaries and prop validation.
   - Preserve existing project structure while elevating code quality to senior production standards.
3. Once all phases are implemented, run the build script (`npm run build`) and lint checks to confirm zero syntax errors, broken imports, or missing dependencies.

Begin implementation with **Phase 1**.