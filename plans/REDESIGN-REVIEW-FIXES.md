# Luna redesign: review log and deferred fixes

Companion to [UI-REDESIGN-2026-09-22.md](UI-REDESIGN-2026-09-22.md).

## How this works

- Codex implements the redesign on `redesign/luna` phase by phase.
- After each Codex phase, Claude reviews the new commits against the redesign brief and the
  owner's concerns, then adds anything that needs fixing to the fix list below.
- **No fixes are applied while Codex is still working**, so Codex doesn't revert or trip over
  them. This file lives on its own branch, `review/luna-redesign`, in a separate worktree.
- Each round, `review/luna-redesign` is fast-forwarded to the latest `redesign/luna`
  (`git merge --ff-only redesign/luna`) so the line references and checks match Codex's
  code. This plan file stays uncommitted until the owner asks, so the fast-forward always
  works.
- When Codex finishes its last phase, apply the fix list on top of the final `redesign/luna`
  state. File/line references were taken at the commit named in each round and **must be
  re-checked** against the final code before editing; Codex may move or rewrite them in
  later phases, which can fix an item or make it obsolete.

Fix status values: `open`, `superseded` (a later Codex phase changed it; note how),
`done`, `dropped` (with reason).

---

## Fix list

### F1. Restore the long-tailed "Qu" in phase names. Priority: high. Status: **done** (`f9baf4c`)

**Owner concern:** the sweeping Q tail in "First Quarter" / "Last Quarter" disappeared,
and it was part of Luna's typography.

**Cause (verified in-browser):** Cormorant Garamond's long tail is not the plain `Q` glyph.
It is the **`Q_u` ligature**. Browsers turn off ligatures whenever `letter-spacing` isn't
zero, and `font-variant-ligatures` can't turn them back on. Codex added negative tracking to
both phase-name styles:

- `src/index.css` `.hero-phase-name span { letter-spacing: -0.035em }` (~L1856 @ c43d7bd)
- `src/index.css` `.telemetry-phase-name { letter-spacing: -0.025em }` (~L430 @ c43d7bd)

Round 2: unchanged, still open.

**Fix:** delete both declarations. Neither element is inside `h1`–`h4` (the global heading
rule has `letter-spacing: -0.02em`), so they fall back to `normal`. Add a short comment at
each spot saying letter-spacing must stay `normal` to keep the Qu ligature.

**Also check:** any other serif text that can show a phase name: the timeline hover tooltip
(`LunarTimeline.jsx`), the orbital readout (`OrbitalView.jsx`), the calendar phase list, and
the Deep Dive trigger (`letter-spacing: 0.02em`, but its text has no "Qu"). None of the
phase-name ones had letter-spacing at 1d1cbbb. Recheck against the final code, including
any `h1`–`h4` wrappers Codex may add.

**Done when:** "First Quarter" and "Last Quarter" show the long tail in the hero, the Deep
Dive, the timeline tooltip and the orbital readout, in both Chromium and Firefox.

---

### F2. Deep Dive: bring back clear section grouping. Priority: high. Status: **done** (`cfbb3dc`)

**Owner concern:** the old Deep Dive (separate panels) was easier to focus on and less
cluttered than the redesigned one.

**Findings @ 1d1cbbb:**
1. The section boundaries became hairline rules with the same weight as the rules *inside*
   sections (`.telemetry-measurements` has `border-top`) and under the drawer header, and
   the spacing doesn't separate groups. The whole drawer reads as one run-on column.
2. The conversion is half done. `LunarData` and `SkyPosition` are flat `.telemetry-section`s,
   but `OrbitalView` is still a `.glass-panel orbital-card` with border and hover
   highlight. Two visual languages in one drawer.
3. **Regression:** removing the card padding and widening the drawer (480px →
   `min(31rem, 100vw)`) made the content wider. The rise/set grid in `SkyPosition.jsx`
   (`repeat(auto-fit, minmax(80px, 1fr))`) now fits 4 columns, so Moonrise / Moonset / Peak /
   Sunrise sit on one row and **Sunset is left alone** on the next (was 3 + 2).

**Round 2 (`c43d7bd`) update:**
- Item 3 is **fixed by Codex**. `.sky-ephemeris-grid` is now a 6-column grid giving 3 + 2
  with Sunset/Sunrise centred (2 + 2 + 1 at ≤520px, checked at 320px). Keep this. Its
  `.sky-stat:nth-last-child(2)` / `:last-child` placement assumes exactly 5 stats. That's
  true today (all 5 always render), but add a comment there.
- Items 1 and 2 are still open. The flat section treatment wasn't changed. The orbital
  panel is still `glass-panel`, and its readout is now a **box inside a box** (bordered
  `.orbital-readout` inside the bordered card).
- The owner compared again and still leans toward the old drawer.
- New minor issue: at desktop drawer width the "24-Hour Sky Transit & Ephemeris" heading
  wraps to 2 lines and squeezes the location, which then wraps as "Greenwich, UK / · GMT+1"
  with the dot at the start of the second line. Put the location + timezone on their own
  line under the heading.
- Keep Codex's round-2 improvements: icons `aria-hidden`, classes instead of inline styles,
  the desktop drawer handle hidden, and the `dvh` sheet height.

**Fix direction (agreed with owner):** go back to separate panels, but quieter than the old
glass cards:
- Each of the 5 groups (current phase, distance, zodiac + next full moon, sky transit,
  orbital geometry) gets a quiet surface: a slightly lighter tone (e.g. `--bg-surface-1`),
  `--radius-lg`, **no border, no hover highlight, no backdrop blur** (the drawer already
  blurs).
- Gap between groups about 1.5–2rem. Inside a group, use hairline dividers only.
- Remove the drawer-header bottom border, or make it clearly different from the rules
  inside sections.
- `OrbitalView` uses the same section primitive as the rest (drop `glass-panel`), and
  `.orbital-readout` loses its own border/background (a divider above it is enough).
  Retune `.orbital-canvas-wrap`'s leftover navy gradient `rgba(17, 21, 48, …)` to the new
  palette.
- ~~Rise/set grid fixed at 3 columns~~ (done by Codex in round 2, see above).
- The Clock / Distance settings at the top should read as settings rather than data: give
  them their own small group or clear spacing before the first data section.

**Done when:** at 1920, 1440, 1280 and on the mobile sheet, each topic reads as its own
block at a glance, rise/set never leaves a lone item, and all 5 groups look the same.
Compare side by side with screenshots of the old drawer.

---

### F3. Brand assets and wordmark mark. Priority: medium. Status: open, waiting on the owner's new assets

**Owner concern:** the UI moved from violet-navy to grey-black (owner prefers the new
look), but the brand images are still violet.

**Findings @ 1d1cbbb:**
- Still violet: `public/icon-192.png`, `favicon-32.png`, `apple-touch-icon.png`,
  `icon-512.png`, `icon-maskable-512.png`, `og-card.png`.
- `LoadingScreen.jsx` shows `icon-192.png` at 96px as the first thing on screen, so the
  first impression is the old violet brand.
- Codex added a Unicode `◐` "brand mark" next to the wordmark (`App.jsx` `.app-brand-mark`,
  CSS `.app-brand-mark`). It's drawn by whatever fallback font each OS has (looks
  different on every device) and doesn't match the crescent logo.
- The loading screen still has violet-leaning glows and gradients; check once the new icon
  exists.

**Owner action: regenerate the assets (e.g. with ChatGPT). Brief:**
> Same crescent logo, identical geometry. Background near-black `#060910` (not navy).
> Glow: cold silver-white, with at most a faint periwinkle edge (`#c2cff7` / `#8d9dd6`),
> no saturated violet. Don't make it flat grey; keep the soft luminous halo. Sizes needed:
> 32, 180 (apple-touch), 192, 512, 512 maskable (logo inside the safe zone, about 80%), and
> the 1200×630 OG card with the same starfield.

**Code fix once assets arrive:**
- Replace the files in `public/` and bump the cache-busting query (`og-card.png?v=2` →
  `v=3`). Check the PWA manifest icons in `vite.config.js`.
- Replace the `◐` span with the real logo (small `<img>` of the icon, or an inline SVG
  crescent), or remove it. Keep `aria-hidden`.
- Retune the loading-screen glows to the new palette.

---

### F4. Small text and wide letter-spacing, against the brief. Priority: medium. Status: **done** (`5ed6735`)

The brief says: *"Avoid tiny text purely for aesthetics"* and *"Avoid extreme letter
spacing."* At 1d1cbbb Codex went the other way:
- `.utility-label` 0.75rem → **0.68rem**, tracking 0.1em → **0.13em** (used everywhere)
- `.timeline-labels` 0.66rem / 0.12em, `.today-button` 0.66rem / 0.12em,
  `.distance-gauge-labels` 0.66rem, `.telemetry-exact-badge` 0.64rem

Round 2 added more: `.calendar-events-label` 0.68rem, `.orbital-distance-value span`
(unit) 0.65rem, `.orbital-reading-label` 0.7rem.

**Fix:** no uppercase label below 0.72rem (~11.5px); keep tracking ≤ 0.1em. Check that the
timeline header and the mobile header still fit at 320–375px afterwards.

---

### F5. The Moon runs into the date controls. Priority: high (raised in round 3). Status: **done** (`bfce798`)

`.moon-viz-wrapper` went from `52vh / max 560px` to `min(62vh, 720px)`. At 1920×~970 the top
of the Moon nearly touches the Today button (owner screenshot 6), which cuts into the
negative space the brief asks for. Round 2: unchanged (owner screenshots 7 and 8 show the
same thing).

**Round 3 (`6e1eb28`): still open, and the cause is now clear.** Codex's short-screen
rules didn't touch this (owner screenshot 11, 1920×~970). The real problem isn't the
Moon's size. The Moon area starts **higher than the header's lowest control**, so the
sphere is always drawn up into the date-navigation row. Measured:

| Viewport | Moon area starts | Date nav row ends | Result |
|---|---|---|---|
| 1920×970 | ~56px (`margin-top: 3.5rem`) | ~110px | Moon touches Today |
| 1024×768 | 3.5rem | ~96px | Moon touches Today |
| 1280×540 | 44px (new `2.75rem` rule) | 96px | ~20px gap, OK only because the Moon is small |
| 844×390 | 59px | 96px | Moon touches Today |
| **667×375** | **100px** (new `6.25rem` rule) | **148px** (header has 3 rows ≤768px) | **Today button and ‹ › sit on top of the Moon** |

**Fix (revised):** set `.main-canvas-area`'s top offset from the header's real height
(date pill + nav row + about 1rem of space, plus `env(safe-area-inset-top)`) instead of
fixed rem values that are shorter than it, and let `.moon-viz-wrapper` shrink to what's
left. For landscape phones ≤768px wide and ≤560px tall there isn't enough height for
3 header rows + Moon + name + timeline (375 − 150 − 108 ≈ 117px). That needs a compact
layout, e.g. the date pill and nav on one row, or a shorter timeline header. Check again
after Codex's responsive pass, which may change this.

**Round 4 (`2260b53`): partly fixed.** The short-screen margin is now 6.5rem, so desktop-
header landscape phones are clear (844×390: Moon starts at 105, nav ends at 96; 932×430:
113 vs 96). Portrait phones and tablets are clear (390×844: 183 vs 154; 700×1000: 185 vs
154). **Still open:**
- **1920×970** (owner's concern): Moon starts at 103 and fills its area, so its top edge
  is about 9px under Today. Needs real space (≥ 1.5rem).
- **~960–1010 wide at normal heights** (e.g. 960×600, 990×700): Moon area starts at 56–59
  while the nav ends at 96, so Today sits on the Moon's edge (the `3.5rem` desktop margin
  applies here).
- **667×375** (≤768px landscape phone): *worse*. The 44px touch targets made the header
  taller (nav now ends at 154), and the Moon still starts at 100.

The fix direction above still applies. The 3.5rem / 6.25rem / 6.5rem margins are all
guesses at the header's height. Base the offset on the real header height instead.

**Fix:** size the stage from the space left after the header and timeline (e.g. cap
around 56–58vh, or use `clamp()` with header clearance), and keep at least ~1.5rem between
the Today button and the Moon's limb. Check at 1920×1080, 1440×900, 1366×768 and 1280×720.

---

### F6. Cleanup. Priority: low. Status: **done** (`d06a97a` duplicate header, `cfbb3dc` `.glass-panel`, `fa310b7` the rest)

- Unused tokens `--bg-night-blue`, `--bg-surface-solid` (`index.css` `:root`).
- Styles only half moved out of the components:
  - `LocationPicker.jsx` still builds a `rowStyle` object (now just flex/gap), which
    should become part of `.location-row`.
  - The drawer `<footer>` in `App.jsx` still has inline styles.
  - The `LunarTimeline.jsx` tooltip has an empty line left inside its inline style object,
    and many of its inline styles remain.
- Recheck for dead CSS after Codex's final phase (the brief asks for it too).
- Round 4: the `.app-header` rule is defined twice (~L243 and ~L1871; the second wins). Merge
  them into one.
- Round 2: all of the above still present. The calendar and telemetry components lost
  their inline styles (good), but `LocationPicker` `rowStyle`, the drawer footer and the
  timeline tooltip are still inline.

---

### F7. Altitude chart: the horizon label overlaps the curve. Priority: low. Status: **done** (`5708681`)

Round 2 moved the "0° Horizon" text inside the plot (`SkyPosition.jsx` `AltitudeArc`,
`textAnchor="end"` at `width - padding.right - 4`), which fixed it spilling past the
drawer edge. But it now sits where the curve and its fill cross the horizon near midnight,
so the two overlap when the Moon is rising or setting late in the day (owner screenshot 8).
The live-position label (e.g. "-4.6° (Below horizon)") can also sit on the curve.

**Fix:** reserve a right gutter in `padding.right` for the label and put it back outside the
plot, or keep it inside but draw a dark text outline behind it (`paint-order: stroke`
with a stroke in the drawer background colour) so it stays readable over the curve.
Presentation only; the altitude data doesn't change.

---

### F8. Header controls overlap between ~769px and ~950px wide. Priority: high. Status: **done** (`d06a97a`)

Found in round 3 (at `6e1eb28`). Above 768px the header uses the desktop 3-column grid.
Codex changed it from master's `1fr auto 1fr` to `minmax(0, 1fr) auto minmax(0, 1fr)`,
which allows the side columns to shrink **below their content**. Codex also made the Deep
Dive button wider by adding an icon. The right-hand actions (location, share, shortcuts,
Deep Dive: about 370px wide) no longer fit in their column and slide under the centred
date controls.

Measured: at **844×390** the location pill starts at x=516 while the date controls end at
x=548 (**32px overlap**), and "Deep Dive" wraps onto 2 lines (button 58px tall). At
1024×768 there's a 25px gap, so the overlap runs from about 769px to about 950px wide.
That covers common landscape phones (844, 896, 915, 932) and small tablet/laptop windows.

**Fix:** stop the columns overlapping (go back to `1fr auto 1fr`, or give the side columns
a proper minimum width), and below about 1040px make the header compact: location as an
icon only and Deep Dive as an icon only, as the ≤480px rules already do, or switch to
the 2-row mobile header at a higher breakpoint. `white-space: nowrap` on
`.deep-dive-trigger`. Compare with master at the same widths to confirm what the old
behaviour was.

**Round 4 (F8) (`2260b53`): mostly fixed by Codex.** A new `769–959px` rule switches to icon-only
location and Deep Dive buttons. Measured gaps: 844 → 116px, 932 → 160px. **Remaining:**
at **960px** the full labels come back with no room (gap 0px, "Deep Dive" wraps to 58px
tall), and 990px has only a 4px gap. Raise the upper bound to about 1039px (at 1010: 14px;
1024: 25px), or add `white-space: nowrap` and a minimum gap.

**Correction to the cause:** there are **two `.app-header` rules** in `index.css` (~L243 with
`minmax(0, 1fr) auto minmax(0, 1fr)`, and the older one ~L1871 under "Responsive App
Header" with `1fr auto 1fr`). The later one wins, so the `minmax(0, …)` version never
applies. The overlap comes from the actions being too wide for their column, not from
`minmax(0)`. Merge the two rules (see F6).

---

### F9. Touch devices 481–768px: "Deep Dive" squeezed into a 44px circle. Priority: high. Status: **done** (`d06a97a`)

Regression from round 4 (`614ab9c`). The new rule
`@media (max-width: 768px) and (hover: none), (max-width: 768px) and (pointer: coarse)`
sets `.deep-dive-trigger { width: 44px; min-width: 44px }`, but the label is only hidden at
≤480px (`.deep-dive-trigger > span { display: none }`). Between 481 and 768px on touch
devices the full "Deep Dive" text is forced into a 44px-wide button and wraps to two lines
(measured 44×58px at 700×1000 and 667×375). Affected: iPad mini portrait (744), iPad
portrait (768), and phones held sideways at ≤768px. The location button is fine (its
label is hidden there).

**Fix:** either hide `.deep-dive-trigger > span` wherever the button is forced to 44px
wide, or keep the label and use `min-height: 44px` with automatic width at 481–768px.
There's room: at 700px portrait the right-hand actions have plenty of space. Check at
744×1133, 768×1024 and 667×375 with touch emulation.

---

## Owner decisions

### D1. Reduced motion stops the Moon's spin after a drag (round 4). Decision: **keep** (owner, 2026-09-23)

`614ab9c` changed `MoonVisualization.jsx` so that when the OS "reduce motion" setting is
on, the Moon stops dead when you release it instead of spinning on and slowing down.
Dragging itself is unchanged: it's applied in the pointer handler, which I checked still
runs. This only happens with that setting on, but it does change a listed feature
("Moon drag/rotation and inertia"). The brief also asks to respect reduced motion.
**Recommendation: keep it.** An object that keeps spinning after you release it is exactly
the kind of motion that setting exists to stop, and nobody without the setting sees any
change.

---

## Review rounds

### Round 1: `24439d2` + `1d1cbbb` (reviewed 2026-09-23)

Codex's report: design foundation, main screen, overlays, telemetry workspace. 115 tests,
ESLint and build passing, 114.5 KB gzip. **Independently re-verified:** tests 115/115, lint
clean, build OK. No app features or astronomical calculations changed.

Owner concerns → F3 (brand colour), F1 (Q tail), F2 (Deep Dive).
Additional findings → F4, F5, F6.

Still to come from Codex (not reviewed yet): the full calendar "lunar almanac" restyle, and
checks at the target screen sizes (320 → 2560, short heights).

### Round 2: `dacde40` + `c43d7bd` (reviewed 2026-09-23)

Codex's report: lunar almanac calendar (seven-column layout, day states, scrollable popup
on short screens); Deep Dive transit grid balanced; orbital readout reflows on narrow
screens. Codex couldn't check 320px itself.

**Independently re-verified at `c43d7bd`:** tests 115/115, ESLint clean, build OK, bundle
budget met (entry 114.2 KB gzip / 130 KB). **320×640 checked in the browser:** calendar
panel 8→312px, no horizontal overflow, day cells 38×44px; Deep Dive sheet has no
overflowing elements; rise/set 2 + 2 + 1. No app features or astronomical calculations
changed.

- **Calendar:** the owner approves it, and I agree. Inline styles moved into classes, hover
  is handled in CSS instead of JS, outside-month days are `aria-hidden`, touch targets are
  44px, selected-day contrast is fine (white on `--accent-strong` ≈ 4.9:1). No fixes needed.
  Nav/close buttons are 30px, below the 44px comfort size but above WCAG AA's 24px, and
  bigger than before (28px). Leaving them.
- **Deep Dive:** the owner is still undecided but leans toward the old one. F2 updated: item
  3 fixed by Codex; items 1–2 still open; box-in-box readout and heading wrap added.
- **New:** F7 (horizon label overlap). F4 and F6 extended.
- F1, F3 and F5 unchanged.

Next from Codex: the broader responsive and accessibility pass.

### Round 3: `6e1eb28` (reviewed 2026-09-23)

Codex's report: short-screen rules (`max-height: 560px`, plus a `max-width: 768px` variant)
to keep the Moon, name and timeline in view on landscape phones and short laptop windows.
Codex could only check 1280×720 and says the width checks are still to do.

**Independently re-verified at `6e1eb28`:** tests 115/115, ESLint clean, build OK, bundle
budget met. The commit is CSS only (+47 lines). No app features or calculations changed.

Browser checks (Codex's dev server, same commit):
- 1280×540: works. Everything fits, timeline at 432–540, about 20px between Today and
  the Moon.
- 1024×768: header fits (25px spare); Moon touches Today.
- 844×390: **header overlap** (F8, new) and Moon touches Today.
- 667×375: **nav row on top of the Moon** (F5).
- No horizontal page scroll at any of these sizes.

Owner concern: the Moon still touches the date controls. F5 updated with the root cause
and measurements. New: F8. Everything else unchanged.

Next from Codex: finishing the width checks, then the accessibility/performance pass.

### Round 4: `614ab9c` + `2260b53` (reviewed 2026-09-23)

Codex's report: responsive pass at 320–2560px plus short heights; the 844×390
header/Moon overlap fixed; safe-area insets for the header, timeline and overlays; 44px
touch targets on coarse pointers; reduced motion stops the Moon's post-drag spin. Codex
left reduced-motion, coarse-pointer, offline and WebGL-fallback runtime checks for final QA.

**Independently re-verified at `2260b53`:** tests 115/115, ESLint clean, build OK, bundle
budget met. No astronomical calculations changed. One behaviour change under the
reduced-motion setting → D1.

Browser measurements (Codex's dev server, same commit):

| Viewport | Header | Moon vs date nav |
|---|---|---|
| 1920×970 | fine | Moon ~9px below Today, **too tight** (F5) |
| 1010×700 | 14px gap | Moon area starts 58, nav ends 96, **overlaps** (F5) |
| 990×700 | 4px gap, **tight** (F8) | overlaps (F5) |
| 960×600 | **0px gap, Deep Dive wraps** (F8) | overlaps (F5) |
| 932×430 | icons only, 160px gap ✓ | clear ✓ |
| 844×390 | icons only, 116px gap ✓ | clear ✓ |
| 700×1000 touch | **Deep Dive squeezed** (F9) | clear ✓ |
| 667×375 touch | **Deep Dive squeezed** (F9) | **Today on top of the Moon** (F5) |
| 390×844 touch | fine, 44px icons ✓ | clear ✓ |

No horizontal page scroll anywhere. Also checked: the reduced-motion change leaves
dragging working (rotation is applied in `onPointerMove`, not in the frame loop).

Updates: F5 partly fixed, now with precise remaining cases. F8 mostly fixed; the 960–990
edge remains; cause corrected (duplicate `.app-header`, added to F6). **New:** F9
(regression), D1 (owner decision). F1–F4, F6 and F7 unchanged.

Next from Codex: final QA (reduced motion, coarse pointer, offline, WebGL fallback).

### Round 5: final QA, no commits (2026-09-23)

Codex ran two final-QA turns and made no code changes. `redesign/luna` stays at
`2260b53`. Codex couldn't emulate offline mode, reduced motion, a touch-only device or
disabled WebGL, so it only reviewed those code paths. Status of those checks:

- **Touch (coarse pointer):** runtime-verified by Claude in round 4 (the browser pane's
  touch emulation reports `pointer: coarse`), which is how F9 was found.
- **Reduced motion:** the code path was reviewed in round 4 (D1). The runtime check is
  still open.
- **Offline / PWA:** only the build output was checked (service worker and 24 precached
  files). Runtime still open.
- **WebGL fallback:** runtime still open.

These still need a real-browser check before merging: DevTools → Rendering (emulate
`prefers-reduced-motion`), Network → Offline after one online load, and
`chrome://flags` / `--disable-webgl` for the fallback.

Codex's phases are done. The fix list above is ready to apply.

## Fixes applied (2026-09-23, on `review/luna-redesign`)

Applied after Codex's final phase, one commit per fix, each checked in the browser at the
plan's sizes against a dev server running this worktree (:5181). Tests, lint, build
and bundle budget passed after each.

| Commit | Fixes | Verified |
|---|---|---|
| `d06a97a` | F8, F9, duplicate `.app-header` | header gap 174px at 960, 29px at 1039/1040; Deep Dive 44×44 icon on touch at 700 and 667 |
| `bfce798` | F5 | Moon's edge is 39–77px below the date controls from 960 to 1920 wide (260 at 2560); landscape phones clear, and the Moon grew (844×390: 92→138px, 667×375: 66→124px) |
| `f9baf4c` | F1 | long Q tail back in the hero; computed `letter-spacing: normal` in hero and Deep Dive |
| `cfbb3dc` | F2, `.glass-panel` removed | 5 matching quiet panels; rise/set 3 + 2; nothing overflows the 496px drawer |
| `5ed6735` | F4 | every uppercase label ≥ 0.72rem, tracking ≤ 0.1em; header layouts re-measured |
| `5708681` | F7 | "0° Horizon" readable over the curve on a late-moonrise date (Sep 30) |
| `fa310b7` | F6 | location rows, footer and tooltip styles unchanged after the move |

Known limit: at 568×320 (first-gen iPhone SE, landscape) the header needs two rows and
the Moon is only about 20px. No layout of the current controls fits that height.

Still open: **F3** (waiting on new brand assets). Real-browser checks of **offline** (use
`npm run preview` or the live site; the dev server has no service worker) and **WebGL
fallback** (start Chrome with `--disable-webgl`; turning off graphics acceleration only
switches to software WebGL) are still pending. Reduced motion passed (owner, 2026-09-23).
