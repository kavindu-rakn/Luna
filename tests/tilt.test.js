import { describe, it, expect } from 'vitest';
import { createTiltReader, screenTilt } from '../src/utils/tilt';

// Feed a reader readings at 60 a second; returns the last pull
const hold = (reader, reading, from, ms, angle = 0) => {
  let pull = null;
  for (let t = from; t <= from + ms; t += 1000 / 60) pull = reader.read(reading, angle, t);
  return pull;
};

describe('screenTilt', () => {
  it('reads the tilt along the screen, whichever way up the phone is held', () => {
    const reading = { beta: 10, gamma: 4 };
    expect(screenTilt(reading, 0)).toEqual({ x: 4, y: 10 });
    expect(screenTilt(reading, 90)).toEqual({ x: 10, y: -4 });
    expect(screenTilt(reading, 270)).toEqual({ x: -10, y: 4 });
    expect(screenTilt(reading, 180)).toEqual({ x: -4, y: -10 });
  });
});

describe('createTiltReader', () => {
  it('starts centred, wherever the phone is held', () => {
    const reader = createTiltReader();
    expect(reader.read({ beta: 50, gamma: -8 }, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('ignores the small movements of a resting hand', () => {
    const reader = createTiltReader();
    hold(reader, { beta: 40, gamma: 0 }, 0, 500);
    const pull = reader.read({ beta: 41, gamma: 1 }, 0, 520);
    expect(pull.x).toBe(0);
    expect(pull.y).toBe(0);
  });

  it('pulls further the further it tilts, up to a full pull', () => {
    const reader = createTiltReader();
    hold(reader, { beta: 40, gamma: 0 }, 0, 500);
    const small = reader.read({ beta: 40, gamma: 6 }, 0, 520);
    const reader2 = createTiltReader();
    hold(reader2, { beta: 40, gamma: 0 }, 0, 500);
    const large = reader2.read({ beta: 40, gamma: 30 }, 0, 520);
    expect(small.x).toBeGreaterThan(0.2);
    expect(small.x).toBeLessThan(0.4);
    expect(large.x).toBe(1);
  });

  it('recentres within about a second once the phone settles at a new angle', () => {
    const reader = createTiltReader();
    hold(reader, { beta: 40, gamma: 0 }, 0, 500);
    // Tilted 12° over a quarter second
    let pull;
    for (let i = 1; i <= 15; i++) pull = reader.read({ beta: 40, gamma: (12 * i) / 15 }, 0, 500 + i * 16.7);
    expect(pull.x).toBeGreaterThan(0.5);
    // Then held there
    expect(hold(reader, { beta: 40, gamma: 12 }, 760, 1100).x).toBe(0);
  });

  it('keeps the pull while the phone is still turning', () => {
    const reader = createTiltReader();
    hold(reader, { beta: 40, gamma: 0 }, 0, 500);
    // A slow, steady turn of 20° a second for a second
    let pull;
    for (let t = 0; t <= 1000; t += 1000 / 60) pull = reader.read({ beta: 40, gamma: (20 * t) / 1000 }, 0, 500 + t);
    expect(pull.x).toBeGreaterThan(0.9);
  });
});
