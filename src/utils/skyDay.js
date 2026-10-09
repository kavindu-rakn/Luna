import * as SunCalc from 'suncalc';
import {
  formatTimeString,
  getBrowserTimeZone,
  getInstantInZone,
  getStartOfDayInZone,
  getTimeZoneLabel,
  getZonedDay,
  toCompassBearing,
  writeTime
} from './lunarCalc';

// Kept apart from lunarCalc.js, which loads with the page: only Deep Dive's
// Tonight chapter needs these, and they load with it.

// Locate moonrise / moonset by scanning the location's own 24-hour day for horizon
// crossings, then bisecting to the second. Derived from the same altitude function
// that draws the transit curve, so the chart and the numbers beneath it always agree.
//
// Rise and set follow the USNO convention of the upper limb touching the horizon, so the
// centre's apparent altitude is lifted by the Moon's semidiameter (0.2725 x horizontal
// parallax) plus the 0.09 deg residual refraction SunCalc 2 tunes its own getMoonTimes with.
const EARTH_RADIUS_KM = 6378.14;
const findHorizonCrossings = (dayStartMs, lat, lon) => {
  const altitudeAt = (ms) => {
    const { altitude, distance } = SunCalc.getMoonPosition(new Date(ms), lat, lon);
    const semidiameter = (0.2725 * Math.asin(EARTH_RADIUS_KM / distance) * 180) / Math.PI;
    return altitude + semidiameter + 0.09;
  };

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

// The local day's sky, for Deep Dive's Tonight chapter (decision E7): the Moon's
// altitude through the day, the Sun's twilight bands behind it, and where the Moon
// rises, sets and stands highest. It depends only on the day and the place, so
// dragging the time through the day doesn't work it out again.
//
// Fractions run from 0 at the place's local midnight to 1 at the next, so a day
// that gains or loses an hour to daylight saving still fills the chart.

// The Sun's altitude at each band's lower edge: sunrise and sunset as SunCalc
// times them (the upper limb with refraction), then civil, nautical and
// astronomical twilight
const BAND_EDGES = [['day', -0.833], ['civil', -6], ['nautical', -12], ['astronomical', -18]];
const bandOf = (sunAltitude) => BAND_EDGES.find(([, edge]) => sunAltitude > edge)?.[0] ?? 'night';

const CURVE_STEPS = 96; // every 15 minutes
const SUN_STEPS = 144; // every 10 minutes

// The eight compass points, in words, for "rises in the northeast"
const COMPASS_WORDS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
export const compassWord = (bearingDeg) => COMPASS_WORDS[Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8];

export const getSkyDay = (date = new Date(), lat = 0, lon = 0, timeZone = null, clock = '12h') => {
  const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const zone = timeZone || getBrowserTimeZone();
  const dayStartMs = getStartOfDayInZone(validDate, zone);
  // The next local midnight: a day and a half on, back to that day's start
  const dayEndMs = getStartOfDayInZone(new Date(dayStartMs + 36 * 3600000), zone);
  const length = dayEndMs - dayStartMs;
  const at = (fraction) => new Date(dayStartMs + fraction * length);
  const fractionOf = (when) => (when ? (when.getTime() - dayStartMs) / length : null);
  const moonAltitude = (when) => SunCalc.getMoonPosition(when, lat, lon).altitude;

  // The Moon's altitude every 15 minutes
  const curve = [];
  for (let i = 0; i <= CURVE_STEPS; i++) {
    const fraction = i / CURVE_STEPS;
    curve.push({ fraction, altitude: moonAltitude(at(fraction)) });
  }

  // Its highest point, found exactly between the samples around the highest one
  let best = 0;
  for (let i = 1; i < curve.length; i++) if (curve[i].altitude > curve[best].altitude) best = i;
  let lo = curve[Math.max(0, best - 1)].fraction;
  let hi = curve[Math.min(curve.length - 1, best + 1)].fraction;
  for (let i = 0; i < 40; i++) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (moonAltitude(at(a)) < moonAltitude(at(b))) lo = a;
    else hi = b;
  }
  const peakWhen = at((lo + hi) / 2);
  const peakPosition = SunCalc.getMoonPosition(peakWhen, lat, lon);

  // The Sun's bands, each edge placed between the 10-minute samples it falls
  // between; a fast-moving Sun can cross more than one edge in a step
  const edges = BAND_EDGES.map(([, edge]) => edge);
  const bands = [];
  let previous = { fraction: 0, altitude: SunCalc.getPosition(at(0), lat, lon).altitude };
  let band = { kind: bandOf(previous.altitude), from: 0 };
  for (let i = 1; i <= SUN_STEPS; i++) {
    const next = { fraction: i / SUN_STEPS, altitude: SunCalc.getPosition(at(i / SUN_STEPS), lat, lon).altitude };
    const rising = next.altitude > previous.altitude;
    const crossings = edges
      .filter((edge) => (previous.altitude - edge) * (next.altitude - edge) < 0)
      .map((edge) => ({
        edge,
        fraction: previous.fraction + ((edge - previous.altitude) / (next.altitude - previous.altitude)) * (next.fraction - previous.fraction)
      }))
      .sort((a, b) => a.fraction - b.fraction);
    for (const { edge, fraction } of crossings) {
      bands.push({ ...band, to: fraction });
      band = { kind: bandOf(rising ? edge + 1e-6 : edge - 1e-6), from: fraction };
    }
    previous = next;
  }
  bands.push({ ...band, to: 1 });

  // Rise and set, and which way to look
  const { rise, set } = findHorizonCrossings(dayStartMs, lat, lon);
  const horizonEvent = (when) => (when
    ? {
      fraction: fractionOf(when),
      time: formatTimeString(when, zone, clock),
      direction: compassWord(toCompassBearing(SunCalc.getMoonPosition(when, lat, lon).azimuth))
    }
    : null);

  // Sunrise and sunset for the place's own day, asked about its noon
  const sun = SunCalc.getTimes(at(0.5), lat, lon);
  const sunTime = (when) => (when instanceof Date && !isNaN(when.getTime()) ? formatTimeString(when, zone, clock) : null);

  // Four ticks at the place's own midnight, 6, noon and 6, on the chosen clock;
  // on a day the clocks change they sit at the real hours, not quarters of the day
  const tickFormat = new Intl.DateTimeFormat('en-US', clock === '24h'
    ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone }
    : { hour: 'numeric', hourCycle: 'h12', timeZone: zone });
  const { year, month, day } = getZonedDay(at(0.5), zone);
  const ticks = [0, 6, 12, 18].map((hour) => {
    const when = hour === 0 ? at(0) : getInstantInZone(year, month, day, hour, 0, zone);
    return { fraction: fractionOf(when), label: writeTime(tickFormat, when) };
  });

  return {
    dayStartMs,
    dayEndMs,
    timeZone: zone,
    timeZoneLabel: getTimeZoneLabel(validDate, zone),
    curve,
    bands,
    rise: horizonEvent(rise),
    set: horizonEvent(set),
    peak: {
      fraction: fractionOf(peakWhen),
      altitude: peakPosition.altitude,
      time: formatTimeString(peakWhen, zone, clock),
      direction: compassWord(toCompassBearing(peakPosition.azimuth))
    },
    sunrise: sunTime(sun.sunrise),
    sunset: sunTime(sun.sunset),
    ticks
  };
};
