// The scene's own thread. three.js parses, compiles its shaders and draws here, so
// none of it holds up the page. Messages in are the scene's methods; events go
// back as { type }. If this thread can't get a WebGL 2 context (Safari before 17,
// for one, has OffscreenCanvas without WebGL), it says 'fallback' and the page
// runs the same scene itself.

import { createScene } from './scene.js';

let scene = null;
let starting = false;
// Messages that arrive while the scene is still starting: only the latest of each
// kind matters
const pending = new Map();

const emit = (type, data = {}) => self.postMessage({ type, ...data });

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    if (starting || scene) return;
    starting = true;
    try {
      scene = await createScene(data.canvas, { ...data, emit });
    } catch (error) {
      emit('fallback', { reason: String(error?.message || error) });
      return;
    }
    for (const [type, message] of pending) scene[type]?.(message);
    pending.clear();
    return;
  }
  if (!scene) {
    // Pointer moves only make sense live
    if (data.type !== 'pointer') pending.set(data.type, data);
    return;
  }
  scene[data.type]?.(data);
};
