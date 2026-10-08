import { describe, it, expect } from 'vitest';
import { dateCue, quarterAt } from '../src/audio/cues.js';
import { strongest } from '../src/audio/sound.js';
import { getAdjacentQuarterPhase, getMoonPhaseFraction } from '../src/utils/lunarCalc.js';
import { placeSpring, stepSpring } from '../src/utils/spring.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const at = (ms, phase, day) => ({ ms, phase, day: day ?? String(Math.floor(ms / DAY)) });

describe('what a change of date sounds like', () => {
  it('ticks for a day crossed, and stays quiet within a day', () => {
    expect(dateCue(at(0, 0.1), at(DAY, 0.134))).toEqual({ kind: 'tick' });
    expect(dateCue(at(DAY, 0.134), at(0, 0.1))).toEqual({ kind: 'tick' });
    expect(dateCue(at(HOUR, 0.1), at(2 * HOUR, 0.1014))).toBeNull();
  });

  it('chimes the phase a scrub passes, either way', () => {
    expect(dateCue(at(0, 0.249), at(2 * HOUR, 0.2512))).toEqual({ kind: 'chime', index: 1 });
    expect(dateCue(at(2 * HOUR, 0.2512), at(0, 0.249))).toEqual({ kind: 'chime', index: 1 });
    expect(dateCue(at(0, 0.49), at(DAY, 0.524))).toEqual({ kind: 'chime', index: 2 });
  });

  it('hears New Moon where the cycle wraps', () => {
    expect(dateCue(at(0, 0.998), at(2 * HOUR, 0.0008))).toEqual({ kind: 'chime', index: 0 });
    expect(dateCue(at(2 * HOUR, 0.0008), at(0, 0.998))).toEqual({ kind: 'chime', index: 0 });
  });

  it('chimes a jump only when it lands on a phase', () => {
    expect(dateCue(at(0, 0.3), at(8 * DAY, 0.5))).toEqual({ kind: 'chime', index: 2 });
    expect(dateCue(at(0, 0.3), at(9 * DAY, 0.6))).toBeNull();
  });

  it('does not chime again on leaving the phase it sits on', () => {
    expect(quarterAt(0.25)).toBe(1);
    expect(dateCue(at(0, 0.25), at(HOUR, 0.2514))).toBeNull();
    expect(dateCue(at(0, 0.2499999), at(DAY, 0.284))).toEqual({ kind: 'tick' });
    expect(dateCue(at(HOUR, 0.2500001), at(0, 0.2486))).toBeNull();
  });

  it('chimes the right phase for every jump the phase buttons make', () => {
    let date = new Date(Date.UTC(2026, 9, 8, 12));
    const heard = [];
    for (let i = 0; i < 5; i++) {
      const next = getAdjacentQuarterPhase(date, 1);
      const cue = dateCue(
        at(date.getTime(), getMoonPhaseFraction(date)),
        at(next.getTime(), getMoonPhaseFraction(next))
      );
      heard.push(cue?.index);
      date = next;
    }
    // From a waning crescent on 8 Oct 2026: New, First Quarter, Full, Last Quarter, New
    expect(heard).toEqual([0, 1, 2, 3, 0]);
  });
});

describe('one action, one sound', () => {
  const pick = (...kinds) => strongest(kinds.map((kind) => ({ kind })))?.kind;

  it('lets the most telling cue of a press play', () => {
    // Deep Dive from the menu: the item, the menu closing, the sheet opening
    expect(pick('glass', 'felt', 'sheet-open')).toBe('sheet-open');
    // A day stepped out of "now"
    expect(pick('live-off', 'tick')).toBe('live-off');
    // A day picked in the calendar from "now": the choice is heard, not the leaving
    expect(pick('glass', 'felt', 'live-off')).toBe('glass');
    // A scrub across Full Moon
    expect(pick('tick', 'chime')).toBe('chime');
    // Tilt switched in the open menu
    expect(pick('switch-on', 'glass')).toBe('switch-on');
  });

  it('ignores what it does not know', () => {
    expect(pick('nonsense')).toBeUndefined();
    expect(pick()).toBeUndefined();
  });
});

describe('the halo spring', () => {
  it('reaches the pointer without overshooting, then rests on it', () => {
    const spring = { x: 0, y: 0, vx: 0, vy: 0 };
    const target = { x: 300, y: -120 };
    let furthest = 0;
    let settled = false;
    for (let frame = 0; frame < 240 && !settled; frame++) {
      settled = stepSpring(spring, target, 1 / 60);
      furthest = Math.max(furthest, spring.x);
    }
    expect(settled).toBe(true);
    expect(furthest).toBeLessThanOrEqual(300.5);
    expect(spring).toEqual({ x: 300, y: -120, vx: 0, vy: 0 });
  });

  it('is not thrown by a long frame', () => {
    const spring = { x: 0, y: 0, vx: 0, vy: 0 };
    stepSpring(spring, { x: 100, y: 0 }, 5);
    expect(Number.isFinite(spring.x)).toBe(true);
    expect(spring.x).toBeGreaterThan(0);
    expect(spring.x).toBeLessThanOrEqual(100.5);
  });

  it('starts where it is placed, at rest', () => {
    const spring = { x: 5, y: 5, vx: 40, vy: 40 };
    placeSpring(spring, { x: 12, y: 34 });
    expect(spring).toEqual({ x: 12, y: 34, vx: 0, vy: 0 });
  });
});
