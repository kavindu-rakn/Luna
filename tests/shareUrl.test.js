import { describe, it, expect } from 'vitest';
import {
  readSharedState,
  buildSharedSearch,
  buildShareUrl,
  parseSharedDate,
  parseSharedCoordinates,
  isValidTimeZone
} from '../src/utils/shareUrl.js';

const REYKJAVIK = { lat: 64.145981, lon: -21.9422367, name: 'Reykjavik, Iceland', timeZone: 'Atlantic/Reykjavik' };
const INSTANT = new Date('2026-09-26T16:50:17Z');

describe('a link round-trips the view it describes', () => {
  it('restores date, place and timezone', () => {
    const state = readSharedState(buildSharedSearch(INSTANT, REYKJAVIK));
    expect(state.date.toISOString()).toBe('2026-09-26T16:50:00.000Z'); // minute precision
    expect(state.location).toEqual({
      lat: 64.15,
      lon: -21.94,
      name: 'Reykjavik, Iceland',
      timeZone: 'Atlantic/Reykjavik'
    });
  });

  it('builds an absolute URL on the current path', () => {
    const url = buildShareUrl(INSTANT, REYKJAVIK, {
      origin: 'https://kavindu-rakn.github.io',
      pathname: '/Luna/'
    });
    expect(url.startsWith('https://kavindu-rakn.github.io/Luna/?')).toBe(true);
    expect(new URL(url).searchParams.get('tz')).toBe('Atlantic/Reykjavik');
  });
});

describe('what a live view writes', () => {
  it('omits the date, so a bookmark keeps showing tonight', () => {
    const search = buildSharedSearch(null, REYKJAVIK);
    expect(new URLSearchParams(search).has('d')).toBe(false);
    expect(readSharedState(search).date).toBeUndefined();
  });

  it('rounds coordinates to about a kilometre', () => {
    const at = new URLSearchParams(buildSharedSearch(null, REYKJAVIK)).get('at');
    expect(at).toBe('64.15,-21.94');
  });

  it('never writes a negative zero', () => {
    // Greenwich is the default, so this is the URL every first-time visitor sees
    const greenwich = { lat: 51.4769, lon: -0.0005, name: 'Greenwich, UK', timeZone: 'Europe/London' };
    expect(new URLSearchParams(buildSharedSearch(null, greenwich)).get('at')).toBe('51.48,0.00');

    const nearEquator = { lat: -0.004, lon: -0.004, name: 'x', timeZone: 'UTC' };
    expect(new URLSearchParams(buildSharedSearch(null, nearEquator)).get('at')).toBe('0.00,0.00');

    // but a genuinely negative value keeps its sign
    const justWest = { lat: 0, lon: -0.006, name: 'x', timeZone: 'UTC' };
    expect(new URLSearchParams(buildSharedSearch(null, justWest)).get('at')).toBe('0.00,-0.01');
  });
});

describe('dates', () => {
  it('reads a bare day as local noon at the location, not UTC midnight', () => {
    // Noon in Tokyo is 03:00 UTC; UTC midnight would be 09:00 the previous evening there
    const noonTokyo = parseSharedDate('2026-09-26', 'Asia/Tokyo');
    expect(noonTokyo.toISOString()).toBe('2026-09-26T03:00:00.000Z');

    const noonLondon = parseSharedDate('2026-09-26', 'Europe/London');
    expect(noonLondon.toISOString()).toBe('2026-09-26T11:00:00.000Z'); // BST
  });

  it('keeps a bare day on its date where clocks run more than 12 hours ahead of UTC', () => {
    // These opened a day late: Christmas in Auckland landed on Boxing Day
    expect(parseSharedDate('2026-12-25', 'Pacific/Auckland').toISOString()).toBe('2026-12-24T23:00:00.000Z');
    expect(parseSharedDate('2026-09-26', 'Pacific/Kiritimati').toISOString()).toBe('2026-09-25T22:00:00.000Z');
    expect(parseSharedDate('2026-09-26', 'Pacific/Tongatapu').toISOString()).toBe('2026-09-25T23:00:00.000Z');
  });

  it('uses the link timezone for a bare day', () => {
    const state = readSharedState('?d=2026-09-26&at=35.68,139.65&tz=Asia/Tokyo');
    expect(state.date.toISOString()).toBe('2026-09-26T03:00:00.000Z');
  });

  it('refuses days that do not exist rather than rolling them over', () => {
    expect(parseSharedDate('2026-02-31')).toBeNull();
    expect(parseSharedDate('2026-13-01')).toBeNull();
    expect(parseSharedDate('2026-00-10')).toBeNull();
  });

  it('refuses a time without an explicit UTC marker', () => {
    // Otherwise it would be read silently in the viewer's own timezone
    expect(parseSharedDate('2026-09-26T18:09')).toBeNull();
    expect(parseSharedDate('2026-09-26 18:09')).toBeNull();
    expect(parseSharedDate('2026-09-26T18:09+05:30')).toBeNull();
  });

  it('accepts the forms it writes', () => {
    expect(parseSharedDate('2026-09-26T18:09Z')).not.toBeNull();
    expect(parseSharedDate('2026-09-26T18:09:30Z')).not.toBeNull();
    expect(parseSharedDate('2026-09-26T18:09:30.500Z')).not.toBeNull();
  });

  it('refuses dates the ephemeris cannot usefully describe', () => {
    expect(parseSharedDate('0999-12-31T00:00Z')).toBeNull();
    expect(parseSharedDate('3001-01-01T00:00Z')).toBeNull();
    expect(parseSharedDate('1969-07-20T20:17Z')).not.toBeNull(); // Apollo 11
  });

  it('refuses rubbish', () => {
    for (const bad of ['', 'yesterday', 'NaN', '2026', '9999999999999', null, undefined, 42]) {
      expect(parseSharedDate(bad)).toBeNull();
    }
  });
});

describe('coordinates', () => {
  it('parses a latitude,longitude pair', () => {
    expect(parseSharedCoordinates('64.15,-21.94')).toEqual({ lat: 64.15, lon: -21.94 });
    expect(parseSharedCoordinates(' 0 , 0 ')).toEqual({ lat: 0, lon: 0 });
  });

  it('refuses points off the globe or malformed pairs', () => {
    for (const bad of ['91,0', '-91,0', '0,181', '0,-181', '1,2,3', '1', 'a,b', ',', '', null, 'Infinity,0']) {
      expect(parseSharedCoordinates(bad)).toBeNull();
    }
  });
});

describe('timezones', () => {
  it('accepts real IANA zones only', () => {
    expect(isValidTimeZone('Atlantic/Reykjavik')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });

  it('marks an invalid zone for re-resolution instead of trusting it', () => {
    const state = readSharedState('?at=64.15,-21.94&tz=Not/A_Zone');
    expect(state.location.timeZone).toBeNull();
  });
});

describe('hostile links', () => {
  it('strips control characters and caps the name length', () => {
    const name = `Bad${String.fromCharCode(0)}Name${String.fromCharCode(7)}Here${'x'.repeat(200)}`;
    const state = readSharedState(`?at=0,0&n=${encodeURIComponent(name)}`);
    expect(state.location.name.startsWith('BadNameHere')).toBe(true);
    expect(state.location.name).toHaveLength(80);
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    expect(/[\u0000-\u001f\u007f]/.test(state.location.name)).toBe(false);
  });

  it('keeps markup as plain text for React to escape', () => {
    const state = readSharedState(`?at=0,0&n=${encodeURIComponent('<img src=x onerror=alert(1)>')}`);
    expect(typeof state.location.name).toBe('string');
    expect(state.location.name).toBe('<img src=x onerror=alert(1)>');
  });

  it('falls back to coordinates when the name is missing or empty', () => {
    expect(readSharedState('?at=64.15,-21.94').location.name).toBe('64.15°N, 21.94°W');
    expect(readSharedState('?at=64.15,-21.94&n=%20%20').location.name).toBe('64.15°N, 21.94°W');
  });

  it('drops a bad field without discarding the good ones', () => {
    const state = readSharedState('?d=garbage&at=64.15,-21.94&tz=Atlantic/Reykjavik');
    expect(state.date).toBeUndefined();
    expect(state.location.timeZone).toBe('Atlantic/Reykjavik');

    const noPlace = readSharedState('?d=2026-09-26T18:09Z&at=999,999');
    expect(noPlace.location).toBeUndefined();
    expect(noPlace.date.toISOString()).toBe('2026-09-26T18:09:00.000Z');
  });

  it('returns nothing for an empty or unrelated query', () => {
    expect(readSharedState('')).toEqual({});
    expect(readSharedState('?utm_source=newsletter&ref=abc')).toEqual({});
  });
});
