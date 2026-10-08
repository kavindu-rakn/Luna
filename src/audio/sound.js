import { useSyncExternalStore } from 'react';

// Sound (decision A7, the master prompt 4.4): off by default, turned on from the
// menu, the choice kept on this device under luna_sound. This small part loads
// with the page; the sounds themselves (./engine.js) load only once sound is first
// turned on. Browsers allow audio only from a press, so the AudioContext is made
// inside one: the Sound switch itself, or, when sound was left on last visit, the
// first press of this one. Nothing ever plays as the page loads.
const KEY = 'luna_sound';

// One action, one sound. A press can set off several cues at once (choosing a
// menu item closes the menu too; stepping a day out of "now" also leaves live
// mode), so cues raised together are gathered and only the most telling plays.
const CUES = {
  'sheet-open': ['open', 7],
  'sheet-close': ['close', 7],
  chime: ['chime', 6],
  meteor: ['meteor', 6],
  'switch-on': ['on', 5],
  'switch-off': ['off', 5],
  glass: ['glass', 4],
  'live-on': ['on', 3],
  'live-off': ['off', 3],
  felt: ['felt', 2],
  tick: ['tick', 1],
  hover: ['hover', 0]
};
// Ticks while scrubbing, at most this often
const TICK_GAP_MS = 35;
const HOVER_GAP_MS = 40;
// Controls that answer a hover with a faint tick, with a mouse only
const HOVER_SELECTOR = '.date-nav button, .menu-item';

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

const audioContextClass = () => (typeof window === 'undefined'
  ? null
  : window.AudioContext || window.webkitAudioContext || null);

export const soundSupported = () => Boolean(audioContextClass());

let on = soundSupported() && read() === 'on';
let ctx = null;
let engine = null;
let loading = null;
let lit = 0;
let pending = [];
let flushTimer = null;
let lastTickAt = 0;
let lastHoverAt = 0;
let suspendTimer = null;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

const running = () => Boolean(engine && ctx && ctx.state === 'running');

const loadEngine = () => {
  if (!loading) {
    loading = import('./engine.js').then(({ createEngine }) => {
      engine = createEngine(ctx);
      engine.setAmbientLevel(lit);
      return engine;
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
};

// Inside a press: make the context (or wake it), and the engine with it
const wake = () => {
  if (!on) return null;
  if (!ctx) {
    const AudioContextClass = audioContextClass();
    if (!AudioContextClass) return null;
    try {
      ctx = new AudioContextClass();
    } catch {
      return null;
    }
    // A sample of silence, played from the press, unlocks older iPhones
    const blank = ctx.createBufferSource();
    blank.buffer = ctx.createBuffer(1, 1, 22050);
    blank.connect(ctx.destination);
    blank.start(0);
  }
  clearTimeout(suspendTimer);
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return loadEngine().then((ready) => {
    // Turned off again while the sounds were arriving
    if (on) ready.startAmbient();
    else ctx.suspend().catch(() => {});
    return ready;
  });
};

// Of the cues raised together, the one that plays: the most telling, the first
// of equals
export const strongest = (cues) => {
  let best = null;
  for (const raised of cues) {
    if (CUES[raised.kind] && (!best || CUES[raised.kind][1] > CUES[best.kind][1])) best = raised;
  }
  return best;
};

const flush = () => {
  flushTimer = null;
  const cues = pending;
  pending = [];
  if (!running()) return;
  const best = strongest(cues);
  if (!best) return;
  const now = performance.now();
  if (best.kind === 'tick') {
    if (now - lastTickAt < TICK_GAP_MS) return;
    lastTickAt = now;
  }
  if (best.kind === 'hover') {
    if (now - lastHoverAt < HOVER_GAP_MS) return;
    lastHoverAt = now;
  }
  const [name] = CUES[best.kind];
  engine.play(name, best.kind === 'tick' ? lit : best.arg);
};

// Ask for a sound. Cues raised in the same moment are weighed together, so a
// press that does three things still makes one sound.
export const cue = (kind, arg) => {
  if (!on || !CUES[kind] || !running()) return;
  pending.push({ kind, arg });
  if (!flushTimer) flushTimer = setTimeout(flush, 0);
};

// How much of the Moon is lit on the date being looked at (0…1): the day ticks
// are pitched by it, and the ambient bed brightens toward Full
export const setIllumination = (value) => {
  lit = value;
  engine?.setAmbientLevel(value);
};

export const isSoundOn = () => on;

// The Sound switch. Called inside its press, so the context can start.
export const toggleSound = () => {
  if (!soundSupported()) return;
  on = !on;
  write(on ? 'on' : 'off');
  notify();
  if (on) {
    wake()?.then((ready) => { if (on) ready.play('on'); });
    return;
  }
  if (!engine) return;
  engine.play('off');
  engine.stopAmbient();
  // Let the switch and the bed's fade finish, then let the device rest
  clearTimeout(suspendTimer);
  suspendTimer = setTimeout(() => { if (!on) ctx?.suspend().catch(() => {}); }, 1500);
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSound = () => ({
  on: useSyncExternalStore(subscribe, isSoundOn, () => false),
  supported: soundSupported(),
  toggle: toggleSound
});

// Listens for presses: one wakes the sound when it was left on last visit, and
// controls marked data-sound="…" play that cue. Hovering the date bar or a menu
// item with a mouse makes the faintest tick. The sound rests while the page is
// hidden.
export const installSound = (doc = document) => {
  const onPress = () => {
    if (on && (!ctx || ctx.state !== 'running')) wake();
  };
  const onClick = (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-sound]') : null;
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    cue(control.dataset.sound);
  };
  const onOver = (event) => {
    if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) return;
    const control = event.target.closest(HOVER_SELECTOR);
    // Entering the control, not moving between its own parts
    if (!control || control.disabled || (event.relatedTarget instanceof Node && control.contains(event.relatedTarget))) return;
    cue('hover');
  };
  const onVisibility = () => {
    if (!ctx) return;
    if (doc.hidden) ctx.suspend().catch(() => {});
    else if (on) ctx.resume().catch(() => {});
  };
  doc.addEventListener('pointerdown', onPress, { capture: true, passive: true });
  doc.addEventListener('keydown', onPress, { capture: true });
  doc.addEventListener('click', onClick, { capture: true });
  doc.addEventListener('pointerover', onOver, { passive: true });
  doc.addEventListener('visibilitychange', onVisibility);
  return () => {
    doc.removeEventListener('pointerdown', onPress, { capture: true });
    doc.removeEventListener('keydown', onPress, { capture: true });
    doc.removeEventListener('click', onClick, { capture: true });
    doc.removeEventListener('pointerover', onOver);
    doc.removeEventListener('visibilitychange', onVisibility);
  };
};
