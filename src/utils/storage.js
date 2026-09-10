// Everything Luna keeps in this browser's storage lives under keys beginning luna_:
// the chosen place, saved places, clock and distance settings, and the name of the
// last place found with "Use my location". Nothing else is written, and none of it
// leaves the device.
export const STORAGE_PREFIX = 'luna_';

// Keys in storage that begin with a prefix. Collected before anything is removed,
// since removing while walking the indices would skip entries.
export const listStoredKeys = (prefix = STORAGE_PREFIX) => {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
};

// "Forget places and settings": remove all of it. Returns how many entries went.
export const forgetStoredData = () => {
  const keys = listStoredKeys();
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage became unavailable; the rest cannot be removed either
      return 0;
    }
  }
  return keys.length;
};
