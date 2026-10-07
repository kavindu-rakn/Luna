import { useCallback, useEffect, useState } from 'react';

// "Tilt to look around" (decision G5): whether the phone's motion sensor moves the
// sky. It is on unless turned off, wherever the sensor can be read without a
// prompt. On an iPhone, which asks first, it starts only from its own control; no
// prompt ever appears on a first tap. The choice stays on this device, under
// luna_tilt.
const KEY = 'luna_tilt';

const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const write = (value) => {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Storage unavailable: the choice lasts this visit
  }
};

// Phones and tablets: a motion sensor is the only way to look around
export const tiltSupported = () => typeof window !== 'undefined'
  && typeof window.DeviceOrientationEvent !== 'undefined'
  && Boolean(window.matchMedia?.('(pointer: coarse)').matches);

const asksFirst = () => typeof window.DeviceOrientationEvent?.requestPermission === 'function';

export const useTilt = (enabled = true) => {
  const [supported] = useState(() => enabled && tiltSupported());
  const [on, setOn] = useState(() => supported && !asksFirst() && read() !== 'off');

  // Where the browser has a permission step, ask once without a tap: that never
  // shows a prompt. It succeeds where no prompt is needed (recent Chrome has the
  // step but grants it outright) or where it was granted before, and simply fails
  // on an iPhone that hasn't been asked yet.
  useEffect(() => {
    if (!supported || !asksFirst() || read() === 'off') return;
    window.DeviceOrientationEvent.requestPermission()
      .then((state) => { if (state === 'granted') setOn(true); })
      .catch(() => {});
  }, [supported]);

  const toggle = useCallback(() => {
    if (on) {
      setOn(false);
      write('off');
      return;
    }
    if (!asksFirst()) {
      setOn(true);
      write('on');
      return;
    }
    // Asked straight from the tap, as iOS insists
    window.DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state !== 'granted') return;
        setOn(true);
        write('on');
      })
      .catch(() => {});
  }, [on]);

  return { supported, on, toggle };
};
