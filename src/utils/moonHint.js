// Whether the hint that the Moon turns has had its one showing on this device: the
// "Drag to rotate" beside the ring over the Moon, with a mouse, until the first turn
// (MoonScene), or the first-visit line on a touch screen, until the first touch
// (MoonLine)
const KEY = 'luna_moon_hint';

export const readMoonHintSeen = () => {
  try {
    return localStorage.getItem(KEY) === 'seen';
  } catch {
    return false;
  }
};

export const storeMoonHintSeen = () => {
  try {
    localStorage.setItem(KEY, 'seen');
  } catch {
    // Storage unavailable: it shows again next visit
  }
};
