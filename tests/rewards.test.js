import { describe, it, expect } from 'vitest';
import { eyesAt, EYES_S, STAY_S } from '../src/sky/rewards';

describe('your eyes adjust', () => {
  it('waits three minutes, then comes on slowly over a minute and a half, and stays', () => {
    expect(STAY_S).toBe(180);
    expect(eyesAt(0)).toBe(0);
    expect(eyesAt(EYES_S / 2)).toBeCloseTo(0.5, 9);
    expect(eyesAt(EYES_S)).toBe(1);
    expect(eyesAt(EYES_S * 10)).toBe(1);
    for (let t = 1; t < EYES_S; t++) expect(eyesAt(t)).toBeGreaterThan(eyesAt(t - 1));
  });
});
