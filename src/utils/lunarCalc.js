import SunCalc from 'suncalc';

// Constants for lunar mechanics
export const SYNODIC_MONTH = 29.53058867; // average synodic month in days
export const MIN_MOON_DISTANCE = 356500;   // Perigee in km
export const MAX_MOON_DISTANCE = 406700;   // Apogee in km
export const MEAN_MOON_DISTANCE = 384400;  // Average distance in km

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', startDeg: 0 },
  { name: 'Taurus', symbol: '♉', startDeg: 30 },
  { name: 'Gemini', symbol: '♊', startDeg: 60 },
  { name: 'Cancer', symbol: '♋', startDeg: 90 },
  { name: 'Leo', symbol: '♌', startDeg: 120 },
  { name: 'Virgo', symbol: '♍', startDeg: 150 },
  { name: 'Libra', symbol: '♎', startDeg: 180 },
  { name: 'Scorpio', symbol: '♏', startDeg: 210 },
  { name: 'Sagittarius', symbol: '♐', startDeg: 240 },
  { name: 'Capricorn', symbol: '♑', startDeg: 270 },
  { name: 'Aquarius', symbol: '♒', startDeg: 300 },
  { name: 'Pisces', symbol: '♓', startDeg: 330 }
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

// Estimate Zodiac Constellation of the Moon from approximate ecliptic longitude
export const getMoonZodiac = (date = new Date()) => {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / (1000 * 60 * 60 * 24);
  let L = (218.316 + 13.176396 * d) % 360;
  if (L < 0) L += 360;
  
  const signIndex = Math.floor(L / 30);
  const sign = ZODIAC_SIGNS[signIndex % 12];
  const degreeInSign = (L % 30).toFixed(1);
  
  return {
    ...sign,
    eclipticLongitude: L.toFixed(1),
    degreeInSign: `${degreeInSign}°`
  };
};

// Get comprehensive lunar details
export const getLunarDetails = (date = new Date(), lat = 0, lon = 0) => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const moonIllumination = SunCalc.getMoonIllumination(validDate);
  const moonPosition = SunCalc.getMoonPosition(validDate, lat, lon);

  const phase = moonIllumination.phase; // 0 to 1
  const fraction = moonIllumination.fraction; // 0.0 to 1.0
  const angle = moonIllumination.angle; // crescent tilt angle in radians

  const age = phase * SYNODIC_MONTH;
  const distanceKm = moonPosition.distance ? Math.round(moonPosition.distance) : MEAN_MOON_DISTANCE;
  const distancePercent = Math.max(0, Math.min(100, ((distanceKm - MIN_MOON_DISTANCE) / (MAX_MOON_DISTANCE - MIN_MOON_DISTANCE)) * 100));

  // Determine major vs intermediate phase names with refined astronomical threshold
  const PRIMARY_THRESHOLD = 0.015; // ~10.6 hours window
  let name = '';
  let isExactPrimary = false;
  let phaseKey = '';

  if (phase <= PRIMARY_THRESHOLD || phase >= 1 - PRIMARY_THRESHOLD) {
    name = 'New Moon';
    phaseKey = 'new_moon';
    isExactPrimary = true;
  } else if (Math.abs(phase - 0.25) <= PRIMARY_THRESHOLD) {
    name = 'First Quarter';
    phaseKey = 'first_quarter';
    isExactPrimary = true;
  } else if (Math.abs(phase - 0.5) <= PRIMARY_THRESHOLD) {
    name = 'Full Moon';
    phaseKey = 'full_moon';
    isExactPrimary = true;
  } else if (Math.abs(phase - 0.75) <= PRIMARY_THRESHOLD) {
    name = 'Last Quarter';
    phaseKey = 'last_quarter';
    isExactPrimary = true;
  } else if (phase < 0.25) {
    name = 'Waxing Crescent';
    phaseKey = 'waxing_crescent';
  } else if (phase < 0.5) {
    name = 'Waxing Gibbous';
    phaseKey = 'waxing_gibbous';
  } else if (phase < 0.75) {
    name = 'Waning Gibbous';
    phaseKey = 'waning_gibbous';
  } else {
    name = 'Waning Crescent';
    phaseKey = 'waning_crescent';
  }

  const nextPhases = getNextMajorPhases(validDate);
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

// Calculate exact upcoming dates for the 4 primary quarter phases
export const getNextMajorPhases = (date = new Date()) => {
  const current = SunCalc.getMoonIllumination(date);
  const phase = current.phase;

  const getDaysUntil = (targetPhase) => {
    let diff = targetPhase - phase;
    if (diff <= 0) diff += 1;
    return diff * SYNODIC_MONTH;
  };

  const daysToNew = getDaysUntil(0);
  const daysToFirstQ = getDaysUntil(0.25);
  const daysToFull = getDaysUntil(0.5);
  const daysToLastQ = getDaysUntil(0.75);

  const addDays = (days) => {
    const d = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    return {
      date: d,
      daysRemaining: days.toFixed(1),
      formatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  return {
    nextNewMoon: addDays(daysToNew),
    nextFirstQuarter: addDays(daysToFirstQ),
    nextFullMoon: addDays(daysToFull),
    nextLastQuarter: addDays(daysToLastQ)
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
  const currentIllum = SunCalc.getMoonIllumination(validDate);
  const p = currentIllum.phase; // 0.0 to 1.0

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

  // 3. Golden-section optimization over [approx - 36h, approx + 36h]
  // Because angular distance is smooth and convex, it converges to sub-second precision with zero seam bugs.
  const phi = (1 + Math.sqrt(5)) / 2;
  const resphi = 2 - phi;

  let a = approxTargetTime - 36 * 3600000;
  let b = approxTargetTime + 36 * 3600000;
  let x1 = a + resphi * (b - a);
  let x2 = b - resphi * (b - a);

  let f1 = getPhaseAngularDistance(SunCalc.getMoonIllumination(new Date(x1)).phase, targetPhase);
  let f2 = getPhaseAngularDistance(SunCalc.getMoonIllumination(new Date(x2)).phase, targetPhase);

  for (let iter = 0; iter < 28; iter++) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = a + resphi * (b - a);
      f1 = getPhaseAngularDistance(SunCalc.getMoonIllumination(new Date(x1)).phase, targetPhase);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = b - resphi * (b - a);
      f2 = getPhaseAngularDistance(SunCalc.getMoonIllumination(new Date(x2)).phase, targetPhase);
    }
  }

  const exactTime = Math.round((a + b) / 2);
  return new Date(exactTime);
};

// Get the 30-day timeline centered around the selected date
export const getCyclePhases = (centerDate = new Date(), daysCount = 30) => {
  const halfCycle = Math.floor(daysCount / 2);
  const phases = [];

  for (let i = -halfCycle; i <= halfCycle; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    const details = getLunarDetails(d);
    
    phases.push({
      date: d,
      dayOffset: i,
      phase: details.phase,
      fraction: parseFloat(details.fraction),
      name: details.name,
      phaseKey: details.phaseKey,
      isExactPrimary: details.isExactPrimary,
      isMajor: ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'].includes(details.name),
      isCurrent: i === 0
    });
  }

  return phases;
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

// Wall-clock calendar/clock fields of an instant, as read in a given timezone
const getZonedParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = {};
  for (const { type, value } of formatter.formatToParts(date)) {
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
export const formatTimeString = (d, timeZone) => {
  if (!d || isNaN(d.getTime())) return '--:--';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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
export const getSkyData = (date = new Date(), lat = 0, lon = 0, timeZone = null) => {
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
      label: new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: true,
        timeZone: zone
      }).format(pointDate)
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
    moonrise: formatTimeString(moonriseDate, zone),
    moonset: formatTimeString(moonsetDate, zone),
    moonriseDate,
    moonsetDate,
    sunrise: formatTimeString(sunTimes.sunrise, zone),
    sunset: formatTimeString(sunTimes.sunset, zone),
    solarNoon: formatTimeString(sunTimes.solarNoon, zone),
    dusk: formatTimeString(sunTimes.dusk, zone),
    dawn: formatTimeString(sunTimes.dawn, zone),
    currentMoonAltitude: currentMoonAlt.toFixed(1),
    currentMoonAltitudeValue: currentMoonAlt,
    currentMoonAzimuth: currentMoonBearing.toFixed(1),
    currentMoonCompass: toCompassDirection(currentMoonBearing),
    currentSunAltitude: currentSunAlt.toFixed(1),
    isMoonUp: currentMoonAlt > 0,
    isSunUp: currentSunAlt > 0,
    altitudePoints,
    peakAltitude: peakPoint.altitude.toFixed(1),
    peakTime: peakPoint.label,
    peakCompass: peakPoint.compass
  };
};

// Safe reverse geocoding with localStorage caching
export const reverseGeocodeCached = async (lat, lon) => {
  const cacheKey = `luna_geo_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore localStorage access errors
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
    const country = data.address?.country || '';
    const name = city ? `${city}, ${country}` : country || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ name, lat, lon }));
    } catch {
      // Ignore localStorage quota or access errors
    }
    
    return { name, lat, lon };
  } catch {
    const fallbackName = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    return { name: fallbackName, lat, lon };
  }
};
