import { describe, it, expect } from 'vitest';
import { eyesAt, EYES_S, figureSegments, haloAt, HALO_S, linesAt, LINES_S, namePlace } from '../src/sky/rewards';
import { LINES } from '../src/sky/lines';
import { constellationOfDate } from '../src/sky/constellations';
import { unitVector } from '../src/sky/frame';
import { getMoonView } from '../src/utils/moonView';

describe('your eyes adjust', () => {
  it('comes on slowly over a minute and a half, and stays', () => {
    expect(eyesAt(0)).toBe(0);
    expect(eyesAt(EYES_S / 2)).toBeCloseTo(0.5, 9);
    expect(eyesAt(EYES_S)).toBe(1);
    expect(eyesAt(EYES_S * 10)).toBe(1);
    for (let t = 1; t < EYES_S; t++) expect(eyesAt(t)).toBeGreaterThan(eyesAt(t - 1));
  });
});

describe('the constellation draws itself', () => {
  it('draws, holds, fades and is gone', () => {
    const { draw, hold, fade } = LINES_S;
    expect(linesAt(0).drawn).toBe(0);
    expect(linesAt(draw).drawn).toBe(1);
    expect(linesAt(draw + hold / 2).light).toBe(1);
    expect(linesAt(draw + hold + fade / 2).light).toBeCloseTo(0.5, 9);
    expect(linesAt(draw + hold + fade)).toBeNull();
  });

  it('draws a figure at one steady pace, line after line', () => {
    const segments = figureSegments([LINES.Leo], unitVector);
    expect(segments[0].from).toBe(0);
    expect(segments[segments.length - 1].to).toBeCloseTo(1, 12);
    for (let i = 1; i < segments.length; i++) expect(segments[i].from).toBeCloseTo(segments[i - 1].to, 12);
  });

  it('has a figure for every constellation the Moon passes through', () => {
    // The Moon's path wanders over the 18.6-year cycle of its nodes; a step of
    // a little under a day catches each constellation it crosses
    const seen = new Set();
    const start = Date.UTC(2026, 0, 1);
    for (let t = start; t < start + 19 * 365.25 * 86400000; t += 0.9 * 86400000) {
      const view = getMoonView(new Date(t), 0, 0);
      seen.add(constellationOfDate(view.ra, view.dec, view.time));
    }
    expect([...seen].filter((name) => !LINES[name])).toEqual([]);
    // Taurus, Gemini and the rest of the zodiac, and some outside it
    expect(seen.has('Orion')).toBe(true);
    expect(seen.has('Ophiuchus')).toBe(true);
  });

  it('names the figure clear of the Moon and on screen', () => {
    const half = [40, 11];
    const wide = [-700, 700, -430, 430];
    // Off the Moon already: the middle of the figure
    expect(namePlace([[300, 40], [420, -60]], 200, half, wide)).toEqual([360, -10]);
    // On it: pushed straight out until the whole name clears it
    const [x, y] = namePlace([[-30, 0], [70, 0]], 200, half, wide);
    expect(x).toBeCloseTo(240, 9);
    expect(y).toBeCloseTo(0, 9);
    // A phone: the Moon all but fills the width, so the name goes above it
    const phone = [-195, 195, -370, 474];
    expect(namePlace([[150, -20], [170, 10]], 175, half, phone)).toEqual([0, -186]);
    expect(namePlace([], 200, half, wide)).toBeNull();
  });
});

describe('a lunar halo', () => {
  it('glows up, holds and fades', () => {
    const { rise, hold, fade } = HALO_S;
    expect(haloAt(0)).toBe(0);
    expect(haloAt(rise + hold / 2)).toBe(1);
    expect(haloAt(rise + hold + fade / 2)).toBeCloseTo(0.5, 9);
    expect(haloAt(rise + hold + fade)).toBeNull();
  });
});
