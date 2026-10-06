// Starts the 3D Moon for a page canvas, off the main thread where the browser can.
//
// Where a canvas can hand its drawing to a worker (transferControlToOffscreen), the
// scene runs in a module worker and the page only forwards messages. If the
// worker can't get WebGL there, or can't start at all, it falls back: a canvas
// that has been transferred can't be drawn on again, so the page swaps in a fresh
// one (replaceCanvas) and runs the same scene module itself. If that fails too,
// 'fallback' reaches the page and the flat Moon stays. Features are detected,
// never browser versions.

export const startScene = ({ canvas, width, height, dpr, reducedMotion, textureUrl, view, onEvent, replaceCanvas }) => {
  let disposed = false;
  let worker = null;
  let scene = null;
  let route = null;
  // Where messages go once a scene is starting or running. Until then only the
  // latest view and size are kept, and the scene starts from them.
  let deliver = null;
  const state = { width, height, dpr, reducedMotion, textureUrl, view };

  const send = (type, data = {}) => {
    if (type === 'setView') state.view = data.view;
    else if (type === 'resize') Object.assign(state, data);
    else if (type === 'setReducedMotion') state.reducedMotion = data.reducedMotion;
    deliver?.(type, data);
  };

  const onMainThread = async (target) => {
    route = 'main';
    try {
      const { createScene } = await import('./scene.js');
      if (disposed) return;
      const started = await createScene(target, { ...state, emit: onEvent });
      if (disposed) {
        started.dispose();
        return;
      }
      scene = started;
      deliver = (type, data) => scene[type]?.(data);
    } catch (error) {
      if (!disposed) onEvent('fallback', { reason: String(error?.message || error) });
    }
  };

  const fallBack = async () => {
    if (!worker) return;
    worker.terminate();
    worker = null;
    deliver = null;
    if (disposed) return;
    const fresh = await replaceCanvas();
    if (!disposed && fresh) onMainThread(fresh);
  };

  if (typeof Worker !== 'undefined' && typeof canvas.transferControlToOffscreen === 'function') {
    route = 'worker';
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      const offscreen = canvas.transferControlToOffscreen();
      worker.onmessage = ({ data }) => {
        if (data.type === 'fallback') fallBack();
        else onEvent(data.type, data);
      };
      // A worker that can't load (no module workers, a blocked script) errors here
      worker.onerror = (event) => {
        event.preventDefault?.();
        fallBack();
      };
      worker.postMessage({ type: 'init', canvas: offscreen, ...state }, [offscreen]);
      // The worker holds anything sent while its scene starts
      deliver = (type, data) => worker?.postMessage({ type, ...data });
    } catch {
      // Transferring failed before anything was drawn on the canvas, so it is
      // still usable here
      worker?.terminate();
      worker = null;
      onMainThread(canvas);
    }
  } else {
    onMainThread(canvas);
  }

  return {
    get route() {
      return route;
    },
    send,
    dispose() {
      disposed = true;
      deliver = null;
      worker?.terminate();
      scene?.dispose();
    }
  };
};
