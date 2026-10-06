# Luna premium redesign: master prompt

You are building the second redesign of Luna, taking it from a well-engineered app with a
cheap-looking surface to an immersive, minimal, award-level experience on desktop and phones,
with Lighthouse at 100. This document is the brief for every phase. Read it in full before
starting any phase, then read the phase's own section again.

The owner's decisions, and the audit behind them, are recorded in
[PREMIUM-REDESIGN-DECISIONS.md](PREMIUM-REDESIGN-DECISIONS.md). That file is the source of
truth for *what* was decided; this one says *how to build it*. When they disagree, the
decisions file wins, and you fix this file in the same pull request.

---

## 0. Before each phase

1. `git fetch` and branch from the latest `origin/master`:
   `redesign/phase-<n>-<slug>`. Don't let the branch track master.
2. Re-read the decisions file and this phase's section. If the owner has changed anything
   since (check the chat, the decisions file and the audit page's database), update both
   files first.
3. Record a baseline: run the checks in §8 on master and keep the numbers for the PR.
4. At the end: run every check in §8 again, update the phase table in the decisions file,
   and open one pull request for the phase. The owner reviews and merges; never merge it
   yourself.

---

## 1. The product

Luna is an interactive lunar ephemeris: a photographic 3D Moon at the correct phase for any
date and place, a 30-day cycle timeline, a calendar, location search with saved places, and a
Deep Dive with illumination, age, distance, zodiac, rise/set/transit, a 24-hour altitude
curve and an Earth–Moon orbit diagram. It works offline as a PWA, shares exact views by URL
(`?d=&at=&n=&tz=`), and keeps preferences on the device.

- Stack today: React 19, Vite (rolldown), three.js with React Three Fiber and drei, GSAP,
  SunCalc, tz-lookup, vite-plugin-pwa, Vitest, ESLint. Fonts self-hosted via Fontsource.
- Astronomy lives in `src/utils/lunarCalc.js` (Meeus, *Astronomical Algorithms*, plus
  SunCalc). Tests run under `TZ=Asia/Colombo` on purpose.
- Hosting moves from GitHub Pages to Vercel at `https://luna-kvn.vercel.app/`, and later to
  `https://luna-kvn.xyz/` once the owner buys the domain.
- Luna is the owner's flagship portfolio project and will be submitted to Awwwards.

---

## 2. Non-negotiables

### 2.1 Keep every existing capability

Unless the decisions file removes something, all of this keeps working, by mouse, touch and
keyboard:

- the photographic 3D Moon at the correct phase, with drag rotation and inertia
- live mode following the clock, and pinned mode after any step, scrub or jump
- previous/next day, previous/next exact major phase, back to now
- the 30-day timeline scrubber with exact phase marks and a hover/drag readout
- the calendar: month and year navigation, a phase glyph per day, the month's exact phase
  times, full keyboard grid navigation
- location search (Nominatim), "Use my location", saved places, time zone resolved per place
- 12/24-hour and km/mile preferences
- rise, set, transit, peak altitude and direction; the 24-hour altitude curve; sunrise/sunset
- tropical and sidereal zodiac; distance with perigee/apogee context; lunar age
- the Earth–Moon orbit diagram (becomes 2D SVG, E8)
- URL state and the share button; shared links open the exact view
- keyboard shortcuts (←/→, Shift+←/→, T, D, ?, Esc) and the shortcuts reference
- the privacy dialog, including forgetting stored data
- offline use and the "update available" prompt
- the screen-reader live region announcing date, place, phase and illumination
- the 2D Moon fallback when WebGL is unavailable
- reduced-motion behaviour

### 2.2 Astronomy

- Don't change existing calculations, their precision or their semantics. Moving code is fine
  if behaviour is identical and tests still pass.
- New astronomy (libration, axis position angle, subsolar point, parallactic angle, twilight,
  meteor-shower dates) goes in new, pure, tested functions. Test each against published
  values: Meeus's worked examples (e.g. Example 53.a for the physical ephemeris of the Moon),
  or JPL Horizons output saved as a fixture. Note the source of each expected value in the test.

### 2.3 Accessibility

- Lighthouse accessibility stays at 100, and so do the parts it doesn't measure: visible focus
  on everything, logical tab order, focus moved into and back out of every overlay, Esc closing
  the topmost layer only, touch targets of at least 44 px (48 px on touch screens for the date
  bar), text contrast of at least 4.5:1.
- Accessible names contain the visible label (WCAG 2.5.3). The date button's name must include
  the date it shows.
- `prefers-reduced-motion`: no travel, parallax, idle drift, inertia or intro choreography;
  opacity fades up to 200 ms are fine. The Moon still renders; the sky is static.
- Idle fade (D3) must not hide anything that has focus, and faded chrome stays in the
  accessibility tree.
- Everything the Moon and sky show is also available as text.

### 2.4 Privacy

- The only third party the app talks to is Nominatim for place search. No analytics, no fonts
  or scripts from other origins, no telemetry.
- Anything new kept on the device (sound on/off, tilt on/off, "first-visit line seen",
  "intro seen this session", a guessed first location) is local, is listed in the privacy
  dialog, and is cleared by its "forget" action.
- The time-zone guess for the first location (I3) is computed on the device from the browser's
  IANA zone. Nothing is sent.

### 2.5 Offline and updates

The service worker precaches the shell, the app and the 2K Moon assets, so the Moon renders
with no signal. Larger assets (4K texture, star catalogue if large) are cached on first use.
Updates still wait for the viewer to accept them.

### 2.6 Browsers

- Full experience: iOS/iPadOS Safari 15.4+, and the last two versions of Chrome, Edge, Firefox
  and Samsung Internet. Build targets must be set so the output parses on Safari 15.4.
- Where the browser can run WebGL in a worker, the scene runs in a worker; everywhere else the
  same scene runs on the main thread (§4.2). Never gate the 3D Moon on worker support.
- No WebGL at all: the 2D Moon and a static sky.
- Don't depend on View Transitions, the Popover API or OffscreenCanvas without a fallback that
  works on Safari 15.4.

---

## 3. Performance contract

### 3.1 The rule (owner's words, J1)

> If some decisions are discarded in order to hit a perfect hundred score in mobile, inform and
> explain to me first, then we will discuss again what will be changed. 100 on desktop is a
> must and we should aim for 95+ on mobile if not 100.

So: desktop 100 in every Lighthouse category is required. Mobile aims for 100 everywhere, with
Performance at 95 at the very least. If a decided feature stands between the build and those
numbers, stop, measure what it costs, write the options up with numbers, and wait for the
owner. Never quietly drop or water down a decision to win points.

"Every category" means all the categories Lighthouse reports (Performance, Accessibility,
Best Practices, SEO, and Agentic Browsing in Lighthouse 13).

### 3.2 Mobile targets

Roughly the value that scores 0.99 on each of Lighthouse's mobile curves:

| Metric | Baseline | Target |
|---|---|---|
| First Contentful Paint | 3.5 s | ≤ 1.1 s |
| Largest Contentful Paint | 4.0 s | ≤ 1.7 s |
| Total Blocking Time | 1,440 ms | ≤ 80 ms |
| Speed Index | 4.3 s | ≤ 2.2 s |
| Cumulative Layout Shift | 0.021 | < 0.05 |

### 3.3 Budgets

- Nothing but the HTML (with inlined CSS, the shell markup and one small inline script) and
  the preloaded first-frame fonts may block the first paint.
- Entry JavaScript (gzip): 90 KB, enforced by `scripts/check-bundle.js`.
- three.js, the scene, GSAP, Deep Dive, the calendar, the sound engine and the star catalogue
  all load after first paint or on first use.
- No main-thread task over 50 ms during load on a mid-range phone (4× CPU slowdown).
- When nothing changes, nothing renders: no perpetual rAF loops or infinite CSS animations,
  except the time-based star scintillation (G2), capped at 15 fps, off in the background,
  off under reduced motion, and running in the worker where one exists.

### 3.4 How to measure

- Lighthouse CLI, median of three runs each for the mobile and desktop presets, against the
  Vercel preview deployment of the branch (it serves Brotli and real caching headers; a local
  `vite preview` is only a rough guide).
- Record baseline and result in every PR, with the LCP element and the longest tasks.
- Also check in a real browser: Performance panel with 4× CPU throttling for long tasks, and
  memory on the 4K texture path.

---

## 4. Architecture

### 4.1 Start-up sequence

1. **HTML paints the shell.** `index.html` carries inlined CSS, the prerendered shell (the
   same markup React will render first) and one tiny inline script. The script works out the
   date to show (the `?d=` link, or now), the time zone (`?tz=`, the saved place, or the
   browser's), a low-precision Moon phase and illumination, and writes the date, the phase name
   and the 2D Moon's terminator into the shell before first paint. The phase name is the LCP
   element. The script is allowed by a SHA-256 hash in the CSP, computed at build time.
2. **React takes over** the same DOM with `createRoot` and computes exact values. Where the
   shell's approximation differed, the text changes in place; nothing moves.
3. **The scene starts after first paint.** When its first frame is ready, the 3D Moon fades in
   over the 2D one (≤ 400 ms), at the same size, phase and orientation, so there is no jump.
4. **Everything else loads on idle or first use**: GSAP, Deep Dive chapters, the calendar, the
   location search, the sound engine, the 4K texture, the star catalogue.

There is no loading screen. The intro (Phase 5) plays over the real page.

### 4.2 The scene

- Plain three.js. React Three Fiber and drei are removed.
- One framework-free module, `src/scene/`, owns the Moon, the stars, the glow and the camera.
  It takes a canvas (`HTMLCanvasElement` or `OffscreenCanvas`) and exposes a small message-style
  API, so the same code runs in a worker or on the main thread:
  - `init({ canvas, width, height, dpr, quality, reducedMotion, textureUrl, view })`
  - `setView({ view })` from the selected date and place. As built in 1a, the view is the
    rotation from the Moon's own axes to the screen (libration, axis angle and parallactic
    angle folded together, from `getMoonView` in `src/utils/moonView.js`), the same
    rotation without libration (the flat photograph's pose), and the Sun's direction on
    screen; 1c adds the Moon's RA/Dec and the sidereal frame for the sky
  - `pointer({ kind, x, y, t })` for drag (the page hit-tests the disc itself), `reset()` for
    a double-click or double-tap, `settle()` once the page has faded the first frame in
  - `tilt({ x, y })` from device orientation, already normalised
  - `resize({ width, height, dpr })`, `setReducedMotion()`, `setQuality(level)`, `dispose()`
  - events back: `firstFrame`, `rotated` (offset present or not), `contextLost`, `fallback`
- **Worker where supported.** If `HTMLCanvasElement.prototype.transferControlToOffscreen`
  exists, transfer the canvas to a module worker running the scene. If the worker can't get a
  WebGL context, it posts `fallback`; the main thread then replaces the canvas (a transferred
  canvas can't be reused) and runs the same module directly. Detect features, never versions.
- **Render on demand.** A frame is drawn only when something changes: view, drag, inertia,
  tilt, resize, the halo moving over the sky, the fade-in, or scintillation within its budget.
- **Quality tiers**, chosen at start and lowered if frames run long:
  - high: 4K colour + normal map, glow, full star catalogue, device pixel ratio up to 2
  - medium: 2K colour + normal map, glow, full catalogue, ratio up to 2
  - low (older iPhones, low-memory Android, software rendering): 2K colour, analytic glow
    only, bright stars only, ratio 1.5
- Shader compilation uses `renderer.compileAsync` so the parallel-compile extension keeps it
  off the critical path where available. Texture uploads are staged, one per frame.
- Context loss is handled: re-create resources, never a blank Moon.

### 4.3 Motion

- GSAP stays (J5), always imported dynamically after first paint. Use its Flip plugin for
  anchored popovers and the stage re-frame. All GSAP plugins are free to use.
- CSS transitions for micro-interactions; GSAP for choreography and anything interruptible.
- Tokens: `--dur-1: 120ms`, `--dur-2: 200ms`, `--dur-3: 320ms`, `--dur-4: 600ms`;
  `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`; `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
- Everything interruptible: a panel closing mid-open reverses from where it is.

### 4.4 Sound

- The approved recipes are in [reference/luna-sound-lab.html](reference/luna-sound-lab.html).
  Port them as they are into `src/audio/`: same partials, envelopes, filters, reverb impulse,
  jitter and ambient graph. Tune only if the owner asks.
- Off by default. A sound toggle in the menu turns it on; the `AudioContext` is created inside
  that click. The engine's code loads only when sound is first turned on. The on/off choice is
  kept on the device.
- Map:

| Sound | Where |
|---|---|
| Glass tap | Button presses: the date bar, menu items, choosing a calendar day or a place |
| Felt press | Grabbing the Moon, closing overlays |
| Hover tick | Desktop only, very low: the date bar and menu items |
| Switch on / off | Toggles: sound, tilt, settings, entering or leaving live mode |
| Sheet open / close | Deep Dive panel and sheet, phone sheets |
| Day tick | Each day crossed while scrubbing or stepping; pitch from that day's illumination |
| Phase chime | Arriving at an exact phase by scrub, detent or jump; the phase's own chord |
| Meteor streak | The fling easter egg (C2); a quieter variant for shower meteors (Phase 6) |
| Quiet reward | The reward for staying (Phase 6) |
| Ambient bed | While sound is on; follows the selected date's illumination |

- Nothing ever plays on page load. Ticks are throttled while scrubbing (at most one per
  35 ms). On iPhone, Web Audio follows the silent switch; that is intended.

### 4.5 Hosting

- `vercel.json` sets the build and response headers: `frame-ancestors 'none'` and
  `X-Frame-Options` (both only work as headers), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` allowing
  geolocation, accelerometer and gyroscope for this origin only, `Cache-Control: public,
  max-age=31536000, immutable` for hashed files under `/assets/`, and `no-cache` for
  `index.html`, `sw.js` and the manifest. The rest of the content security policy stays in the
  `<meta>` tag the build writes, because it carries the inline script's hash, which changes
  with every edit to that script. Keep `public/_headers` in step for other hosts.
- `scripts/site-url.js` already resolves Vercel's production URL; production must build with
  base `/`.
- **GitHub Pages cutover**, once Vercel serves production and the owner confirms:
  - Replace the Pages deploy with a tiny redirect site: `index.html` and `404.html` that send
    `/Luna/<path>?<query>#<hash>` to the same path, query and hash on the new origin, so shared
    `?d=&at=` links keep working.
  - Ship a self-destructing `/Luna/sw.js` there: on install it skips waiting; on activate it
    deletes every cache, unregisters itself and navigates open clients to the new origin.
    Without it, installed and offline visitors stay on the old app.
  - Update `package.json` `homepage`, the README, social-card URLs and any hard-coded links.
- Later, `luna-kvn.xyz` is added to the Vercel project; `luna-kvn.vercel.app` redirects to it.
  The owner buys the domain; never buy anything.

---

## 5. Design language

"Quiet stage, instrument data" (A6): the home screen is almost nothing but the Moon, the sky
and one line of type; controls step back until reached for. Inside Deep Dive, data is laid out
like a measuring instrument: hairlines, tabular figures, units that are obvious, nothing
decorative.

### 5.1 Colour

Dark only (B7). Silver, plus one warm accent that means "now" (B6).

| Token | Value | Use |
|---|---|---|
| `--space-0` | `#04060b` | deepest sky, behind the stars |
| `--space-1` | `#060910` | page background, theme colour |
| `--ink-1` | `#f1f3f7` | primary text, active icons |
| `--ink-2` | `#c5ccd8` | secondary text |
| `--ink-3` | `#8a93a3` | muted text, labels (keep ≥ 4.5:1 for text) |
| `--ink-4` | `#4b5262` | disabled, decorative only |
| `--hairline` | `rgba(226, 232, 240, 0.14)` | control edges at rest, dividers |
| `--hairline-strong` | `rgba(226, 232, 240, 0.28)` | hover |
| `--hairline-active` | `rgba(226, 232, 240, 0.5)` | pressed, selected |
| `--panel` | `rgba(8, 11, 17, 0.98)` | panels and sheets: opaque enough that nothing ghosts through |
| `--scrim` | `rgba(3, 5, 9, 0.6)` | behind modal overlays: dim only, no blur (E10) |
| `--now` | `#e9c27d` | earthshine amber: live ⊙, live timeline thumb, the "now" marker on the Tonight chart. Nothing else. |
| `--now-glow` | `rgba(233, 194, 125, 0.35)` | glow around `--now` elements |

Values can be tuned in Phase 2, but the roles can't: one warm colour, one meaning.

### 5.2 Type

- **Cormorant Garamond** (400, 600) only at 24 px and up: the wordmark, phase names, hero
  numbers (E5) and chapter titles. `letter-spacing: normal` on every Cormorant element, always:
  any tracking turns off the `Q_u` ligature that draws the long-tailed Q the owner wants kept.
- **Inter** (variable) for everything else, with `font-variant-numeric: tabular-nums` wherever
  numbers can change or align.
- Outfit, JetBrains Mono, Cormorant 700 and italics are removed.
- Scale: 12, 13, 15, 17, 20, 24, 32, 44, 60, with the hero phase name on a `clamp()`.
- Sentence case everywhere (B5). No tracked uppercase labels.
- Preload only the files the first frame is set in: Cormorant 400 and 600 Latin (the phase
  name, the date, the wordmark). If the swap from the fallback face shows up as layout shift,
  add metric-matched fallback faces (`size-adjust`, `ascent-override`).

### 5.3 Space and shape

- 4 px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Controls are circles or capsules; panels 20 px corners, popovers 16 px.
- Cards are used only where a group needs separating; inside Deep Dive, hairlines separate rows.

### 5.4 Controls (D1, D7)

- Hairline instrument: transparent at rest with a 1 px `--hairline` edge; on hover the edge
  becomes `--hairline-strong` and a 4% fill appears; on press, a soft radial **light bloom**
  starts at the press point and fades out (CSS custom properties set on `pointerdown`), and the
  edge reaches `--hairline-active`. No scaling, lifting or glowing shadows on hover. No
  magnetic pull (C4).
- Sizes: 40 px on desktop, 48 px on touch screens for the date bar, at least 44 px elsewhere.
- One primary per view; everything else quieter.

### 5.5 Icons (D6)

A fully custom set, drawn for Luna: 24 px grid, 1.25 px strokes, round caps and joins, optical
alignment checked at 16 and 20 px. Inline SVG React components in `src/components/icons/`.
Needed at least: previous phase, previous day, now (⊙, with a live state), next day, next phase,
location, menu, close, share, sound on, sound off, tilt, settings, keyboard, privacy, about,
search, locate me, saved place (empty and filled), rise, set, peak, sunrise, sunset, calendar
previous/next, external link. Phase glyphs stay as the existing `MoonIcon`.

### 5.6 Cursor (C1–C4)

- The native pointer is always visible, except over the Moon (C3).
- **Moonlight halo**: one element, a wide soft radial light (roughly 360–520 px) that follows
  the pointer across the sky with a spring, moved by `transform` only, animating only while it
  moves. It fades out over controls, text and panels. Stars inside it brighten slightly (a
  pointer uniform in the star shader).
- **Over the Moon**: the native pointer hides and a hairline ring takes its place, with a
  "Drag to rotate" label the first time and grab/grabbing states. After a rotation it offers
  "Double-click to reset" (F7).
- **Over the timeline**: the existing date readout, restyled.
- **Fling easter egg** (C2): a fast flick across empty sky, never over controls, launches a
  meteor streak along the flick's path, with its sound if sound is on. Rare: at most once every
  45 seconds.
- Touch screens have none of this.

### 5.7 Copy (K1, K2)

Plain and observer-first: "Tonight", "Rises 6:40 pm in the east", "Back to now". No
"telemetry", "initializing" or "ephemeris" in the interface. 12-hour times as `6:40 pm`;
24-hour as `18:40`.

---

## 6. Surfaces

### 6.1 The stage

- The Moon is the hero, centred in the space available, drawn by the scene (§4.2), sized as
  today or larger.
- The phase name sits beneath it in Cormorant. Tapping or clicking it opens Deep Dive; it reads
  as a quiet link (a hairline underline or chevron on hover and focus), and it is a real button.
- **Orientation (F4)**: the disc is turned as it appears from the selected place and time, with
  the observer's zenith up.
- **Libration (F5)**: the true optical libration for the instant, diurnal included where cheap.
- **Drag (F7, H6)**: one-finger or mouse drag rotates the Moon, with inertia. The rotation is
  kept as an offset on top of the true orientation; libration and orientation keep updating
  underneath while scrubbing. Double-click or double-tap springs back.
- **Earthshine (F3)**: faint, visible only on thin crescents.
- **Glow (F6)**: a subtle bloom on the lit limb, stronger near full.
- **Sky (G1–G4)**: real stars (≈ 5,000 to magnitude 6, from the Yale Bright Star Catalogue or
  Hipparcos; check the terms and credit it on the about page), packed to a small binary file
  loaded after first paint. The Moon is drawn far larger than its true 0.5°, so the sky is a
  composite: a wide field (roughly 60–90° across the viewport) centred on the Moon's position,
  oriented to the observer's horizon, the Moon sitting in front of its actual constellation.
  Magnitude drives size and brightness on a power curve; colour index drives temperature.
  A few bright stars scintillate, rarely and subtly, on time not frames. Depth layers (G4):
  faint stars move least, bright stars a little more, the Moon more, the interface not at all.
- **Tilt (G5, G6)**: on phones, device orientation drives the same depth layers: small,
  spring-damped, a small dead zone, a recentre within about a second of settling. On iOS it
  starts only from the "Tilt to look around" control, which asks for permission; elsewhere it is
  on by default and the same control turns it off.
- **Idle (D3)**: after about 4 s with no input, the header, date block and timeline fade out,
  leaving the Moon and sky. Any pointer move, tap or key brings them back. Never while something
  has focus or a panel is open.

### 6.2 Header and menu (D2)

- Top left: the wordmark, the crescent redrawn as inline SVG (B1) beside "Luna" in Cormorant,
  static (B2), with a one-time reveal in the intro.
- Top right: one menu button. The menu holds: Deep Dive, Share, Sound on/off, Tilt to look
  around (touch devices), Settings (12h/24h and km/mi overrides, E4), Keyboard shortcuts
  (devices with a keyboard), Privacy, About.
- Nothing else in the header.

### 6.3 The date block (D4, D5)

- The date, then the location as a quiet caption beneath it; the caption is a button that opens
  the location picker, anchored to it.
- The five controls (previous phase, previous day, now, next day, next phase) as one hairline
  instrument bar attached to the date. ⊙ is always there: when live it is brighter, in `--now`;
  when not live it looks exactly like the other four.
- Clicking the date opens the calendar, anchored to it.
- Desktop: top centre. Phones: inside the bottom dock (§6.6).

### 6.4 The timeline (H1–H4)

- Structure kept: day ticks, phase icons, a glowing thumb. Restyled in the hairline language.
- No caption. On a first visit the thumb nudges once to show it moves.
- The thumb pulses only while live, in `--now`.
- Soft detents at the exact phases: the thumb eases into them when released nearby. On Android,
  a short haptic tick at each detent (`navigator.vibrate`); iOS browsers expose no haptics.
- Tapping a phase icon jumps to that exact phase.

### 6.5 Deep Dive (E1–E8)

- **Desktop**: a panel on the right, opaque (`--panel`). When it opens, the whole stage (Moon,
  phase name, date block, timeline) re-centres in the space left of it, animated with the
  panel; nothing is cut off (E1 and the owner's note on the timeline).
- **Phones**: a bottom sheet above the dock with three detents: peek (a row of key numbers:
  illumination, age, next phase), half (the Moon moves up and shrinks; the timeline stays
  usable) and full. The handle drags; a downward swipe or flick closes; velocity decides the
  detent; content scrolls only at full height, with a clean hand-off between sheet drag and
  scroll.
- **Content**, three chapters, each number shown once (E3):
  - **Tonight**: the 24-hour altitude chart as the centrepiece (E7): full width, horizon line,
    civil/nautical/astronomical twilight bands from SunCalc, moonrise and moonset marked on the
    curve, and a draggable "now" marker in `--now` that sets the time of day. Then rise, set,
    peak altitude with time and compass direction, sunrise and sunset.
  - **The Moon**: illumination and age as hero numbers in Cormorant; distance on a
    perigee–apogee scale; tropical and sidereal zodiac; the next exact phase with a countdown.
  - **The Orbit**: a crisp 2D SVG diagram (E8): Earth, the Moon's orbit, the sun's direction,
    the Moon at its elongation with its lit half, labelled plainly.
- Numbers: Cormorant for hero figures, tabular Inter in rows (E5). Units always visible.
- While scrubbing, values change instantly; once settled for about 250 ms, changed values
  cross-fade briefly (E6).
- Settings are gone from the top of Deep Dive (E4): 12h/24h and km/mi default from the locale
  (`Intl` hour cycle; miles for the US, UK, Liberia and Myanmar) and can be overridden in the
  menu's Settings.
- No icon beside every label; sentence-case labels; nothing ghosts through.

### 6.6 Phones (A5, H5)

- Top: the wordmark and the menu. Middle: the Moon and the phase name. Bottom dock, within
  thumb reach: the date, the location caption, the five-button bar and the timeline.
- The Deep Dive peek sits just above the dock.
- Safe areas respected on every edge; `dvh` units; no horizontal scroll at 320 px.

### 6.7 Overlays (E9, E10)

- One overlay system for the calendar, location picker, menu, settings, shortcuts, privacy and
  about. It sits above everything, the Deep Dive sheet included, which removes the
  popover-under-sheet bug by design.
- Desktop: each popover grows out of the control that opened it (GSAP Flip or a transform
  origin at the trigger) and shrinks back into it.
- Phones: the same content in a bottom sheet (shared sheet component).
- Modal overlays dim what's behind with `--scrim`; no blur. Non-modal popovers don't dim.
- Esc and outside clicks close the topmost overlay only; focus returns to its trigger.

### 6.8 First visit and intro (I1–I3)

- The first location is guessed from the device's IANA time zone (e.g. `Asia/Colombo` →
  Colombo) using the zone coordinates in tzdata's `zone1970.tab`, bundled as a small table. It
  is marked as a guess in the location caption until the visitor picks a place.
- One line, e.g. "Drag the Moon · Scrub the cycle", fades after the first interaction and never
  shows again on that device.
- The intro (Phase 5): up to 1.2 s, once per session, skipped by any input, and skipped
  entirely under reduced motion. It plays over the real page: the phase name is painted in the
  first frame; the intro may reveal the sky, sweep the terminator across the Moon, reveal the
  wordmark and bring the controls up.

---

## 7. Phases

Each phase is one pull request to master. Every phase leaves the site shippable.

### Phase 0: Foundation

Goal: host on Vercel, measure properly, paint before JavaScript, and fix the audit's bugs.

- `vercel.json` with the headers in §4.5. The owner creates the Vercel project `luna-kvn`
  connected to this repository (or asks Claude to do it through the Vercel connector).
- A Lighthouse script (`scripts/lighthouse.mjs`, `npm run lighthouse -- <url>`) that runs
  mobile and desktop three times each and prints the medians, the LCP element and the longest
  tasks. Output stays out of git.
- The static shell (§4.1): prerendered at build time from the same React components the app
  renders first, injected into `dist/index.html`, with the hashed inline "now" script. The
  loading screen is removed; the 2D Moon holds the stage until the 3D Moon's first frame, then
  cross-fades.
- CSS inlined into the HTML; the first-frame fonts preloaded.
- Fonts trimmed (B3): Outfit, JetBrains Mono, Cormorant 700 and italics removed; monospace
  numbers become tabular Inter.
- GSAP and the Deep Dive contents load after first paint (idle prefetch, so opening Deep Dive
  stays instant).
- The wordmark shimmer stops (B2); the timeline thumb pulses only while live (H3).
- Added once measured on Vercel: nothing redraws at rest. The current Moon renders on demand,
  the starfield redraws about fifteen times a second while still, and the cursor trail stops
  when the mouse does. PageSpeed renders WebGL in software, so every-frame drawing cost
  seconds of blocking time. Phase 1 replaces all three.
- Audit bugs: popovers opening under the Deep Dive sheet; km/mi clipped at 360 px; the date
  button's accessible name.
- GitHub Pages cutover (§4.5) once the owner confirms Vercel production works: a follow-up
  commit in this PR if Vercel is ready before merge, otherwise its own small PR.

Done when: mobile FCP ≤ 1.1 s and LCP ≤ 1.7 s on the Vercel preview; desktop stays at 100;
nothing listed in §2.1 has regressed; the old URL still reaches the app.

### Phase 1: The Moon and the sky

Goal: a Moon that looks photographed and a sky that looks observed, without blocking the main
thread.

Built in three pull requests, each shippable:

- **1a, the renderer and the true Moon**: the scene module and worker replacing React Three
  Fiber and drei (with the old look carried over), the new astronomy, orientation, libration,
  the drag offset and reset, the 2D Moon's orientation, and the SVG orbit (E8), which has to
  replace the old orbit scene before fiber can go.
- **1b, the photographed Moon**: textures, the lunar shader, glow, quality tiers.
- **1c, the observed sky**: real stars, the halo's pointer uniform, tilt, and removing the old
  starfield and aura.

- Replace React Three Fiber and drei with the scene module and worker (§4.2).
- Textures from the NASA SVS CGI Moon Kit (LRO colour and LOLA elevation; public domain, credit
  NASA's Scientific Visualization Studio): 2K and 4K colour, and a normal map generated from
  the elevation, with the pole blending done at build time instead of in the browser. Encoded
  as KTX2 (ETC1S for colour, UASTC for normals), with a one-off, documented script in
  `scripts/textures/`. Check that KTX2 transcoding works inside the worker on the floor
  browsers (the loader spawns its own workers); if not, transcode in the scene worker directly.
- The lunar shader (F2): Lommel-Seeliger with a little Lambert, the normal map, a small
  opposition surge near full, faint earthshine (F3), tone mapping, correct colour space.
- Glow (F6): an analytic limb glow on all tiers; a real bloom pass only on high.
- New astronomy with tests (§2.2): optical libration l, b; axis position angle P; subsolar
  selenographic point; parallactic angle q; the Moon's topocentric RA/Dec for the sky field.
- Orientation (F4), libration (F5) and the drag offset with double-click reset (F7).
- Real stars (G1–G4) in the same pass, the halo's pointer uniform, tilt (G5, G6) with the
  "Tilt to look around" control.
- The shell's 2D Moon gets the same orientation, so the cross-fade doesn't jump.
- Remove the old starfield canvas, the moon aura div and the Earth texture.

Done when: mobile TBT ≤ 80 ms on the worker path, mobile Performance ≥ 95 (aim 100), desktop
100; the main-thread fallback works (test with the worker disabled); no WebGL shows the 2D
Moon; reduced motion shows a static sky; 4K loads only on the high tier.

### Phase 2: Design language, header and controls

- Tokens (§5), the hairline controls with the light bloom, the custom icon set.
- The header and menu (§6.2), the date block with the live ⊙ (§6.3), idle fade (§6.1).
- The cursor (§5.6): remove `CustomCursor.jsx` and its 39 elements; add the halo, the Moon ring
  and the fling easter egg.
- The sound engine (§4.4), with every existing control wired to its sound.
- Copy (§5.7) across the app; 12-hour times without leading zeros.

Done when: every control uses one language; no hover scales or lifts; the icon set is
complete; sound is off by default and nothing loads until it's turned on.

### Phase 3: Deep Dive and overlays

- The desktop re-framing panel and the phone detent sheet (§6.5).
- The three chapters, the Tonight chart, the SVG orbit, serif hero figures, settled
  cross-fades, locale defaults with overrides in Settings.
- The overlay system (§6.7): calendar, location, menu, settings, shortcuts, privacy and about,
  anchored on desktop and as sheets on phones; dim-only scrim.

Done when: the Moon and timeline are never cut off; nothing ghosts through; each number
appears once; the sheet feels native on a real phone.

### Phase 4: Phones and the timeline

- The bottom dock (§6.6).
- The timeline restyle, first-visit nudge, detents with Android haptics, phase-icon jumps (§6.4).
- The first-visit line and the time-zone location guess (§6.8).

Done when: every control a phone needs is within thumb reach; the timeline has no caption;
a first visit from any time zone opens on a nearby city.

### Phase 5: Intro and Awwwards polish

- The cinematic intro (§6.8) and the wordmark's one-time reveal.
- An About view: what Luna is, how it works, credits (NASA SVS, the star catalogue, Meeus,
  SunCalc, fonts, OpenStreetMap/Nominatim) and the maker.
- A branded 404 page in Luna's own look, for any path that isn't the app (Vercel serves its
  plain "404: NOT_FOUND" today).
- A last design QA sweep at every breakpoint: spacing, alignment, wrapping, clipping,
  overflow, icon sizes, hover and focus states, animation jank, layout shift, dead CSS.
- A final performance pass against §3.
- When the owner has bought `luna-kvn.xyz`: add it to the Vercel project and update every URL.

Done when: the §3 numbers hold on the production domain, and the owner is ready to submit.

### Phase 6: New features

- **Meteor-shower nights**: the major showers' active windows and peaks, computed each year
  from solar longitude (so no yearly data updates), with radiants placed in the real-sky field.
  During a shower, meteors radiate from the radiant at a rate shaped by the shower's ZHR, the
  radiant's altitude and the moonlight, and Tonight mentions it.
- **The reward for staying**: a separate, simpler effect that appears after several minutes on
  the page. Design it with the owner first.

---

## 8. Checks for every pull request

- `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle`.
- Lighthouse medians before and after (§3.4), in the PR description.
- Screenshots or a short recording: desktop 1440×900, phone 390×844 and 360×780.
- Keyboard-only pass through everything the phase touched.
- Reduced motion on.
- No WebGL (Chrome started with `--disable-webgl`).
- Offline: `npm run build && npm run preview`, load once, go offline, reload.
- The worker path and the main-thread path both render (from Phase 1).
- Screen reader spot check of the live region and any new controls.
- The owner checks on a real iPhone and a real Android phone before merging.

---

## 9. Working agreements

- Commit messages follow the repo's style: `type(scope): summary` in plain English, then a
  body explaining why. **Never add a `Co-Authored-By` trailer.**
- Code comments explain why, in the same plain voice as the existing code.
- PR descriptions: what changed, why, the numbers, screenshots, anything left for the owner;
  ending with "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
- Keep the phase table in the decisions file current.
- Stop and ask the owner before: dropping or changing any decision, removing any capability in
  §2.1, buying anything, creating or changing hosting projects or DNS, adding a dependency over
  20 KB gzipped to first load, or submitting anywhere.
- If a phase grows too big for one reviewable PR, split it into numbered parts
  (`phase-3a`, `phase-3b`), each shippable.

---

## 10. Owner actions

- Create the Vercel project `luna-kvn` for this repository (Phase 0), or ask Claude to create
  it through the Vercel connector.
- Buy `luna-kvn.xyz` when ready (Phase 5).
- Test each phase on a real iPhone and Android phone before merging.
- Submit to Awwwards after Phase 5.
