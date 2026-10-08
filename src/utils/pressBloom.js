// The light bloom on a pressed control (decision D7): a soft radial light that
// starts where the finger or pointer came down and fades as it spreads. The look
// is CSS (.is-blooming in index.css); this only says where the press landed and
// restarts the animation. A key press blooms from the middle.

export const BLOOM_SELECTOR = '.glass-button, .ghost-control-btn, .date-display-btn, .date-place, .menu-item, .calendar-day, .location-row, .calendar-phase';

const bloom = (control, x, y) => {
  if (!control || control.disabled) return;
  control.style.setProperty('--press-x', `${x}px`);
  control.style.setProperty('--press-y', `${y}px`);
  // Taking the class off and reading layout restarts an animation already running
  control.classList.remove('is-blooming');
  void control.offsetWidth;
  control.classList.add('is-blooming');
};

export const installPressBloom = (doc = document) => {
  const onPointerDown = (event) => {
    if (event.button > 0) return;
    const control = event.target instanceof Element ? event.target.closest(BLOOM_SELECTOR) : null;
    if (!control) return;
    const rect = control.getBoundingClientRect();
    bloom(control, event.clientX - rect.left, event.clientY - rect.top);
  };
  const onKeyDown = (event) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) return;
    const control = event.target instanceof Element ? event.target.closest(BLOOM_SELECTOR) : null;
    if (!control || control !== event.target) return;
    bloom(control, control.offsetWidth / 2, control.offsetHeight / 2);
  };
  const onAnimationEnd = (event) => {
    if (event.animationName === 'press-bloom') event.target.classList.remove('is-blooming');
  };
  doc.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
  doc.addEventListener('keydown', onKeyDown, { capture: true });
  doc.addEventListener('animationend', onAnimationEnd);
  return () => {
    doc.removeEventListener('pointerdown', onPointerDown, { capture: true });
    doc.removeEventListener('keydown', onKeyDown, { capture: true });
    doc.removeEventListener('animationend', onAnimationEnd);
  };
};
