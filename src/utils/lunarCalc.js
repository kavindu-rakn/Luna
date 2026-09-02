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

// Format a Date object nicely
export const formatTimeString = (d) => {
  if (!d || isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// 24-Hour Continuous Sky Ephemeris
export const getSkyData = (date = new Date(), lat = 0, lon = 0) => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();

  const moonTimes = SunCalc.getMoonTimes(validDate, lat, lon);
  const sunTimes = SunCalc.getTimes(validDate, lat, lon);

  const currentMoonPos = SunCalc.getMoonPosition(validDate, lat, lon);
  const currentSunPos = SunCalc.getPosition(validDate, lat, lon);

  // Sample the full 24-hour solar day (00:00 to 23:30 in 30-minute intervals = 48 points)
  const altitudePoints = [];
  const startOfDay = new Date(validDate);
  startOfDay.setHours(0, 0, 0, 0);

  let peakPoint = { altitude: -90, hour: 0, label: '12 AM', azimuth: 180, compass: 'S' };

  for (let step = 0; step < 48; step++) {
    const pointDate = new Date(startOfDay.getTime() + step * 30 * 60 * 1000);
    const moonPos = SunCalc.getMoonPosition(pointDate, lat, lon);
    const sunPos = SunCalc.getPosition(pointDate, lat, lon);

    const altDeg = toDeg(moonPos.altitude);
    const sunAltDeg = toDeg(sunPos.altitude);
    const azimuthDeg = toCompassBearing(moonPos.azimuth);
    const compassDir = toCompassDirection(azimuthDeg);

    const point = {
      step,
      time: pointDate,
      hour: pointDate.getHours() + pointDate.getMinutes() / 60,
      altitude: parseFloat(altDeg.toFixed(1)),
      sunAltitude: parseFloat(sunAltDeg.toFixed(1)),
      azimuth: parseFloat(azimuthDeg.toFixed(1)),
      compass: compassDir,
      isDaylight: sunAltDeg > 0,
      isMoonUp: altDeg > 0,
      label: pointDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: pointDate.getMinutes() === 0 ? undefined : '2-digit', hour12: true })
    };

    altitudePoints.push(point);

    if (altDeg > peakPoint.altitude) {
      peakPoint = point;
    }
  }

  const currentMoonAlt = toDeg(currentMoonPos.altitude);
  const currentSunAlt = toDeg(currentSunPos.altitude);
  const currentMoonBearing = toCompassBearing(currentMoonPos.azimuth);

  return {
    date: validDate,
    moonrise: formatTimeString(moonTimes.rise),
    moonset: formatTimeString(moonTimes.set),
    moonriseDate: moonTimes.rise,
    moonsetDate: moonTimes.set,
    sunrise: formatTimeString(sunTimes.sunrise),
    sunset: formatTimeString(sunTimes.sunset),
    solarNoon: formatTimeString(sunTimes.solarNoon),
    dusk: formatTimeString(sunTimes.dusk),
    dawn: formatTimeString(sunTimes.dawn),
    currentMoonAltitude: currentMoonAlt.toFixed(1),
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
