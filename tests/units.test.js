import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectClock,
  detectDistanceUnit,
  loadPreferences,
  storePreference,
  convertDistance,
  formatDistance,
  formatDistanceThousands,
  KM_PER_MILE
} from '../src/utils/units.js';

// Just enough of the Storage API to run the persistence code for real
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe('the default clock follows the device', () => {
  it('reads 12- or 24-hour from the locale', () => {
    expect(detectClock('en-US')).toBe('12h');
    expect(detectClock('en-IN')).toBe('12h');
    expect(detectClock('en-GB')).toBe('24h');
    expect(detectClock('de-DE')).toBe('24h');
    expect(detectClock('ja-JP')).toBe('24h');
  });

  it('falls back instead of throwing on a malformed tag', () => {
    expect(detectClock('not a locale!')).toBe('12h');
  });
});

describe('the default distance unit follows the region', () => {
  it('uses miles only where people measure in them', () => {
    expect(detectDistanceUnit('en-US')).toBe('mi');
    expect(detectDistanceUnit('en-GB')).toBe('mi');
    expect(detectDistanceUnit('en-IN')).toBe('km');
    expect(detectDistanceUnit('si-LK')).toBe('km');
    expect(detectDistanceUnit('de-DE')).toBe('km');
  });

  it('expands a bare language to its likeliest region', () => {
    expect(detectDistanceUnit('en')).toBe('mi');
    expect(detectDistanceUnit('ja')).toBe('km');
  });

  it('falls back to kilometres on a malformed or missing tag', () => {
    expect(detectDistanceUnit('not a locale!')).toBe('km');
    expect(detectDistanceUnit(undefined)).toBe('km');
  });
});

describe('remembered preferences', () => {
  it('start from the device when nothing is stored', () => {
    expect(loadPreferences('en-GB')).toEqual({ clock: '24h', distanceUnit: 'mi' });
    expect(loadPreferences('de-DE')).toEqual({ clock: '24h', distanceUnit: 'km' });
  });

  it('keep a choice, while the untouched setting still follows the device', () => {
    storePreference('clock', '12h');
    expect(loadPreferences('de-DE')).toEqual({ clock: '12h', distanceUnit: 'km' });
    expect(loadPreferences('en-US')).toEqual({ clock: '12h', distanceUnit: 'mi' });
  });

  it('accumulate choices rather than replacing them', () => {
    storePreference('clock', '24h');
    storePreference('distanceUnit', 'km');
    expect(loadPreferences('en-US')).toEqual({ clock: '24h', distanceUnit: 'km' });
  });

  it('ignore stored values they do not recognise', () => {
    localStorage.setItem('luna_preferences', JSON.stringify({ clock: '13h', distanceUnit: 'furlongs' }));
    expect(loadPreferences('en-US')).toEqual({ clock: '12h', distanceUnit: 'mi' });
  });

  it('survive corrupt storage, and recover on the next choice', () => {
    localStorage.setItem('luna_preferences', '{not json');
    expect(loadPreferences('de-DE')).toEqual({ clock: '24h', distanceUnit: 'km' });
    storePreference('distanceUnit', 'mi');
    expect(loadPreferences('de-DE')).toEqual({ clock: '24h', distanceUnit: 'mi' });
  });

  it('still work where storage is blocked', () => {
    globalThis.localStorage = {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); }
    };
    expect(() => storePreference('clock', '24h')).not.toThrow();
    expect(loadPreferences('en-US')).toEqual({ clock: '12h', distanceUnit: 'mi' });
  });
});

describe('distances', () => {
  it('convert with the exact international mile', () => {
    expect(KM_PER_MILE).toBe(1.609344);
    expect(convertDistance(1.609344, 'mi')).toBeCloseTo(1, 12);
    expect(convertDistance(384400, 'km')).toBe(384400);
  });

  it('group digits the English way', () => {
    expect(formatDistance(384400, 'km')).toBe('384,400');
    expect(formatDistance(384400, 'mi')).toBe('238,855');
  });

  it('label the perigee and apogee ends in thousands', () => {
    expect(formatDistanceThousands(356500, 'km')).toBe('357k km');
    expect(formatDistanceThousands(406700, 'km')).toBe('407k km');
    expect(formatDistanceThousands(356500, 'mi')).toBe('222k mi');
    expect(formatDistanceThousands(406700, 'mi')).toBe('253k mi');
  });
});
