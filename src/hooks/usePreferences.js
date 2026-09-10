import { useState, useCallback } from 'react';
import { loadPreferences, storePreference } from '../utils/units';

// The viewer's clock and distance unit, starting from whatever their device uses
export const usePreferences = () => {
  const [preferences, setPreferences] = useState(() => loadPreferences());

  const setPreference = useCallback((key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    storePreference(key, value);
  }, []);

  return [preferences, setPreference];
};
