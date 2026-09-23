import { describe, it, expect, vi } from 'vitest';
import { canCreateWebGL } from '../src/utils/webgl.js';

// A canvas whose getContext answers from a table, as a browser would per context type
const fakeCanvas = (contexts) => ({
  getContext: vi.fn((type) => contexts[type] ?? null)
});

describe('canCreateWebGL', () => {
  it('accepts WebGL 2', () => {
    const loseContext = vi.fn();
    const gl = { getExtension: () => ({ loseContext }) };
    expect(canCreateWebGL(() => fakeCanvas({ webgl2: gl }))).toBe(true);
  });

  it('falls back to WebGL 1 when WebGL 2 is missing', () => {
    const gl = { getExtension: () => null };
    const canvas = fakeCanvas({ webgl: gl });
    expect(canCreateWebGL(() => canvas)).toBe(true);
    expect(canvas.getContext).toHaveBeenCalledWith('webgl');
  });

  it('releases the probe context so it does not count against the browser limit', () => {
    const loseContext = vi.fn();
    const gl = { getExtension: (name) => (name === 'WEBGL_lose_context' ? { loseContext } : null) };
    canCreateWebGL(() => fakeCanvas({ webgl2: gl }));
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it('rejects a browser with WebGL disabled', () => {
    expect(canCreateWebGL(() => fakeCanvas({}))).toBe(false);
  });

  it('rejects rather than throws when probing fails', () => {
    const canvas = { getContext: () => { throw new Error('blocked'); } };
    expect(canCreateWebGL(() => canvas)).toBe(false);
  });
});
