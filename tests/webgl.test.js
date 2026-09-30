import { describe, it, expect } from 'vitest';
import { hasWebGLApi } from '../src/utils/webgl.js';

describe('hasWebGLApi', () => {
  it('accepts a browser with WebGL 2', () => {
    expect(hasWebGLApi({ WebGL2RenderingContext: function WebGL2RenderingContext() {} })).toBe(true);
  });

  it('accepts a browser with only WebGL 1', () => {
    expect(hasWebGLApi({ WebGLRenderingContext: function WebGLRenderingContext() {} })).toBe(true);
  });

  it('rejects a browser with no WebGL API', () => {
    expect(hasWebGLApi({})).toBe(false);
  });

  it('rejects the build-time prerender, which has no window', () => {
    expect(hasWebGLApi(undefined)).toBe(false);
    expect(hasWebGLApi(null)).toBe(false);
  });

  it('never creates a context to find out', () => {
    let created = false;
    const scope = {
      WebGLRenderingContext: function WebGLRenderingContext() { created = true; },
      document: { createElement: () => { created = true; return {}; } }
    };
    hasWebGLApi(scope);
    expect(created).toBe(false);
  });
});
