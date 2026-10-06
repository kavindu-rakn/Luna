import { describe, it, expect } from 'vitest';
import { getMoonEclipticLatitude, getGeocentricLibration, getMoonView, bodyToView } from '../src/utils/moonView.js';

// Meeus, Astronomical Algorithms, examples 47.a, 48.a and 53.a: 1992 April 12, 0h TD
const MEEUS = new Date(Date.UTC(1992, 3, 12, 0, 0, 0));
const GREENWICH = { lat: 51.4769, lon: -0.0005 };

const angleBetween = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const apply = (m, v) => [0, 1, 2].map((row) => m[row * 3] * v[0] + m[row * 3 + 1] * v[1] + m[row * 3 + 2] * v[2]);

describe('geocentric position and libration', () => {
  it("reproduces Meeus's latitude, right ascension and declination (example 47.a)", () => {
    const g = getGeocentricLibration(MEEUS);
    expect(getMoonEclipticLatitude(MEEUS)).toBeCloseTo(-3.229126, 5);
    expect(g.ra).toBeCloseTo(134.68847, 3);
    expect(g.dec).toBeCloseTo(13.768368, 3);
  });

  it("reproduces Meeus's optical libration and axis angle (example 53.a)", () => {
    const g = getGeocentricLibration(MEEUS);
    expect(g.l).toBeCloseTo(-1.206, 2);
    expect(g.b).toBeCloseTo(4.194, 2);
    // Meeus's 15.08 includes physical libration, which is left out here
    expect(Math.abs(g.P - 15.08)).toBeLessThan(0.05);
  });

  it("puts the Sun overhead where Meeus does (example 53.a)", () => {
    const { subsolar } = getGeocentricLibration(MEEUS);
    expect(Math.abs(subsolar.l - 67.89)).toBeLessThan(0.05);
    expect(Math.abs(subsolar.b - 1.46)).toBeLessThan(0.05);
  });

  it("points the bright limb where Meeus does (example 48.a)", () => {
    expect(getGeocentricLibration(MEEUS).brightLimb).toBeCloseTo(285.0, 1);
  });

  it('stays within the libration the Moon is known to reach over a year', () => {
    let maxL = 0;
    let maxB = 0;
    for (let day = 0; day < 365; day += 0.5) {
      const g = getGeocentricLibration(new Date(Date.UTC(2026, 0, 1) + day * 86400000));
      maxL = Math.max(maxL, Math.abs(g.l));
      maxB = Math.max(maxB, Math.abs(g.b));
    }
    // About ±7.9° in longitude and ±6.9° in latitude; a year reaches close to both
    expect(maxL).toBeGreaterThan(6.5);
    expect(maxL).toBeLessThan(8.2);
    expect(maxB).toBeGreaterThan(6.4);
    expect(maxB).toBeLessThan(7);
  });
});

describe('bodyToView', () => {
  it('shows the near side face-on with north up and selenographic east to the right', () => {
    const m = bodyToView([1, 0, 0], 0);
    expect(apply(m, [1, 0, 0]).map((c) => +c.toFixed(9))).toEqual([0, 0, 1]);
    expect(apply(m, [0, 1, 0]).map((c) => +c.toFixed(9))).toEqual([1, 0, 0]);
    expect(apply(m, [0, 0, 1]).map((c) => +c.toFixed(9))).toEqual([0, 1, 0]);
  });

  it('turns the pole anticlockwise by the pole angle', () => {
    const pole = apply(bodyToView([1, 0, 0], 90), [0, 0, 1]);
    expect(pole[0]).toBeCloseTo(-1, 9);
    expect(pole[1]).toBeCloseTo(0, 9);
  });

  it('is a rotation', () => {
    const m = bodyToView([0.9, 0.1, -0.2], 37);
    const rows = [m.slice(0, 3), m.slice(3, 6), m.slice(6, 9)];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const d = rows[i][0] * rows[j][0] + rows[i][1] * rows[j][1] + rows[i][2] * rows[j][2];
        expect(d).toBeCloseTo(i === j ? 1 : 0, 9);
      }
    }
  });
});

describe('getMoonView', () => {
  it('lights the disc from where the bright limb angle says, turned for the zenith', () => {
    for (const date of [MEEUS, new Date('2026-10-14T18:00:00Z'), new Date('2026-10-25T03:00:00Z')]) {
      const v = getMoonView(date, GREENWICH.lat, GREENWICH.lon);
      expect(angleBetween(v.limbAngle, v.brightLimbAngle - v.parallacticAngle)).toBeLessThan(0.5);
    }
  });

  it('agrees with the illuminated fraction to within a topocentric degree', () => {
    const v = getMoonView(MEEUS, 0, 0);
    // Meeus 48.a: geocentric phase angle 69.08°
    expect(Math.abs(v.phaseAngle - 69.08)).toBeLessThan(1.2);
    expect(v.litPhase).toBeCloseTo((180 - v.phaseAngle) / 360, 9);
  });

  it('has no parallactic angle on the meridian, and opposite signs either side of it', () => {
    // Search a day for the Moon's transit at Greenwich
    const start = Date.UTC(2026, 9, 14);
    let best = null;
    for (let m = 0; m < 1500; m += 2) {
      const v = getMoonView(new Date(start + m * 60000), GREENWICH.lat, GREENWICH.lon);
      if (!best || Math.abs(v.hourAngle) < Math.abs(best.v.hourAngle)) best = { m, v };
    }
    expect(Math.abs(best.v.parallacticAngle)).toBeLessThan(1);
    const east = getMoonView(new Date(start + (best.m - 120) * 60000), GREENWICH.lat, GREENWICH.lon);
    const west = getMoonView(new Date(start + (best.m + 120) * 60000), GREENWICH.lat, GREENWICH.lon);
    expect(east.parallacticAngle).toBeLessThan(0);
    expect(west.parallacticAngle).toBeGreaterThan(0);
  });

  it('nods by up to a degree over a night as the observer turns with the Earth', () => {
    const at = (hours) => getMoonView(new Date(Date.UTC(2026, 9, 14, hours)), 0, 0).libration;
    const evening = at(18);
    const morning = at(30);
    const geo = getGeocentricLibration(new Date(Date.UTC(2026, 9, 14, 18)));
    expect(Math.abs(evening.l - geo.l)).toBeLessThan(1.1);
    expect(Math.abs(evening.l - morning.l)).toBeGreaterThan(0.2);
  });

  it('keeps the Moon in front of the viewer in its own sky', () => {
    const v = getMoonView(new Date('2026-10-14T18:00:00Z'), GREENWICH.lat, GREENWICH.lon);
    expect(v.ra).toBeGreaterThanOrEqual(0);
    expect(v.ra).toBeLessThan(360);
    expect(Math.abs(v.dec)).toBeLessThan(29);
    expect(v.altitude).toBeGreaterThan(-90);
    expect(v.altitude).toBeLessThan(90);
  });
});
