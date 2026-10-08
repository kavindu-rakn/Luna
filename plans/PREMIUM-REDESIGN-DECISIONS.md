# Luna premium redesign: decisions

Record of what the owner decided for the second redesign round, and why. The build brief
that turns these into work is [PREMIUM-REDESIGN-MASTER-PROMPT.md](PREMIUM-REDESIGN-MASTER-PROMPT.md).

- Started: 2026-09-27
- Audit of the live site, with screenshots: https://claude.ai/artifact/4y3p1cbJgfeZe9PauvhY5E
  (the owner's answers are stored in that page's database, document `decisions/answers`)
- Approved sounds, playable: https://claude.ai/artifact/6XtTvgi3fwi2Hi8xvH3N3Z, source kept at
  [reference/luna-sound-lab.html](reference/luna-sound-lab.html)
- Builder: Claude, one pull request per phase. The owner reviews and merges.

Where a later answer in chat differs from the questionnaire, the chat answer wins. Those are
marked **settled in chat** below.

---

## 1. Why a second round

The first redesign (September 2026, [UI-REDESIGN-2026-09-22.md](UI-REDESIGN-2026-09-22.md))
changed the skin: colour, logo and fonts. The components underneath stayed the same, and they
are what reads as cheap.

### Baseline, 27 Sep 2026

Lighthouse 13.5 against https://kavindu-rakn.github.io/Luna/, headless Chrome 154.

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Mobile | **53** | 100 | 100 | 100 |
| Desktop | 98 | 100 | 100 | 100 |

Mobile metrics: First Contentful Paint 3.5 s, Largest Contentful Paint 4.0 s (the loading
screen's logo), Total Blocking Time 1,440 ms (seven long tasks, the largest 1,157 ms), Speed
Index 4.3 s, Cumulative Layout Shift 0.021.

A 10-second CPU profile of a mobile load at 4× slowdown attributed the JavaScript time to the
three.js scene (731 ms), app code and the starfield loop (about 300 ms) and the Moon texture's
pole blending on the main thread (258 ms). Start-up ephemeris maths was under 10 ms. About
3 s more was native work: WebGL, canvas and paint.

### The ten tells, worst first

1. **The Moon doesn't look like the Moon.** A 1024×512 texture stretched across ~515 CSS px
   (~1,000 device px on phones), no relief so the terminator has no crater shadows, PBR
   falloff that makes a full Moon look like a plastic ball, earthshine at 0.55 that makes a
   16% crescent read as a dim full Moon.
2. **The cursor fights the pointer.** The native arrow stays, a `difference`-blended dot sits
   on its hotspot and inverts the icon underneath on hover, and a 38-particle comet trails it.
   39 elements move through `left`/`top` every frame, forever. The layer sinks under native
   dialogs' top layer.
3. **Deep Dive covers the thing it describes.** On desktop the panel cuts the Moon (and the
   timeline) in half. No blur at 96% opacity, so header controls ghost through. Settings before
   content, five equal cards, phase/illumination/distance shown three times, an icon on every
   uppercase label, bold monospace numbers, ~7 px chart labels.
4. **On phones, Deep Dive is a fixed box.** 85% tall, a handle that does nothing, the Moon
   hidden while reading about it, content ghosting through.
5. **Four button dialects in one header.** Nothing leads; hover is lift-and-glow; a lightbulb
   opens keyboard shortcuts.
6. **Typography by accumulation.** Four families (168 KB on mobile), a shimmering wordmark,
   tracked uppercase micro-labels, sci-fi copy.
7. **A wallpaper, not a sky.** Uniform dots of one colour, all twinkling on a linear ramp at a
   frame-rate-dependent speed; parallax only moves the stars; the iOS motion prompt fires on
   the first tap anywhere.
8. **The loading screen is the slowest thing on the page.** It is the LCP element.
9. **The timeline explains itself.** "Drag the slider", an endless pulse, three mark systems.
10. **On phones the composition floats.** Every button in the top 155 px, loose gaps below.

### Bugs found during the audit

- On phones, the location and calendar popovers open underneath the Deep Dive sheet, their
  text bleeding through the cards.
- The km/mi toggle is clipped at the right edge on a 360 px-wide phone.
- The date button's accessible name ("Current Date. Click to open calendar.") doesn't contain
  the visible date, so voice-control users can't say what they see (WCAG 2.5.3).
- `public/_headers` does nothing on GitHub Pages, which also caps caching at 10 minutes.

---

## 2. Decisions

"Rec" marks the options Claude recommended; the owner's pick is in **bold**.

### A. Direction and scope

| ID | Question | Decision | Notes |
|---|---|---|---|
| A1 | How far this round goes | **Full re-imagining** | Rec was the art-directed shell redesign. |
| A2 | Presentation-only behaviour | **Open to real features** | New features include meteor-shower nights and a reward for staying (see G7). |
| A3 | Awwwards | **Yes, submit** | Needs an about/credits page and a strong first five seconds. |
| A4 | Audience | **Casual first, sky watchers on demand** (rec) | "This is also my best and most complete project in the portfolio." |
| A5 | Leading device | **Equal priority** | Both layouts get bespoke treatment. |
| A6 | Mood | **Quiet stage, instrument data** (rec) | Quiet minimal on the home screen, observatory instrument inside Deep Dive. |
| A7 | Sound | **Optional ambient bed, off by default** | Owner's reference: https://www.21hrs.space/ (sound on button clicks). See "Sound" below. |
| A8 | Reference sites | https://www.21hrs.space/ | For its button sound effects. |

### B. Brand and type

| ID | Question | Decision | Notes |
|---|---|---|---|
| B1 | Crescent mark | **Redraw as inline SVG, same shape** (rec) | "I like the logo." |
| B2 | Wordmark shimmer | **Static, with a one-time reveal on load** | |
| B3 | Type system | **Trim to Cormorant + Inter** (rec) | Cormorant only at 24 px and up; Inter everywhere else, numbers in tabular figures. **Keep the Qu tail**: Cormorant's long-tailed Q is the `Q_u` ligature, which any non-zero `letter-spacing` switches off. |
| B4 | Paid typeface budget | **No, free fonts only** | |
| B5 | Uppercase micro-labels | **Sentence case, small and muted** (rec) | |
| B6 | Accent | **Silver, plus one warm accent for "now"** (rec) | An earthshine amber, used only for live/now. |
| B7 | Display modes | **Dark only** (rec) | |

### C. Custom cursor

| ID | Question | Decision | Notes |
|---|---|---|---|
| C1 | What the cursor is | **Halo and contextual states together** (rec) | Native pointer + a soft moonlight halo in the sky only + contextual states on the Moon and timeline. |
| C2 | Comet trail | **Keep as a rare easter egg** | A meteor streak when the pointer is flung fast across empty sky. **Settled in chat:** separate from the "reward for staying". |
| C3 | Hide the native pointer | **Only over the Moon** | A bespoke rotate cursor on the one draggable object. |
| C4 | Magnetic buttons | **No** (rec) | |

### D. Buttons and controls

| ID | Question | Decision | Notes |
|---|---|---|---|
| D1 | Control language | **Hairline instrument** (rec) | No fill at rest, 1 px engraved edge; fill on hover and press. |
| D2 | Desktop header | **Wordmark only; everything in one menu** | **Settled in chat:** the location shows as a quiet caption under the date (tap to change); tapping the phase name opens Deep Dive (also the D key and the menu); on phones a slim grabber above the timeline is the entry (changed from the sheet's peek on 8 Oct 2026, see E2). |
| D3 | Idle fade | **None** | **Settled in chat (8 Oct 2026):** dropped in 2b's review. Built as a 4 s fade, it left nothing to do but look at a still Moon, like an awkward silence; Luna's motion is already enough. The controls stay. |
| D4 | Date navigation | **Five buttons, redrawn as one bar attached to the date** | |
| D5 | Today | **⊙ icon always visible** | Owner's note: combine the icon and the live indicator. When live, ⊙ is brighter (in the warm "now" accent); when not live, it matches the other four. Keeps the symmetry. |
| D6 | Icons | **Fully custom set** | |
| D7 | Press feedback | **A soft light bloom from the press point** (rec) | |

### E. Deep Dive and dialogs

| ID | Question | Decision | Notes |
|---|---|---|---|
| E1 | Deep Dive on desktop | **Panel over the stage, stage re-frames** (rec) | Owner: "The timeline cut-off should also be fixed." The whole stage re-centres in the space left of the panel. |
| E2 | Deep Dive on phones | **One sheet, from a grabber above the timeline** | **Settled in chat (8 Oct 2026), after testing on the owner's phones:** the peek and the half height are gone. The peek's numbers repeated Deep Dive and cluttered the stage, nothing said it could be lifted, it covered the timeline's tags and sat on the timeline like a block; half height showed little. Now a slim grabber in the timeline's own colour is the way up, and the sheet rises to just under the top of the screen, stopping at the timeline so it can still be scrubbed. The grabber and the sheet's top drag it; swipe or flick down, ✕ and Esc close it. Deep Dive stays in the menu everywhere. |
| E3 | Content | **Three chapters: Tonight, The Moon, The Orbit** (rec) | Each number once. |
| E4 | 12h/24h and km/mi | **Default from locale, override in a small settings menu** (rec) | |
| E5 | Numbers | **Serif figures for hero numbers, tabular sans in tables** (rec) | |
| E6 | Value changes | **Instant while scrubbing, soft crossfade when settled** (rec) | |
| E7 | Altitude chart | **Centrepiece of Tonight** (rec) | Full width, horizon, twilight bands, rise/set on the curve, draggable "now" marker. |
| E8 | Orbit diagram | **Crisp 2D SVG** (rec) | Retires the 512 KB Earth texture and the second WebGL context. |
| E9 | Dialogs and popovers | **Anchored: each grows from its control; sheets on phones** (rec) | Fixes the popover-under-sheet bug by design. |
| E10 | Behind dialogs | **Dim only** (rec) | No backdrop blur. |

### F. The Moon

| ID | Question | Decision | Notes |
|---|---|---|---|
| F1 | Texture | **Progressive 2K then 4K, with a normal map** (rec) | NASA LRO colour and elevation, GPU-compressed. |
| F2 | Shading | **A lunar shader** (rec) | Lommel-Seeliger / Hapke-style. |
| F3 | Earthshine | **Faint, visible only on thin crescents** (rec) | |
| F4 | Orientation | **As seen from the chosen place and time** (rec) | Rotated by the parallactic angle: the "boat" crescent near the equator. |
| F5 | Libration | **Show real libration** | Claude first recommended ignoring it as "nearly invisible"; that was wrong: at desktop size the ±7.9° nod moves central features by ~35 px, and it shows clearly when scrubbing a month. |
| F6 | Glow | **Subtle bloom on the lit limb, stronger near full** (rec) | |
| F7 | After a drag | **It stays where it was left** | **Settled in chat:** the drag is kept as an offset on top of the true orientation, so libration and tilt keep updating underneath when scrubbing. Double-click or double-tap resets; once rotated, the Moon cursor says so. |

### G. Starfield and gyro

| ID | Question | Decision | Notes |
|---|---|---|---|
| G1 | Stars | **The real sky around the Moon** (rec) | The Moon sits in front of its actual constellation. |
| G2 | Twinkle | **Rare, subtle scintillation on a few bright stars, time-based** (rec) | |
| G3 | Renderer | **GPU points in the Moon's WebGL pass** (rec) | |
| G4 | Desktop parallax | **Depth layers: far stars, near stars, Moon, interface** (rec) | **Settled in chat (7 Oct 2026):** the Moon holds still with the interface and the sky slides behind it, the faintest stars most. A Moon that moved with the hand read as a cheap magnetic-button effect. |
| G5 | Gyro permission | **From its own control** (rec) | "Tilt to look around". No prompt on first tap. |
| G6 | Tilt feel | **Smaller, spring-damped, a small dead zone, quicker recentre** (rec) | |
| G7 | Ambient sky events | **Meteors only on real shower nights** | Owner: "Meteor shower feature is going to be added, plus the rare reward for staying too, but different and simpler than the actual meteor shower feature's effect. These will attract people to check the app." |

### H. Timeline and phone layout

| ID | Question | Decision | Notes |
|---|---|---|---|
| H1 | "Drag the slider" | **Remove it; a one-time thumb nudge teaches the drag** (rec) | |
| H2 | Timeline look | **Ticks, phase icons and a glowing thumb, as now** | Structure kept, restyled in the new language. |
| H3 | Thumb pulse | **Pulse only while live** | Same warm "now" accent as the live ⊙. |
| H4 | Scrub feel | **Soft detents at exact phases, with haptics on Android** (rec) | |
| H5 | Phone layout | **Bottom dock** (rec) | Date, location caption, the five-button bar and the timeline within thumb reach; the top keeps the wordmark and the menu. |
| H6 | Phone gestures | **One-finger drag rotates, as now** | No swipe-to-change-day. |

### I. First impression

| ID | Question | Decision | Notes |
|---|---|---|---|
| I1 | Loading screen | **A short cinematic intro** | Up to 1.2 s, once per session, skippable. It must reveal the real page rather than cover it, so the phase name is visible from the first frame (LCP and Speed Index). |
| I2 | First-visit guidance | **One line that fades after the first interaction** (rec) | |
| I3 | First-visit location | **Guess from the device time zone** (rec) | No permission, no network request. |

### J. Performance and engineering

| ID | Question | Decision | Notes |
|---|---|---|---|
| J1 | Target | **100 in every category, mobile and desktop** (rec) | Owner: "If some decisions are discarded in order to hit a perfect hundred score in mobile, inform and explain to me first, then we will discuss again what will be changed. 100 on desktop is a must and we should aim for 95+ on mobile if not 100." |
| J2 | Where the 3D runs | **Plain three.js, in a worker where supported** | **Settled in chat.** The questionnaire said (a), React Three Fiber on the main thread, with the owner rejecting a worker-only renderer because it would cut users. The final choice drops React Three Fiber and drei; one scene module runs in an OffscreenCanvas worker where the browser supports WebGL there and on the main thread everywhere else, so every visitor still sees the 3D Moon. Lighthouse runs in Chrome, so it measures the worker path. |
| J3 | Static shell | **Prerender header, date, phase name and 2D Moon** (rec) | |
| J4 | Hosting | **Vercel** | **Settled in chat.** Questionnaire said Cloudflare Pages. See "Hosting" below. |
| J5 | Animation stack | **Keep GSAP** | Load it after first paint. Its Flip plugin also gives anchored popovers on iOS 15, which lacks View Transitions. |
| J6 | Browser floor | **Full experience back to iOS 15** | **Settled in chat:** iOS 15.4 or later (every iOS 15 device can update to 15.8; `:has()` and `dvh` need 15.4). |
| J7 | Who builds | **Claude builds, in phased PRs** | |

### K. Words

| ID | Question | Decision | Notes |
|---|---|---|---|
| K1 | Voice | **Plain and observer-first** (rec) | "Tonight", "Rises 6:40 pm in the east". |
| K2 | 12-hour format | **6:40 pm** (rec) | 24-hour stays 18:40. |

---

## 3. Settled in chat after the questionnaire

### Hosting: Vercel, at luna-kvn.vercel.app, later luna-kvn.xyz

- The owner already hosts almost everything on Vercel and wants uniform project domains
  (`luna-kvn.xyz`, `prompta-kvn.xyz`, `zchema-kvn.xyz`). Until the domain is bought, Luna lives
  at `luna-kvn.vercel.app`.
- Vercel's .xyz price, checked on 27 Sep 2026: $1.99 for the first year, $13 a year to renew.
  `luna-kvn.xyz` was available; `kavindu-rakn.xyz` was already taken by someone else.
- Why not Cloudflare: its only real advantage for Luna is unlimited static bandwidth. Vercel's
  free Hobby plan includes the first 100 GB of transfer a month, shared across all of the
  owner's Vercel projects, and sustained use past its limits can pause deployments. After the
  redesign a first visit is estimated at 2–4 MB on desktop and 1–1.5 MB on phones, so 100 GB is
  roughly 30,000–50,000 first visits a month. That is comfortable in normal months; the risk is
  a spike (an Awwwards feature). Mitigations: keep first visits light, load the 4K texture only
  on large screens, keep the build host-neutral, and check usage before submitting.
- Hobby is for non-commercial use. Donations are allowed; ads or selling anything would need
  Vercel Pro.
- Old `kavindu-rakn.github.io/Luna/` links, including shared `?d=&at=` links, must keep working
  after the move (see the master prompt, Phase 0).

### Sound: every sound generated in the browser

The owner listened to the sound lab and approved every sound as it stands: "They felt exactly
right for Luna." All interface sounds and the ambient bed are synthesised with the Web Audio
API; no audio files. The lab's source is the reference implementation:
[reference/luna-sound-lab.html](reference/luna-sound-lab.html).

For comparison, 21hrs.space plays four recorded files (207 KB of WAV and MP3), all downloaded
when the page opens.

---

## 4. Tensions and how they're resolved

| Pull | Resolution |
|---|---|
| F7 "stays where left" and H6 drag-to-rotate vs F4/F5 true orientation and libration | The drag is an offset on top of the true orientation; double-click/tap resets. |
| D2 wordmark-only header vs a location that changes every number | Location as a caption under the date; the phase name opens Deep Dive. |
| I1 cinematic intro vs LCP and Speed Index | The intro reveals the real page; the phase name is painted in the first frame. |
| J6 iOS 15 vs View Transitions, OffscreenCanvas WebGL and the Popover API | GSAP Flip for anchored motion; main-thread renderer fallback; no reliance on the Popover API. |
| J2 main-thread 3D vs a mobile 100 | Worker where supported, main thread elsewhere. |
| J5 keep GSAP vs first-load bytes | GSAP loads after first paint. |
| G1 real sky vs the Moon's true size | The Moon is drawn far larger than its 0.5° against a wide sky field, like a composite photograph. The sky is oriented to the observer's horizon and centred on the Moon's position. |
| A2 open to features vs finishing the redesign | New features (meteor showers, reward for staying) come after the redesign, as their own phase. |
| F5 real libration vs a flat Moon photographed with none | The 3D Moon's first frame takes the photograph's pose, at the true tilt and lighting; once the page has faded it in, it nods into the libration of the moment over 1.6 s. Under reduced motion it starts at its true libration. |

---

## 4b. Settled in chat after Phase 0

- **Branded 404 page** (6 Oct 2026): an unknown path currently ends on Vercel's plain
  "404: NOT_FOUND" page. The owner wants a branded one, in a later phase: Phase 5's polish.
- **Phase 1 in three parts**, as the working agreements allow: 1a the renderer and the true
  Moon, 1b the photographed Moon (textures, lunar shader, glow, quality tiers), 1c the
  observed sky (stars, tilt). The SVG orbit (E8) moved into 1a, because the old orbit was the
  other React Three Fiber scene and fiber can only go once both are gone.

---

## 5. Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation: Vercel, measurement, static shell, no loader, fonts, GSAP after paint, audit bugs, render on demand | Done: PR #51 merged 6 Oct 2026; GitHub Pages forwards to Vercel |
| 1a | The renderer and the true Moon: scene worker with main-thread fallback, fiber and drei removed, libration, tilt and lighting from new astronomy, drag offset and reset, SVG orbit | Done: PR #55 merged 6 Oct 2026 |
| 1b | The photographed Moon: NASA textures (KTX2, 2K/4K, normal map), lunar shader, glow, quality tiers | Done: PR #57 merged 7 Oct 2026 |
| 1c | The observed sky: real stars around the Moon, planets, depth layers, scintillation, tilt | Done: PR #58 merged 7 Oct 2026 |
| 2a | The instrument: tokens, hairline controls with the light bloom, the custom icon set, copy | Done: PR #60 merged 7 Oct 2026 |
| 2b | Header and date: wordmark and menu, the date block with the live ⊙, the phase name opening Deep Dive | Done: PR #61 merged 8 Oct 2026 |
| 2c | Cursor and sound: halo, Moon ring and fling meteor; the sound engine wired to every control | Done: PR #63 merged 8 Oct 2026 (with the settings fix, #62) |
| 3a | Deep Dive's frame: the re-framing panel on wide screens, the detent sheet on phones | In review |
| 3b | Deep Dive's three chapters: Tonight, The Moon, The Orbit; each number once; settled cross-fades | Not started |
| 3c | One overlay system: anchored popovers on wide screens, sheets on phones, dim-only scrim | Not started |
| 4 | Phones and the timeline: bottom dock, timeline restyle, detents and haptics, first-visit touches | Not started |
| 5 | Intro and Awwwards polish: cinematic intro, about/credits, branded 404, final performance pass, domain | Not started |
| 6 | New features: meteor-shower nights, reward for staying | Not started |

### Phase 0 notes

- Local Lighthouse, 5 runs each against `vite preview` under the same conditions: mobile
  44 → 55, desktop 76 → 89; first paint 3.7 → 2.5 s, largest paint 4.9 → 4.1 s, blocking time
  2.4 → 1.9 s, layout shift 0.021 → 0. This machine is noisy (master alone swung from 52 to 44
  on mobile within the day), and `vite preview` serves uncompressed files, so only same-run
  comparisons mean anything.
- Vercel project `luna-kvn` created on 5 Oct 2026; production is https://luna-kvn.vercel.app.
  Renamed `luna` on 7 Oct 2026. The production address is unchanged, but preview URLs now
  start `luna-git-`.
  Vercel Authentication is off for this project (owner's choice), so previews open without a
  login. Previews always score SEO 60 and Best Practices 92: Vercel sends `x-robots-tag:
  noindex` and injects its comment toolbar, which our CSP blocks. Production has neither.
- PageSpeed Insights on master as served by Vercel: mobile 56, desktop 60. Desktop
  blocking time was 4.1 s although first and largest paint were 0.4 s: its servers render
  WebGL in software, and the Moon, starfield and cursor trail redrew every frame forever.
  Hence the render-on-demand step added to this phase.
- Lighthouse medians on the Vercel preview (3 runs, this machine), before and after
  rendering on demand: mobile 66 → 78 (first paint 1.3 s, largest paint 2.0 s, speed index
  2.3 s, blocking time 0.77 s), desktop 100 → 99–100 (blocking time ~50–75 ms).
- What's left on mobile is main-thread work: fiber and three.js starting up (with the
  software WebGL Lighthouse uses, creating a context alone cost 1.5 s), the texture's pole
  blending, and React's first render. Phase 1's worker renderer is aimed at exactly this.
- Tried and reverted: loading the app from the inline script after first paint. It only
  moved the app's start-up into the window Lighthouse counts as blocking time.
- The owner's phone check (6 Oct 2026) found two things on the preview:
  - A visible jump from the flat Moon to the 3D one, on desktop, iOS and Android. The
    old close camera (5.8 units, 40° lens) drew the sphere's outline about 5% larger
    than the flat Moon and hid part of a crescent's lit edge, and Lambert shading thinned
    the crescent further. The flat Moon had a hard terminator, a grey night side and a
    dimmer bright limb. Now the camera stands 300 units off, the sphere reflects by the
    Lommel-Seeliger law, and the flat Moon is shaded in 32 steps along the same law, with
    an earthshine filter fitted to the 3D Moon's night side. Measured flat against 3D
    along the disc's middle at five phases: the same size, and brightness within about 5%
    (10-20% on a crescent's bright limb).
  - Spinning the Moon took many swipes on Android. Chrome claimed the swipe as a page pan
    and cancelled the drag after a couple of moves (reproduced with emulated touch). The
    canvas now sets `touch-action: pinch-zoom` and captures the pointer, and the spin on
    release comes from speed, timed by the events themselves, so 120 Hz and 60 Hz flicks
    at the same speed leave the same spin.

### Phase 1 notes

- 1b's textures come from NASA SVS's CGI Moon Kit (svs.gsfc.nasa.gov/4720): the owner chose the
  2025 colour map (`lroc_color_16bit_srgb_4k.tif`, 61.9 MB) over the 2019 one, with
  `ldem_16_uint.tif` (33.2 MB) for relief. `scripts/textures/build.mjs` fetches them into a
  git-ignored folder and writes the committed textures and the flat Moon's photograph.
- The 2025 map is albedo only, brighter and in colour, with no shading baked in, where the old
  texture had crater shadows painted on. Relief now comes from LOLA elevation through the normal
  map, lit from the Sun's true direction: crisp along the terminator, gone at full.
- Sizes: colour 410 KB (2K) and 1.5 MB (4K, large screens only), relief 663 KB. The relief was
  compared on a quarter Moon's terminator: ETC1S with all three directions was 450 KB and soft;
  UASTC was crisp at 1.9 MB; ETC1S with the two directions stored apart was nearly as crisp at
  663 KB. The flat Moon's photograph is 20 KB, down from 27 KB, at 512 px.
- The flat Moon's photograph is lit and tone-mapped as the 3D Moon lights a full Moon, and
  matches it there within 4% along the disc. At other phases its stepped shading matches at the
  terminator; 20-35° in, the 3D Moon's relief shadows darken rough ground by about a fifth,
  which a photograph can't follow for every Sun direction, so the relief fades in with the 3D
  Moon. Its earthshine is fitted to the shader's own maths to within two levels in 255.
- F6's glow first ran inside the canvas, which is barely taller than the Moon, so its top and
  bottom were cropped into a light rectangle, worst at full (the owner's phone check, 7 Oct 2026).
  It is now a CSS gradient behind both Moons, which the canvas can't crop and the flat Moon
  shares from the first frame. The owner dropped the brief's bloom pass the same day.
- The owner asked why the full and new Moons look flat while other phases show sharp relief.
  That is the real Moon: at full the Sun is behind the viewer and every slope it lights faces the
  viewer too, so there are no shadows; earthshine, which lights the new Moon, comes from Earth,
  behind the viewer, for the same reason. A "relief floor" was tried (relief lit from 12° or 20°
  off the viewer): it added almost nothing to the face and piled black shadows along one limb,
  so the shader stays physical.
- Earthshine shows on crescents but not gibbous Moons, as F3 decided and as on the real Moon:
  seen from a gibbous Moon, Earth is a thin crescent, and its light is a sliver of what reaches a
  young crescent Moon from a nearly full Earth.
- 1c's sky comes from two CDS catalogues the owner approved on 7 Oct 2026: the Bright Star
  Catalogue (V/50, 5,080 stars to magnitude 6, packed by `scripts/sky/build.mjs` into a 30 KB
  file the service worker precaches) and Roman's constellation boundaries (VI/42), which name
  the constellation behind the Moon in its screen-reader label, so the sky is also text (2.3).
- **The five naked-eye planets were added** (owner, 7 Oct 2026): the Moon travels the ecliptic
  as they do, and a sky without them is wrong whenever one is up. Positions from JPL's
  approximate Keplerian elements, tested against JPL Horizons; magnitudes from the Astronomical
  Almanac's formulas, with Saturn's rings.
- The stars have to share the Moon's WebGL pass (G3), so the scene's canvas now covers the whole
  screen behind the interface. The Moon is rendered into a box of its own, the size of the
  page's Moon area, with 4× antialiasing, and laid onto the canvas at whole pixels; the canvas
  itself has no antialiasing and no depth buffer. On a phone that keeps memory near what the
  Moon's own canvas used, and a frame where only a star changes reuses the Moon as drawn. The
  glow moved back into the scene, now that nothing can crop it; the page's CSS glow stays for
  the flat Moon and fades out as the scene fades in. Measured on a real
  GPU: the 3D Moon's outline lands on the flat Moon's to the pixel.
- The composite (section 4, G1): an 80° field across the screen's diagonal. The drawn Moon
  covers about 14° of sky in every direction (about 16° on a phone), so stars and planets that
  close to the Moon are behind it, as in a composite photograph: a planet beside the Moon in
  the real sky shows only once it is more than about 14° away. The owner kept this as decided
  (7 Oct 2026), over a narrower field or pushing nearby objects out to the Moon's edge.
- Depth layers (G4, changed in chat): first built as the brief had them, the Moon moving most
  (up to 10 px, stars 3-6 px). The owner found a Moon that follows the cursor and the tilt
  gimmicky, like magnetic buttons, so it now holds still with the interface and the sky slides
  behind it, as the background does when a camera circles its subject: the faintest stars
  about 7 px, the brightest about 4, on a spring, with the mouse on desktops and the tilt on
  phones. The movement between Moon and stars, which is what reads as depth, is the same as
  before. It also keeps the Moon a still target for dragging, keeps it on its phase name, and
  means the Moon never renders again just because the stars moved. Measured: Saturn slides 4 px
  with the pointer at the screen's edge and the Moon's pixels don't change; tilting 12° slides a
  star 3.6 px, and holding still brings it back exactly. Twinkle: one bright star at a time for about 2 s, every 3.5-9 s, ±13% in brightness,
  about 14 frames a second while it lasts and none in between; none under reduced motion.
- "Tilt to look around" sits in the header, on phones only, until Phase 2's menu takes it.
  Recent Chrome also has iOS's permission step but grants it without asking, so the page asks
  once without a tap (which never prompts): tilt starts wherever no prompt is needed, and on an
  iPhone it waits for the control.

### Phase 2 notes

- Phase 2 in three parts, as the working agreements allow (7 Oct 2026): 2a the instrument
  (tokens, controls, icons, copy), 2b the header and date block, 2c the cursor and sound.
- 2a keeps every surface where it is and changes how it looks and reads. The section 5 tokens
  are in `:root`; the stylesheet's older names now point at them, so the lavender accent is gone
  everywhere at once, and later phases retire the old names as they rebuild each surface.
  Panels and popovers are opaque (`--panel`), with no blur; the modal scrim dims only.
- Controls: transparent at rest with a hairline edge, a 4% fill and a brighter edge on hover,
  nothing scaled or lifted. The press bloom is CSS on `::after`, started by a capture-phase
  pointer listener (`src/utils/pressBloom.js`) that records where the press landed; a key press
  blooms from the middle. It swells for the first fifth of 600 ms, then fades as it spreads.
- The icon set: 34 icons drawn for Luna in `src/components/icons/icons.js`, plain path data that
  `Icon.jsx` draws and a contact sheet can render too. Lucide is removed, which took 1.6 KB off
  the entry. The peak icon is a dotted path with the Moon at its top.
- Copy: no "telemetry" or "ephemeris"; sentence case; labels lost their decorative icons;
  12-hour times read "6:40 pm" (K2), 24-hour "18:40". Cormorant now only appears at 24 px and up,
  except the date pill, which 2b redraws. "Drag the slider" stays, in sentence case, until
  Phase 4's first-visit nudge replaces it. The live timeline thumb pulses in `--now`.
- 2b rebuilds the header (D2): the wordmark, the date block in the middle, one menu on the
  right. The crescent is redrawn as vectors fitted to the old 128 px mark: a dark disc, its
  rim, and the crescent cut from one circle by another, its horns reaching just past the rim
  (B1). The glow is a CSS drop shadow, so the same mark can be drawn plain.
- The date block (D4, D5): the date in Cormorant at 24 px opens the calendar; the place sits
  beneath it as a quiet caption that opens the location picker, anchored to it; the five
  controls are one hairline capsule, ⊙ lit in `--now` while the view follows the clock and
  otherwise drawn like the other four. On phones it stays at the top under the wordmark and
  menu until Phase 4's bottom dock; its caption's touch target is 36 px there, short of 44,
  for that interim, so the Moon keeps its size.
- The menu is a disclosure, not an ARIA menu, since it holds actions, a switch and two radio
  groups. It holds Deep Dive, Share, Tilt to look around (touch screens, motion allowed),
  Keyboard shortcuts (devices with a keyboard), Privacy, and the clock and distance settings
  (E4), which moved out of Deep Dive. Sound joins in 2c, About in Phase 5.
- The phase name is a real button that opens Deep Dive, drawn as text with a hairline
  underline on hover and focus.
- No idle fade (D3, settled in chat on 8 Oct 2026). 2b built one: after 4 s untouched the
  header and the timeline faded, leaving the Moon, the sky and the phase name. In review the
  owner dropped it: with nothing to do but look at a still Moon, it felt like an awkward
  silence, and Luna's motion is already enough. The controls stay.
- 2c replaces the comet cursor (C1–C3). The native pointer stays. With a mouse, a moonlight
  halo (480 px, transform only) trails it on a critically damped spring, beneath the scene's
  canvas so the Moon covers it and only sky is lit; it fades over controls, text and panels.
  The scene steps the same spring (`src/utils/spring.js`) for the stars it brightens, so the
  light and the stars move as one, and stops drawing once both settle.
- Over the Moon's disc a hairline ring replaces the pointer, closing a little while the Moon
  is held. "Drag to rotate" shows beside it until the first turn (remembered on the device as
  `luna_moon_hint`, listed in the privacy dialog); while the Moon is turned it reads
  "Double-click to reset" (F7). Labels wait 300 ms, so passing over the Moon says nothing.
- The fling (C2): a flick of at least 300 px (or 22% of the width) at 3 px/ms or faster, nearly
  straight, all of it over open sky at least 32 px clear of the Moon's limb, launches a meteor
  along its path and on past it while the sky ahead stays empty. Once per 45 s at most. The
  streak lasts 0.95 s, matched to its sound's spark. None of this with touch or reduced motion.
- Sound (A7, the master prompt 4.4): the lab's recipes, ported unchanged into
  `src/audio/engine.js`, which loads only once sound is first turned on. The AudioContext is
  made inside the Sound switch's press, or, when sound was left on last visit, inside the
  first press of the new one; nothing plays as the page loads. One change, a parameter not a
  recipe: the meteor pans the way the streak on screen crosses, where the lab always panned
  left to right. Sound rests while the page is hidden.
- One action, one sound. Cues raised together are weighed and only the most telling plays:
  Deep Dive's sheet, then a phase chime, the meteor, a switch (Sound, Tilt, the settings, a
  saved place), a glass tap (menu items, calendar days and months, places), leaving or
  returning to now, the felt press (closing a panel, grabbing the Moon), a day tick, a hover
  tick. Date sounds follow the view rather than the control: whatever moved the date (a
  button, a key, the timeline), a day crossed ticks at the pitch of that day's illumination
  and an exact phase reached by scrub, step or jump rings its chord (`src/audio/cues.js`).
- Phase 3 in three parts, as with Phases 1 and 2 (agreed in chat on 8 Oct 2026): 3a the frame,
  3b the chapters, 3c the overlays. On phones the sheet sits above the timeline until Phase 4's
  dock slots in beneath it.
- 3a, wide screens (960 px and up): Deep Dive is an opaque panel, 31 rem, on the right. The
  stage (header, Moon, phase name, timeline) narrows to the space beside it with the panel's
  own easing, so nothing is cut off (E1). The scene follows the Moon's area a frame at a time;
  a Moon that only moved is laid down again rather than rendered, and its box only grows
  while the stage moves, fitting itself again 400 ms after it stops.
- 3a, phones (E2, as changed in chat on 8 Oct 2026): one sheet, open or closed. 3a's first
  build had a peek of three numbers and a half height; on the owner's iPhone and Android the
  peek cluttered the stage and covered the timeline's tags, half height showed little, and the
  sheet, sized from measurements, left a gap above the timeline and once would not close.
  Now a slim grabber (a 36 × 4 px pill in the timeline's colour, with a 120 × 28 px reach)
  sits just above the timeline, and the sheet rises from there to just under the top of the
  screen. It is laid out inside the stage's own box, which ends where the timeline begins,
  so it meets the timeline exactly on every phone with nothing measured; closed, it is
  hidden, not just moved out of sight. The timeline sits above it, so its tag over the thumb
  still shows while scrubbing with the sheet open. The grabber and the sheet's top drag it,
  timed by the events themselves; a release's speed, carried on 220 ms, decides open or
  closed; at the top of scrolled contents a pull down takes it down. A press on the close
  button is never taken for a drag. The drag code loads as its own chunk after first paint.
  The stage doesn't re-frame on phones; the Moon keeps its size, less the grabber's 16 px
  where the height is tight.
- 3a made `--panel` opaque: at 98% the header's date ghosted through the full-height sheet.
