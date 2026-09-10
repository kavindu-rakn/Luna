import SunCalc from 'suncalc';

// Constants for lunar mechanics
export const SYNODIC_MONTH = 29.53058867; // average synodic month in days
export const MIN_MOON_DISTANCE = 356500;   // Perigee in km
export const MAX_MOON_DISTANCE = 406700;   // Apogee in km
export const MEAN_MOON_DISTANCE = 384400;  // Average distance in km

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈\uFE0E', startDeg: 0 },
  { name: 'Taurus', symbol: '♉\uFE0E', startDeg: 30 },
  { name: 'Gemini', symbol: '♊\uFE0E', startDeg: 60 },
  { name: 'Cancer', symbol: '♋\uFE0E', startDeg: 90 },
  { name: 'Leo', symbol: '♌\uFE0E', startDeg: 120 },
  { name: 'Virgo', symbol: '♍\uFE0E', startDeg: 150 },
  { name: 'Libra', symbol: '♎\uFE0E', startDeg: 180 },
  { name: 'Scorpio', symbol: '♏\uFE0E', startDeg: 210 },
  { name: 'Sagittarius', symbol: '♐\uFE0E', startDeg: 240 },
  { name: 'Capricorn', symbol: '♑\uFE0E', startDeg: 270 },
  { name: 'Aquarius', symbol: '♒\uFE0E', startDeg: 300 },
  { name: 'Pisces', symbol: '♓\uFE0E', startDeg: 330 }
];

// Convert radians to degrees
export const toDeg = (rad) => (rad * 180) / Math.PI;

// Convert SunCalc azimuth (where 0 is South, West is positive, East is negative) to compass bearing (0 = North, 90 = East, 180 = South, 270 = West)
export const toCompassBearing = (azimuthRad) => {
  const deg = toDeg(azimuthRad);
  return (deg + 180) % 360;
};

// Compass bearing to 16-wind cardinal direction string
export const toCompassDirection = (bearingDeg) => {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(bearingDeg / 22.5) % 16;
  return directions[index];
};

// The Moon's tropical zodiac SIGN — an even 30-degree division of the ecliptic
// measured from the vernal equinox. Note this is not the same thing as the IAU
// constellation the Moon lies in, whose boundaries are irregular.
export const getMoonZodiac = (date = new Date()) => {
  const tropicalLon = getMoonEclipticLongitude(date);
  const ayanamsa = getAyanamsa(date);
  const siderealLon = ((tropicalLon - ayanamsa) % 360 + 360) % 360;

  const read = (longitude) => {
    const sign = ZODIAC_SIGNS[Math.floor(longitude / 30) % 12];
    return {
      name: sign.name,
      symbol: sign.symbol,
      startDeg: sign.startDeg,
      degreeInSign: `${(longitude % 30).toFixed(1)}°`
    };
  };

  const tropical = read(tropicalLon);
  const sidereal = read(siderealLon);

  // Spread the tropical reading at the top level: it is what the UI shows by default
  return {
    ...tropical,
    eclipticLongitude: tropicalLon.toFixed(2),
    tropical,
    sidereal: { ...sidereal, ayanamsa: ayanamsa.toFixed(2) }
  };
};

// ═══ EARTH-MOON DISTANCE (Meeus, Astronomical Algorithms, ch. 47) ═══
// SunCalc models the distance with a single term, 385001 - 20905*cos(M'), which spans
// only 364,096-405,906 km. The Moon's true range is roughly 356,500-406,700 km, so
// readings near perigee were short by up to ~7,600 km and the lower fifth of the
// perigee/apogee gauge could never be reached. These are the principal periodic terms.

// Fundamental arguments in degrees, plus the eccentricity correction E,
// for an instant expressed in Julian centuries since J2000.
const getLunarArguments = (date) => {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  return {
    T,
    // Mean elongation of the Moon from the Sun
    D: 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000,
    // Sun's mean anomaly
    M: 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000,
    // Moon's mean anomaly
    Mp: 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000,
    // Moon's argument of latitude
    F: 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000,
    // Correction for the varying eccentricity of Earth's orbit
    E: 1 - 0.002516 * T - 0.0000074 * T2
  };
};

// Meeus table 47.A — [D, M, M', F, sumL, sumR]
// sumL in units of 1e-6 degrees, sumR in units of 0.001 km
const LUNAR_TERMS = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752]
];

// Sum the periodic series once; both distance and longitude fall out of it.
const sumLunarSeries = (date) => {
  const { T, D, M, Mp, F, E } = getLunarArguments(date);
  const rad = Math.PI / 180;

  let sumL = 0;
  let sumR = 0;

  for (const [cD, cM, cMp, cF, coeffL, coeffR] of LUNAR_TERMS) {
    const arg = (cD * D + cM * M + cMp * Mp + cF * F) * rad;
    // Terms involving the Sun's anomaly are scaled by E (or E squared)
    const eScale = cM === 0 ? 1 : Math.pow(E, Math.abs(cM));
    if (coeffL !== 0) sumL += coeffL * Math.sin(arg) * eScale;
    if (coeffR !== 0) sumR += coeffR * Math.cos(arg) * eScale;
  }

  // Moon's mean longitude
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T
    + Math.pow(T, 3) / 538841 - Math.pow(T, 4) / 65194000;

  // Additive terms for the action of Venus (A1), Jupiter (A2) and Earth's flattening
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  sumL += 3958 * Math.sin(A1 * rad)
    + 1962 * Math.sin((Lp - F) * rad)
    + 318 * Math.sin(A2 * rad);

  return { Lp, sumL, sumR };
};

// Earth-Moon centre-to-centre distance in kilometres
export const getMoonDistanceKm = (date = new Date()) => {
  return 385000.56 + sumLunarSeries(date).sumR / 1000;
};

// Apparent ecliptic longitude of the Moon, 0-360 degrees.
// The previous implementation used only the mean longitude, omitting the equation of
// the centre (6.29 deg) and every other periodic term, which put the reported zodiac
// sign in the wrong 30-degree bin roughly 13% of the time.
export const getMoonEclipticLongitude = (date = new Date()) => {
  const { Lp, sumL } = sumLunarSeries(date);
  const lambda = Lp + sumL / 1000000;
  return ((lambda % 360) + 360) % 360;
};

// Apparent ecliptic longitude of the Sun, 0-360 degrees (Meeus ch. 25, ~0.01 deg).
export const getSunEclipticLongitude = (date = new Date()) => {
  const rad = Math.PI / 180;
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;

  // Geometric mean longitude and mean anomaly
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;

  // Equation of the centre
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * rad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M * rad)
    + 0.000289 * Math.sin(3 * M * rad);

  // Correction from true to apparent longitude
  const omega = 125.04 - 1934.136 * T;
  const apparent = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad);

  return ((apparent % 360) + 360) % 360;
};

// Angular distance of the Moon east of the Sun along the ecliptic, 0-360 degrees.
// This is what actually defines the phases: 0 New, 90 First Quarter, 180 Full,
// 270 Last Quarter. It advances monotonically at about 12.19 deg/day, so unlike
// SunCalc's illumination-derived phase it is continuous through New Moon and
// genuinely reaches every target value.
export const getMoonElongation = (date = new Date()) => {
  const d = getMoonEclipticLongitude(date) - getSunEclipticLongitude(date);
  return ((d % 360) + 360) % 360;
};

// Phase as a 0..1 fraction of the synodic cycle
export const getMoonPhaseFraction = (date = new Date()) => getMoonElongation(date) / 360;

// Illuminated fraction of the lunar disc, 0..1, derived from the same elongation
// so the phase name, the terminator and the percentage can never disagree.
export const getIlluminatedFraction = (date = new Date()) => {
  return (1 - Math.cos(getMoonElongation(date) * Math.PI / 180)) / 2;
};

// Lahiri (Chitrapaksha) ayanamsa: the offset between the tropical zodiac, measured
// from the moving vernal equinox, and the sidereal zodiac, fixed against the stars.
export const getAyanamsa = (date = new Date()) => {
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;
  return 23.85286 + 1.396971 * T + 0.0003086 * T * T;
};

// Classify a 0..1 phase value into its name. Shared by the full detail record and
// the lightweight timeline summary so the two can never drift apart.
const PRIMARY_THRESHOLD = 0.015; // ~10.6 hour window around each exact quarter

export const classifyPhase = (phase) => {
  if (phase <= PRIMARY_THRESHOLD || phase >= 1 - PRIMARY_THRESHOLD) {
    return { name: 'New Moon', phaseKey: 'new_moon', isExactPrimary: true };
  }
  if (Math.abs(phase - 0.25) <= PRIMARY_THRESHOLD) {
    return { name: 'First Quarter', phaseKey: 'first_quarter', isExactPrimary: true };
  }
  if (Math.abs(phase - 0.5) <= PRIMARY_THRESHOLD) {
    return { name: 'Full Moon', phaseKey: 'full_moon', isExactPrimary: true };
  }
  if (Math.abs(phase - 0.75) <= PRIMARY_THRESHOLD) {
    return { name: 'Last Quarter', phaseKey: 'last_quarter', isExactPrimary: true };
  }
  if (phase < 0.25) return { name: 'Waxing Crescent', phaseKey: 'waxing_crescent', isExactPrimary: false };
  if (phase < 0.5) return { name: 'Waxing Gibbous', phaseKey: 'waxing_gibbous', isExactPrimary: false };
  if (phase < 0.75) return { name: 'Waning Gibbous', phaseKey: 'waning_gibbous', isExactPrimary: false };
  return { name: 'Waning Crescent', phaseKey: 'waning_crescent', isExactPrimary: false };
};

// Illumination-only phase record. Costs a single SunCalc call, with no observer
// position, zodiac or phase projections — used for the 30-day timeline, which
// renders 31 of these on every scrub frame.
export const getPhaseSummary = (date = new Date()) => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const phase = getMoonPhaseFraction(validDate);
  const fraction = getIlluminatedFraction(validDate);
  return {
    date: validDate,
    phase,
    fraction: (fraction * 100).toFixed(1),
    ...classifyPhase(phase)
  };
};

// Golden-section search for the instant at which the Moon reaches `targetPhase`.
// The cosine distance metric is smooth and convex across the search window, so this
// converges without the seam discontinuity a raw phase difference would suffer at
// the New Moon boundary.
const solvePhaseInstant = (targetPhase, approxTimeMs, windowHours = 36) => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const resphi = 2 - phi;

  let a = approxTimeMs - windowHours * 3600000;
  let b = approxTimeMs + windowHours * 3600000;
  let x1 = a + resphi * (b - a);
  let x2 = b - resphi * (b - a);

  let f1 = getPhaseAngularDistance(getMoonPhaseFraction(new Date(x1)), targetPhase);
  let f2 = getPhaseAngularDistance(getMoonPhaseFraction(new Date(x2)), targetPhase);

  for (let iter = 0; iter < 28; iter++) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = a + resphi * (b - a);
      f1 = getPhaseAngularDistance(getMoonPhaseFraction(new Date(x1)), targetPhase);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = b - resphi * (b - a);
      f2 = getPhaseAngularDistance(getMoonPhaseFraction(new Date(x2)), targetPhase);
    }
  }

  return new Date(Math.round((a + b) / 2));
};

// "in 4d 6h" / "in 3h 12m" / "in 8 min" / "happening now"
const formatCountdown = (ms) => {
  if (ms <= 60000) return 'happening now';
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes} min`;
};

// 12- or 24-hour, as the viewer prefers. hourCycle rather than hour12: false,
// which some engines render as "24:00" at midnight.
const hourCycleFor = (clock) => (clock === '24h' ? 'h23' : 'h12');

// Date and time of a phase event, in the observing location's timezone
export const formatPhaseStamp = (d, timeZone, clock = '12h') => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: hourCycleFor(clock),
      timeZone
    }).format(d);
  } catch {
    return '--';
  }
};

// Get comprehensive lunar details
export const getLunarDetails = (date = new Date(), lat = 0, lon = 0, timeZone = null, clock = '12h') => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const moonPosition = SunCalc.getMoonPosition(validDate, lat, lon);

  const phase = getMoonPhaseFraction(validDate); // 0 to 1, from true elongation
  const fraction = getIlluminatedFraction(validDate); // 0.0 to 1.0
  // Position angle of the bright limb is a separate quantity; SunCalc handles it well
  const angle = SunCalc.getMoonIllumination(validDate).angle;

  const age = phase * SYNODIC_MONTH;
  const distanceKm = Math.round(getMoonDistanceKm(validDate));
  const distancePercent = Math.max(0, Math.min(100, ((distanceKm - MIN_MOON_DISTANCE) / (MAX_MOON_DISTANCE - MIN_MOON_DISTANCE)) * 100));

  const { name, phaseKey, isExactPrimary } = classifyPhase(phase);

  const nextPhases = getNextMajorPhases(validDate, timeZone, clock);
  const zodiac = getMoonZodiac(validDate);

  return {
    date: validDate,
    phase,
    fraction: (fraction * 100).toFixed(1),
    fractionValue: fraction,
    angle: angle.toFixed(2),
    angleDeg: toDeg(angle).toFixed(1),
    name,
    phaseKey,
    isExactPrimary,
    age: age.toFixed(1),
    ageValue: age,
    distanceKm,
    distancePercent: distancePercent.toFixed(1),
    zodiac,
    nextPhases,
    altitude: toDeg(moonPosition.altitude).toFixed(1),
    azimuth: toCompassBearing(moonPosition.azimuth).toFixed(1)
  };
};

// Exact instants of the four upcoming primary quarter phases.
// Solved with the same golden-section search that drives Shift+Arrow navigation, so
// the countdown in the drawer and the keyboard jump can never name different dates.
export const getNextMajorPhases = (date = new Date(), timeZone = null, clock = '12h') => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const zone = timeZone || getBrowserTimeZone();
  const nowMs = validDate.getTime();
  const currentPhase = getMoonPhaseFraction(validDate);

  const resolve = (targetPhase) => {
    let diff = targetPhase - currentPhase;
    if (diff <= 0) diff += 1;

    let exact = solvePhaseInstant(targetPhase, nowMs + diff * SYNODIC_MONTH * 86400000);

    // The refined instant can land marginally in the past when we are sitting on the
    // event itself; advance a whole synodic month and re-solve if that happens.
    if (exact.getTime() < nowMs) {
      exact = solvePhaseInstant(targetPhase, exact.getTime() + SYNODIC_MONTH * 86400000);
    }

    const msRemaining = Math.max(0, exact.getTime() - nowMs);

    return {
      date: exact,
      msRemaining,
      daysRemaining: (msRemaining / 86400000).toFixed(1),
      countdown: formatCountdown(msRemaining),
      formatted: formatPhaseStamp(exact, zone, clock)
    };
  };

  return {
    nextNewMoon: resolve(0),
    nextFirstQuarter: resolve(0.25),
    nextFullMoon: resolve(0.5),
    nextLastQuarter: resolve(0.75)
  };
};

// Continuous angular distance metric between two phase values (0.0 to 1.0)
// Returns 0.0 when phase exactly matches targetPhase, with smooth convex gradient everywhere.
const getPhaseAngularDistance = (phase, targetPhase) => {
  const diff = (phase - targetPhase) * 2 * Math.PI;
  return 1 - Math.cos(diff);
};

// Jump directly to the exact astronomical date & minute of the next (+1) or previous (-1) major quarter phase
export const getAdjacentQuarterPhase = (currentDate = new Date(), direction = 1) => {
  const validDate = currentDate instanceof Date && !isNaN(currentDate.getTime()) ? currentDate : new Date();
  const p = getMoonPhaseFraction(validDate); // 0.0 to 1.0

  // 1. Determine current position in quarter cycle: [0..4)
  // 0 = New Moon (0.0), 1 = First Quarter (0.25), 2 = Full Moon (0.50), 3 = Last Quarter (0.75)
  const quarterFloat = p * 4;
  const nearestQuarterInt = Math.round(quarterFloat);
  const distToNearestQuarter = Math.abs(quarterFloat - nearestQuarterInt);

  let targetQuarterIndex;
  let phaseDelta;

  if (direction > 0) {
    // If already sitting on an exact quarter phase (within ~14 hours), force step to next (+1)
    if (distToNearestQuarter < 0.08) {
      targetQuarterIndex = (nearestQuarterInt + 1) % 4;
      phaseDelta = 0.25;
    } else {
      targetQuarterIndex = Math.ceil(quarterFloat) % 4;
      const targetP = targetQuarterIndex * 0.25;
      phaseDelta = targetP - p;
      if (phaseDelta <= 0.02) phaseDelta += 1.0;
    }
  } else {
    // If moving backward:
    if (distToNearestQuarter < 0.08) {
      targetQuarterIndex = (nearestQuarterInt - 1 + 4) % 4;
      phaseDelta = 0.25;
    } else {
      targetQuarterIndex = (Math.floor(quarterFloat) + 4) % 4;
      const targetP = targetQuarterIndex * 0.25;
      phaseDelta = p - targetP;
      if (phaseDelta <= 0.02) phaseDelta += 1.0;
    }
  }

  const targetPhase = targetQuarterIndex * 0.25;

  // 2. Compute initial time estimate
  const approxDays = phaseDelta * SYNODIC_MONTH;
  const approxTargetTime = validDate.getTime() + (direction > 0 ? 1 : -1) * approxDays * 86400000;

  // 3. Golden-section refinement around that estimate
  return solvePhaseInstant(targetPhase, approxTargetTime);
};

// The synodic month containing `date`: the New Moon at or before it, through to the
// next New Moon.
//
// The timeline used to build a 30-day window centred on the selection, which meant
// the window moved with every change and the marker was pinned to the middle
// forever. It could never reach either end of its own track. Anchoring to a real
// lunar cycle gives the scrubber a fixed span to travel across, and makes the
// panel's "Lunar Cycle" label literally true.
let cachedCycle = null;

export const getSynodicCycle = (date = new Date()) => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const nowMs = validDate.getTime();

  // Solving six phase instants costs a couple of milliseconds, and a drag asks for
  // the cycle on every pointer move. The answer only changes when the selection
  // crosses a New Moon, so hold the last one. Memoising a deterministic function is
  // a property of the function, not of whoever calls it.
  if (cachedCycle && nowMs >= cachedCycle.startMs && nowMs < cachedCycle.startMs + cachedCycle.durationMs) {
    return cachedCycle;
  }
  const MS_PER_DAY = 86400000;
  const cycleMs = SYNODIC_MONTH * MS_PER_DAY;

  // Seed from the current phase, then solve for the exact instants
  const elapsedDays = getMoonPhaseFraction(validDate) * SYNODIC_MONTH;
  let start = solvePhaseInstant(0, nowMs - elapsedDays * MS_PER_DAY);
  if (start.getTime() > nowMs) {
    start = solvePhaseInstant(0, start.getTime() - cycleMs);
  }

  let end = solvePhaseInstant(0, start.getTime() + cycleMs);
  if (end.getTime() <= nowMs) {
    start = end;
    end = solvePhaseInstant(0, start.getTime() + cycleMs);
  }

  const startMs = start.getTime();
  const durationMs = end.getTime() - startMs;
  const fractionAt = (ms) => Math.max(0, Math.min(1, (ms - startMs) / durationMs));

  // Solved, not assumed to be evenly spaced. The Moon's angular speed varies, so
  // First Quarter does not fall exactly a quarter of the way through the cycle,
  // and the timeline should show that rather than hide it.
  const quarters = [0.25, 0.5, 0.75].map((target) => {
    const instant = solvePhaseInstant(target, startMs + target * durationMs);
    return {
      ...classifyPhase(target),
      phase: target,
      date: instant,
      fraction: fractionAt(instant.getTime())
    };
  });

  // One tick per 24 hours from the opening New Moon
  const ticks = [];
  for (let ms = startMs; ms < end.getTime(); ms += MS_PER_DAY) {
    ticks.push({
      date: new Date(ms),
      fraction: fractionAt(ms),
      illumination: getIlluminatedFraction(new Date(ms))
    });
  }

  cachedCycle = {
    start,
    end,
    startMs,
    durationMs,
    durationDays: durationMs / MS_PER_DAY,
    quarters,
    ticks
  };

  return cachedCycle;
};

// Where an instant falls within a cycle, 0 at the opening New Moon and 1 at the next
export const getCycleFraction = (cycle, date) => {
  if (!cycle || !cycle.durationMs) return 0;
  const ms = (date instanceof Date ? date.getTime() : Number(date)) - cycle.startMs;
  return Math.max(0, Math.min(1, ms / cycle.durationMs));
};

// The instant at a given position along a cycle
export const getDateAtCycleFraction = (cycle, fraction) => {
  const clamped = Math.max(0, Math.min(1, fraction));
  return new Date(Math.round(cycle.startMs + clamped * cycle.durationMs));
};

// ═══ TIMEZONE HELPERS ═══
// Astronomy is computed for a LOCATION, so every time we display must be rendered
// in that location's timezone, not in whatever timezone the viewer's browser sits in.

export const getBrowserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

// Building an Intl.DateTimeFormat costs far more than using one, and the sky chart
// and a calendar month each read hundreds of instants, so keep one per zone
const zonedFormatters = new Map();
const getZonedFormatter = (timeZone) => {
  let formatter = zonedFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    zonedFormatters.set(timeZone, formatter);
  }
  return formatter;
};

// Wall-clock calendar/clock fields of an instant, as read in a given timezone
const getZonedParts = (date, timeZone) => {
  const parts = {};
  for (const { type, value } of getZonedFormatter(timeZone).formatToParts(date)) {
    parts[type] = value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24, // some locales emit '24' for midnight
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
};

// UTC offset of a timezone, in milliseconds, at a specific instant
const getZoneOffsetMs = (date, timeZone) => {
  const p = getZonedParts(date, timeZone);
  const asIfUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUTC - Math.floor(date.getTime() / 1000) * 1000;
};

// The instant at which the given timezone's clock reads 00:00 on the day containing `date`
export const getStartOfDayInZone = (date, timeZone) => {
  const p = getZonedParts(date, timeZone);
  const naiveMidnight = Date.UTC(p.year, p.month - 1, p.day);

  // Two passes: the second re-reads the offset at the guessed instant so that
  // days containing a DST transition still resolve to true local midnight.
  let instant = naiveMidnight - getZoneOffsetMs(date, timeZone);
  instant = naiveMidnight - getZoneOffsetMs(new Date(instant), timeZone);
  return instant;
};

// The calendar day of an instant as a place's clock reads it. Month is 0-based, as in Date.
export const getZonedDay = (date, timeZone) => {
  const p = getZonedParts(date, timeZone);
  return { year: p.year, month: p.month - 1, day: p.day };
};

// The instant at which a place's clock shows a given date and time. Two passes,
// like getStartOfDayInZone, so a time on the day of a DST change still resolves.
export const getInstantInZone = (year, month, day, hour, minute, timeZone) => {
  const wall = Date.UTC(year, month, day, hour, minute);
  let instant = wall - getZoneOffsetMs(new Date(wall), timeZone);
  instant = wall - getZoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
};

// Noon on a date at a place: where picking a day, or opening a link to one, lands
export const getNoonInZone = (year, month, day, timeZone) =>
  getInstantInZone(year, month, day, 12, 0, timeZone);

// Short timezone abbreviation for display, e.g. "GMT+1", "BST", "EDT"
export const getTimeZoneLabel = (date, timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(date);
    const match = parts.find((p) => p.type === 'timeZoneName');
    return match ? match.value : timeZone;
  } catch {
    return timeZone;
  }
};

// Format an instant as a clock time in the given timezone
export const formatTimeString = (d, timeZone, clock = '12h') => {
  if (!d || isNaN(d.getTime())) return '--:--';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: hourCycleFor(clock),
      timeZone
    }).format(d);
  } catch {
    return '--:--';
  }
};

// A clock time without the padding zero, "7:30 PM" or "19:30", for running text
export const formatShortTime = (d, timeZone, clock = '12h') => {
  if (!d || isNaN(d.getTime())) return '--:--';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: hourCycleFor(clock),
      timeZone
    }).format(d);
  } catch {
    return '--:--';
  }
};

// Locate moonrise / moonset by scanning the location's own 24-hour day for horizon
// crossings, then bisecting to the second. Derived from the same altitude function
// that draws the transit curve, so the chart and the numbers beneath it always agree.
const findHorizonCrossings = (dayStartMs, lat, lon) => {
  const altitudeAt = (ms) => SunCalc.getMoonPosition(new Date(ms), lat, lon).altitude;

  const COARSE_STEP = 10 * 60 * 1000; // 10 minutes
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

  const bisect = (lo, hi) => {
    const loSign = Math.sign(altitudeAt(lo));
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (Math.sign(altitudeAt(mid)) === loSign) lo = mid;
      else hi = mid;
    }
    return new Date(Math.round((lo + hi) / 2));
  };

  let rise = null;
  let set = null;
  let prevAlt = altitudeAt(dayStartMs);

  for (let t = dayStartMs + COARSE_STEP; t <= dayEndMs; t += COARSE_STEP) {
    const alt = altitudeAt(t);
    if (rise === null && prevAlt < 0 && alt >= 0) rise = bisect(t - COARSE_STEP, t);
    if (set === null && prevAlt >= 0 && alt < 0) set = bisect(t - COARSE_STEP, t);
    prevAlt = alt;
  }

  return { rise, set };
};

// 24-Hour Continuous Sky Ephemeris, anchored to the observing location's local day
export const getSkyData = (date = new Date(), lat = 0, lon = 0, timeZone = null, clock = '12h') => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const zone = timeZone || getBrowserTimeZone();

  // The day we chart runs from local midnight to local midnight AT THE LOCATION.
  const dayStartMs = getStartOfDayInZone(validDate, zone);

  // SunCalc.getTimes is longitude-based and therefore already timezone-independent.
  const sunTimes = SunCalc.getTimes(validDate, lat, lon);
  const { rise: moonriseDate, set: moonsetDate } = findHorizonCrossings(dayStartMs, lat, lon);

  const currentMoonPos = SunCalc.getMoonPosition(validDate, lat, lon);
  const currentSunPos = SunCalc.getPosition(validDate, lat, lon);

  // Sample the local day in 30-minute intervals (48 points)
  const altitudePoints = [];
  let peakPoint = { altitude: -90, hour: 0, label: '12 AM', azimuth: 180, compass: 'S' };

  // Axis ticks read "4 AM" on a 12-hour clock and "04:00" on a 24-hour one, where a
  // bare "04" would look like a count rather than a time. One formatter for all 48.
  const tickFormat = new Intl.DateTimeFormat('en-US', clock === '24h'
    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone }
    : { hour: 'numeric', hourCycle: 'h12', timeZone: zone });

  for (let step = 0; step < 48; step++) {
    const pointDate = new Date(dayStartMs + step * 30 * 60 * 1000);
    const moonPos = SunCalc.getMoonPosition(pointDate, lat, lon);
    const sunPos = SunCalc.getPosition(pointDate, lat, lon);

    const altDeg = toDeg(moonPos.altitude);
    const sunAltDeg = toDeg(sunPos.altitude);
    const azimuthDeg = toCompassBearing(moonPos.azimuth);
    const compassDir = toCompassDirection(azimuthDeg);
    const zoned = getZonedParts(pointDate, zone);

    const point = {
      step,
      time: pointDate,
      hour: zoned.hour + zoned.minute / 60,
      altitude: parseFloat(altDeg.toFixed(1)),
      sunAltitude: parseFloat(sunAltDeg.toFixed(1)),
      azimuth: parseFloat(azimuthDeg.toFixed(1)),
      compass: compassDir,
      isDaylight: sunAltDeg > 0,
      isMoonUp: altDeg > 0,
      label: tickFormat.format(pointDate)
    };

    altitudePoints.push(point);

    if (altDeg > peakPoint.altitude) {
      peakPoint = point;
    }
  }

  const currentMoonAlt = toDeg(currentMoonPos.altitude);
  const currentSunAlt = toDeg(currentSunPos.altitude);
  const currentMoonBearing = toCompassBearing(currentMoonPos.azimuth);

  // Where the selected instant falls within the charted day (0 = local midnight, 1 = next midnight)
  const currentFraction = Math.max(0, Math.min(1, (validDate.getTime() - dayStartMs) / 86400000));

  return {
    date: validDate,
    timeZone: zone,
    timeZoneLabel: getTimeZoneLabel(validDate, zone),
    dayStartMs,
    currentFraction,
    moonrise: formatTimeString(moonriseDate, zone, clock),
    moonset: formatTimeString(moonsetDate, zone, clock),
    moonriseDate,
    moonsetDate,
    sunrise: formatTimeString(sunTimes.sunrise, zone, clock),
    sunset: formatTimeString(sunTimes.sunset, zone, clock),
    solarNoon: formatTimeString(sunTimes.solarNoon, zone, clock),
    dusk: formatTimeString(sunTimes.dusk, zone, clock),
    dawn: formatTimeString(sunTimes.dawn, zone, clock),
    currentMoonAltitude: currentMoonAlt.toFixed(1),
    currentMoonAltitudeValue: currentMoonAlt,
    currentMoonAzimuth: currentMoonBearing.toFixed(1),
    currentMoonCompass: toCompassDirection(currentMoonBearing),
    currentSunAltitude: currentSunAlt.toFixed(1),
    isMoonUp: currentMoonAlt > 0,
    isSunUp: currentSunAlt > 0,
    altitudePoints,
    peakAltitude: peakPoint.altitude.toFixed(1),
    // With minutes: samples are half an hour apart, and on a 24-hour clock the
    // hour-only tick "04:00" would pass off a 04:30 peak as exact
    peakTime: formatShortTime(peakPoint.time, zone, clock),
    peakCompass: peakPoint.compass
  };
};
