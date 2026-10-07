// Luna's own icon set (decision D6): drawn on a 24 px grid with 1.25 px strokes,
// round caps and joins, and checked at 16, 20 and 24 px. Each icon is a list of
// SVG elements as [tag, attributes]; Icon.jsx draws them. Kept as plain data so a
// contact sheet can be rendered from the same source without React.
//
// A dot is a zero-length line: with round caps it draws a disc the stroke's width.
// Filled shapes say so with fill: 'currentColor'.

const dot = (x, y) => ['path', { d: `M${x} ${y}h.01` }];

export const ICONS = {
  // The date bar: phases jump two chevrons at a time, days one
  previousPhase: [['path', { d: 'M12.25 6.5 6.75 12l5.5 5.5' }], ['path', { d: 'M17.75 6.5 12.25 12l5.5 5.5' }]],
  previousDay: [['path', { d: 'M14.75 6.5 9.25 12l5.5 5.5' }]],
  nextDay: [['path', { d: 'M9.25 6.5 14.75 12l-5.5 5.5' }]],
  nextPhase: [['path', { d: 'M6.25 6.5 11.75 12l-5.5 5.5' }], ['path', { d: 'M11.75 6.5 17.25 12l-5.5 5.5' }]],
  // ⊙: the page styles its live state (decision D5)
  now: [['circle', { cx: 12, cy: 12, r: 7.25 }], ['circle', { cx: 12, cy: 12, r: 1.9, fill: 'currentColor', stroke: 'none' }]],

  location: [
    ['path', { d: 'M12 20.75s-6.25-5.7-6.25-10.6a6.25 6.25 0 0 1 12.5 0c0 4.9-6.25 10.6-6.25 10.6Z' }],
    ['circle', { cx: 12, cy: 10.15, r: 2.25 }]
  ],
  locateMe: [
    ['circle', { cx: 12, cy: 12, r: 6.25 }],
    ['circle', { cx: 12, cy: 12, r: 1.75, fill: 'currentColor', stroke: 'none' }],
    ['path', { d: 'M12 2.75v3M12 18.25v3M2.75 12h3M18.25 12h3' }]
  ],
  search: [['circle', { cx: 10.5, cy: 10.5, r: 6.25 }], ['path', { d: 'm15.1 15.1 4.65 4.65' }]],
  savedPlace: [['path', { d: 'M12 4.05 14.09 9.58 19.99 9.85 15.38 13.55 16.94 19.25 12 16 7.06 19.25 8.62 13.55 4.01 9.85 9.91 9.58Z' }]],
  savedPlaceFilled: [['path', { d: 'M12 4.05 14.09 9.58 19.99 9.85 15.38 13.55 16.94 19.25 12 16 7.06 19.25 8.62 13.55 4.01 9.85 9.91 9.58Z', fill: 'currentColor' }]],

  menu: [['path', { d: 'M4.75 9.25h14.5M4.75 14.75h14.5' }]],
  close: [['path', { d: 'm6.75 6.75 10.5 10.5M17.25 6.75 6.75 17.25' }]],
  share: [
    ['path', { d: 'M8.25 10.25H7.5a1.75 1.75 0 0 0-1.75 1.75v6.25c0 .97.78 1.75 1.75 1.75h9c.97 0 1.75-.78 1.75-1.75V12c0-.97-.78-1.75-1.75-1.75h-.75' }],
    ['path', { d: 'M12 14.25V3.75M8.75 7 12 3.75 15.25 7' }]
  ],
  // Speaker, with its sound or crossed out
  soundOn: [
    ['path', { d: 'M4.75 9.5h2.8L12 5.75v12.5L7.55 14.5h-2.8Z' }],
    ['path', { d: 'M15.25 9.25a3.9 3.9 0 0 1 0 5.5M17.75 6.75a7.4 7.4 0 0 1 0 10.5' }]
  ],
  soundOff: [
    ['path', { d: 'M4.75 9.5h2.8L12 5.75v12.5L7.55 14.5h-2.8Z' }],
    ['path', { d: 'm15.5 9.75 4.5 4.5M20 9.75l-4.5 4.5' }]
  ],
  // A phone leaning, with the sky's drift either side
  tilt: [
    ['rect', { x: 8.75, y: 4.25, width: 6.5, height: 15.5, rx: 1.75, transform: 'rotate(-16 12 12)' }],
    ['path', { d: 'M4.25 8.75a8.5 8.5 0 0 0 0 6.5M19.75 8.75a8.5 8.5 0 0 1 0 6.5' }]
  ],
  settings: [
    ['path', { d: 'M4.75 8h2.5M11.25 8h8M4.75 16h8M16.75 16h2.5' }],
    ['circle', { cx: 9.25, cy: 8, r: 2 }],
    ['circle', { cx: 14.75, cy: 16, r: 2 }]
  ],
  keyboard: [
    ['rect', { x: 3.75, y: 6.75, width: 16.5, height: 10.5, rx: 2 }],
    dot(7.5, 10), dot(10.5, 10), dot(13.5, 10), dot(16.5, 10),
    ['path', { d: 'M9 14h6' }]
  ],
  privacy: [['path', { d: 'M12 3.75 5.75 6.2v5.3c0 4.05 2.65 7.3 6.25 8.75 3.6-1.45 6.25-4.7 6.25-8.75V6.2Z' }]],
  about: [['circle', { cx: 12, cy: 12, r: 8.25 }], ['path', { d: 'M12 11v5' }], dot(12, 8)],
  help: [
    ['circle', { cx: 12, cy: 12, r: 8.25 }],
    ['path', { d: 'M9.75 9.6a2.3 2.3 0 0 1 4.5.65c0 1.55-2.25 2-2.25 3.5' }],
    dot(12, 16.4)
  ],
  externalLink: [
    ['path', { d: 'M13.75 4.75h5.5v5.5M19.25 4.75l-8 8' }],
    ['path', { d: 'M17.25 13.5v4c0 .97-.78 1.75-1.75 1.75h-9c-.97 0-1.75-.78-1.75-1.75v-9c0-.97.78-1.75 1.75-1.75h4' }]
  ],
  // Deep Dive: the readings inside
  readings: [['path', { d: 'M6.5 18.5v-6M12 18.5v-13M17.5 18.5v-9' }]],

  // The Moon's day: a horizon with the Moon or Sun crossing it
  rise: [['path', { d: 'M4 18.25h16' }], ['path', { d: 'M12 14.5V5.25M8.75 8.5 12 5.25l3.25 3.25' }]],
  set: [['path', { d: 'M4 18.25h16' }], ['path', { d: 'M12 5.25v9.25M8.75 11.25 12 14.5l3.25-3.25' }]],
  peak: [
    ['path', { d: 'M4 18.25h16' }],
    ['path', { d: 'M4.75 18.25C7.2 12.6 9.5 10.5 12 10.5s4.8 2.1 7.25 7.75', strokeDasharray: '0 2.6' }],
    ['circle', { cx: 12, cy: 10.5, r: 2, fill: 'currentColor', stroke: 'none' }]
  ],
  sunrise: [
    ['path', { d: 'M3.75 19h16.5M7.5 19a4.5 4.5 0 0 1 9 0M4.9 14.4l1.25.7M19.1 14.4l-1.25.7' }],
    ['path', { d: 'M12 11.75v-7M9.25 7.5 12 4.75l2.75 2.75' }]
  ],
  sunset: [
    ['path', { d: 'M3.75 19h16.5M7.5 19a4.5 4.5 0 0 1 9 0M4.9 14.4l1.25.7M19.1 14.4l-1.25.7' }],
    ['path', { d: 'M12 4.75v7M9.25 9 12 11.75 14.75 9' }]
  ],
  moon: [['path', { d: 'M15.75 4.6a7.75 7.75 0 1 0 3.65 10.6A6.25 6.25 0 0 1 15.75 4.6Z' }]],

  // Feedback
  check: [['path', { d: 'm5.5 12.5 4 4 9-9' }]],
  alert: [['circle', { cx: 12, cy: 12, r: 8.25 }], ['path', { d: 'M12 7.75v5' }], dot(12, 16.25)],
  spinner: [['path', { d: 'M12 3.75A8.25 8.25 0 1 1 3.75 12' }]],
  refresh: [
    ['path', { d: 'M4.75 12A7.25 7.25 0 0 1 17.4 7.2M19.25 12A7.25 7.25 0 0 1 6.6 16.8' }],
    ['path', { d: 'M17.75 3.75v3.6h-3.6M6.25 20.25v-3.6h3.6' }]
  ],
  offline: [
    ['path', { d: 'M5.25 10.4a9.6 9.6 0 0 1 13.5 0M8 13.25a5.7 5.7 0 0 1 8 0M10.6 16.1a2 2 0 0 1 2.8 0' }],
    dot(12, 19),
    ['path', { d: 'm4.5 4.5 15 15' }]
  ]
};

export const ICON_NAMES = Object.keys(ICONS);
