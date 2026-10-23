import * as SunCalc from 'suncalc';
import { getSunEclipticLongitude, getZonedDay } from '../utils/lunarCalc';

// Meteor showers (Phase 6, as settled in chat on 22 Oct 2026): the IMO's nine major
// showers, when each is active and how strongly, worked out for any year from the
// Sun's longitude, so the dates never need updating; and how many of its meteors
// someone could see from a place at a moment, with the radiant's height, the
// moonlight and the twilight counted.
//
// Two sources:
//
// - The IMO's 2027 Meteor Shower Calendar (Rendtel, IMO INFO(3-26); correct as of
//   June 2026; https://www.imo.net/files/data/calendar/cal2027.pdf). Table 5, the
//   Working List of Visual Meteor Showers: each shower's activity dates, the solar
//   longitude of its maximum (equinox 2000.0), its speed, its population index and
//   its ZHR. Table 6: its radiant's position every five days through its season.
// - How sharply each one rises to its maximum and falls away: Jenniskens (1994),
//   A&A 287, 990-1013, as ECSS-E-ST-10-04C tabulates it in Table C-2
//   (https://spenvis.oma.be/ecss/e_st_10_04c/ecss_14_02_02.htm and _03.htm): the
//   slopes B of a peak and, for some, of a broad background beneath it, in
//   ZHR = ZHRmax 10^(-B |λ - λmax|), rising and falling. Only the shapes are used,
//   centred on the IMO's maxima and scaled to its ZHRs, which are today's: the
//   showers' strengths have moved since the 1980s data (the Geminids' peak was
//   74 + 18 then, 150 now).
//
// The Quadrantids are in neither of Jenniskens' tables. Their slope comes from the
// IMO's "short length of maximum activity (6 hours)" (the calendar's web page,
// https://www.imo.net/calendar/), taken as the time the rate stays above half its
// peak: B = log10(2) / 0.123° = 2.4.

const rad = Math.PI / 180;

export const SHOWERS = [
  {
    id: 'QUA',
    name: 'Quadrantids',
    active: ['12-28', '01-12'],
    peak: 283.15,
    zhr: 80,
    speed: 41,
    population: 2.1,
    radiants: [['12-30', 226, 50], ['12-31', 228, 50], ['01-05', 231, 49], ['01-10', 234, 48]],
    profile: [{ zhr: 1, rise: 2.4, fall: 2.4 }]
  },
  {
    id: 'LYR',
    name: 'Lyrids',
    active: ['04-14', '04-30'],
    peak: 32.32,
    zhr: 18,
    speed: 49,
    population: 2.1,
    radiants: [['04-15', 263, 34], ['04-20', 269, 34], ['04-25', 274, 34], ['04-30', 279, 34]],
    profile: [{ zhr: 12.8, rise: 0.22, fall: 0.22 }]
  },
  {
    id: 'ETA',
    name: 'Eta Aquariids',
    active: ['04-19', '05-28'],
    peak: 45.5,
    zhr: 50,
    speed: 66,
    population: 2.4,
    radiants: [['04-20', 323, -7], ['04-25', 328, -5], ['04-30', 332, -3], ['05-05', 337, -1], ['05-10', 341, 1], ['05-15', 345, 3], ['05-20', 349, 5], ['05-25', 353, 7]],
    profile: [{ zhr: 36.7, rise: 0.08, fall: 0.08 }]
  },
  {
    id: 'SDA',
    name: 'Southern Delta Aquariids',
    active: ['07-12', '08-23'],
    peak: 128,
    zhr: 25,
    speed: 41,
    population: 2.5,
    radiants: [['07-10', 325, -19], ['07-15', 329, -19], ['07-20', 333, -18], ['07-25', 337, -17], ['07-30', 340, -16], ['08-05', 345, -14], ['08-10', 349, -13], ['08-15', 352, -12], ['08-20', 356, -11]],
    profile: [{ zhr: 11.4, rise: 0.091, fall: 0.091 }]
  },
  {
    id: 'PER',
    name: 'Perseids',
    active: ['07-17', '08-24'],
    peak: 140.0,
    zhr: 110,
    speed: 59,
    population: 2.2,
    radiants: [['07-15', 6, 50], ['07-20', 11, 52], ['07-25', 22, 53], ['07-30', 29, 54], ['08-05', 37, 56], ['08-10', 45, 57], ['08-15', 51, 58], ['08-20', 57, 58], ['08-25', 63, 58]],
    profile: [{ zhr: 70, rise: 0.35, fall: 0.35 }, { zhr: 23, rise: 0.05, fall: 0.092 }]
  },
  {
    id: 'ORI',
    name: 'Orionids',
    active: ['10-02', '11-07'],
    peak: 208,
    zhr: 20,
    speed: 66,
    population: 2.5,
    radiants: [['10-05', 85, 14], ['10-10', 88, 15], ['10-15', 91, 15], ['10-20', 94, 16], ['10-25', 98, 16], ['10-30', 101, 16], ['11-05', 105, 17]],
    profile: [{ zhr: 25, rise: 0.12, fall: 0.12 }]
  },
  {
    id: 'LEO',
    name: 'Leonids',
    active: ['11-06', '11-30'],
    peak: 235.27,
    zhr: 15,
    speed: 71,
    population: 2.5,
    radiants: [['11-10', 147, 24], ['11-15', 150, 23], ['11-20', 153, 21], ['11-25', 156, 20], ['11-30', 159, 19]],
    profile: [{ zhr: 19, rise: 0.55, fall: 0.55 }, { zhr: 4, rise: 0.025, fall: 0.15 }]
  },
  {
    id: 'GEM',
    name: 'Geminids',
    active: ['12-04', '12-20'],
    peak: 262.2,
    zhr: 150,
    speed: 35,
    population: 2.6,
    radiants: [['12-05', 103, 33], ['12-10', 108, 33], ['12-15', 113, 33], ['12-20', 118, 32]],
    // The one stream whose peak rises more slowly than it falls
    profile: [{ zhr: 74, rise: 0.59, fall: 0.81 }, { zhr: 18, rise: 0.09, fall: 0.31 }]
  },
  {
    id: 'URS',
    name: 'Ursids',
    active: ['12-17', '12-26'],
    peak: 270.7,
    zhr: 10,
    speed: 33,
    population: 2.8,
    radiants: [['12-20', 217, 76], ['12-25', 217, 74]],
    profile: [{ zhr: 10, rise: 0.9, fall: 0.9 }, { zhr: 2, rise: 0.08, fall: 0.2 }]
  }
];

// ── The Sun's longitude ──────────────────────────────────────────────
const centuries = (ms) => (ms / 86400000 + 2440587.5 - 2451545) / 36525;

// The Sun's longitude referred to the equinox of J2000, as shower data is: its
// longitude for the equinox of the date (lunarCalc, Meeus ch. 25), less the
// general precession in longitude since 2000 (Meeus 21.5, 5029.0966" a century).
export const solarLongitude = (date) => {
  const T = centuries(date.getTime());
  const precession = (5029.0966 * T + 1.11113 * T * T) / 3600;
  return (((getSunEclipticLongitude(date) - precession) % 360) + 360) % 360;
};

// The signed difference between two longitudes, -180 to 180
const angleBetween = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;

const DAY_MS = 86400000;
const DEGREES_A_DAY = 360 / 365.2422;

// The first instant after `fromMs` when the Sun reaches longitude `target`. The
// Sun moves about a degree a day, unevenly; a few corrections settle it to the
// second.
export const whenSolarLongitude = (target, fromMs) => {
  let ms = fromMs + ((((target - solarLongitude(new Date(fromMs))) % 360) + 360) % 360) / DEGREES_A_DAY * DAY_MS;
  for (let i = 0; i < 4; i++) ms -= angleBetween(solarLongitude(new Date(ms)), target) / DEGREES_A_DAY * DAY_MS;
  return new Date(ms);
};

// The calendar's dates as solar longitudes. A date's longitude moves by under a
// quarter of a degree from year to year; they are read once, for 2027, the year
// the calendar was made for.
const longitudeOfDay = (monthDay) => {
  const [month, day] = monthDay.split('-').map(Number);
  return solarLongitude(new Date(Date.UTC(2027, month - 1, day)));
};

// Active from the start of the first day to the end of the last
const WINDOWS = new Map(SHOWERS.map((s) => [s.id, { from: longitudeOfDay(s.active[0]), to: longitudeOfDay(s.active[1]) + DEGREES_A_DAY }]));

const inWindow = (shower, longitude) => {
  const { from, to } = WINDOWS.get(shower.id);
  const span = (((to - from) % 360) + 360) % 360;
  return (((longitude - from) % 360) + 360) % 360 <= span;
};

// ── Activity ─────────────────────────────────────────────────────────
const shapeAt = (shower, longitude) => {
  const offset = angleBetween(longitude, shower.peak);
  return shower.profile.reduce((sum, part) => sum + part.zhr * 10 ** (-(offset < 0 ? part.rise : part.fall) * Math.abs(offset)), 0);
};

// The zenithal hourly rate at a moment: what one observer would see under a dark
// sky with the radiant overhead. Zero outside the activity dates.
export const zenithalHourlyRate = (shower, date) => {
  const longitude = solarLongitude(date);
  if (!inWindow(shower, longitude)) return 0;
  return shower.zhr * shapeAt(shower, longitude) / shapeAt(shower, shower.peak);
};

// Where the radiant is at a moment (J2000 degrees): Table 6's track, interpolated
// by the Sun's longitude, and carried on at its first or last step's pace beyond it
const TRACKS = new Map(SHOWERS.map((s) => {
  const points = s.radiants.map(([day, ra, dec]) => ({ at: longitudeOfDay(day), ra, dec }));
  // Unwrapped, so a track across the new year, or across 0h of right ascension,
  // runs on without a jump
  for (let i = 1; i < points.length; i++) {
    while (points[i].at < points[i - 1].at) points[i].at += 360;
    while (points[i].ra - points[i - 1].ra > 180) points[i].ra -= 360;
    while (points[i].ra - points[i - 1].ra < -180) points[i].ra += 360;
  }
  return [s.id, points];
}));

export const radiantAt = (shower, date) => {
  const points = TRACKS.get(shower.id);
  const middle = (points[0].at + points[points.length - 1].at) / 2;
  const at = middle + angleBetween(solarLongitude(date), middle);
  let i = points.findIndex((p) => p.at >= at);
  if (i === 0) i = 1;
  if (i < 0) i = points.length - 1;
  const a = points[i - 1];
  const b = points[i];
  const t = (at - a.at) / (b.at - a.at);
  return {
    ra: (((a.ra + (b.ra - a.ra) * t) % 360) + 360) % 360,
    dec: a.dec + (b.dec - a.dec) * t
  };
};

// ── What can be seen from a place ────────────────────────────────────
// A direction's height above the horizon. The mean sidereal time is close enough:
// a radiant is a degree or two across.
export const altitudeOf = ({ ra, dec }, date, lat, lon) => {
  const T = centuries(date.getTime());
  const days = date.getTime() / DAY_MS + 2440587.5 - 2451545;
  const sidereal = 280.46061837 + 360.98564736629 * days + 0.000387933 * T * T;
  const hourAngle = (sidereal + lon - ra) * rad;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec * rad) + Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(hourAngle)) / rad;
};

// How much the moonlight dims the faintest stars, in magnitudes: a full Moon high
// in the sky about a magnitude and a half, the usual rule that it hides about
// three in four meteors; less for a crescent or a low Moon. (SunCalc 2 gives
// altitudes in degrees.)
const moonlightOf = (date, lat, lon) => {
  const moonUp = Math.max(0, SunCalc.getMoonPosition(date, lat, lon).altitude);
  return 1.5 * SunCalc.getMoonIllumination(date).fraction * Math.sqrt(Math.sin(moonUp * rad));
};

// How much fainter than a dark sky's (magnitude 6.5, which ZHR assumes) the
// faintest visible stars are. Twilight takes from astronomical darkness, the Sun
// 18° down, to a sky too bright for meteors at 6° down. Both this and the
// moonlight are approximations, for estimates rather than counts.
const skyLoss = (date, lat, lon) => {
  const sun = SunCalc.getPosition(date, lat, lon).altitude;
  if (sun > -6) return Infinity;
  return Math.max(0, (sun + 18) / 12) * 4 + moonlightOf(date, lat, lon);
};

// How many of a shower's meteors one observer would see in an hour, at a place and
// a moment (IMO: HR = ZHR sin(h) / r^(6.5 - lm), r the shower's population index:
// each magnitude the sky loses hides that many times the meteors). Zero by day,
// and while the radiant is below the horizon.
export const visibleHourlyRate = (shower, date, lat, lon) => {
  const zhr = zenithalHourlyRate(shower, date);
  if (!zhr) return 0;
  const height = altitudeOf(radiantAt(shower, date), date, lat, lon);
  if (height <= 0) return 0;
  const loss = skyLoss(date, lat, lon);
  if (!Number.isFinite(loss)) return 0;
  return zhr * Math.sin(height * rad) / shower.population ** loss;
};

// The showers to draw in the sky at a moment (src/sky/meteors.js): each one's
// visible hourly rate here, its radiant, speed and population index, and the
// faintest meteor the sky shows. Nothing by day or while every radiant is down.
export const meteorsInSky = (date, lat, lon) => {
  const loss = skyLoss(date, lat, lon);
  if (!Number.isFinite(loss)) return [];
  return activeShowers(date)
    .map(({ shower }) => ({ shower, rate: visibleHourlyRate(shower, date, lat, lon) }))
    .filter(({ rate }) => rate > 0)
    .map(({ shower, rate }) => ({
      id: shower.id,
      rate,
      radiant: radiantAt(shower, date),
      speed: shower.speed,
      population: shower.population,
      faintest: 6.5 - loss
    }));
};

// How much of a shower the moonlight alone hides, 0 (none) to 1
export const moonlightLoss = (shower, date, lat, lon) => 1 - shower.population ** -moonlightOf(date, lat, lon);

// The showers active at a moment, strongest first
export const activeShowers = (date) => SHOWERS
  .map((shower) => ({ shower, zhr: zenithalHourlyRate(shower, date) }))
  .filter(({ zhr }) => zhr >= 1)
  .sort((a, b) => b.zhr - a.zhr);

// Each shower's maximum in a year, in order
export const peaksInYear = (year) => SHOWERS
  .map((shower) => ({ shower, date: whenSolarLongitude(shower.peak, Date.UTC(year, 0, 1) - DAY_MS) }))
  .filter(({ date }) => date.getUTCFullYear() === year)
  .sort((a, b) => a.date - b.date);

// A shower's maximum nearest a moment, a year either way
export const nearestPeak = (shower, date) => whenSolarLongitude(shower.peak, date.getTime() - 182.6 * DAY_MS);

// The night around a moment at a place: from the evening's dusk (the Sun 6° down)
// to the morning's dawn. If the moment is in daylight, the night ahead of it.
export const nightAround = (date, lat, lon) => {
  const times = (ms) => SunCalc.getTimes(new Date(ms), lat, lon);
  const ms = date.getTime();
  const dark = SunCalc.getPosition(date, lat, lon).altitude < -6;
  const dawn = times(ms).dawn;
  // In the small hours the night began the evening before
  const start = dark && dawn && ms < dawn.getTime() ? ms - DAY_MS : ms;
  const evening = times(start).dusk;
  const morning = times(start + DAY_MS).dawn;
  if (!evening || !morning || !Number.isFinite(evening.getTime()) || !Number.isFinite(morning.getTime())) return null;
  return { from: evening.getTime(), to: morning.getTime() };
};

// The best of a shower over a night: its strongest visible rate and when it comes,
// sampled every 10 minutes
const bestOver = (shower, night, lat, lon) => {
  let best = { rate: 0, at: null };
  for (let ms = night.from; ms <= night.to; ms += 600000) {
    const rate = visibleHourlyRate(shower, new Date(ms), lat, lon);
    if (rate > best.rate) best = { rate, at: new Date(ms) };
  }
  return best;
};

// The best of a shower on the night around a moment. Null for a place with no dark
// night (summer near the poles).
export const bestOfNight = (shower, date, lat, lon) => {
  const night = nightAround(date, lat, lon);
  return night ? { ...bestOver(shower, night, lat, lon), night } : null;
};

// Every shower active over a night, for Tonight: the best each offers from this
// place, how much of it the Moon hides then, and how near its maximum is.
// Strongest first. One whose radiant stays below the horizon all night is still
// listed, with a rate of nothing, so Tonight can say why.
export const showersOverNight = (night, lat, lon) => {
  if (!night) return [];
  const middle = new Date((night.from + night.to) / 2);
  return SHOWERS
    .filter((shower) => zenithalHourlyRate(shower, new Date(night.from)) >= 1 || zenithalHourlyRate(shower, new Date(night.to)) >= 1)
    .map((shower) => {
      const best = bestOver(shower, night, lat, lon);
      return {
        shower,
        ...best,
        zhr: zenithalHourlyRate(shower, middle),
        moonlight: best.at ? moonlightLoss(shower, best.at, lat, lon) : 0,
        peak: nearestPeak(shower, middle),
        peakNight: Math.abs(nearestPeak(shower, middle) - middle) <= 12 * 3600000
      };
    })
    .sort((a, b) => b.rate - a.rate);
};

// Each meteor shower peaking in a month that can be seen from this place, for the
// calendar, by the night nearest its maximum here: that night's dates ("Dec 13–14",
// as the IMO writes them), the day of the month its evening falls on, and its best
// moment. A shower whose radiant stays down all that night, or a maximum with no
// dark night near it (summer near the poles), is left out: there is nothing to see.
export const showerNightsInMonth = (year, month, timeZone, lat, lon) => {
  const short = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
  const long = (date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone });
  const middle = (night) => (night ? (night.from + night.to) / 2 : Infinity);
  // A peak night can begin the evening before its maximum, in the month before
  const from = Date.UTC(year, month, 1) - 2 * DAY_MS;
  const to = Date.UTC(year, month + 1, 1) + 2 * DAY_MS;
  return [year - 1, year, year + 1]
    .flatMap((y) => peaksInYear(y))
    .filter(({ date }) => date >= from && date < to)
    .map(({ shower, date }) => {
      const ahead = nightAround(date, lat, lon);
      const before = nightAround(new Date(date.getTime() - DAY_MS), lat, lon);
      const night = Math.abs(middle(before) - date) < Math.abs(middle(ahead) - date) ? before : ahead;
      const best = night && bestOver(shower, night, lat, lon);
      if (!best || best.rate < 1) return null;
      const evening = getZonedDay(new Date(night.from), timeZone);
      const morning = getZonedDay(new Date(night.to), timeZone);
      const sameMonth = morning.month === evening.month;
      return {
        shower,
        best: best.at,
        rate: best.rate,
        evening: evening.day,
        month: evening.month,
        year: evening.year,
        nightLabel: `${short(new Date(night.from))}–${sameMonth ? morning.day : short(new Date(night.to))}`,
        nightWords: `${long(new Date(night.from))} to ${sameMonth ? morning.day : long(new Date(night.to))}`
      };
    })
    .filter((entry) => entry && entry.year === year && entry.month === month)
    .sort((a, b) => a.evening - b.evening);
};
