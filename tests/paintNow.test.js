import { describe, it, expect } from 'vitest';
import { paintNow } from '../src/shell/paintNow';
import { getMoonElongation, getPhaseSummary } from '../src/utils/lunarCalc';

// The shell's inline script, run without a document so it only returns what it worked out
const run = (search = '', stored = null) => paintNow({
  location: { search },
  localStorage: { getItem: () => stored }
}, null);

// Smallest angle between two elongations, across the 360/0 seam
const angleBetween = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

describe('shell paintNow', () => {
  it('stays within a degree of the exact elongation across two centuries', () => {
    let worst = 0;
    for (let ms = Date.UTC(1950, 0, 1); ms < Date.UTC(2150, 0, 1); ms += 7.3 * 86400000) {
      const instant = new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
      worst = Math.max(worst, angleBetween(run(`?d=${instant}`).elongation, getMoonElongation(new Date(ms))));
    }
    // One degree is about two hours of lunar motion
    expect(worst).toBeLessThan(1);
  });

  it('names the phase as the app does, except within a degree of a boundary', () => {
    for (let ms = Date.UTC(2020, 0, 1); ms < Date.UTC(2032, 0, 1); ms += 0.61 * 86400000) {
      const instant = new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
      const exact = getPhaseSummary(new Date(ms));
      const e = getMoonElongation(new Date(ms));
      const nearBoundary = [0, 5.4, 84.6, 95.4, 174.6, 185.4, 264.6, 275.4, 354.6]
        .some((edge) => angleBetween(e, edge) < 1);
      if (!nearBoundary) expect(run(`?d=${instant}`).name).toBe(exact.name);
    }
  });

  it('reads a shared day as that day, in the shared place', () => {
    const result = run('?d=2026-10-14&at=6.93,79.85&n=Colombo%2C+Sri+Lanka&tz=Asia%2FColombo');
    expect(result.when.toISOString()).toBe('2026-10-14T12:00:00.000Z');
    expect(result.place.name).toBe('Colombo, Sri Lanka');
    expect(result.timeZone).toBe('Asia/Colombo');
    expect(result.name).toBe('Waxing Crescent');
  });

  it('names a shared place without a name by its coordinates', () => {
    expect(run('?at=-33.87,151.21').place.name).toBe('33.87°S, 151.21°E');
  });

  it('falls back to the saved place, then to Greenwich', () => {
    const saved = JSON.stringify({ lat: 6.93, lon: 79.85, name: 'Colombo', timeZone: 'Asia/Colombo' });
    expect(run('', saved).place.name).toBe('Colombo');
    expect(run('', 'not json').place.name).toBe('Greenwich, UK');
    expect(run('').timeZone).toBe('Europe/London');
  });

  it('survives a hand-edited link', () => {
    const result = run('?d=2026-99-99&at=abc&tz=Not%2FAZone');
    expect(result.timeZone).toBe('Europe/London');
    expect(Number.isFinite(result.elongation)).toBe(true);
  });

  it('is self-contained, so the build can inline it', () => {
    // Rebuilt from its own source with nothing in scope, it must still run
    const rebuilt = new Function(`return (${paintNow.toString()})`)();
    expect(rebuilt({ location: { search: '?d=2026-09-26' }, localStorage: { getItem: () => null } }, null).name)
      .toBe('Full Moon');
  });
});
