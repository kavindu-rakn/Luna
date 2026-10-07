import { useEffect, useState } from 'react';

// Idle fade (decision D3): after a few seconds with no input, the header, the date
// block and the timeline fade away and leave the Moon and the sky. Any pointer
// move, tap, scroll or key brings them back. Never while a panel is open (blocked),
// and never while something has keyboard focus or a text field is in use: fading
// what someone is working with would lose their place. Faded controls stay in the
// accessibility tree; only their look and their clicks are switched off.
const IDLE_MS = 4000;
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'];

const holdsFocus = () => {
  const active = document.activeElement;
  if (!active || active === document.body) return false;
  if (active.matches('input, textarea, select, [contenteditable="true"]')) return true;
  try {
    return active.matches(':focus-visible');
  } catch {
    return false;
  }
};

export const useIdle = ({ enabled = true, blocked = false } = {}) => {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled || blocked) return undefined;
    let timer = null;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(function check() {
        // Focus can arrive without an event this hook hears (a script moving it)
        if (holdsFocus()) {
          timer = setTimeout(check, IDLE_MS);
          return;
        }
        setIdle(true);
      }, IDLE_MS);
    };
    const wake = () => {
      setIdle(false);
      arm();
    };
    for (const type of WAKE_EVENTS) window.addEventListener(type, wake, { passive: true, capture: true });
    arm();
    return () => {
      clearTimeout(timer);
      for (const type of WAKE_EVENTS) window.removeEventListener(type, wake, { capture: true });
      setIdle(false);
    };
  }, [enabled, blocked]);

  return idle && enabled && !blocked;
};
