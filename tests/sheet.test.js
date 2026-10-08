import { describe, it, expect } from 'vitest';
import { offsetFor, settleAt, shownAt } from '../src/utils/sheet.js';

// A 390×844 phone: 744 px from just under the top of the screen to the timeline
const PHONE = { height: 744, peek: 72, short: false, halfMax: Infinity };
// A 320×640 phone, where half height has to leave the Moon some room
const SMALL = { height: 540, peek: 72, short: false, halfMax: 150 };
// A phone on its side
const SIDEWAYS = { height: 304, peek: 72, short: true, halfMax: Infinity };

describe("Deep Dive's sheet heights", () => {
  it('shows the peek, about half, or all of its room', () => {
    expect(shownAt('closed', PHONE)).toBe(72);
    expect(shownAt('half', PHONE)).toBe(Math.round(744 * 0.45));
    expect(shownAt('full', PHONE)).toBe(744);
    expect(offsetFor('full', PHONE)).toBe(0);
    expect(offsetFor('closed', PHONE)).toBe(744 - 72);
  });

  it('keeps half height short enough for the Moon, but still useful', () => {
    // The Moon's limit would leave too little sheet, so the sheet's own minimum wins
    expect(shownAt('half', SMALL)).toBe(72 + 100);
    expect(shownAt('half', { ...SMALL, halfMax: 200 })).toBe(200);
  });

  it('has no peek and no half on its side', () => {
    expect(shownAt('closed', SIDEWAYS)).toBe(0);
    expect(shownAt('half', SIDEWAYS)).toBe(304);
  });
});

describe('where a drag settles', () => {
  const at = (detent, room) => offsetFor(detent, room);

  it('settles at the nearest height when let go slowly', () => {
    expect(settleAt(at('half', PHONE) + 20, 0, PHONE)).toBe('half');
    expect(settleAt(at('full', PHONE) + 60, 0, PHONE)).toBe('full');
    expect(settleAt(at('closed', PHONE) - 30, 0, PHONE)).toBe('closed');
  });

  it('carries a flick on to where it was heading', () => {
    // From half, a fast flick down closes; a fast flick up goes to full
    expect(settleAt(at('half', PHONE), 1.8, PHONE)).toBe('closed');
    expect(settleAt(at('half', PHONE), -1.8, PHONE)).toBe('full');
    // From the peek, a gentle flick up stops at half
    expect(settleAt(at('closed', PHONE) - 40, -0.8, PHONE)).toBe('half');
  });

  it('only opens fully or closes on its side', () => {
    expect(settleAt(at('full', SIDEWAYS) + 100, 0, SIDEWAYS)).toBe('full');
    expect(settleAt(at('full', SIDEWAYS) + 200, 0, SIDEWAYS)).toBe('closed');
  });
});
