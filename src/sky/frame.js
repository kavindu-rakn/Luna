// How the sky behind the Moon is laid out on screen (decision G1). The Moon is drawn
// far larger than its true half degree, so the sky is a composite, like a
// photograph taken through a wide lens: a field about 80° across the screen's
// diagonal, centred on where the Moon really is among the stars, and turned to the
// observer's horizon, with the zenith up, as the Moon itself is (F4).
//
// Star positions are J2000; the Moon's come from getMoonView for the equator of
// the date. Precession between the two (about 0.36° by 2026) is folded into the one
// matrix the stars are projected through. Meeus, Astronomical Algorithms (2nd ed.),
// ch. 21.

const rad = Math.PI / 180;

// The field's span across the screen's diagonal, in degrees
export const FIELD_DIAGONAL = 80;
// Directions closer than this to 90° from the Moon (about 81°) are not drawn: a
// flat projection stretches them without limit
export const MIN_FORWARD = 0.15;

export const centuriesSinceJ2000 = (ms) => (ms / 86400000 + 2440587.5 - 2451545) / 36525;

// Matrices are 3×3, as arrays of nine numbers row by row
export const multiply = (a, b) => {
  const out = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
};
export const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const apply = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
];

// A unit vector towards right ascension and declination, in degrees
export const unitVector = (ra, dec) => [
  Math.cos(dec * rad) * Math.cos(ra * rad),
  Math.cos(dec * rad) * Math.sin(ra * rad),
  Math.sin(dec * rad)
];

// Right ascension (0-360) and declination of a vector, in degrees
export const toRaDec = (v) => {
  const ra = Math.atan2(v[1], v[0]) / rad;
  return { ra: (ra + 360) % 360, dec: Math.asin(Math.max(-1, Math.min(1, v[2] / Math.hypot(v[0], v[1], v[2])))) / rad };
};

// Precession from J2000 to an epoch T Julian centuries later (or earlier), the
// IAU 1976 angles (Meeus 21.2-21.4): v_epoch = P v_J2000
export const precessionMatrix = (T) => {
  const zeta = ((2306.2181 + (0.30188 + 0.017998 * T) * T) * T) / 3600 * rad;
  const z = ((2306.2181 + (1.09468 + 0.018203 * T) * T) * T) / 3600 * rad;
  const theta = ((2004.3109 - (0.42665 + 0.041833 * T) * T) * T) / 3600 * rad;
  const [cZeta, sZeta, cz, sz, cTheta, sTheta] = [
    Math.cos(zeta), Math.sin(zeta), Math.cos(z), Math.sin(z), Math.cos(theta), Math.sin(theta)
  ];
  return [
    cZeta * cTheta * cz - sZeta * sz, -sZeta * cTheta * cz - cZeta * sz, -sTheta * cz,
    cZeta * cTheta * sz + sZeta * cz, -sZeta * cTheta * sz + cZeta * cz, -sTheta * sz,
    cZeta * sTheta, -sZeta * sTheta, cTheta
  ];
};

// The turn from J2000 directions into the sky as drawn: rows are the screen's
// right, its up (towards the zenith) and the line of sight towards the Moon.
// On a screen with north up, east is on the left, as it is looking up at the sky;
// the parallactic angle q then turns the zenith to the top, exactly as it turns
// the Moon (getMoonView), so the Moon sits on its own patch of sky.
export const skyFrame = ({ ra, dec, parallacticAngle, time }) => {
  const a = ra * rad;
  const d = dec * rad;
  const q = parallacticAngle * rad;
  const forward = unitVector(ra, dec);
  const north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const east = [-Math.sin(a), Math.cos(a), 0];
  const up = north.map((n, i) => n * Math.cos(q) + east[i] * Math.sin(q));
  const right = north.map((n, i) => n * Math.sin(q) - east[i] * Math.cos(q));
  return multiply([...right, ...up, ...forward], precessionMatrix(centuriesSinceJ2000(time)));
};

// How many CSS pixels one unit of the projection spans, for a screen this size
export const focalLength = (width, height) => Math.hypot(width, height) / 2 / Math.tan((FIELD_DIAGONAL / 2) * rad);

// Where a J2000 direction lands, in pixels from the Moon's centre (x right, y
// down, as on the page), or null when it is too far round to draw
export const project = (frame, focal, direction) => {
  const v = apply(frame, direction);
  if (v[2] < MIN_FORWARD) return null;
  return [(focal * v[0]) / v[2], (-focal * v[1]) / v[2]];
};

// The observer's zenith as a J2000 direction: overhead is right ascension = local
// sidereal time, declination = latitude, in the equator of the date
export const zenithDirection = ({ latitude, siderealTime, time }) =>
  apply(transpose(precessionMatrix(centuriesSinceJ2000(time))), unitVector(siderealTime, latitude));
