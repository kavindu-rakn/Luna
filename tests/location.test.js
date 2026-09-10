import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveTimeZone,
  isSamePlace,
  loadStoredLocation,
  storeLocation,
  loadSavedPlaces,
  storeSavedPlaces,
  DEFAULT_LOCATION
} from '../src/utils/location.js';

// The suite runs in Node, so stand up just enough of the Storage API to exercise
// the persistence guards. Everything here writes through the real code paths.
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

describe('timezone resolution from coordinates', () => {
  it('names the zone for places across the world', async () => {
    const cases = [
      [51.4769, -0.0005, 'Europe/London'],
      [6.9271, 79.8612, 'Asia/Colombo'],
      [35.6762, 139.6503, 'Asia/Tokyo'],
      [40.7128, -74.006, 'America/New_York'],
      [-33.8688, 151.2093, 'Australia/Sydney'],
      [64.1466, -21.9426, 'Atlantic/Reykjavik'],
      [78.22, 15.65, 'Arctic/Longyearbyen']
    ];
    for (const [lat, lon, expected] of cases) {
      await expect(resolveTimeZone(lat, lon)).resolves.toBe(expected);
    }
  });

  it('resolves from the coordinates rather than the device clock', async () => {
    // The suite runs under TZ=Asia/Colombo. A location in Tokyo must not inherit it.
    expect(process.env.TZ).toBe('Asia/Colombo');
    await expect(resolveTimeZone(35.6762, 139.6503)).resolves.toBe('Asia/Tokyo');
  });

  it('always yields something usable', async () => {
    // Mid-ocean has no land timezone; the caller still needs a valid zone
    const zone = await resolveTimeZone(0, -140);
    expect(typeof zone).toBe('string');
    expect(zone.length).toBeGreaterThan(0);
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: zone })).not.toThrow();
  });
});

describe('place identity', () => {
  it('treats places within about a kilometre as the same', () => {
    const base = { lat: 51.4769, lon: -0.0005 };
    expect(isSamePlace(base, { lat: 51.4769, lon: -0.0005 })).toBe(true);
    expect(isSamePlace(base, { lat: 51.4800, lon: -0.0020 })).toBe(true);
    expect(isSamePlace(base, { lat: 51.5200, lon: -0.1000 })).toBe(false);
  });

  it('does not treat a missing place as matching anything', () => {
    expect(isSamePlace(null, { lat: 0, lon: 0 })).toBe(false);
    expect(isSamePlace({ lat: 0, lon: 0 }, undefined)).toBe(false);
  });
});

describe('persistence guards', () => {
  it('round-trips a stored location', () => {
    storeLocation(DEFAULT_LOCATION);
    expect(loadStoredLocation()).toEqual(DEFAULT_LOCATION);
  });

  it('rejects corrupted or incomplete stored data rather than trusting it', () => {
    const rejects = [
      'not json at all',
      JSON.stringify({ lat: 'north', lon: 0, name: 'x', timeZone: 'UTC' }),
      JSON.stringify({ lat: 91, lon: 0, name: 'x', timeZone: 'UTC' }),      // off the globe
      JSON.stringify({ lat: 0, lon: 181, name: 'x', timeZone: 'UTC' }),
      JSON.stringify({ lat: 0, lon: 0, timeZone: 'UTC' }),                   // no name
      JSON.stringify({ lat: 0, lon: 0, name: 'x' }),                         // no timezone
      JSON.stringify(null)
    ];
    for (const value of rejects) {
      localStorage.setItem('luna_location', value);
      expect(loadStoredLocation()).toBeNull();
    }
  });

  it('survives storage being unavailable', () => {
    // Private browsing and blocked site data both make this throw
    globalThis.localStorage = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); }
    };
    expect(loadStoredLocation()).toBeNull();
    expect(loadSavedPlaces()).toEqual([]);
    expect(() => storeLocation(DEFAULT_LOCATION)).not.toThrow();
    expect(() => storeSavedPlaces([DEFAULT_LOCATION])).not.toThrow();
  });

  it('keeps the saved list bounded and free of junk', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      lat: i, lon: i, name: `Place ${i}`, timeZone: 'UTC'
    }));
    storeSavedPlaces(many);
    expect(loadSavedPlaces()).toHaveLength(12);

    localStorage.setItem('luna_saved_places', JSON.stringify([
      DEFAULT_LOCATION,
      { lat: 'nope', lon: 0, name: 'bad', timeZone: 'UTC' }
    ]));
    expect(loadSavedPlaces()).toEqual([DEFAULT_LOCATION]);
  });

  it('ignores a saved list that is not a list', () => {
    localStorage.setItem('luna_saved_places', JSON.stringify({ not: 'an array' }));
    expect(loadSavedPlaces()).toEqual([]);
  });
});
