import { describe, it, expect } from 'vitest';
import { litPath } from '../src/utils/moonPath';
import { paintNow } from '../src/shell/paintNow';

// Read the terminator's half-width and the arc flags back out of a lit path
const parse = (d) => {
  const [, outer, rx, inner] = d.match(/A [\d.]+,[\d.]+ 0 0 (\d) [\d.]+,[\d.]+ A ([\d.]+),[\d.]+ 0 0 (\d)/);
  return { outer: Number(outer), rx: Number(rx), inner: Number(inner) };
};

// Fraction of the disc the path covers: a half-disc plus or minus a half-ellipse
const litArea = (phase, size = 200) => {
  const r = size / 2 - 0.5;
  const { rx } = parse(litPath(phase, size));
  const moreThanHalf = phase > 0.25 && phase < 0.75;
  return moreThanHalf ? (1 + rx / r) / 2 : (1 - rx / r) / 2;
};

describe('litPath', () => {
  it('lights exactly the illuminated fraction of the disc', () => {
    for (let phase = 0; phase < 1; phase += 0.01) {
      const illuminated = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
      expect(litArea(phase)).toBeCloseTo(illuminated, 2);
    }
  });

  it('draws a 16% crescent as a crescent, not a quarter', () => {
    // 14 Oct 2026, 18:00 UTC: elongation ~47°, 16% lit
    expect(litArea(47 / 360)).toBeCloseTo(0.16, 2);
  });

  it('lights the right-hand limb while waxing and the left while waning', () => {
    expect(parse(litPath(0.1, 200)).outer).toBe(1);
    expect(parse(litPath(0.9, 200)).outer).toBe(0);
  });

  it('matches what the shell script draws before the app loads', () => {
    let drawn = null;
    const path = { setAttribute: (name, value) => { if (name === 'd') drawn = value; } };
    path.ownerSVGElement = { getAttribute: () => '200' };
    const doc = { querySelector: (selector) => (selector.includes('path') ? path : null) };
    const win = { location: { search: '?d=2026-10-14T18:00Z' }, localStorage: { getItem: () => null } };
    paintNow(win, doc);
    const { phase } = paintNow(win, null);
    expect(drawn).toBe(litPath(phase, 200));
  });
});
