import { describe, it, expect } from 'vitest';
import {
  litPath, shadePhases, earthshine, SHADE_STEPS, SHADE_HEADROOM, SHADE_TOE
} from '../src/utils/moonPath';
import { getMoonView } from '../src/utils/moonView';
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

});

// Lommel-Seeliger brightness, as the 3D Moon shows it, of ground δ (in turns) past
// the terminator of a Moon at the given phase, on the disc's scale
const brightness = (phase, delta) => {
  const E = (phase <= 0.5 ? phase : 1 - phase) * 2 * Math.PI;
  const d = delta * 2 * Math.PI;
  const law = (2 * Math.sin(d)) / (Math.sin(d) + Math.sin(E - d));
  return (Math.sqrt(law / SHADE_HEADROOM) - SHADE_TOE) / (1 - SHADE_TOE);
};

describe('shadePhases', () => {
  it('starts at the Moon itself and steps towards the sun', () => {
    const waxing = shadePhases(0.2);
    const waning = shadePhases(0.8);
    expect(waxing[0]).toBe(0.2);
    expect(waning[0]).toBe(0.8);
    for (let step = 1; step < SHADE_STEPS; step++) {
      expect(waxing[step]).toBeLessThan(waxing[step - 1]);
      expect(waning[step]).toBeGreaterThan(waning[step - 1]);
    }
  });

  it('puts each step where the light reaches its level', () => {
    for (const phase of [0.05, 0.125, 0.25, 0.4, 0.6, 0.75, 0.93]) {
      shadePhases(phase).forEach((shifted, step) => {
        if (step) expect(brightness(phase, Math.abs(shifted - phase))).toBeCloseTo((step + 0.5) / SHADE_STEPS, 6);
      });
    }
  });

  it('stays on the same side of New and Full Moon', () => {
    for (let phase = 0.01; phase < 1; phase += 0.01) {
      for (const shifted of shadePhases(phase)) {
        expect(shifted >= 0 && shifted <= 1).toBe(true);
        expect(shifted <= 0.5).toBe(phase <= 0.5);
      }
    }
  });

  it('lights a Full Moon evenly to its edge', () => {
    // Every step either covers the whole disc or, brighter than a Full Moon, none of it
    const shapes = shadePhases(0.5).map((shifted) => Math.round(shifted * 1e9) / 1e9);
    expect(shapes.every((shifted) => shifted === 0.5 || shifted === 0)).toBe(true);
    // …and together the steps that cover it show the photograph at 90%
    const covering = shapes.filter((shifted) => shifted === 0.5).length;
    expect(Math.abs(covering / SHADE_STEPS - 0.9)).toBeLessThan(1 / SHADE_STEPS);
  });

  it('puts no step across the face of a nearly full Moon', () => {
    // A Full Moon's even light sits mid-step, so near it every step's edge hugs a
    // limb rather than cutting across the face
    for (const phase of [0.495, 0.505]) {
      for (const shifted of shadePhases(phase)) {
        expect(Math.abs(Math.cos(shifted * 2 * Math.PI))).toBeGreaterThan(0.85);
      }
    }
  });
});

describe('earthshine', () => {
  it('is strongest at New Moon and gone at Full', () => {
    expect(earthshine(0)).toBeCloseTo(1, 6);
    // Faint by the quarters: an eighth of New Moon's
    expect(earthshine(0.25)).toBeCloseTo(0.125, 6);
    expect(earthshine(0.5)).toBeCloseTo(0, 6);
    expect(earthshine(0.9)).toBeCloseTo(earthshine(0.1), 6);
  });
});

describe('the shell script', () => {
  const element = () => ({ setAttribute(name, value) { this[name] = value; } });
  const paint = (search) => {
    const svg = { getAttribute: () => '200' };
    const paths = Array.from({ length: SHADE_STEPS }, () => ({ ...element(), ownerSVGElement: svg }));
    const parts = { use: element(), 'mask g': element(), image: element() };
    const doc = {
      querySelector: (selector) => Object.entries(parts).find(([key]) => selector.endsWith(key))?.[1] ?? null,
      querySelectorAll: (selector) => (selector.endsWith('path') ? paths : [])
    };
    const win = { location: { search }, localStorage: { getItem: () => null } };
    paintNow(win, doc);
    return { paths, parts, view: paintNow(win, null).view };
  };
  const angle = (transform) => Number(/rotate\((-?[\d.]+) 100 100\)/.exec(transform)[1]);
  const angleBetween = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

  it('draws the 2D Moon the way MoonDisc does', () => {
    const { paths, parts, view } = paint('?d=2026-10-14T18:00Z');
    expect(paths.map((path) => path.d)).toEqual(shadePhases(view.litPhase).map((shifted) => litPath(shifted, 200)));
    expect(parts.use.opacity).toBe(earthshine(view.litPhase).toFixed(4));
    expect(angleBetween(angle(parts['mask g'].transform), 270 - view.limbAngle)).toBeLessThan(0.01);
    expect(angleBetween(angle(parts.image.transform), -view.poleAngle)).toBeLessThan(0.01);
  });

  it('turns it within a degree or so of where the app will', () => {
    const places = [[51.4769, -0.0005], [6.93, 79.85], [-33.87, 151.21]];
    for (const [lat, lon] of places) {
      for (const iso of ['2026-10-14T18:00Z', '2026-10-18T15:00Z', '2026-10-22T03:00Z', '2026-11-05T06:00Z']) {
        const { view } = paint(`?d=${iso}&at=${lat},${lon}`);
        const app = getMoonView(new Date(iso.replace('Z', ':00Z')), lat, lon);
        expect(Math.abs(view.litPhase - app.litPhase) * 360).toBeLessThan(1.2);
        expect(angleBetween(view.poleAngle, app.poleAngle)).toBeLessThan(1);
        expect(angleBetween(view.limbAngle, app.limbAngle)).toBeLessThan(2);
      }
    }
  });
});
