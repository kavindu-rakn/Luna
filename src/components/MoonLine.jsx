import React, { useEffect, useState } from 'react';
import { readMoonHintSeen, storeMoonHintSeen } from '../utils/moonHint';

// How long after the page settles the line fades in, beside the timeline's nudge
const SHOW_AFTER_MS = 600;

// The first-visit line (decision I2, as settled in chat on 11 Oct 2026): on a touch
// screen, where nothing else says so, one quiet line under the phase name says the
// Moon turns. It fades in once the page has settled and leaves at the first touch
// or key anywhere, and never shows again on this device. With a mouse the ring
// over the Moon says "Drag to rotate" instead (MoonScene), and the timeline's
// nudge teaches the scrub everywhere (H1).
//
// It hangs under the phase name from inside its button, out of the stage's flow:
// on phones the stage spaces its items evenly, so even an empty extra item would
// move the Moon. Hidden from screen readers, and so from the button's name:
// turning the Moon is exploration, and everything it shows is also available as
// text. A <small>, not a <span>, which the phase name's own styles would claim.
const MoonLine = ({ enabled, settled }) => {
  const [seen] = useState(readMoonHintSeen);
  const [touched, setTouched] = useState(false);
  const [shown, setShown] = useState(false);
  const [gone, setGone] = useState(false);
  const active = enabled && !seen;

  // The first touch or key, before the line shows or after, is its last
  useEffect(() => {
    if (!active) return undefined;
    const done = () => {
      storeMoonHintSeen();
      setTouched(true);
    };
    const options = { capture: true, once: true };
    window.addEventListener('pointerdown', done, options);
    window.addEventListener('keydown', done, options);
    return () => {
      window.removeEventListener('pointerdown', done, options);
      window.removeEventListener('keydown', done, options);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !settled || touched) return undefined;
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [active, settled, touched]);

  if (!active || gone || (touched && !shown)) return null;

  return (
    <small
      className={`moon-line${shown && !touched ? ' is-shown' : ''}`}
      aria-hidden="true"
      onTransitionEnd={() => {
        if (touched) setGone(true);
      }}
    >
      Drag to turn the Moon
    </small>
  );
};

export default MoonLine;
