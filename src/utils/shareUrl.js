// The observing state, carried in the query string so that a link is a view.
//
//   ?d=2026-09-26T16:50Z&at=64.15,-21.94&n=Reykjavik,+Iceland&tz=Atlantic/Reykjavik
//
//   d   the selected instant, minute precision, UTC. Omitted while the view is
//       live, so a bookmark keeps showing tonight's Moon rather than freezing on
//       the moment it was saved. A bare day (2026-09-26) is read as local noon.
//   at  latitude,longitude, rounded to two decimals (about a kilometre)
//   n   place name, display only
//   tz  IANA timezone; re-derived from the coordinates if missing or invalid
//
// Everything here is untrusted input. It arrives in a link someone else wrote.

import { getNoonInZone } from './lunarCalc';

const MAX_NAME_LENGTH = 80;

// Meeus' periodic series are fitted around J2000. Far from the present they still
// compute, just not usefully, so anything outside a generous window is refused.
const MIN_YEAR = 1000;
const MAX_YEAR = 3000;

export const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

const isValidInstant = (date) =>
  date instanceof Date &&
  !isNaN(date.getTime()) &&
  date.getUTCFullYear() >= MIN_YEAR &&
  date.getUTCFullYear() <= MAX_YEAR;

// Control characters have no business in a place name, and a cap keeps a hostile
// link from pushing the header layout around. React escapes what remains.
const cleanName = (value) => {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_NAME_LENGTH);
};

const coordinateName = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

export const formatSharedDate = (date) => `${date.toISOString().slice(0, 16)}Z`;

// Two decimals, about a kilometre. Rounding a small negative number keeps its sign,
// so Greenwich (-0.0005) would otherwise serialise as "-0.00", which is exactly the
// URL every first-time visitor lands on.
const formatCoordinate = (value) => {
  const rounded = Math.round(value * 100) / 100;
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(2);
};

export const parseSharedDate = (value, timeZone = 'UTC') => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  // A bare day means "that day", so land on local noon at the observing location
  // rather than on UTC midnight, which is the previous evening for half the world.
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dayOnly) {
    const [, y, m, d] = dayOnly.map(Number);
    const probe = new Date(Date.UTC(y, m - 1, d, 12));
    // Reject impossible days that Date would silently roll over, like 2026-02-31
    if (probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
    const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
    // Noon on that date on the place's own clock. Reading the date off UTC noon
    // first, as this used to, gave the next day wherever clocks run more than
    // 12 hours ahead of UTC: a Christmas link for Auckland opened on Boxing Day.
    const noon = getNoonInZone(y, m - 1, d, zone);
    return isValidInstant(noon) ? noon : null;
  }

  // Otherwise insist on an explicit instant, so "2026-09-26 18:09" is not read
  // silently in whatever timezone the viewer's device happens to be in
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(trimmed)) return null;
  const instant = new Date(trimmed);
  return isValidInstant(instant) ? instant : null;
};

export const parseSharedCoordinates = (value) => {
  if (typeof value !== 'string') return null;
  const parts = value.split(',').map((part) => part.trim());
  // Number('') is 0, not NaN, so an empty half would silently become the equator
  // or the prime meridian and a link like ?at=, would land on 0,0 in the Atlantic
  if (parts.length !== 2 || parts.some((part) => part === '')) return null;
  const [lat, lon] = parts.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
};

/**
 * Read the observing state from a query string. Every field is validated on its
 * own; a malformed field is dropped rather than failing the whole link.
 * A location's timeZone is null when it still needs resolving from coordinates.
 */
export const readSharedState = (search = typeof window !== 'undefined' ? window.location.search : '') => {
  const params = new URLSearchParams(search);
  const state = {};

  const coordinates = parseSharedCoordinates(params.get('at'));
  if (coordinates) {
    const timeZone = params.get('tz');
    state.location = {
      lat: coordinates.lat,
      lon: coordinates.lon,
      name: cleanName(params.get('n')) || coordinateName(coordinates.lat, coordinates.lon),
      timeZone: isValidTimeZone(timeZone) ? timeZone : null
    };
  }

  const rawDate = params.get('d');
  if (rawDate) {
    const date = parseSharedDate(rawDate, state.location?.timeZone || 'UTC');
    if (date) state.date = date;
  }

  return state;
};

/**
 * Build the query string for a view. Pass date as null for a live view.
 */
export const buildSharedSearch = (date, location) => {
  const params = new URLSearchParams();
  if (date && isValidInstant(date)) params.set('d', formatSharedDate(date));
  if (location && Number.isFinite(location.lat) && Number.isFinite(location.lon)) {
    params.set('at', `${formatCoordinate(location.lat)},${formatCoordinate(location.lon)}`);
    const name = cleanName(location.name);
    if (name) params.set('n', name);
    if (isValidTimeZone(location.timeZone)) params.set('tz', location.timeZone);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

/**
 * An absolute link to exactly this view. Sharing always pins the instant: a
 * link sent to someone is a snapshot of what the sender was looking at.
 */
export const buildShareUrl = (date, location, base = window.location) =>
  `${base.origin}${base.pathname}${buildSharedSearch(date, location)}`;
