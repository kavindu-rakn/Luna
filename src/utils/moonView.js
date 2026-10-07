// The Moon as it looks from a place at an instant: which way it is turned in the
// sky, how far it has nodded to show past its edges (libration), where the Sun
// lights it from, and where it stands among the stars. The 3D Moon and the flat
// one are both drawn from this, so they always agree.
//
// Meeus, Astronomical Algorithms (2nd ed.): sidereal time (ch. 12), coordinates
// (13), the parallactic angle (14), nutation (22), the Sun's distance (25),
// parallax (40), the Moon's latitude (47), the bright limb (48) and libration (53).
// Times are treated as Terrestrial Time; the ~70 s difference from UTC moves the
// Moon by 0.01°, far below anything drawn.

import { getLunarArguments, getMoonEclipticLongitude, getMoonDistanceKm, getSunEclipticLongitude } from './lunarCalc.js';

const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const sin = (d) => Math.sin(d * rad);
const cos = (d) => Math.cos(d * rad);
const norm360 = (d) => ((d % 360) + 360) % 360;
const norm180 = (d) => norm360(d + 180) - 180;

const EARTH_RADIUS_KM = 6378.14;
const AU_KM = 149597870.7;
// Inclination of the Moon's mean equator to the ecliptic
const LUNAR_EQUATOR_INCLINATION = 1.54242;

// Meeus table 47.B — [D, M, M', F, Σb in 1e-6 degrees]
const LATITUDE_TERMS = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833], [0, 0, 1, -3, 777], [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607], [2, 0, 2, -1, 596], [2, -1, 1, -1, 491], [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421], [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351], [4, 0, 0, 1, 331], [2, -1, 1, 1, 315], [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283], [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220], [2, 1, -1, -1, -220], [1, 0, 1, 1, -185], [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177], [4, 0, -2, -1, 176], [4, -1, -1, -1, 166], [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132], [1, 0, -1, -1, -119], [4, -1, 0, -1, 115], [2, -2, 0, 1, 107]
];

const centuries = (date) => (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;

// The Moon's geocentric ecliptic latitude in degrees (Meeus 47)
export const getMoonEclipticLatitude = (date = new Date()) => {
  const { T, D, M, Mp, F, E } = getLunarArguments(date);
  let sumB = 0;
  for (const [cD, cM, cMp, cF, coeff] of LATITUDE_TERMS) {
    const eScale = cM === 0 ? 1 : E ** Math.abs(cM);
    sumB += coeff * eScale * sin(cD * D + cM * M + cMp * Mp + cF * F);
  }
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000;
  const A1 = 119.75 + 131.849 * T;
  const A3 = 313.45 + 481266.484 * T;
  sumB += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
  return sumB / 1e6;
};

// Nutation in longitude and the true obliquity of the ecliptic, to about 0.5"
// (Meeus 22, the shortened series), with the mean longitude of the Moon's node
const getNutation = (T) => {
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T ** 3 / 450000;
  const L = 280.4665 + 36000.7698 * T;
  const Lm = 218.3165 + 481267.8813 * T;
  const dPsi = (-17.2 * sin(omega) - 1.32 * sin(2 * L) - 0.23 * sin(2 * Lm) + 0.21 * sin(2 * omega)) / 3600;
  const dEps = (9.2 * cos(omega) + 0.57 * cos(2 * L) + 0.1 * cos(2 * Lm) - 0.09 * cos(2 * omega)) / 3600;
  const eps0 = 23.4392911 - (46.815 * T + 0.00059 * T * T - 0.001813 * T ** 3) / 3600;
  return { dPsi, eps: eps0 + dEps };
};

// The Earth-Sun distance in AU (Meeus 25)
const getSunDistanceAU = (T) => {
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  return (1.000001018 * (1 - e * e)) / (1 + e * cos(M + C));
};

const toEquatorial = (lambda, beta, eps) => ({
  ra: norm360(Math.atan2(sin(lambda) * cos(eps) - Math.tan(beta * rad) * sin(eps), cos(lambda)) * deg),
  dec: Math.asin(sin(beta) * cos(eps) + cos(beta) * sin(eps) * sin(lambda)) * deg
});

const toEcliptic = (ra, dec, eps) => ({
  lambda: norm360(Math.atan2(sin(ra) * cos(eps) + Math.tan(dec * rad) * sin(eps), cos(ra)) * deg),
  beta: Math.asin(sin(dec) * cos(eps) - cos(dec) * sin(eps) * sin(ra)) * deg
});

// Apparent sidereal time at Greenwich, in degrees (Meeus 12)
const getSiderealTime = (date, T, dPsi, eps) => {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const mean = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T ** 3 / 38710000;
  return norm360(mean + dPsi * cos(eps));
};

// Optical libration for the Moon seen in direction (lambda, beta), and the same
// formulas give the subsolar point when fed the Sun's direction from the Moon
// (Meeus 53). Physical libration, a few hundredths of a degree, is left out.
const librate = (lambda, beta, dPsi, node, F) => {
  const W = lambda - dPsi - node;
  const I = LUNAR_EQUATOR_INCLINATION;
  const A = Math.atan2(sin(W) * cos(beta) * cos(I) - sin(beta) * sin(I), cos(W) * cos(beta)) * deg;
  return {
    l: norm180(A - F),
    b: Math.asin(-sin(W) * cos(beta) * sin(I) - sin(beta) * cos(I)) * deg
  };
};

// Everything that follows from the instant alone, seen from Earth's centre
const geocentric = (date) => {
  const T = centuries(date);
  const { F } = getLunarArguments(date);
  const { dPsi, eps } = getNutation(T);
  // The mean longitude of the ascending node, the precise form libration needs
  const node = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000;
  const lambda = getMoonEclipticLongitude(date) + dPsi;
  const beta = getMoonEclipticLatitude(date);
  const distanceKm = getMoonDistanceKm(date);
  const sunLambda = getSunEclipticLongitude(date);
  const sunDistanceAU = getSunDistanceAU(T);
  return {
    T, F, dPsi, eps, node, lambda, beta, distanceKm, sunLambda, sunDistanceAU,
    moon: toEquatorial(lambda, beta, eps),
    sun: toEquatorial(sunLambda, 0, eps)
  };
};

// The point on the Moon with the Sun overhead (Meeus 53)
const subsolarPoint = (g) => {
  const ratio = g.distanceKm / (g.sunDistanceAU * AU_KM);
  const lambdaH = g.sunLambda + 180 + ratio * deg * cos(g.beta) * sin(g.sunLambda - g.lambda);
  return librate(lambdaH, ratio * g.beta, g.dPsi, g.node, g.F);
};

// Position angle of the Moon's axis, measured from celestial north through east,
// for the Moon at right ascension ra with libration latitude b (Meeus 53)
const axisAngle = (g, ra, b) => {
  const I = LUNAR_EQUATOR_INCLINATION;
  const V = g.node + g.dPsi;
  const X = sin(I) * sin(V);
  const Y = sin(I) * cos(V) * cos(g.eps) - cos(I) * sin(g.eps);
  const omega = Math.atan2(X, Y) * deg;
  return Math.asin((Math.hypot(X, Y) * cos(ra - omega)) / cos(b)) * deg;
};

// Position angle of the bright limb's midpoint, from north through east (Meeus 48)
const brightLimbAngle = (sun, moon) => norm360(Math.atan2(
  cos(sun.dec) * sin(sun.ra - moon.ra),
  sin(sun.dec) * cos(moon.dec) - cos(sun.dec) * sin(moon.dec) * cos(sun.ra - moon.ra)
) * deg);

// Geocentric optical libration, axis angle and subsolar point, as Meeus's
// examples give them. The view below uses the topocentric versions.
export const getGeocentricLibration = (date = new Date()) => {
  const g = geocentric(date);
  const libration = librate(g.lambda, g.beta, g.dPsi, g.node, g.F);
  return {
    ...libration,
    P: axisAngle(g, g.moon.ra, libration.b),
    subsolar: subsolarPoint(g),
    brightLimb: brightLimbAngle(g.sun, g.moon),
    ra: g.moon.ra,
    dec: g.moon.dec,
    lambda: g.lambda,
    beta: g.beta,
    eps: g.eps,
    dPsi: g.dPsi
  };
};

// A unit vector in the Moon's own axes: x towards 0° longitude on the equator
// (the middle of the near side), y towards 90° east, z towards the north pole
const selenographic = (l, b) => [cos(b) * cos(l), cos(b) * sin(l), sin(b)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a) => {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
};

// The rotation from the Moon's axes to the view: rows are the screen's right, its
// up (the observer's zenith) and the direction back towards the viewer, each in
// the Moon's axes. The viewer looks along `toViewer`; the north pole appears
// poleAngle degrees anticlockwise from straight up.
export const bodyToView = (toViewer, poleAngle) => {
  const z = normalize(toViewer);
  const pole = [0, 0, 1];
  const up0 = normalize(pole.map((c, i) => c - dot(pole, z) * z[i]));
  const right0 = cross(up0, z);
  const c = cos(poleAngle);
  const s = sin(poleAngle);
  const up = up0.map((v, i) => c * v + s * right0[i]);
  const right = right0.map((v, i) => c * v - s * up0[i]);
  return [...right, ...up, ...z];
};

const applyRows = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
];

// The Moon from a place on Earth (latitude and east longitude in degrees) at an
// instant: everything the 3D scene and the flat Moon need, and the Moon's place
// in the sky for the star field.
export const getMoonView = (date = new Date(), lat = 0, lon = 0) => {
  const g = geocentric(date);

  // Parallax: from the surface the Moon sits up to a degree from where it sits
  // seen from Earth's centre, which shifts its libration and its tilt (Meeus 40)
  const phi = Math.max(-89.999, Math.min(89.999, lat));
  const u = Math.atan(0.99664719 * Math.tan(phi * rad));
  const rhoSin = 0.99664719 * Math.sin(u);
  const rhoCos = Math.cos(u);
  const sinPi = EARTH_RADIUS_KM / g.distanceKm;
  const theta = getSiderealTime(date, g.T, g.dPsi, g.eps) + lon;
  const H = theta - g.moon.ra;
  const dRa = Math.atan2(-rhoCos * sinPi * sin(H), cos(g.moon.dec) - rhoCos * sinPi * cos(H)) * deg;
  const moon = {
    ra: norm360(g.moon.ra + dRa),
    dec: Math.atan2((sin(g.moon.dec) - rhoSin * sinPi) * cos(dRa), cos(g.moon.dec) - rhoCos * sinPi * cos(H)) * deg
  };
  const hourAngle = H - dRa;

  // Topocentric libration: the same formulas, fed the direction from the observer
  const topo = toEcliptic(moon.ra, moon.dec, g.eps);
  const libration = librate(topo.lambda, topo.beta, g.dPsi, g.node, g.F);
  const subsolar = subsolarPoint(g);
  const P = axisAngle(g, moon.ra, libration.b);

  // Parallactic angle: how far the zenith is turned from celestial north at the
  // Moon, so the disc can be drawn as it stands in this observer's sky (Meeus 14)
  const q = Math.atan2(sin(hourAngle), Math.tan(phi * rad) * cos(moon.dec) - sin(moon.dec) * cos(hourAngle)) * deg;
  const altitude = Math.asin(sin(phi) * sin(moon.dec) + cos(phi) * cos(moon.dec) * cos(hourAngle)) * deg;

  // On a screen with the zenith up, a direction at position angle θ (measured from
  // north through east) appears θ - q anticlockwise from up
  const poleAngle = norm180(P - q);
  const toViewer = selenographic(libration.l, libration.b);
  const toSun = selenographic(subsolar.l, subsolar.b);
  const matrix = bodyToView(toViewer, poleAngle);
  const sunView = applyRows(matrix, toSun);
  const phaseAngle = Math.acos(Math.max(-1, Math.min(1, dot(toViewer, toSun)))) * deg;

  return {
    libration,
    subsolar,
    axisAngle: P,
    parallacticAngle: q,
    brightLimbAngle: brightLimbAngle(g.sun, moon),
    poleAngle,
    // Where the bright limb's midpoint points on screen, anticlockwise from up
    limbAngle: norm360(Math.atan2(-sunView[0], sunView[1]) * deg),
    phaseAngle,
    // The phase whose lit shape this is, on the 0-0.5 scale litPath reads with the
    // bright limb on the right: 0 new, 0.5 full
    litPhase: (180 - phaseAngle) / 360,
    bodyToView: matrix,
    // As the flat Moon's photograph shows it: the same tilt, no libration
    meanBodyToView: bodyToView([1, 0, 0], poleAngle),
    sunView,
    ra: moon.ra,
    dec: moon.dec,
    altitude,
    hourAngle: norm180(hourAngle),
    siderealTime: norm360(theta),
    // The instant and the latitude, for the sky's precession and its zenith
    time: date.getTime(),
    latitude: phi
  };
};
