// The Moon's textures (built by scripts/textures/build.mjs from NASA's CGI Moon
// Kit), and the quality tier that decides which ones a device loads.
//
// KTX2 in the scene's worker: GPU-compressed, so a 2K colour map takes about a
// quarter of the video memory an image would, and nothing has to be decoded on the
// way in. On the main thread, plain images: three.js's Basis transcoder evaluates
// code as it starts, which the page's security policy rightly forbids, and its
// workers inherit that policy there (the scene's worker has none of its own). And
// wherever KTX2 fails or stalls, plain images take over.

import { LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, Texture } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const FILES = {
  'color-2k': { ktx2: 'moon-color-2k.ktx2', image: 'moon-color-2k.jpg', colorSpace: SRGBColorSpace },
  'color-4k': { ktx2: 'moon-color-4k.ktx2', colorSpace: SRGBColorSpace },
  // The KTX2 relief is packed: east-west in the colour channels, north-south in
  // alpha (see scripts/textures/build.mjs)
  'normal-2k': { ktx2: 'moon-normal-2k.ktx2', image: 'moon-normal-2k.jpg', colorSpace: NoColorSpace, packed: true }
};

const ANISOTROPY = 8;
// A transcoder that can't start never answers; give up on it after this long
const KTX2_PATIENCE_MS = 8000;

const fromImage = async (url, colorSpace) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  // As stored: a normal map's values are directions, not colours to manage
  const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const texture = new Texture(bitmap);
  texture.colorSpace = colorSpace;
  // Row 0 is the north pole, at v = 0 on the sphere; image bitmaps upload top row first
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = ANISOTROPY;
  texture.needsUpdate = true;
  return texture;
};

export const createTextureLoader = ({ base, renderer, ktx2: useKTX2 = true }) => {
  let ktx2 = null;
  let ktx2Broken = !useKTX2;

  const fromKTX2 = async (url) => {
    ktx2 ??= new KTX2Loader().detectSupport(renderer);
    let timer;
    const stalled = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('KTX2 transcoder stalled')), KTX2_PATIENCE_MS);
    });
    try {
      const texture = await Promise.race([ktx2.loadAsync(url), stalled]);
      texture.anisotropy = ANISOTROPY;
      return texture;
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    async load(name) {
      const file = FILES[name];
      if (file.ktx2 && !ktx2Broken) {
        try {
          const texture = await fromKTX2(base + file.ktx2);
          texture.userData.packed = Boolean(file.packed);
          return texture;
        } catch (error) {
          if (!file.image) throw error;
          // Once refused, it will be refused again
          ktx2Broken = true;
        }
      }
      return fromImage(base + file.image, file.colorSpace);
    },
    canLoad: (name) => Boolean(FILES[name].image) || !ktx2Broken,
    dispose() {
      ktx2?.dispose();
    }
  };
};

// Quality tiers (the master prompt, 4.2):
//   high    4K colour once the 2K one is up, device pixel ratio up to 2
//   medium  2K colour, ratio up to 2
//   low     2K colour, ratio 1.5: software rendering, low-memory devices, and the
//           older iPhones, which reach the scene on the main thread because their
//           Safari can't draw WebGL in a worker
// Every tier gets the normal map: the colour map is albedo only, so without it a
// crescent would show no craters at all.
export const chooseTier = ({ renderer, width, height, dpr, route }) => {
  const gl = renderer.getContext();
  let gpu = '';
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  } catch {
    // Unknown GPU: decide on the rest
  }
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);
  const memory = typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined;
  const lowMemory = typeof memory === 'number' && memory < 4;
  if (software || lowMemory || route === 'main') return 'low';

  // 2K shows 1,024 texels across the near side, so it stays sharp until the disc
  // is about that many device pixels wide
  const disc = Math.min(0.92 * height, 0.83 * width) * Math.min(dpr || 1, 2);
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  return disc > 1100 && maxTexture >= 4096 ? 'high' : 'medium';
};

export const PIXEL_RATIO_CAP = { high: 2, medium: 2, low: 1.5 };
