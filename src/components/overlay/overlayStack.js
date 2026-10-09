// The overlays that are open, oldest first (the master prompt 6.7). Esc and a press
// outside close the top one only, so a dialog opened from a popover closes back to
// the popover, and the popover back to the page.
const stack = [];

const onPressOutside = (event) => {
  const top = stack[stack.length - 1];
  // A modal overlay's own scrim takes the press; the page behind it is inert
  if (!top || top.modal) return;
  if (top.contains(event.target)) return;
  top.close();
};

// entry: { close(), modal, contains(target) }. Returns the way to take it off again.
export const pushOverlay = (entry) => {
  if (stack.length === 0 && typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onPressOutside, true);
  }
  stack.push(entry);
  return () => {
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    if (stack.length === 0 && typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', onPressOutside, true);
    }
  };
};

export const topOverlay = () => stack[stack.length - 1] ?? null;

// Closes the top overlay, if there is one, and says whether there was
export const closeTopOverlay = () => {
  const top = topOverlay();
  if (!top) return false;
  top.close();
  return true;
};

// Whether the page behind is shut off, so its keyboard shortcuts must wait
export const isModalOpen = () => stack.some((entry) => entry.modal);

// For tests
export const pressOutside = onPressOutside;
