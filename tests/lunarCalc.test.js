import { describe, it, expect } from 'vitest';
import {
  getStartOfDayInZone,
  getTimeZoneLabel,
  formatTimeString,
  getSkyData,
  getSunEclipticLongitude,
  getMoonEclipticLongitude,
  getMoonElongation,
  getMoonPhaseFraction,
  getIlluminatedFraction,
  getMoonDistanceKm,
  getAyanamsa,
  getMoonZodiac,
  getNextMajorPhases,
  getAdjacentQuarterPhase,
  getLunarDetails,
  getPhaseSummary,
  getCyclePhases,
  classifyPhase,
  toCompassBearing,
  toCompassDirection,
  SYNODIC_MONTH,
  MIN_MOON_DISTANCE,
  MAX_MOON_DISTANCE
} from '../src/utils/lunarCalc.js';

// Greenwich Observatory, the app's fallback location
const GREENWICH = { lat: 51.4769, lon: -0.0005, tz: 'Europe/London' };

const minutesBetween = (a, b) => Math.abs(a.getTime() - b.getTime()) / 60000;

describe('the machine timezone must not leak into results', () => {
  it('runs the suite from a half-hour offset zone', () => {
    // Guards the guard: if this ever reports 0 the other tests stop proving anything
    expect(new Date('2026-09-19T12:00:00Z').getTimezoneOffset()).toBe(-330);
  });

  it('renders Greenwich sunrise and sunset on the location clock, not the viewer clock', () => {
    const sky = getSkyData(new Date('2026-09-19T12:00:00Z'), GREENWICH.lat, GREENWICH.lon, GREENWICH.tz);
    // Before the fix these read 11:12 AM and 11:38 PM on an Asia/Colombo machine
    expect(sky.sunrise).toBe('06:42 AM');
    expect(sky.sunset).toBe('07:08 PM');
  });

  it('anchors the charted day to local midnight at the location', () => {
    const sky = getSkyData(new Date('2026-09-19T12:00:00Z'), GREENWICH.lat, GREENWICH.lon, GREENWICH.tz);
    // 19 Sep 2026 00:00 BST is 18 Sep 23:00 UTC
    expect(new Date(sky.dayStartMs).toISOString()).toBe('2026-09-18T23:00:00.000Z');
    expect(sky.altitudePoints).toHaveLength(48);
    expect(sky.altitudePoints[0].label).toBe('12 AM');
  });

  it('names the timezone it used', () => {
    const sky = getSkyData(new Date('2026-09-19T12:00:00Z'), GREENWICH.lat, GREENWICH.lon, GREENWICH.tz);
    expect(sky.timeZone).toBe('Europe/London');
    expect(sky.timeZoneLabel).toBe('GMT+1');
    expect(getTimeZoneLabel(new Date('2026-01-15T12:00:00Z'), 'Europe/London')).toBe('GMT');
  });

  it('stamps phase events on the location clock, including a date rollover', () => {
    // One instant, three zones. Tokyo rolls to the next calendar day.
    const from = new Date('2026-09-19T12:00:00Z');
    const london = getNextMajorPhases(from, 'Europe/London').nextFullMoon;
    const tokyo = getNextMajorPhases(from, 'Asia/Tokyo').nextFullMoon;
    const newYork = getNextMajorPhases(from, 'America/New_York').nextFullMoon;

    expect(london.date.getTime()).toBe(tokyo.date.getTime());
    expect(london.formatted).toBe('Sep 26, 5:50 PM');
    expect(tokyo.formatted).toBe('Sep 27, 1:50 AM');
    expect(newYork.formatted).toBe('Sep 26, 12:50 PM');
  });

  it('resolves local midnight across DST, half-hour offsets and the dateline', () => {
    const cases = [
      ['2026-03-29T12:00:00Z', 'Europe/London', '2026-03-29T00:00:00.000Z'], // spring forward
      ['2026-11-01T18:00:00Z', 'America/New_York', '2026-11-01T04:00:00.000Z'], // fall back
      ['2026-09-19T12:00:00Z', 'Asia/Colombo', '2026-09-18T18:30:00.000Z'], // +05:30
      ['2026-09-19T00:30:00Z', 'Pacific/Auckland', '2026-09-18T12:00:00.000Z'], // ahead of UTC
      ['2026-09-19T12:00:00Z', 'Pacific/Kiritimati', '2026-09-19T10:00:00.000Z'] // +14
    ];
    for (const [iso, zone, expected] of cases) {
      expect(new Date(getStartOfDayInZone(new Date(iso), zone)).toISOString()).toBe(expected);
    }
  });

  it('degrades to dashes rather than throwing on an absent time', () => {
    expect(formatTimeString(null, 'UTC')).toBe('--:--');
    expect(formatTimeString(new Date('nonsense'), 'UTC')).toBe('--:--');
  });
});

describe('phase is driven by true elongation', () => {
  it('places the four quarters at their defining elongations', () => {
    // 0 deg New, 90 First Quarter, 180 Full, 270 Last Quarter
    let d = new Date('2026-06-01T12:00:00Z');
    for (let i = 0; i < 4; i++) {
      d = getAdjacentQuarterPhase(d, 1);
      const elongation = getMoonElongation(d);
      const nearest = Math.round(elongation / 90) * 90;
      const errorDeg = Math.abs(((elongation - nearest + 540) % 360) - 180);
      expect(errorDeg * 60).toBeLessThan(0.5); // under half an arcminute
    }
  });

  it('reaches exactly 0% and 100% illumination at the syzygies', () => {
    const next = getNextMajorPhases(new Date('2026-06-20T00:00:00Z'), 'UTC');
    expect(getIlluminatedFraction(next.nextFullMoon.date) * 100).toBeCloseTo(100, 3);
    expect(getIlluminatedFraction(next.nextNewMoon.date) * 100).toBeCloseTo(0, 3);
  });

  it('advances elongation monotonically through New Moon', () => {
    // SunCalc's illumination-derived phase jumps from ~0.986 to ~0.014 here,
    // skipping zero entirely. Elongation must not.
    const start = new Date('2026-06-14T00:00:00Z').getTime();
    let crossings = 0;
    let prev = getMoonElongation(new Date(start));
    for (let i = 1; i <= 96; i++) {
      const cur = getMoonElongation(new Date(start + i * 30 * 60 * 1000));
      if (cur < prev) crossings++; // only the 360 -> 0 wrap may decrease
      prev = cur;
    }
    expect(crossings).toBe(1);
  });

  it('keeps phase, illumination and age mutually consistent', () => {
    const when = new Date('2026-09-09T10:55:00Z');
    const d = getLunarDetails(when, GREENWICH.lat, GREENWICH.lon, GREENWICH.tz);
    expect(d.phase).toBeCloseTo(getMoonElongation(when) / 360, 10);
    expect(d.phase).toBeCloseTo(getMoonPhaseFraction(when), 12);
    expect(parseFloat(d.fraction)).toBeCloseTo(getIlluminatedFraction(when) * 100, 1);
    expect(parseFloat(d.age)).toBeCloseTo(d.phase * SYNODIC_MONTH, 1);
  });
});

describe('accuracy against published values', () => {
  // A total solar eclipse happens at exact ecliptic conjunction, so the published
  // eclipse-day New Moon is an independent reference for the whole engine.
  it('lands within two minutes of the 2017 and 2024 eclipse conjunctions', () => {
    const cases = [
      ['2017-08-15T00:00:00Z', '2017-08-21T18:30:00Z'],
      ['2024-04-02T00:00:00Z', '2024-04-08T18:21:00Z']
    ];
    for (const [from, published] of cases) {
      const computed = getNextMajorPhases(new Date(from), 'UTC').nextNewMoon.date;
      expect(minutesBetween(computed, new Date(published))).toBeLessThan(2);
    }
  });

  it('keeps the solar longitude sane', () => {
    // The Sun sits near 0 deg at the March equinox and 180 deg at the September one
    expect(getSunEclipticLongitude(new Date('2026-03-20T14:46:00Z'))).toBeCloseTo(0, 1);
    expect(getSunEclipticLongitude(new Date('2026-09-23T00:05:00Z'))).toBeCloseTo(180, 1);
  });

  it('advances lunar longitude at the sidereal rate', () => {
    const a = getMoonEclipticLongitude(new Date('2026-01-01T00:00:00Z'));
    const b = getMoonEclipticLongitude(new Date('2026-01-31T00:00:00Z'));
    // 30 days is a little over one sidereal month (27.32158 d)
    const travelled = ((b - a) % 360 + 360) % 360 + 360;
    expect(travelled / 30).toBeCloseTo(360 / 27.32158, 0);
  });
});

describe('the drawer and the keyboard must never disagree', () => {
  it('gives the same Full Moon instant by both routes', () => {
    const isFull = (d) => getIlluminatedFraction(d) > 0.99;
    const starts = [
      '2026-06-01T12:00:00Z',
      '2026-09-19T12:00:00Z',
      '2026-11-11T12:00:00Z',
      '2027-03-02T04:00:00Z',
      '2026-01-05T12:00:00Z'
    ];
    for (const iso of starts) {
      const drawer = getNextMajorPhases(new Date(iso), 'UTC').nextFullMoon.date;
      let jump = new Date(iso);
      for (let i = 0; i < 8 && !isFull(jump); i++) jump = getAdjacentQuarterPhase(jump, 1);
      expect(minutesBetween(drawer, jump)).toBeLessThan(1);
    }
  });

  it('never reports a countdown of zero days', () => {
    // Sitting exactly on a Full Moon used to print "in 0.0 days"
    const full = getNextMajorPhases(new Date('2026-06-20T00:00:00Z'), 'UTC').nextFullMoon.date;
    const at = getNextMajorPhases(full, 'UTC');
    expect(at.nextFullMoon.countdown).toBe('happening now');
    for (const key of ['nextNewMoon', 'nextFirstQuarter', 'nextLastQuarter']) {
      expect(at[key].countdown).toMatch(/^in \d/);
      expect(at[key].msRemaining).toBeGreaterThan(0);
    }
  });

  it('steps forward and backward without landing on the same instant', () => {
    const start = new Date('2026-09-19T12:00:00Z');
    const fwd = getAdjacentQuarterPhase(start, 1);
    const back = getAdjacentQuarterPhase(start, -1);
    expect(fwd.getTime()).toBeGreaterThan(start.getTime());
    expect(back.getTime()).toBeLessThan(start.getTime());
  });
});

describe('Earth-Moon distance', () => {
  it('spans the accepted perigee and apogee extremes', () => {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let n = 0;
    const start = Date.UTC(2020, 0, 1);
    for (let i = 0; i < 5 * 365 * 4; i++) {
      const r = getMoonDistanceKm(new Date(start + i * 6 * 3600000));
      if (r < min) min = r;
      if (r > max) max = r;
      sum += r;
      n++;
    }
    // SunCalc's single-term model could only reach 364,096 - 405,906 km
    expect(min).toBeGreaterThan(356000);
    expect(min).toBeLessThan(357500);
    expect(max).toBeGreaterThan(406000);
    expect(max).toBeLessThan(407000);
    expect(sum / n).toBeCloseTo(385000, -3);
  });

  it('reaches both ends of the gauge it is plotted against', () => {
    const pct = (km) => ((km - MIN_MOON_DISTANCE) / (MAX_MOON_DISTANCE - MIN_MOON_DISTANCE)) * 100;
    let lo = 101;
    let hi = -1;
    const start = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 3 * 365 * 4; i++) {
      const p = pct(getMoonDistanceKm(new Date(start + i * 6 * 3600000)));
      if (p < lo) lo = p;
      if (p > hi) hi = p;
    }
    expect(lo).toBeLessThan(2); // the bottom fifth used to be unreachable
    expect(hi).toBeGreaterThan(98);
  });
});

describe('zodiac', () => {
  it('matches published Lahiri ayanamsa values', () => {
    expect(getAyanamsa(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(23.85, 1);
    expect(getAyanamsa(new Date('2026-01-01T00:00:00Z'))).toBeCloseTo(24.22, 1);
  });

  it('separates the sidereal reading from the tropical one by the ayanamsa', () => {
    const when = new Date('2026-09-09T12:00:00Z');
    const z = getMoonZodiac(when);
    const tropical = parseFloat(z.eclipticLongitude);
    const expectedSidereal = ((tropical - getAyanamsa(when)) % 360 + 360) % 360;
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    expect(z.sidereal.name).toBe(signs[Math.floor(expectedSidereal / 30) % 12]);
    expect(z.tropical.name).toBe(signs[Math.floor(tropical / 30) % 12]);
  });

  it('renders glyphs as text, never as colour emoji', () => {
    // U+FE0E is what stops the OS resolving these through the emoji font
    for (let m = 0; m < 12; m++) {
      const z = getMoonZodiac(new Date(Date.UTC(2026, m, 5)));
      expect(z.symbol).toMatch(/︎$/);
    }
  });
});

describe('phase classification and the timeline', () => {
  it('names each phase from its position in the cycle', () => {
    expect(classifyPhase(0).name).toBe('New Moon');
    expect(classifyPhase(0.25).name).toBe('First Quarter');
    expect(classifyPhase(0.5).name).toBe('Full Moon');
    expect(classifyPhase(0.75).name).toBe('Last Quarter');
    expect(classifyPhase(0.125).name).toBe('Waxing Crescent');
    expect(classifyPhase(0.375).name).toBe('Waxing Gibbous');
    expect(classifyPhase(0.625).name).toBe('Waning Gibbous');
    expect(classifyPhase(0.875).name).toBe('Waning Crescent');
    expect(classifyPhase(0.999).name).toBe('New Moon');
  });

  it('flags only the primary phases as exact', () => {
    expect(classifyPhase(0.5).isExactPrimary).toBe(true);
    expect(classifyPhase(0.4).isExactPrimary).toBe(false);
  });

  it('agrees with the full detail record it stands in for', () => {
    const when = new Date('2026-09-19T12:00:00Z');
    const summary = getPhaseSummary(when);
    const full = getLunarDetails(when, GREENWICH.lat, GREENWICH.lon, GREENWICH.tz);
    expect(summary.name).toBe(full.name);
    expect(summary.phase).toBeCloseTo(full.phase, 12);
    expect(summary.fraction).toBe(full.fraction);
  });

  it('returns a 31-day window centred on the selected date', () => {
    const centre = new Date('2026-09-19T12:00:00Z');
    const cycle = getCyclePhases(centre, 30);
    expect(cycle).toHaveLength(31);
    expect(cycle[15].isCurrent).toBe(true);
    expect(cycle.filter((d) => d.isCurrent)).toHaveLength(1);
  });
});

describe('robustness', () => {
  it('substitutes the current date for an invalid one', () => {
    for (const bad of [new Date('nonsense'), null, undefined, 'not a date']) {
      expect(() => getLunarDetails(bad, 0, 0, 'UTC')).not.toThrow();
      expect(getLunarDetails(bad, 0, 0, 'UTC').name).toBeTruthy();
    }
  });

  it('reports dashes where the Moon neither rises nor sets', () => {
    // Svalbard in midsummer: the Moon can stay below the horizon all day
    const polar = getSkyData(new Date('2026-06-21T12:00:00Z'), 78.22, 15.65, 'Arctic/Longyearbyen');
    for (const value of [polar.moonrise, polar.moonset]) {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^(--:--|\d{2}:\d{2} [AP]M)$/);
    }
  });

  it('converts SunCalc azimuth to a compass bearing', () => {
    expect(toCompassBearing(0)).toBeCloseTo(180, 6); // SunCalc zero is due South
    expect(toCompassDirection(0)).toBe('N');
    expect(toCompassDirection(90)).toBe('E');
    expect(toCompassDirection(180)).toBe('S');
    expect(toCompassDirection(270)).toBe('W');
    expect(toCompassDirection(359)).toBe('N');
  });

  it('keeps the timeline cheap enough to scrub at 60fps', () => {
    const centre = new Date('2026-09-19T12:00:00Z');
    const started = performance.now();
    for (let i = 0; i < 60; i++) getCyclePhases(new Date(centre.getTime() + i * 3600000), 30);
    const perFrame = (performance.now() - started) / 60;
    expect(perFrame).toBeLessThan(8); // half the 16.7ms frame budget
  });
});
