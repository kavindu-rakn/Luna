import { useEffect, useState } from 'react';

const matches = (query) => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);

// Whether a media query matches, kept up to date as the window changes
export const useMedia = (query) => {
  const [match, setMatch] = useState(() => matches(query));
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = () => setMatch(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return match;
};

// Where the overlays become sheets rising from the bottom (decision E9): phones held
// upright. Wider than this, they hang from the control that opened them.
export const PHONE_OVERLAYS = '(max-width: 639px)';
