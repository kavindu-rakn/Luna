// Whether this browser can create a WebGL context at all.
//
// The 3D scenes can't find this out for themselves. React Three Fiber creates its
// renderer inside an async function, so when WebGL is disabled or blocklisted,
// Three.js's "Error creating WebGL context" becomes an unhandled promise rejection
// that never reaches SceneBoundary: the canvas stays blank, the 2D Moon never
// appears and the loading screen waits for its failsafe. Asking once, up front,
// lets App choose the fallback before mounting a canvas, and spares those
// browsers the Three.js download.
//
// Software WebGL (e.g. Chrome with hardware acceleration off) still counts as
// available: it is slow, but the real Moon does render.
export const canCreateWebGL = (createCanvas = () => document.createElement('canvas')) => {
  try {
    const canvas = createCanvas();
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    // Browsers cap live contexts at around 16, so hand this probe's back at once
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
};
