import { describe, it, expect, vi, afterEach } from 'vitest';
import { startIntro } from '../src/shell/intro';

// Enough of a window and a document for the head's intro script
const page = ({ played = null, reduced = false, storage = true } = {}) => {
  const listeners = new Map();
  const classes = new Set();
  const store = new Map(played ? [['luna_intro', played]] : []);
  const win = {
    sessionStorage: storage
      ? { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) }
      : { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } },
    matchMedia: () => ({ matches: reduced }),
    performance: { now: () => 123 },
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
    setTimeout: vi.fn()
  };
  const doc = {
    documentElement: { classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) } },
    getAnimations: () => []
  };
  return { win, doc, classes, listeners, store };
};

afterEach(() => vi.restoreAllMocks());

describe('the intro (I1)', () => {
  it('plays on the first page of a session, and remembers it for the session', () => {
    const { win, doc, classes, store } = page();
    expect(startIntro(win, doc)).toBe(true);
    expect(classes.has('is-intro')).toBe(true);
    expect(store.get('luna_intro')).toBe('played');
    expect(win.__lunaIntro).toBe(123);
  });

  it('does not play again in the same session', () => {
    const { win, doc, classes } = page({ played: 'played' });
    expect(startIntro(win, doc)).toBe(false);
    expect(classes.size).toBe(0);
  });

  it('does not play under reduced motion, or without session storage', () => {
    for (const options of [{ reduced: true }, { storage: false }]) {
      const { win, doc, classes } = page(options);
      expect(startIntro(win, doc)).toBe(false);
      expect(classes.size).toBe(0);
    }
  });

  it('is skipped by any press, key or wheel', () => {
    for (const type of ['pointerdown', 'keydown', 'wheel']) {
      const { win, doc, classes, listeners } = page();
      startIntro(win, doc);
      listeners.get(type)();
      expect(classes.has('is-intro')).toBe(false);
      expect(listeners.size).toBe(0);
    }
  });

  it('ends when its last animation does', async () => {
    const { win, doc, classes } = page();
    let finish;
    const running = { animationName: 'intro-rise', finished: new Promise((resolve) => { finish = resolve; }) };
    doc.getAnimations = () => [running, { animationName: 'pulse-ring', finished: new Promise(() => {}) }];
    startIntro(win, doc);
    const [check, delay] = win.setTimeout.mock.calls[0];
    expect(delay).toBe(1200);
    check();
    await Promise.resolve();
    expect(classes.has('is-intro')).toBe(true);
    finish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(classes.has('is-intro')).toBe(false);
  });
});
