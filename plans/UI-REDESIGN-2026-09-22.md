You are working on an existing production web application called Luna:

https://kavindu-rakn.github.io/Luna/
https://github.com/kavindu-rakn/Luna

Luna is an immersive celestial lunar ephemeris and 3D orbital explorer built with:
- React 19
- Vite
- Three.js
- React Three Fiber
- Drei
- GSAP
- Lucide React
- existing astronomical/ephemeris logic

YOUR TASK

Completely redesign Luna's frontend visual experience to make it feel substantially more polished, premium, immersive, cohesive, modern, and intentional.

This is a FRONTEND REDESIGN ONLY.

Do not turn this into a feature-development project.

======================================================================
1. NON-NEGOTIABLE PRODUCT CONSTRAINT
======================================================================

DO NOT ADD FEATURES.
DO NOT REMOVE FEATURES.
DO NOT CHANGE EXISTING PRODUCT BEHAVIOR.

The redesigned application must preserve all existing functionality.

Before changing anything, thoroughly inspect the entire codebase and build an inventory of the existing functionality, states, interactions, responsive behavior, keyboard navigation, accessibility behavior, fallbacks, persistence and URL-sharing logic.

Treat the current behavior as the functional specification.

Examples of functionality that MUST remain intact include, but are not limited to:

- interactive photographic 3D Moon
- lunar phase visualization
- Moon drag/rotation and inertia
- realtime/current-time mode
- previous/next day navigation
- previous/next major lunar phase navigation
- date navigation
- 30-day lunar-cycle timeline/scrubber
- exact primary lunar phase jumps
- selected-date state
- location picker/search
- saved/favourite locations
- device/current location functionality
- location-aware timezone handling
- 12/24-hour clock preference
- kilometre/mile preference
- lunar altitude/transit visualization
- rise/set/transit information
- tropical/sidereal zodiac information
- Earth–Moon orbital visualization
- Deep Dive / astronomical telemetry interface
- calendar
- month navigation
- year navigation
- moon phases inside calendar days
- exact phase events inside calendar
- URL state/sharing
- copy/share functionality
- settings/preferences
- privacy information
- offline/PWA functionality
- update handling
- keyboard shortcuts
- Esc dismissal behavior
- accessibility behavior
- WebGL fallback behavior
- all currently supported responsive states

Do not modify astronomical calculations unless a UI refactor absolutely requires moving code without changing its behavior.

Do not alter values, algorithms, formulas, precision, date calculations, timezone calculations or astronomical semantics.

The frontend may LOOK radically different.

It must FUNCTION exactly as Luna does now.

======================================================================
2. FIRST: AUDIT THE APPLICATION
======================================================================

Do not immediately start rewriting components.

First inspect:

- application structure
- components
- stylesheets
- design tokens
- Three.js scenes
- HUD
- timeline
- navigation
- calendar
- location interfaces
- settings
- Deep Dive
- orbital view
- charts
- modals/popovers
- loading state
- empty/error states
- offline states
- PWA/update UI
- responsive layouts
- mobile interactions
- keyboard interactions
- focus states
- reduced-motion handling
- WebGL fallback
- localStorage/preferences
- URL/query-state synchronization

Identify:

1. what is functional logic
2. what is presentation logic
3. what can safely be redesigned
4. what must remain untouched

Refactor presentation structure where useful, but avoid unnecessarily rewriting stable application logic.

======================================================================
3. DESIGN VISION
======================================================================

The target experience is:

"AN INTERACTIVE DIGITAL OBSERVATORY"

Luna should feel like a premium scientific instrument designed for someone standing outside at night looking at the Moon.

The experience should combine:

- cinematic astronomy
- precision instrumentation
- quiet luxury
- scientific credibility
- modern interface design
- excellent information hierarchy
- restrained motion
- tactile interaction

It should NOT look like:

- a SaaS dashboard
- an admin panel
- a generic Tailwind landing page
- a collection of floating cards
- a crypto dashboard
- a gaming HUD
- a cyberpunk interface
- a sci-fi movie prop
- a NASA website clone
- an Apple website clone
- a glassmorphism showcase
- a neon-purple AI product
- an over-designed Dribbble concept

The interface should feel plausible, timeless and usable.

Think:

astronomical observatory
×
museum-grade scientific visualization
×
premium native application
×
modern editorial typography
×
subtle aerospace instrumentation

But create an ORIGINAL visual identity.

======================================================================
4. THE MOON MUST REMAIN THE HERO
======================================================================

The Moon is the primary visual object.

Nothing should visually compete with it.

On desktop, give the Moon significant scale and negative space.

The UI should seem to orbit around the astronomical content rather than enclosing the Moon inside a dashboard.

Avoid putting the Moon inside a card.

Avoid huge opaque containers behind it.

Avoid cluttering its immediate surroundings.

The viewer should initially perceive:

1. Moon
2. current lunar phase
3. temporal position
4. navigation
5. deeper astronomical data

in that order.

The starfield/environment should support the Moon rather than distract from it.

======================================================================
5. VISUAL LANGUAGE
======================================================================

Build a proper design system rather than styling components independently.

Suggested visual direction:

BACKGROUND

Near-black astronomical blue rather than pure black.

Possible range:

#05070D
#080B13
#0A0E18
#0D1120

Use extremely subtle spatial depth through gradients, atmospheric falloff and star density.

Do not use obvious giant radial-gradient blobs.

SURFACE COLORS

Use restrained translucent surfaces where controls need separation.

Example conceptual hierarchy:

surface-1:
very subtle cool-white tint

surface-2:
slightly stronger elevated surface

surface-3:
modal/drawer surface with better separation

Borders should generally be low-contrast.

Avoid outlining every component.

PRIMARY ACCENT

Use a restrained lunar/celestial accent.

The existing violet identity can evolve into a sophisticated cool lunar spectrum:

soft periwinkle
cold silver
moonlit lavender
desaturated blue-violet

Do NOT flood the interface with bright purple.

Reserve stronger accent values for:

- active timeline states
- selected controls
- focus states
- major phase indicators
- meaningful data emphasis

TEXT

Primary:
soft lunar white rather than #FFFFFF

Secondary:
cool grey

Tertiary:
muted astronomical grey

Numerical telemetry can use slightly brighter contrast than prose labels.

======================================================================
6. TYPOGRAPHY
======================================================================

Typography should become one of Luna's strongest visual characteristics.

The existing application uses:
- Cormorant Garamond
- Outfit
- Inter
- JetBrains Mono

You may retain these if they work well, reduce the number of families if appropriate, or reorganize their roles.

Do not add unnecessary font dependencies.

Suggested hierarchy:

EDITORIAL / CELESTIAL
Phase names
Major date moments
Large astronomical headings

Use an elegant serif tastefully.

INTERFACE
Buttons
Navigation
Labels
Settings
Menus

Use a highly legible modern sans-serif.

TELEMETRY
Coordinates
Distances
Times
Angles
Scientific values

Use a mono or tabular-number treatment.

Typography should communicate the difference between:

"First Quarter"

and

"384,626 km"

without requiring containers around everything.

Avoid excessive uppercase.

Avoid extreme letter spacing.

Avoid tiny text purely for aesthetics.

======================================================================
7. MAIN OBSERVATORY SCREEN
======================================================================

Redesign the main screen as one coherent observatory composition.

DESKTOP

Suggested structural zones:

A. TOP OBSERVATORY BAR

Keep it visually lightweight.

Left:
Luna identity / wordmark.

Center or contextually centered:
date/current temporal context and navigation.

Right:
utilities such as Deep Dive and other existing controls.

Do not make this look like a conventional navbar.

Controls can use compact grouped surfaces when appropriate.

B. PRIMARY CELESTIAL STAGE

Large central Moon.

Below or near the Moon:

Phase name
illumination context if already shown here
relevant temporal information currently available

Do not add new astronomical values merely to fill space.

Maintain strong negative space.

C. TEMPORAL NAVIGATION

The lunar-cycle scrubber should become a signature interaction.

Redesign it to feel like an astronomical time instrument rather than an HTML range slider.

Preserve its functionality exactly.

Improve:

- hierarchy
- active position
- major phase markers
- drag state
- labels
- selected date indication
- hover states
- touch usability
- visual relationship between selected date and Moon

It should feel satisfying to scrub through the lunar cycle.

D. SUPPORTING CONTROLS

Previous/next day and major-phase controls should be understandable without dominating the composition.

Iconography and labels should have clear hierarchy.

Tooltips may only be used if equivalent explanatory behavior already exists; do not invent new functional behavior.

======================================================================
8. DEEP DIVE
======================================================================

Deep Dive contains dense scientific information.

Redesign it as a premium astronomical instrumentation workspace.

It should feel related to the main Luna experience while allowing substantially higher information density.

Priorities:

1. clear data hierarchy
2. excellent scanning
3. readable charts
4. obvious units
5. alignment of numerical values
6. clear relationships between related measurements
7. graceful responsive behavior

Avoid producing a generic grid of metric cards.

Prefer:

- sections
- dividers
- aligned measurement groups
- subtle surfaces
- strong typography
- small visual indicators
- deliberate spacing

Where the application already has:

- orbital geometry
- altitude/transit curves
- illumination
- distance
- rise/set/transit
- zodiac information
- other telemetry

redesign their PRESENTATION without changing their data.

Charts should look scientific rather than decorative.

======================================================================
9. EARTH–MOON ORBITAL VIEW
======================================================================

Treat this visualization as a scientific exhibit.

Improve the surrounding interface without changing the underlying astronomical model.

Goals:

- clearly readable Earth/Moon relationship
- subtle depth
- minimal UI interference
- understandable labels
- tasteful lighting
- polished transitions
- responsive framing

Do not artificially exaggerate values or change orbital calculations for visual drama.

Scientific honesty wins over spectacle.

======================================================================
10. CALENDAR
======================================================================

The lunar calendar deserves a complete visual refinement.

Preserve:

- six-week matrix
- date selection
- month navigation
- year navigation
- year input
- moon visualization for individual days
- primary-phase indicators
- exact phase-event listings
- click behavior

Design it as a "lunar almanac".

Important:

The calendar should feel dense but beautiful.

Improve:

- selected day
- today
- outside-month days
- major lunar phases
- hover states
- keyboard focus
- phase-event hierarchy
- day numbers
- Moon thumbnails
- spacing

Avoid excessive borders around every date.

Use alignment, typography, contrast and negative space to create structure.

On mobile, preserve usability before aesthetics.

======================================================================
11. LOCATION EXPERIENCE
======================================================================

Redesign existing:

- location display
- location search
- location results
- favourite/saved places
- use-my-location interaction
- timezone context

Do not add maps.

Do not add weather.

Do not add new geolocation functionality.

Location is astronomical context, not the main product.

Keep the experience clean and quick.

Search results should be highly readable and touch friendly.

======================================================================
12. SETTINGS / PREFERENCES
======================================================================

Existing preferences must remain.

Redesign settings to feel like part of Luna rather than a browser preferences dialog.

Keep choices concise.

For existing options such as:

- 12/24-hour time
- kilometres/miles
- other current settings

use polished segmented controls, toggles, rows or selectors as appropriate.

Do not introduce settings solely because they would look nice.

======================================================================
13. MODALS, DRAWERS AND OVERLAYS
======================================================================

Create one coherent overlay system.

All:

- drawers
- dialogs
- popovers
- calendar overlays
- location interfaces
- shortcuts
- privacy UI
- update notices
- settings

should share consistent:

- corner radii
- shadows
- border logic
- blur logic
- spacing
- typography
- entrance/exit motion
- focus handling
- backdrop behavior

Do not give every modal a different design language.

Blur should be subtle and performance-conscious.

======================================================================
14. MOTION
======================================================================

Motion is important because Luna visualizes celestial mechanics.

Motion should communicate continuity and physicality.

Use animation for:

- panel transitions
- control state changes
- timeline interaction
- date changes
- modal/drawer transitions
- visualization transitions where already appropriate

Keep animation:

- smooth
- restrained
- physically plausible
- relatively short
- interruption-safe

Avoid:

- bouncing interfaces
- excessive springiness
- constant ambient UI motion
- large scale/zoom effects
- flashy page transitions
- gratuitous particle effects

The existing comet cursor is a feature and must remain.

Restyle/integrate it if necessary without removing it.

Respect prefers-reduced-motion.

======================================================================
15. MICRO-INTERACTIONS
======================================================================

Every interactive component should have deliberate:

- default
- hover
- pressed
- selected
- disabled
- focus-visible

states where applicable.

Hover effects should not merely brighten everything.

Use small combinations of:

- opacity
- border
- background
- transform
- shadow
- icon movement

Focus-visible accessibility is mandatory.

Keyboard users should receive an equally polished experience.

======================================================================
16. RESPONSIVE DESIGN
======================================================================

This redesign MUST be designed intentionally for:

- 2560px+ large monitors
- 1920px desktops
- laptops
- tablets
- small tablets
- large phones
- small phones
- landscape mobile

Do not merely scale down the desktop design.

MOBILE SHOULD FEEL DESIGNED, NOT COLLAPSED.

On smaller screens:

- Moon remains visually dominant
- controls become thumb reachable
- timelines remain usable
- text remains readable
- panels avoid overflowing
- Deep Dive adapts intelligently
- charts remain understandable
- calendar remains usable
- safe-area insets are respected
- touch targets are adequate

Test problematic heights as well as widths.

Pay special attention to mobile browser viewport units.

======================================================================
17. ACCESSIBILITY
======================================================================

Do not trade accessibility for aesthetics.

Preserve or improve:

- semantic HTML
- ARIA behavior
- keyboard navigation
- focus trapping
- focus restoration
- focus-visible states
- screen-reader labels
- reduced motion
- sufficient contrast
- usable touch targets
- non-color-only state indication

Decorative stars and visual effects should not pollute the accessibility tree.

======================================================================
18. PERFORMANCE
======================================================================

Luna already has carefully managed lazy loading and bundle-performance considerations.

Do not destroy them during the redesign.

Preserve:

- lazy loading of 3D scenes where currently implemented
- first-paint performance strategy
- code splitting
- offline behavior
- service-worker/PWA behavior
- WebGL fallbacks
- existing performance budget where applicable

Do not add a heavy UI framework simply for styling.

Do not install libraries unless they provide clear value that cannot reasonably be achieved with the existing stack.

Prefer existing dependencies and well-structured CSS.

Avoid huge image assets.

Avoid unnecessary video backgrounds.

Avoid WebGL effects that compete with the Moon.

======================================================================
19. ARCHITECTURAL QUALITY
======================================================================

Do not solve this with one enormous CSS file containing arbitrary overrides.

Create or improve a coherent frontend architecture.

Where appropriate create:

- design tokens
- CSS custom properties
- spacing scale
- radius scale
- typography tokens
- surface tokens
- motion tokens
- reusable primitives

But do not abstract trivial one-off components prematurely.

Keep component ownership understandable.

Avoid CSS specificity wars.

Avoid !important except in genuinely justified edge cases.

Remove obsolete styles left behind by the redesign.

======================================================================
20. VISUAL QUALITY BAR
======================================================================

The final result must feel substantially better than simply:

- changing colors
- increasing border radius
- adding backdrop-filter
- adding gradients
- replacing icons
- enlarging headings

Reconsider:

- composition
- spacing
- rhythm
- hierarchy
- proportions
- positioning
- information density
- responsive behavior
- visual relationships

This is a true redesign, not a reskin.

At the same time, do NOT redesign Luna into a completely unrelated product.

Someone familiar with the application should immediately understand where everything is.

======================================================================
21. THINGS TO ACTIVELY AVOID
======================================================================

Do not:

- create a landing page before the application
- add onboarding
- add accounts
- add authentication
- add AI
- add weather
- add maps
- add achievements
- add notifications
- add social features
- add new astronomical calculations
- add educational articles
- add tabs simply to reorganize things
- remove existing information
- simplify away advanced functionality
- replace working custom interactions with generic UI components
- fill empty space with decorative cards
- use excessive gradients
- use neon glow everywhere
- use glassmorphism everywhere
- use excessive blur
- use generic purple SaaS styling
- use fake scientific graphics
- use decorative charts
- add marketing copy
- change Luna into a dashboard

======================================================================
22. IMPLEMENTATION PROCESS
======================================================================

Work through this systematically.

PHASE 0 — RECONNAISSANCE

Inspect the codebase.

Document:

- application structure
- current feature inventory
- UI component inventory
- frontend architecture
- functional boundaries
- fragile areas
- responsive states
- accessibility behavior
- existing tests
- performance constraints

Do not change code yet.

PHASE 1 — DESIGN FOUNDATION

Define:

- design philosophy
- color system
- typography system
- spacing
- radii
- elevations
- surfaces
- borders
- icons
- motion
- responsive rules
- interaction states

Implement the shared design foundations.

PHASE 2 — MAIN OBSERVATORY

Redesign:

- application shell
- main celestial stage
- Moon framing
- phase typography
- date navigation
- navigation controls
- top controls
- lunar-cycle timeline

Validate all existing behavior.

PHASE 3 — OVERLAYS

Redesign existing:

- location UI
- settings
- shortcuts
- privacy
- calendar
- secondary dialogs/popovers
- update/offline notifications

PHASE 4 — DEEP DIVE

Redesign:

- telemetry hierarchy
- charts
- orbital visualization container/UI
- measurement presentation
- astronomical labels
- responsive layout

PHASE 5 — RESPONSIVE POLISH

Test and correct layouts across:

320
360
375
390
430
768
1024
1280
1440
1920
2560px

Also test short-height desktop/laptop screens.

PHASE 6 — ACCESSIBILITY + PERFORMANCE

Verify:

- keyboard navigation
- focus behavior
- screen-reader semantics
- reduced motion
- contrast
- touch targets
- code splitting
- bundle size
- loading behavior
- WebGL fallback
- PWA/offline behavior

PHASE 7 — FINAL POLISH

Perform a visual QA sweep.

Look specifically for:

- inconsistent spacing
- accidental misalignment
- awkward wrapping
- clipping
- overflow
- inconsistent icon sizes
- border inconsistencies
- weak hover states
- bad mobile hierarchy
- typography mismatches
- animation jank
- layout shifts
- inaccessible states
- dead CSS

======================================================================
23. TESTING REQUIREMENT
======================================================================

After every major phase:

1. run the application
2. run existing tests
3. run production build
4. check console errors/warnings
5. verify functionality affected by the changed components
6. verify responsive layouts
7. verify keyboard operation

Do not wait until the end to discover regressions.

The existing astronomical tests must remain passing.

Do not modify tests merely to make broken behavior pass.

======================================================================
24. GIT WORKFLOW
======================================================================

Before implementation:

- inspect current git status
- do not destroy unrelated uncommitted work
- create an appropriate redesign branch

Make logical commits rather than one giant final commit.

Commit messages should describe completed units of work.

Examples:

feat(ui): establish Luna observatory design system
feat(ui): redesign primary celestial stage
feat(ui): refine lunar cycle navigator
feat(ui): redesign lunar calendar
feat(ui): redesign deep dive telemetry
fix(ui): improve responsive observatory layout
fix(a11y): refine focus and reduced-motion states

Do not commit generated junk or temporary screenshots unless intentionally required by the repository.

======================================================================
25. DECISION-MAKING AUTHORITY
======================================================================

You are the frontend designer AND implementation engineer for this redesign.

Do not ask me to make routine design decisions.

Make strong design decisions yourself based on:

- Luna's purpose
- current functionality
- usability
- astronomy
- information hierarchy
- accessibility
- responsiveness
- maintainability

Only stop and ask me when a decision would:

1. add/remove/change functionality,
2. significantly change product semantics,
3. modify astronomical behavior,
4. require destructive architecture changes,
5. require a major new dependency with meaningful tradeoffs.

For normal visual choices, proceed autonomously.

======================================================================
26. DEFINITION OF DONE
======================================================================

The redesign is complete only when:

- every existing Luna feature remains available
- no existing functional behavior has intentionally changed
- the Moon remains the central visual focus
- the interface has a coherent original design language
- main UI, calendar, Deep Dive, location UI, settings and overlays all feel like one product
- desktop is highly polished
- mobile is equally intentional
- keyboard navigation works
- reduced-motion works
- no major accessibility regressions exist
- no unexpected console errors exist
- existing tests pass
- production build succeeds
- astronomical output remains unchanged
- offline/PWA behavior remains intact
- WebGL fallback remains intact
- performance characteristics have not materially regressed
- obsolete styling from the previous interface has been cleaned up

The final product should make Luna feel less like a web project demonstrating a Moon visualizer and more like a finished digital astronomical instrument someone would willingly keep open on their desktop at night.

Start by inspecting the repository and current application.

Do not begin implementation until you understand exactly what already exists.