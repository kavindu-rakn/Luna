import { describe, it, expect } from 'vitest';
import {
  directionAt,
  fieldShare,
  LINGER_S,
  meteorAt,
  meteorMagnitude,
  meteorPath,
  meteorsPerSecond,
  pickShower,
  segmentDistance,
  SPEED_UP
} from '../src/sky/meteors';
import { focalLength, project, skyFrame, unitVector } from '../src/sky/frame';
import { meteorsInSky } from '../src/sky/showers';

const rad = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / rad;

// A seeded random source, so a test sees the same meteors every run
const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('how often meteors come', () => {
  it('counts the share of the sky on screen against the observer\'s field', () => {
    // The 80° field across the diagonal covers about 0.95 sr on a wide screen, 0.8
    // on a phone held upright, of the observer's 2.24 sr
    expect(fieldShare(1440, 900)).toBeCloseTo(0.42, 2);
    expect(fieldShare(390, 844)).toBeCloseTo(0.36, 2);
  });

  it('turns hourly rates into meteors a second, ten times as often', () => {
    // The 2026 Geminids from London at their best, about 85 an hour: about one
    // every ten seconds on a wide screen
    const perSecond = meteorsPerSecond([{ rate: 85 }], 1440, 900);
    expect(SPEED_UP).toBe(10);
    expect(1 / perSecond).toBeGreaterThan(9);
    expect(1 / perSecond).toBeLessThan(12);
    expect(meteorsPerSecond([], 1440, 900)).toBe(0);
  });

  it('picks a shower in proportion to its rate', () => {
    const random = seeded(7);
    const showers = [{ id: 'A', rate: 30 }, { id: 'B', rate: 10 }];
    const counts = { A: 0, B: 0 };
    for (let i = 0; i < 4000; i++) counts[pickShower(showers, random).id]++;
    expect(counts.A / counts.B).toBeGreaterThan(2.6);
    expect(counts.A / counts.B).toBeLessThan(3.4);
  });
});

describe('a meteor\'s path', () => {
  // The Perseids' radiant on their 2026 maximum
  const radiant = unitVector(48, 58);
  const perseid = { radiant, speed: 59 };

  it('flies away from the radiant, on the great circle through it', () => {
    const random = seeded(3);
    for (let i = 0; i < 50; i++) {
      const start = unitVector(random() * 360, Math.asin(random() * 2 - 1) / rad);
      const path = meteorPath(perseid, start, random);
      if (!path) continue;
      expect(angle(radiant, path.to)).toBeGreaterThan(angle(radiant, path.from));
      const normal = cross(path.from, path.to);
      expect(Math.abs(dot(normal, radiant)) / Math.hypot(...normal)).toBeLessThan(1e-9);
    }
  });

  it('is short near the radiant and long far from it', () => {
    const near = meteorPath(perseid, unitVector(48, 50), () => 0.5);
    const far = meteorPath(perseid, unitVector(138, 0), () => 0.5);
    expect(near.angle / rad).toBeLessThan(far.angle / rad / 4);
    // Side-on, 35 km of path a hundred km up: about 20°
    expect(far.angle / rad).toBeGreaterThan(15);
    expect(far.angle / rad).toBeLessThan(25);
  });

  it('burns for a fraction of a second, briefer the faster the shower', () => {
    const start = unitVector(138, 0);
    const geminid = meteorPath({ radiant, speed: 35 }, start, () => 0.5);
    const leonid = meteorPath({ radiant, speed: 71 }, start, () => 0.5);
    expect(geminid.seconds).toBeCloseTo(1, 0);
    expect(leonid.seconds).toBeLessThan(geminid.seconds / 1.8);
  });

  it('shows no path right at the radiant', () => {
    expect(meteorPath(perseid, radiant, () => 0.5)).toBeNull();
  });

  it('starts under the point on screen it was chosen at', () => {
    const frame = skyFrame({ ra: 120, dec: 20, parallacticAngle: 30, time: Date.UTC(2026, 7, 13) });
    const focal = focalLength(1440, 900);
    const [x, y] = project(frame, focal, directionAt(frame, focal, -400, 250));
    expect(x).toBeCloseTo(-400, 6);
    expect(y).toBeCloseTo(250, 6);
  });

  it('measures how near a segment comes to the Moon', () => {
    expect(segmentDistance([0, 0], [-10, 5], [10, 5])).toBeCloseTo(5, 9);
    expect(segmentDistance([0, 0], [3, 4], [6, 8])).toBeCloseTo(5, 9);
  });
});

describe('how a meteor looks', () => {
  it('comes faint far more often than bright, by the population index', () => {
    const random = seeded(11);
    const shower = { population: 2.2, faintest: 6.5 };
    let bright = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (meteorMagnitude(shower, random) <= 5.5) bright++;
    // One magnitude brighter than the limit: 1 in r of them
    expect(bright / n).toBeCloseTo(1 / 2.2, 1);
  });

  it('brightens, crosses its path and leaves a train that fades', () => {
    expect(meteorAt(1, 0).light).toBe(0);
    const middle = meteorAt(1, 0.5);
    expect(middle.head).toBeCloseTo(0.5, 9);
    expect(middle.tail).toBeCloseTo(0.1, 9);
    expect(middle.light).toBeGreaterThan(0.8);
    const after = meteorAt(1, 1 + LINGER_S / 2);
    expect(after.head).toBe(1);
    expect(after.light).toBeLessThan(0.2);
    expect(meteorAt(1, 1 + LINGER_S + 1e-9)).toBeNull();
  });
});

describe('the showers in the sky', () => {
  const london = [51.48, 0];

  it('gives the Geminids on their 2026 night, with their radiant and speed', () => {
    const [geminids, ...rest] = meteorsInSky(new Date('2026-12-14T03:00:00Z'), ...london);
    expect(rest).toEqual([]);
    expect(geminids.id).toBe('GEM');
    expect(geminids.rate).toBeGreaterThan(60);
    expect(geminids.speed).toBe(35);
    expect(geminids.radiant.dec).toBeCloseTo(33, 0);
    // A waning crescent, risen late: little lost to it
    expect(geminids.faintest).toBeGreaterThan(5.8);
  });

  it('gives nothing by day', () => {
    expect(meteorsInSky(new Date('2026-12-14T12:00:00Z'), ...london)).toEqual([]);
  });
});
