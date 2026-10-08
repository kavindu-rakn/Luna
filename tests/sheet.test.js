import { describe, it, expect } from 'vitest';
import { settlesOpen } from '../src/utils/sheet.js';

// Deep Dive's sheet on a 390×844 phone: about 740 px from just under the top of
// the screen down to the timeline
const HEIGHT = 740;

describe('where a drag of the sheet settles', () => {
  it('opens or closes by where it was let go, when let go slowly', () => {
    expect(settlesOpen(HEIGHT * 0.3, 0, HEIGHT)).toBe(true);
    expect(settlesOpen(HEIGHT * 0.7, 0, HEIGHT)).toBe(false);
  });

  it('carries a flick on to where it was heading', () => {
    // Barely lifted from the grabber, but flicked up: open
    expect(settlesOpen(HEIGHT - 60, -2, HEIGHT)).toBe(true);
    // Barely pulled down from open, but flicked down: closed
    expect(settlesOpen(60, 2, HEIGHT)).toBe(false);
  });

  it('a gentle nudge goes back where it was', () => {
    expect(settlesOpen(40, 0.2, HEIGHT)).toBe(true);
    expect(settlesOpen(HEIGHT - 40, -0.2, HEIGHT)).toBe(false);
  });
});
