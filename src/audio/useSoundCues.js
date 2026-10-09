import { useEffect, useRef } from 'react';
import { cue, isSoundOn, setIllumination } from './sound';
import { dateCue, dayKey } from './cues';
import { getIlluminatedFraction, getMoonPhaseFraction, getZonedDay } from '../utils/lunarCalc';

const describe = (date, timeZone) => {
  let day;
  try {
    day = dayKey(getZonedDay(date, timeZone));
  } catch {
    day = String(Math.floor(date.getTime() / 86400000));
  }
  return { ms: date.getTime(), phase: getMoonPhaseFraction(date), day };
};

// Sounds that follow what the view does rather than which control did it: the
// date (day ticks, phase chimes, leaving and returning to now) and Deep Dive
// opening and closing. Whatever moved the date, a button, a key or the timeline, it
// sounds the same. The overlays sound for themselves (Overlay.jsx).
export const useSoundCues = ({ date, isLive, timeZone, drawerOpen }) => {
  const last = useRef(null);

  useEffect(() => {
    const previous = last.current;
    last.current = { date, isLive, timeZone, drawerOpen, view: null };
    if (!isSoundOn()) return;
    const view = describe(date, timeZone);
    last.current.view = view;
    setIllumination(getIlluminatedFraction(date));
    if (!previous) return;

    if (previous.drawerOpen !== drawerOpen) cue(drawerOpen ? 'sheet-open' : 'sheet-close');

    if (previous.isLive !== isLive) cue(isLive ? 'live-on' : 'live-off');
    // The clock moving on while live is not something to hear
    if (!isLive && previous.date !== date) {
      const sound = dateCue(previous.view ?? describe(previous.date, previous.timeZone), view);
      if (sound) cue(sound.kind, sound.index);
    }
  });
};
