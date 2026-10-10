import { describe, it, expect } from 'vitest';
import { settleTarget, crossesMark } from '../src/utils/timelineDetents';

// The five exact phases on their fixed marks, as the timeline draws them
const marks = [
  { name: 'New Moon', position: 0 },
  { name: 'First Quarter', position: 0.25 },
  { name: 'Full Moon', position: 0.5 },
  { name: 'Last Quarter', position: 0.75 },
  { name: 'New Moon', position: 1 }
];
const CYCLE = 29.53;

describe('settleTarget', () => {
  it('settles a release within six tenths of a day into the phase', () => {
    // A 1300 px rail on a wide screen: a day is 44 px, so the reach is capped at 12 px
    const near = settleTarget(0.5 + 10 / 1300, marks, 1300, CYCLE);
    expect(near?.name).toBe('Full Moon');
    expect(settleTarget(0.5 + 14 / 1300, marks, 1300, CYCLE)).toBeNull();
  });

  it('keeps a nearby day easy to choose on a phone', () => {
    // A 330 px rail: a day is 11 px, so the reach is 0.6 of that, 6.7 px
    expect(settleTarget(0.25 + 6 / 330, marks, 330, CYCLE)?.name).toBe('First Quarter');
    // A day away is a day away
    expect(settleTarget(0.25 + 11 / 330, marks, 330, CYCLE)).toBeNull();
  });

  it('lands a tap on a phase icon, 16 px wide, on that phase', () => {
    expect(settleTarget(0.75 - 6 / 330, marks, 330, CYCLE)?.name).toBe('Last Quarter');
    expect(settleTarget(1 - 4 / 330, marks, 330, CYCLE)?.position).toBe(1);
  });

  it('settles nowhere without a rail to measure', () => {
    expect(settleTarget(0.5, marks, 0, CYCLE)).toBeNull();
  });
});

describe('crossesMark', () => {
  it('ticks as a drag passes or arrives on an exact phase', () => {
    expect(crossesMark(0.48, 0.52, marks)).toBe(true);
    expect(crossesMark(0.52, 0.48, marks)).toBe(true);
    expect(crossesMark(0.48, 0.5, marks)).toBe(true);
  });

  it('stays quiet between phases, and when leaving one it started on', () => {
    expect(crossesMark(0.3, 0.4, marks)).toBe(false);
    expect(crossesMark(0.5, 0.53, marks)).toBe(false);
    expect(crossesMark(null, 0.5, marks)).toBe(false);
  });
});
