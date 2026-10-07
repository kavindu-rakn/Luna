// The five planets the eye can see, where they stand among the stars and how
// bright they are. The Moon always travels along the ecliptic and so do they, so
// Venus or Jupiter often sits right beside it.
//
// Positions from JPL's Keplerian elements for approximate positions of the major
// planets (Standish & Williams, https://ssd.jpl.nasa.gov/planets/approx_pos.html):
// table 1 between 1800 and 2050, good to a few arcminutes, and tables 2a and 2b
// from 3000 BC to 3000 AD, good to about a quarter of a degree. Brightness from
// the Astronomical Almanac's formulas (Meeus, Astronomical Algorithms, ch. 41).

import { centuriesSinceJ2000 } from './frame.js';

const rad = Math.PI / 180;
const OBLIQUITY_J2000 = 23.43928;
// Days light takes to cross an astronomical unit
const LIGHT_DAYS_PER_AU = 0.0057755183;

// [a (au), e, I, L, long. perihelion, long. ascending node] (degrees), then each
// one's rate per Julian century
const TABLE_1 = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus: [[0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]],
  earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
  mars: [[1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]]
};
const TABLE_2 = {
  mercury: [[0.38709843, 0.20563661, 7.00559432, 252.25166724, 77.45771895, 48.33961819],
    [0, 0.00002123, -0.00590158, 149472.67486623, 0.15940013, -0.12214182]],
  venus: [[0.72332102, 0.00676399, 3.39777545, 181.9797085, 131.76755713, 76.67261496],
    [-0.00000026, -0.00005107, 0.00043494, 58517.8156026, 0.05679648, -0.27274174]],
  earth: [[1.00000018, 0.01673163, -0.00054346, 100.46691572, 102.93005885, -5.11260389],
    [-0.00000003, -0.00003661, -0.01337178, 35999.37306329, 0.3179526, -0.24123856]],
  mars: [[1.52371243, 0.09336511, 1.85181869, -4.56813164, -23.91744784, 49.71320984],
    [0.00000097, 0.00009149, -0.00724757, 19140.29934243, 0.45223625, -0.26852431]],
  jupiter: [[5.20248019, 0.0485359, 1.29861416, 34.33479152, 14.27495244, 100.29282654],
    [-0.00002864, 0.00018026, -0.00322699, 3034.90371757, 0.18199196, 0.13024619]],
  saturn: [[9.54149883, 0.05550825, 2.49424102, 50.07571329, 92.86136063, 113.63998702],
    [-0.00003065, -0.00032044, 0.00451969, 1222.11494724, 0.54179478, -0.25015002]]
};
// Table 2b: b, c, s, f, added to the mean anomaly of the outer planets
const TABLE_2B = {
  jupiter: [-0.00012452, 0.0606406, -0.35635438, 38.35125],
  saturn: [0.00025899, -0.13434469, 0.87320147, 38.35125]
};

// Each planet's brightness at 1 au from the Sun and from us, full phase, with its
// change by phase angle i (degrees), and its B−V colour (Mallama 2018), so Mars
// shows orange and Saturn pale gold
const PLANETS = [
  { name: 'Mercury', key: 'mercury', bv: 0.93, phase: (i) => -0.42 + 0.038 * i - 0.000273 * i * i + 0.000002 * i ** 3 },
  { name: 'Venus', key: 'venus', bv: 0.82, phase: (i) => -4.4 + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i ** 3 },
  { name: 'Mars', key: 'mars', bv: 1.36, phase: (i) => -1.52 + 0.016 * i },
  { name: 'Jupiter', key: 'jupiter', bv: 0.83, phase: (i) => -9.4 + 0.005 * i },
  { name: 'Saturn', key: 'saturn', bv: 1.04, phase: (i) => -8.88 + 0.044 * i }
];

// Heliocentric position in au, in the ecliptic and equinox of J2000
const heliocentric = (key, T, table) => {
  const [base, rate] = table[key];
  const [a, e, I, L, peri, node] = base.map((v, i) => v + rate[i] * T);
  let M = L - peri;
  const extra = table === TABLE_2 ? TABLE_2B[key] : null;
  if (extra) {
    const [b, c, s, f] = extra;
    M += b * T * T + c * Math.cos(f * T * rad) + s * Math.sin(f * T * rad);
  }
  M = ((((M + 180) % 360) + 360) % 360) - 180;
  // Kepler's equation, by Newton's method from E = M
  let E = M + (e / rad) * Math.sin(M * rad);
  for (let k = 0; k < 8; k++) {
    const dE = (M - (E - (e / rad) * Math.sin(E * rad))) / (1 - e * Math.cos(E * rad));
    E += dE;
    if (Math.abs(dE) < 1e-7) break;
  }
  const x = a * (Math.cos(E * rad) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E * rad);
  const w = (peri - node) * rad;
  const O = node * rad;
  const i = I * rad;
  return [
    (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)) * x
      + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)) * y,
    (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)) * x
      + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)) * y,
    Math.sin(w) * Math.sin(i) * x + Math.cos(w) * Math.sin(i) * y
  ];
};

const length = (v) => Math.hypot(v[0], v[1], v[2]);

// Saturn's rings, tilted towards us, add up to a magnitude: the tilt B of the ring
// plane seen from Earth (Meeus 45), from Saturn's geocentric ecliptic direction
const ringTilt = (g, T) => {
  const lambda = Math.atan2(g[1], g[0]);
  const beta = Math.asin(g[2] / length(g));
  const incl = (28.075216 - 0.012998 * T) * rad;
  const node = (169.50847 + 1.394681 * T) * rad;
  return Math.asin(Math.sin(incl) * Math.cos(beta) * Math.sin(lambda - node) - Math.cos(incl) * Math.sin(beta));
};

// Every naked-eye planet at an instant: a J2000 equatorial unit vector as seen
// from Earth (light time allowed for), its V magnitude and its B−V colour
export const getPlanets = (date = new Date()) => {
  const ms = date instanceof Date ? date.getTime() : date;
  const T = centuriesSinceJ2000(ms);
  const year = 2000 + T * 100;
  const table = year >= 1800 && year <= 2050 ? TABLE_1 : TABLE_2;
  const earth = heliocentric('earth', T, table);
  const eps = OBLIQUITY_J2000 * rad;

  return PLANETS.map(({ name, key, bv, phase }) => {
    let planet = heliocentric(key, T, table);
    let g = planet.map((c, i) => c - earth[i]);
    // Seen where it was when the light left it
    const lightTime = (length(g) * LIGHT_DAYS_PER_AU) / 36525;
    planet = heliocentric(key, T - lightTime, table);
    g = planet.map((c, i) => c - earth[i]);

    const r = length(planet);
    const delta = length(g);
    const R = length(earth);
    const i = Math.acos(Math.max(-1, Math.min(1, (r * r + delta * delta - R * R) / (2 * r * delta)))) / rad;
    let magnitude = phase(i) + 5 * Math.log10(r * delta);
    if (key === 'saturn') {
      const B = Math.abs(Math.sin(ringTilt(g, T)));
      magnitude += -2.6 * B + 1.25 * B * B;
    }

    const equatorial = [g[0], g[1] * Math.cos(eps) - g[2] * Math.sin(eps), g[1] * Math.sin(eps) + g[2] * Math.cos(eps)];
    return { name, direction: equatorial.map((c) => c / delta), magnitude, colorIndex: bv };
  });
};
