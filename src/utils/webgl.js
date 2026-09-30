// Whether this browser has WebGL at all, answered without creating a context.
//
// This used to create a throwaway WebGL context to be certain, because React Three
// Fiber fails asynchronously when context creation fails, out of SceneBoundary's
// reach. But creating a context is the most expensive thing a page can do at
// start-up: with software rendering (Lighthouse, blocklisted GPUs) the probe alone
// blocked the main thread for over a second, and three.js then paid the same again
// for its real context.
//
// The probe is no longer needed for correctness. The flat Moon is always drawn
// underneath, and the 3D Moon only fades in once it has drawn a frame, so a
// context that can't be created simply leaves the flat Moon in place. Browsers
// with no WebGL API at all skip the 3D download entirely.
export const hasWebGLApi = (scope = globalThis) =>
  typeof scope !== 'undefined' && scope !== null &&
  (typeof scope.WebGL2RenderingContext === 'function' || typeof scope.WebGLRenderingContext === 'function');
