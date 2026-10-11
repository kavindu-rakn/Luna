import { describe, it, expect, afterEach, vi } from 'vitest';
import { guessPlace } from '../src/shell/guessPlace';
import { ZONES } from '../src/shell/zones';
import { loadGuessedLocation, keptPlace } from '../src/utils/location';

const guess = (zone) => guessPlace(ZONES, zone);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the first place, guessed from the time zone (I3)', () => {
  it('names the city the zone is named after, with its country', () => {
    expect(guess('Asia/Colombo')).toEqual({
      name: 'Colombo, Sri Lanka', lat: 6.9, lon: 79.9, timeZone: 'Asia/Colombo', guess: true
    });
    expect(guess('America/Indiana/Indianapolis').name).toBe('Indianapolis, United States');
    expect(guess('Australia/Sydney')).toMatchObject({ lat: -33.9, lon: 151.2 });
  });

  it('keeps each country its own city, where zones agree across a border', () => {
    // In zone1970.tab, Stockholm is Berlin's zone
    expect(guess('Europe/Stockholm').name).toBe('Stockholm, Sweden');
    expect(guess('Europe/Oslo').name).toBe('Oslo, Norway');
  });

  it('finds the old names browsers report, by the city as it is named now', () => {
    expect(guess('Asia/Calcutta')).toMatchObject({ name: 'Kolkata, India', timeZone: 'Asia/Calcutta' });
    expect(guess('Europe/Kiev').name).toBe('Kyiv, Ukraine');
    expect(guess('Asia/Saigon').name).toBe('Ho Chi Minh City, Vietnam');
    expect(guess('America/Buenos_Aires').name).toBe('Buenos Aires, Argentina');
    // Linked to Nairobi's zone, but in Eritrea
    expect(guess('Africa/Asmera').name).toBe('Asmara, Eritrea');
  });

  it('finds a place for every zone this browser knows that names one', () => {
    const missed = Intl.supportedValuesOf('timeZone')
      .filter((zone) => zone.includes('/') && !zone.startsWith('Etc/'))
      .filter((zone) => {
        const place = guess(zone);
        return !place || !place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lon);
      });
    expect(missed).toEqual([]);
  });

  it('spells places as they are written, and does not repeat a name', () => {
    expect(guess('America/Sao_Paulo').name).toBe('São Paulo, Brazil');
    expect(guess('Asia/Singapore').name).toBe('Singapore');
    expect(guess('Asia/Hong_Kong').name).toBe('Hong Kong');
    expect(guess('Atlantic/Faroe').name).toBe('Faroe Islands');
    expect(guess('Indian/Reunion').name).toBe('Réunion');
    expect(guess('America/Mexico_City').name).toBe('Mexico City, Mexico');
  });

  it('guesses nothing for a zone that names no place', () => {
    for (const zone of ['UTC', 'Etc/UTC', 'Etc/GMT+5', 'GMT', 'CET', 'EST5EDT', 'US/Eastern', 'Nowhere/Atlantis']) {
      expect(guess(zone)).toBeNull();
    }
  });

  it('reads the zone from the device, and gives up quietly if it cannot', () => {
    const real = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(guessPlace(ZONES)?.timeZone ?? null).toBe(guess(real)?.timeZone ?? null);

    vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: () => { throw new Error('no Intl'); } });
    expect(guessPlace(ZONES)).toBeNull();
  });

  it('names the city alone where the browser cannot name countries', () => {
    vi.stubGlobal('Intl', { ...Intl, DisplayNames: undefined });
    expect(guess('Asia/Colombo').name).toBe('Colombo');
    // Its own names for countries still apply
    expect(guess('Asia/Hong_Kong').name).toBe('Hong Kong');
  });
});

describe('the app starts from the guess', () => {
  it('takes the guess the page left, marked as one', () => {
    vi.stubGlobal('window', { __lunaGuess: guess('Asia/Colombo') });
    expect(loadGuessedLocation()).toEqual({
      lat: 6.9, lon: 79.9, name: 'Colombo, Sri Lanka', timeZone: 'Asia/Colombo', guess: true
    });
  });

  it('ignores a missing or broken guess', () => {
    expect(loadGuessedLocation()).toBeNull();
    vi.stubGlobal('window', {});
    expect(loadGuessedLocation()).toBeNull();
    vi.stubGlobal('window', { __lunaGuess: { name: 'Colombo', lat: 'x' } });
    expect(loadGuessedLocation()).toBeNull();
  });

  it('keeps a picked or starred place without the mark', () => {
    expect(keptPlace(guess('Asia/Colombo'))).toEqual({
      lat: 6.9, lon: 79.9, name: 'Colombo, Sri Lanka', timeZone: 'Asia/Colombo'
    });
  });
});
