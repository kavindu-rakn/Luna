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
| D2 | Desktop header | **Wordmark only; everything in one menu** | **Settled in chat:** the location shows as a quiet caption under the date (tap to change); tapping the phase name opens Deep Dive (also the D key and the menu); on phones the sheet's peek detent is the entry. |
| D3 | Idle fade | **Fade after about 4 s idle** (rec) | Never while something has focus or a panel is open. |
| D4 | Date navigation | **Five buttons, redrawn as one bar attached to the date** | |
| D5 | Today | **⊙ icon always visible** | Owner's note: combine the icon and the live indicator. When live, ⊙ is brighter (in the warm "now" accent); when not live, it matches the other four. Keeps the symmetry. |
| D6 | Icons | **Fully custom set** | |
| D7 | Press feedback | **A soft light bloom from the press point** (rec) | |

### E. Deep Dive and dialogs

| ID | Question | Decision | Notes |
|---|---|---|---|
| E1 | Deep Dive on desktop | **Panel over the stage, stage re-frames** (rec) | Owner: "The timeline cut-off should also be fixed." The whole stage re-centres in the space left of the panel. |
| E2 | Deep Dive on phones | **Sheet with detents** (rec) | Peek, half, full; the handle drags; swipe down closes. |
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
| G4 | Desktop parallax | **Depth layers: far stars, near stars, Moon, interface** (rec) | |
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

---

## 5. Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation: Vercel, measurement, static shell, no loader, fonts, GSAP after paint, audit bugs | In review: waiting on the Vercel project, then measured there and the Pages cutover |
| 1 | The Moon and the sky: renderer, lunar shader, textures, libration and orientation, real stars, tilt | Not started |
| 2 | Design language: tokens, controls, icons, header and menu, cursor, sound engine, idle fade, copy | Not started |
| 3 | Deep Dive and overlays: re-framing stage, detent sheet, three chapters, anchored popovers | Not started |
| 4 | Phones and the timeline: bottom dock, timeline restyle, detents and haptics, first-visit touches | Not started |
| 5 | Intro and Awwwards polish: cinematic intro, about/credits, final performance pass, domain | Not started |
| 6 | New features: meteor-shower nights, reward for staying | Not started |

### Phase 0 notes

- Local Lighthouse, 5 runs each against `vite preview` under the same conditions: mobile
  44 → 55, desktop 76 → 89; first paint 3.7 → 2.5 s, largest paint 4.9 → 4.1 s, blocking time
  2.4 → 1.9 s, layout shift 0.021 → 0. This machine is noisy (master alone swung from 52 to 44
  on mobile within the day), and `vite preview` serves uncompressed files, so only same-run
  comparisons mean anything. Vercel numbers come next.
- What's left on mobile is main-thread work: fiber and three.js starting up (with the
  software WebGL Lighthouse uses, creating a context alone cost 1.5 s), the texture's pole
  blending, and React's first render. Phase 1's worker renderer is aimed at exactly this.
- Tried and reverted: loading the app from the inline script after first paint. It only
  moved the app's start-up into the window Lighthouse counts as blocking time.
