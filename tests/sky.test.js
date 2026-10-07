import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  apply, precessionMatrix, project, skyFrame, toRaDec, transpose, unitVector, zenithDirection,
  centuriesSinceJ2000, focalLength
} from '../src/sky/frame';
import { decodeStars, countBrighterThan, starLight, starColor, starDepth } from '../src/sky/stars';
import { getPlanets } from '../src/sky/planets';
import { constellationAt, constellationOfDate } from '../src/sky/constellations';
import { getMoonView } from '../src/utils/moonView';

const rad = Math.PI / 180;
// Angular distance between two directions, in degrees
const separation = (a, b) => Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) / rad;

describe('precession', () => {
  it('matches Meeus example 21.b', () => {
    // θ Persei, its J2000 position carried by proper motion to 2028 Nov 13.19 TD
    const T = (2462088.69 - 2451545) / 36525;
    const { ra, dec } = toRaDec(apply(precessionMatrix(T), unitVector(41.054063, 49.22775)));
    expect(ra).toBeCloseTo(41.547214, 4);
    expect(dec).toBeCloseTo(49.348483, 4);
  });
});

describe('the sky frame', () => {
  const at = (iso, lat, lon) => {
    const date = new Date(iso);
    const view = getMoonView(date, lat, lon);
    const time = date.getTime();
    const frame = skyFrame({ ra: view.ra, dec: view.dec, parallacticAngle: view.parallacticAngle, time });
    // Directions in the equator of the date, as the Moon's are, back to J2000
    const toJ2000 = transpose(precessionMatrix(centuriesSinceJ2000(time)));
    return { view, frame, time, toJ2000 };
  };
  const places = [[6.93, 79.85], [51.4769, -0.0005], [-33.87, 151.21]];
  const instants = ['2026-10-14T18:00:00Z', '2026-10-22T03:00:00Z', '2027-03-01T00:00:00Z'];

  it('puts the Moon at the centre of its own patch of sky', () => {
    for (const [lat, lon] of places) {
      for (const iso of instants) {
        const { view, frame, toJ2000 } = at(iso, lat, lon);
        const [x, y] = project(frame, 1000, apply(toJ2000, unitVector(view.ra, view.dec)));
        expect(Math.abs(x)).toBeLessThan(1e-6);
        expect(Math.abs(y)).toBeLessThan(1e-6);
      }
    }
  });

  it('turns the sky as the Moon is turned: position angle θ shows θ − q anticlockwise from up', () => {
    for (const [lat, lon] of places) {
      for (const iso of instants) {
        const { view, frame, toJ2000 } = at(iso, lat, lon);
        const a = view.ra * rad;
        const d = view.dec * rad;
        const forward = unitVector(view.ra, view.dec);
        const north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
        const east = [-Math.sin(a), Math.cos(a), 0];
        for (const theta of [0, 45, 90, 200, 300]) {
          const offset = forward.map((f, i) => Math.cos(5 * rad) * f + Math.sin(5 * rad)
            * (Math.cos(theta * rad) * north[i] + Math.sin(theta * rad) * east[i]));
          const [x, y] = project(frame, 1000, apply(toJ2000, offset));
          const shown = Math.atan2(-x, -y) / rad;
          const expected = theta - view.parallacticAngle;
          expect(Math.abs(((shown - expected + 540) % 360) - 180)).toBeLessThan(1e-6);
        }
      }
    }
  });

  it('keeps the zenith straight up', () => {
    for (const [lat, lon] of places) {
      for (const iso of instants) {
        const { view, frame, time, toJ2000 } = at(iso, lat, lon);
        const moon = apply(toJ2000, unitVector(view.ra, view.dec));
        const zenith = zenithDirection({ latitude: lat, siderealTime: view.siderealTime, time });
        // Five degrees from the Moon towards the zenith
        const along = zenith.map((z, i) => z - moon[i] * (zenith[0] * moon[0] + zenith[1] * moon[1] + zenith[2] * moon[2]));
        const n = Math.hypot(...along);
        const towards = moon.map((m, i) => Math.cos(5 * rad) * m + Math.sin(5 * rad) * (along[i] / n));
        const [x, y] = project(frame, 1000, towards);
        expect(y).toBeLessThan(0);
        // Within a hundredth of a degree: the Moon's place is topocentric, the
        // zenith geocentric
        expect(Math.abs(Math.atan2(x, -y) / rad)).toBeLessThan(0.2);
      }
    }
  });

  it('spans 80° across the diagonal', () => {
    const f = focalLength(1440, 900);
    expect((2 * Math.atan(Math.hypot(1440, 900) / 2 / f)) / rad).toBeCloseTo(80, 6);
  });
});

describe('the star catalogue', () => {
  const file = fs.readFileSync(new URL('../public/assets/sky/stars.bin', import.meta.url));
  const stars = decodeStars(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));

  it('holds the stars to magnitude 6, brightest first, starting with Sirius', () => {
    expect(stars.count).toBe(5080);
    // Magnitudes are kept to a twentieth
    expect(Math.abs(stars.magnitudes[0] + 1.46)).toBeLessThanOrEqual(0.025);
    const sirius = toRaDec(Array.from(stars.directions.slice(0, 3)));
    // Sirius, J2000: 6h45m08.9s −16°42′58″
    expect(sirius.ra).toBeCloseTo(101.287, 2);
    expect(sirius.dec).toBeCloseTo(-16.716, 2);
    for (let i = 1; i < stars.count; i++) expect(stars.magnitudes[i]).toBeGreaterThanOrEqual(stars.magnitudes[i - 1]);
    expect(stars.magnitudes[stars.count - 1]).toBeLessThanOrEqual(6);
  });

  it('counts the bright stars a low tier keeps', () => {
    const n = countBrighterThan(stars.magnitudes, 4.5);
    expect(n).toBeGreaterThan(800);
    expect(n).toBeLessThan(1000);
    expect(stars.magnitudes[n - 1]).toBeLessThanOrEqual(4.5);
    expect(stars.magnitudes[n]).toBeGreaterThan(4.5);
  });

  it('brightens and grows with magnitude, and brings bright stars nearer', () => {
    let previous = { peak: 0, sigma: 0 };
    for (let m = 6; m >= -4.5; m -= 0.5) {
      const light = starLight(m);
      expect(light.peak).toBeGreaterThanOrEqual(previous.peak);
      expect(light.sigma).toBeGreaterThanOrEqual(previous.sigma);
      expect(light.peak).toBeLessThanOrEqual(1);
      previous = light;
    }
    expect(starDepth(6)).toBeLessThan(starDepth(1));
    expect(starDepth(1)).toBeLessThan(1);
  });

  it('colours hot stars blue and cool ones orange', () => {
    const [rRigel, , bRigel] = starColor(-0.03);
    const [rBetelgeuse, , bBetelgeuse] = starColor(1.85);
    expect(bRigel).toBeGreaterThan(rRigel);
    expect(rBetelgeuse).toBeGreaterThan(bBetelgeuse);
    for (const bv of [-0.3, 0.65, 2]) {
      expect(Math.max(...starColor(bv))).toBeCloseTo(1, 6);
      expect(Math.min(...starColor(bv))).toBeGreaterThan(0.3);
    }
  });
});

describe('the planets', () => {
  // JPL Horizons, geocentric astrometric RA/Dec (ICRF) and V magnitude, queried
  // 7 Oct 2026 (ssd.jpl.nasa.gov/api/horizons.api, QUANTITIES='1,9')
  const HORIZONS = {
    Mercury: [['2026-10-07T12:00Z', 215.22389, -16.64683, -0.027], ['1990-01-15T00:00Z', 282.57981, -19.53865, 1.691], ['2240-07-01T00:00Z', 93.36291, 24.31538, -2.049]],
    Venus: [['2026-10-07T12:00Z', 212.81538, -21.17375, -4.635], ['1990-01-15T00:00Z', 302.15284, -14.74074, -4.316], ['2240-07-01T00:00Z', 121.53966, 21.83795, -3.886]],
    Mars: [['2026-10-07T12:00Z', 127.70086, 20.0949, 1.012], ['1990-01-15T00:00Z', 258.7734, -23.22604, 1.526], ['2240-07-01T00:00Z', 344.03453, -11.03048, -1.189]],
    Jupiter: [['2026-10-07T12:00Z', 142.9549, 15.28421, -1.894], ['1990-01-15T00:00Z', 93.87158, 23.30887, -2.696]],
    Saturn: [['2026-10-07T12:00Z', 10.88611, 1.73135, 0.343], ['1990-01-15T00:00Z', 288.81686, -22.03381, 0.533], ['2240-07-01T00:00Z', 112.13079, 21.8412, 0.184]]
  };
  // JPL's own stated accuracy: arcminutes for the inner planets, up to a quarter
  // of a degree for Jupiter and Saturn, more outside 1800-2050
  const TOLERANCE = { Mercury: 0.05, Venus: 0.05, Mars: 0.05, Jupiter: 0.25, Saturn: 0.25 };

  it('places each planet where JPL Horizons does', () => {
    for (const [name, rows] of Object.entries(HORIZONS)) {
      for (const [iso, ra, dec] of rows) {
        const planet = getPlanets(new Date(iso)).find((p) => p.name === name);
        const outside = iso.startsWith('2240');
        expect(separation(planet.direction, unitVector(ra, dec))).toBeLessThan(TOLERANCE[name] * (outside ? 3 : 1));
      }
    }
  });

  it('gives each planet its brightness to within a few tenths of a magnitude', () => {
    for (const [name, rows] of Object.entries(HORIZONS)) {
      for (const [iso, , , magnitude] of rows) {
        const planet = getPlanets(new Date(iso)).find((p) => p.name === name);
        expect(Math.abs(planet.magnitude - magnitude)).toBeLessThan(0.35);
      }
    }
  });
});

describe('constellations', () => {
  it('reproduces Roman’s own examples', () => {
    // Positions at the equinox of 1950, from the ReadMe of CDS VI/42
    const from1950 = transpose(precessionMatrix((2433282.4235 - 2451545) / 36525));
    const examples = [
      [9, 65, 'Ursa Major'], [23.5, -20, 'Aquarius'], [5.12, 9.12, 'Orion'], [9.4555, -19.9, 'Hydra'],
      [12.8888, 22, 'Coma Berenices'], [15.6687, -12.1234, 'Libra'], [19, -40, 'Corona Australis'], [6.2222, -81.1234, 'Mensa']
    ];
    for (const [hours, dec, name] of examples) {
      const { ra, dec: dec2000 } = toRaDec(apply(from1950, unitVector(hours * 15, dec)));
      expect(constellationAt(ra, dec2000)).toBe(name);
    }
  });

  it('names the constellation behind the Moon as JPL Horizons does', () => {
    // Horizons, geocentric astrometric position and constellation (QUANTITIES='1,29')
    const moon = [
      [156.46769, 9.23159, 'Leo'], [245.59694, -26.62588, 'Scorpius'], [338.62456, -8.06604, 'Aquarius'],
      [174.37912, -0.18231, 'Virgo'], [256.94179, -27.55091, 'Ophiuchus'], [229.27035, -23.31857, 'Libra'],
      [319.45724, -17.94628, 'Capricornus'], [232.34659, -24.22822, 'Libra']
    ];
    for (const [ra, dec, name] of moon) expect(constellationAt(ra, dec)).toBe(name);
  });

  it('works from the equator of the date, as the Moon’s own position is given', () => {
    const date = new Date('2026-10-14T18:00:00Z');
    const view = getMoonView(date, 0, 0);
    expect(constellationOfDate(view.ra, view.dec, date.getTime())).toBe('Scorpius');
  });
});
