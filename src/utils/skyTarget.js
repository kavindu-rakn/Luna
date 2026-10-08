// What lies under the pointer, for the moonlight halo (the master prompt 5.6): it
// lights open sky and fades over controls, text and panels. The interface's
// empty space is sky; anything drawn on it isn't.
const NOT_SKY = [
  'button', 'a', 'input', 'select', 'textarea', 'label', 'dialog',
  '[role="slider"]', '[role="dialog"]',
  '.app-brand', '.date-controls', '.app-menu', '.timeline-dock', '.data-drawer',
  '.hero-phase-name', '.update-prompt', '.share-toast'
].join(', ');

export const isOpenSky = (target) => target instanceof Element && !target.closest(NOT_SKY);

// The drawn Moon's radius in its area, which spans the stage: the scene's own
// geometry, repeated so the page can tell synchronously where the Moon is
// (src/scene/scene.js sizes it the same way)
const OUTLINE_OF_HEIGHT = 0.92;
const OUTLINE_OF_WIDTH = 0.83;
export const moonRadius = (rect) => Math.min(OUTLINE_OF_HEIGHT * rect.height, OUTLINE_OF_WIDTH * rect.width) / 2;

// Clear of the Moon's limb by this much
const MOON_CLEARANCE = 32;

// Open sky away from the Moon too: where a flung meteor may fly
export const isEmptySky = (target, x, y) => {
  if (!isOpenSky(target)) return false;
  const area = document.querySelector('.moon-hit');
  if (!area) return true;
  const rect = area.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.hypot(x - cx, y - cy) > moonRadius(rect) + MOON_CLEARANCE;
};
