import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  roundCoordinate,
  roundPlace,
  placeFromPosition,
  reverseGeocodeCached,
  tidyStoredData,
  isSamePlace
} from '../src/utils/location.js';
import { forgetStoredData, listStoredKeys } from '../src/utils/storage.js';

// Enough of the Storage API to walk keys, as the tidying and forgetting code does
class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

// A stand-in for Nominatim that records every URL it is asked for
let requested;
beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  requested = [];
  globalThis.fetch = vi.fn(async (url) => {
    requested.push(String(url));
    return { ok: true, json: async () => ({ address: { city: 'Colombo', country: 'Sri Lanka' } }) };
  });
});
afterEach(() => {
  delete globalThis.fetch;
});

const HOME = { latitude: 6.927079, longitude: 79.861244 };

describe('your position is rounded the moment it arrives', () => {
  it('rounds to two decimals, about a kilometre, without a negative zero', () => {
    expect(roundCoordinate(6.927079)).toBe(6.93);
    expect(roundCoordinate(79.861244)).toBe(79.86);
    expect(Object.is(roundCoordinate(-0.0005), 0)).toBe(true);
    expect(roundPlace({ lat: 51.4769, lon: -0.0005, name: 'Greenwich' })).toEqual({ lat: 51.48, lon: 0, name: 'Greenwich' });
  });

  it('never lets the exact position into the place, the request or storage', async () => {
    const place = await placeFromPosition(HOME);
    expect(place).toEqual({ lat: 6.93, lon: 79.86, name: 'Colombo, Sri Lanka', timeZone: 'Asia/Colombo' });

    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain('lat=6.93&lon=79.86');

    const everything = [...localStorage.map.values()].join(' ');
    expect(everything).not.toContain('6.927');
    expect(everything).not.toContain('79.861');
  });

  it('still matches a saved place held to the same kilometre', () => {
    const searched = { lat: 48.856614, lon: 2.3522219 };
    expect(isSamePlace(roundPlace(searched), searched)).toBe(true);
  });
});

describe('the place-name cache is not a history', () => {
  it('asks once for the same spot, and keeps a single entry however many places are located', async () => {
    await reverseGeocodeCached(6.93, 79.86);
    await reverseGeocodeCached(6.93, 79.86);
    expect(requested).toHaveLength(1);

    await reverseGeocodeCached(51.48, 0);
    await reverseGeocodeCached(35.68, 139.65);
    expect(listStoredKeys('luna_geo_')).toEqual(['luna_geo_last']);
  });

  it('forgets the older spot once a newer one replaces it', async () => {
    await reverseGeocodeCached(6.93, 79.86);
    await reverseGeocodeCached(51.48, 0);
    await reverseGeocodeCached(6.93, 79.86);
    expect(requested).toHaveLength(3);
  });
});

describe('tidying what older versions stored', () => {
  it('deletes the per-place history and rounds exact positions', () => {
    localStorage.setItem('luna_geo_6.93_79.86', JSON.stringify({ name: 'Colombo', lat: 6.927079, lon: 79.861244 }));
    localStorage.setItem('luna_geo_51.48_-0.00', JSON.stringify({ name: 'Greenwich', lat: 51.4769, lon: -0.0005 }));
    localStorage.setItem('luna_geo_last', JSON.stringify({ key: '6.93,79.86', name: 'Colombo' }));
    localStorage.setItem('luna_location', JSON.stringify({ lat: 6.927079, lon: 79.861244, name: 'Colombo', timeZone: 'Asia/Colombo' }));
    localStorage.setItem('luna_saved_places', JSON.stringify([{ lat: 35.689487, lon: 139.691706, name: 'Tokyo', timeZone: 'Asia/Tokyo' }]));
    localStorage.setItem('someone_elses_key', 'untouched');

    tidyStoredData();

    expect(listStoredKeys('luna_geo_')).toEqual(['luna_geo_last']);
    expect(JSON.parse(localStorage.getItem('luna_location'))).toMatchObject({ lat: 6.93, lon: 79.86, name: 'Colombo' });
    expect(JSON.parse(localStorage.getItem('luna_saved_places'))[0]).toMatchObject({ lat: 35.69, lon: 139.69, name: 'Tokyo' });
    expect(localStorage.getItem('someone_elses_key')).toBe('untouched');
  });

  it('does nothing harmful when there is nothing to tidy, or no storage at all', () => {
    expect(() => tidyStoredData()).not.toThrow();
    expect(localStorage.length).toBe(0);

    globalThis.localStorage = {
      get length() { throw new Error('SecurityError'); },
      key() { throw new Error('SecurityError'); },
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); },
      removeItem() { throw new Error('SecurityError'); }
    };
    expect(() => tidyStoredData()).not.toThrow();
  });
});

describe('forgetting places and settings', () => {
  it("removes everything Luna stored and nothing that isn't Luna's", () => {
    localStorage.setItem('luna_location', '{}');
    localStorage.setItem('luna_saved_places', '[]');
    localStorage.setItem('luna_preferences', '{"clock":"24h"}');
    localStorage.setItem('luna_geo_last', '{}');
    localStorage.setItem('another_app', 'keep me');

    expect(forgetStoredData()).toBe(4);
    expect(listStoredKeys()).toEqual([]);
    expect(localStorage.getItem('another_app')).toBe('keep me');
  });

  it('reports nothing removed where storage is blocked, rather than throwing', () => {
    globalThis.localStorage = {
      get length() { throw new Error('SecurityError'); },
      key() { throw new Error('SecurityError'); }
    };
    expect(forgetStoredData()).toBe(0);
  });
});
