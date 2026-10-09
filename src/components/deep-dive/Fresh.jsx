import React, { useEffect, useRef } from 'react';

// How values change in Deep Dive (decision E6): at once while the date is moving,
// so a scrub reads cleanly; a change that comes on its own, a step or a jump, fades
// in briefly. Moving means another change within this long.
const SETTLED_MS = 250;

const Fresh = ({ value, className = '', children }) => {
  const ref = useRef(null);
  const lastChange = useRef(null);

  useEffect(() => {
    const now = performance.now();
    const previous = lastChange.current;
    lastChange.current = now;
    const element = ref.current;
    // Not on first showing, and not mid-scrub
    if (previous === null || !element) return;
    element.classList.remove('is-fresh');
    if (now - previous >= SETTLED_MS) {
      void element.offsetWidth;
      element.classList.add('is-fresh');
    }
  }, [value]);

  return (
    <span ref={ref} className={`dd-fresh${className ? ` ${className}` : ''}`}>
      {children ?? value}
    </span>
  );
};

export default Fresh;
