// Everything to do with *where* the observer is. Astronomy lives in lunarCalc.js;
// this module only resolves places, timezones and what the viewer has saved.

import { listStoredKeys } from './storage';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const STORAGE_KEY = 'luna_location';
const SAVED_KEY = 'luna_saved_places';
// The name found for the last "Use my location", and only that one
const GEOCODE_KEY = 'luna_geo_last';
const LEGACY_GEOCODE_PREFIX = 'luna_geo_';

export const DEFAULT_LOCATION = {
  lat: 51.4769,
  lon: -0.0005,
  name: 'Greenwich, UK',
  timeZone: 'Europe/London'
};

// ── Timezone ─────────────────────────────────────────────────────────
// The lookup table is ~110 KB, so it is fetched on first use rather than shipped
// in the initial bundle. Resolving from coordinates rather than reading the
// device clock also means a viewer travelling with a laptop still set to home
// time gets the timezone of the place they are looking at, not the one they left.
let tzLookupPromise = null;

export const resolveTimeZone = async (lat, lon) => {
  try {
    tzLookupPromise = tzLookupPromise || import('tz-lookup');
    const { default: tzLookup } = await tzLookupPromise;
    return tzLookup(lat, lon);
  } catch {
    // Better a working app on the device's own zone than no app at all
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
};

// ── Precision ────────────────────────────────────────────────────────
// Two decimals, about a kilometre: plenty for astronomy, since rise and set times
// move by seconds over that distance, and too coarse to pick out a home. Rounding a
// small negative number keeps its sign, which would print as "-0.00"; normalise it.
export const roundCoordinate = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

// Every place Luna holds on to is rounded like this, whether it came from the
// browser's location, a search or an older version's storage
export const roundPlace = (place) => ({
  ...place,
  lat: roundCoordinate(place.lat),
  lon: roundCoordinate(place.lon)
});

// ── Formatting ───────────────────────────────────────────────────────
const coordinateName = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

// Nominatim returns a long comma-separated display_name; keep the useful head and
// the country, which is what actually identifies a place to a reader.
const shortenPlaceName = (result) => {
  const address = result.address || {};
  const locality =
    address.city || address.town || address.village || address.hamlet ||
    address.suburb || address.county || address.state || '';
  const country = address.country || '';

  if (locality && country) return `${locality}, ${country}`;
  if (country) return country;

  const parts = (result.display_name || '').split(',').map((p) => p.trim());
  if (parts.length >= 2) return `${parts[0]}, ${parts[parts.length - 1]}`;
  return parts[0] || coordinateName(Number(result.lat), Number(result.lon));
};

// ── Search ───────────────────────────────────────────────────────────
// Nominatim's usage policy caps this at one request per second and forbids bulk
// use, so callers must debounce and only search on a deliberate query. Attribution
// is shown in the picker.
export const searchPlaces = async (query, { signal } = {}) => {
  const trimmed = (query || '').trim();
  if (trimmed.length < 3) return [];

  const url = `${NOMINATIM}/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=6`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Place search failed (${response.status})`);

  const data = await response.json();
  return data.map((result) => ({
    id: `${result.osm_type || 'x'}-${result.osm_id || result.place_id}`,
    name: shortenPlaceName(result),
    detail: result.display_name || '',
    lat: Number(result.lat),
    lon: Number(result.lon)
  }));
};

// ── Reverse geocoding, for the viewer's own position ─────────────────
// Only the most recent lookup is remembered. This used to keep an entry for every
// place looked up, forever, which quietly built a history of where the viewer had been.
export const reverseGeocodeCached = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  try {
    const cached = JSON.parse(localStorage.getItem(GEOCODE_KEY));
    if (cached && cached.key === cacheKey && typeof cached.name === 'string') {
      return { name: cached.name, lat, lon };
    }
  } catch {
    // Ignore localStorage access errors
  }

  try {
    // Rounded before it leaves the device: two decimals is about a kilometre,
    // which is ample for naming a place and needlessly precise to hand out.
    const url = `${NOMINATIM}/reverse?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&format=json&zoom=10&addressdetails=1`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Geocoding request failed');

    const data = await response.json();
    const name = shortenPlaceName(data) || coordinateName(lat, lon);

    try {
      localStorage.setItem(GEOCODE_KEY, JSON.stringify({ key: cacheKey, name }));
    } catch {
      // Ignore quota or access errors
    }

    return { name, lat, lon };
  } catch {
    return { name: coordinateName(lat, lon), lat, lon };
  }
};

// A position from the browser, turned into a place. It is rounded the moment it
// arrives, so the exact position is never stored, sent or put in a link.
export const placeFromPosition = async ({ latitude, longitude }) => {
  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);
  const [place, timeZone] = await Promise.all([
    reverseGeocodeCached(lat, lon),
    resolveTimeZone(lat, lon)
  ]);
  return { lat, lon, name: place.name, timeZone };
};

// ── Persistence ──────────────────────────────────────────────────────
const isUsableLocation = (value) =>
  value &&
  Number.isFinite(value.lat) && Math.abs(value.lat) <= 90 &&
  Number.isFinite(value.lon) && Math.abs(value.lon) <= 180 &&
  typeof value.name === 'string' && typeof value.timeZone === 'string';

export const loadStoredLocation = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return isUsableLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const storeLocation = (location) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Ignore quota or access errors
  }
};

export const loadSavedPlaces = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY));
    return Array.isArray(parsed) ? parsed.filter(isUsableLocation) : [];
  } catch {
    return [];
  }
};

export const storeSavedPlaces = (places) => {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(places.slice(0, 12)));
  } catch {
    // Ignore quota or access errors
  }
};

// Two places are the same if they sit within about a kilometre of each other
// Run once at startup, before anything reads storage. Older versions kept a name for
// every place "Use my location" was pressed at, and the exact position it returned;
// the first goes and the second is rounded like everything else.
export const tidyStoredData = () => {
  for (const key of listStoredKeys(LEGACY_GEOCODE_PREFIX)) {
    if (key === GEOCODE_KEY) continue;
    try {
      localStorage.removeItem(key);
    } catch {
      return;
    }
  }

  const current = loadStoredLocation();
  if (current) storeLocation(roundPlace(current));
  const saved = loadSavedPlaces();
  if (saved.length) storeSavedPlaces(saved.map(roundPlace));
};

export const isSamePlace = (a, b) =>
  !!a && !!b && Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
