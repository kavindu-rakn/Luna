// How the viewer likes to read times and distances. These belong to the viewer,
// not to the view: they are remembered on this device but never put in a shared
// link, so a friend who opens your link sees your Moon in their own units.

export const CLOCKS = ['12h', '24h'];
export const DISTANCE_UNITS = ['km', 'mi'];

// Exact, by the 1959 international yard and pound agreement
export const KM_PER_MILE = 1.609344;

// Where distances are commonly given in miles
const MILE_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

const STORAGE_KEY = 'luna_preferences';

// The language and region the browser formats with by default, e.g. "en-GB"
const getDeviceLocale = () => {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en-US';
  }
};

// The clock a locale uses: 5:09 PM in en-US, 17:09 in en-GB
export const detectClock = (locale) => {
  try {
    const { hourCycle, hour12 } = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
    if (hourCycle) return hourCycle === 'h11' || hourCycle === 'h12' ? '12h' : '24h';
    return hour12 === false ? '24h' : '12h';
  } catch {
    return '12h';
  }
};

// Miles where people measure in them, kilometres everywhere else. A bare language
// tag expands to its likeliest region, so "en" is read as the United States.
export const detectDistanceUnit = (locale) => {
  try {
    return MILE_REGIONS.has(new Intl.Locale(locale).maximize().region) ? 'mi' : 'km';
  } catch {
    return 'km';
  }
};

export const getDefaultPreferences = (locale = getDeviceLocale()) => ({
  clock: detectClock(locale),
  distanceUnit: detectDistanceUnit(locale)
});

const readStored = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

// Only choices the viewer actually made are stored. Anything they never touched
// keeps following the device, so a later change to its settings still carries through.
export const loadPreferences = (locale) => {
  const defaults = getDefaultPreferences(locale);
  const stored = readStored();
  return {
    clock: CLOCKS.includes(stored.clock) ? stored.clock : defaults.clock,
    distanceUnit: DISTANCE_UNITS.includes(stored.distanceUnit) ? stored.distanceUnit : defaults.distanceUnit
  };
};

export const storePreference = (key, value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStored(), [key]: value }));
  } catch {
    // Ignore quota or access errors; the choice still applies for this visit
  }
};

export const convertDistance = (km, unit) => (unit === 'mi' ? km / KM_PER_MILE : km);

// Grouped the English way whatever the device's language. A bare toLocaleString()
// followed the browser, and put Eastern Arabic digits into an English sentence.
const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const formatDistance = (km, unit) => wholeNumber.format(convertDistance(km, unit));

// Rounded to thousands for scale labels: "357k km", "222k mi"
export const formatDistanceThousands = (km, unit) =>
  `${Math.round(convertDistance(km, unit) / 1000)}k ${unit}`;
