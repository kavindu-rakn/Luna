import { describe, it, expect } from 'vitest';
import { ICONS } from '../src/components/icons/icons';

// The master prompt's list (section 5.5), by the name each has here
const REQUIRED = [
  'previousPhase', 'previousDay', 'now', 'nextDay', 'nextPhase', 'location', 'menu', 'close', 'share',
  'soundOn', 'soundOff', 'tilt', 'settings', 'keyboard', 'privacy', 'about', 'search', 'locateMe',
  'savedPlace', 'savedPlaceFilled', 'rise', 'set', 'peak', 'sunrise', 'sunset', 'externalLink'
];

describe('the icon set', () => {
  it('has every icon the brief asks for', () => {
    for (const name of REQUIRED) expect(ICONS[name], name).toBeDefined();
  });

  it('draws each one from SVG shapes on the 24 px grid', () => {
    const SHAPES = new Set(['path', 'circle', 'rect']);
    for (const [name, parts] of Object.entries(ICONS)) {
      expect(parts.length, name).toBeGreaterThan(0);
      for (const [tag, attributes] of parts) {
        expect(SHAPES.has(tag), `${name}: ${tag}`).toBe(true);
        // Every coordinate stays within the grid
        const numbers = Object.entries(attributes)
          .filter(([key]) => !['fill', 'stroke', 'strokeDasharray', 'transform'].includes(key))
          .flatMap(([, value]) => String(value).match(/-?\d*\.?\d+/g) ?? [])
          .map(Number);
        if (tag === 'path') continue; // relative path commands can be negative
        for (const n of numbers) expect(n >= 0 && n <= 24, `${name}: ${n}`).toBe(true);
      }
    }
  });
});
