import { describe, it, expect, afterEach, vi } from 'vitest';
import { chooseTier } from '../src/scene/textures.js';

// A renderer whose GPU says what it is and how large a texture it takes
const rendererFor = (gpu, maxTexture = 16384) => ({
  getContext: () => ({
    RENDERER: 0x1f01,
    MAX_TEXTURE_SIZE: 0x0d33,
    getExtension: (name) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null),
    getParameter: (key) => (key === 0x9246 ? gpu : key === 0x0d33 ? maxTexture : 'WebGL')
  })
});

const DESKTOP_GPU = 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';
// A 1920×1200 screen at twice the density: the disc is well over 1,100 device pixels
const large = { width: 1900, height: 900, dpr: 2, route: 'worker' };
// A phone: the disc is about 300 CSS pixels at three times the density
const phone = { width: 380, height: 560, dpr: 3, route: 'worker' };

afterEach(() => vi.unstubAllGlobals());

describe('chooseTier', () => {
  it('gives a large screen with a capable GPU the 4K tier', () => {
    expect(chooseTier({ renderer: rendererFor(DESKTOP_GPU), ...large })).toBe('high');
  });

  it('keeps a phone-sized disc on 2K', () => {
    expect(chooseTier({ renderer: rendererFor('Apple GPU'), ...phone })).toBe('medium');
  });

  it('keeps 2K where the GPU cannot hold a 4K texture', () => {
    expect(chooseTier({ renderer: rendererFor(DESKTOP_GPU, 2048), ...large })).toBe('medium');
  });

  it('drops software rendering to the low tier, as PageSpeed and blocklisted GPUs use', () => {
    const swiftShader = 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)';
    expect(chooseTier({ renderer: rendererFor(swiftShader), ...large })).toBe('low');
    expect(chooseTier({ renderer: rendererFor('llvmpipe (LLVM 15.0.7, 256 bits)'), ...large })).toBe('low');
  });

  it('drops low-memory devices to the low tier', () => {
    vi.stubGlobal('navigator', { deviceMemory: 2 });
    expect(chooseTier({ renderer: rendererFor(DESKTOP_GPU), ...large })).toBe('low');
  });

  it('puts the main-thread route, the older iPhones, on the low tier', () => {
    expect(chooseTier({ renderer: rendererFor('Apple GPU'), ...large, route: 'main' })).toBe('low');
  });
});
