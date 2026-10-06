// The 3D Moon, in plain three.js and nothing else: no React, no DOM. It takes a
// canvas (an OffscreenCanvas in a worker, or a page canvas on the main thread)
// and is driven by small messages, so exactly the same code runs in either place.
// See src/scene/client.js for how the page picks one.
//
// Nothing renders unless something changed: a new view, a drag and the spin that
// follows it, a reset, the settle after the first frame, a sharper texture
// arriving, a resize. With software WebGL (PageSpeed, blocklisted GPUs) a frame
// costs tens of milliseconds, so a loop running at rest would hold its thread for
// the life of the page.

import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';
import { createLunarMaterial } from './lunarMaterial.js';
import { createGlow } from './glow.js';
import { chooseTier, createTextureLoader, PIXEL_RATIO_CAP } from './textures.js';

// The camera stands far off with a narrow lens. From Earth the Moon is seen as good
// as face-on, which is also how the flat Moon's photograph is projected; a near
// camera saw well under half the sphere, so a crescent's lit edge wrapped out of
// view and the outline looked larger than the flat Moon. This keeps the framing a
// 40° lens had from 5.8 units, from 300 units away, where perspective moves nothing
// on the disc by more than a fraction of a pixel.
const CAMERA_Z = 300;
const VISIBLE_HEIGHT = 2 * 5.8 * Math.tan((40 * Math.PI) / 360);
const CAMERA_FOV = (2 * Math.atan(VISIBLE_HEIGHT / 2 / CAMERA_Z) * 180) / Math.PI;

// The Moon's outline fills 92% of the canvas height, or 83% of its width on a
// narrow portrait phone, where the width runs out first. The flat Moon's CSS
// (.moon-fallback-disc: min(92cqh, 83cqw)) and the page's hit test use the same
// two numbers, so the 3D Moon fades in exactly over the flat one.
export const OUTLINE_OF_HEIGHT = 0.92;
export const OUTLINE_OF_WIDTH = 0.83;

// Sunlight, scaled for an albedo map that is brighter than the real Moon's dark
// dust (it is made to look right, not to measure), then tone-mapped
const SUN_INTENSITY = 0.62;
// Earthshine: sunlight reflected off Earth onto the Moon's night side. Seen from the
// Moon, Earth is full when the Moon is new, so the glow is strongest then. It is
// kept faint and fades fast with the phase, so it shows only around thin crescents
// (F3), cool enough to read as the unlit side.
const EARTHSHINE_MAX = 0.16;
const EARTHSHINE_FALLOFF = 3;
const EARTHSHINE_COLOR = new Color('#9fb0e0');
// A trace of light so no part of the sphere is ever pure black
const AMBIENT = new Color('#7880ab').multiplyScalar(0.012);

// Dragging turns the Moon this far per CSS pixel, on every device
const DRAG_RADIANS_PER_PIXEL = 0.005;
const FRAME_MS = 1000 / 60;
// The fastest spin a flick can leave behind, in radians per 60 Hz frame (about 17°)
const MAX_SPIN = 0.3;
// The spin keeps 94% of its speed each 60 Hz frame, and stops below a hundredth of
// a degree a frame
const SPIN_DECAY = 0.94;
const SPIN_STOP = 2e-4;
// A finger that rests this long before lifting leaves no spin
const REST_MS = 80;
const RESET_MS = 650;
// Frames that keep running slower than this (30 a second) lower the pixel ratio,
// half a step at a time, down to 1
const SLOW_FRAME_MS = 34;
const SLOW_SAMPLE = 30;

// The flat Moon's photograph shows the mean near side, with no libration. The 3D
// Moon's first frame matches it, then, once the page has faded it in and says so
// (settle), nods into the libration of the moment.
const SETTLE_MS = 1600;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;

// A sphere in the Moon's own axes (x to the middle of the near side, y to 90° east,
// z to the north pole), mapped onto the equirectangular texture, whose middle
// column is the prime meridian and whose top row is the north pole
const moonGeometry = (rows = 128, cols = 192) => {
  const positions = [];
  const normals = [];
  const uvs = [];
  const index = [];
  for (let i = 0; i <= rows; i++) {
    const lat = Math.PI / 2 - (i / rows) * Math.PI;
    for (let j = 0; j <= cols; j++) {
      const lon = -Math.PI + (j / cols) * 2 * Math.PI;
      const x = Math.cos(lat) * Math.cos(lon);
      const y = Math.cos(lat) * Math.sin(lon);
      const z = Math.sin(lat);
      positions.push(x, y, z);
      normals.push(x, y, z);
      uvs.push(j / cols, i / rows);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + cols + 1;
      // Wound anticlockwise seen from outside
      if (i !== 0) index.push(a, b, a + 1);
      if (i !== rows - 1) index.push(a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return geometry;
};

const quaternionFromRows = (rows) => new Quaternion().setFromRotationMatrix(new Matrix4().set(
  rows[0], rows[1], rows[2], 0,
  rows[3], rows[4], rows[5], 0,
  rows[6], rows[7], rows[8], 0,
  0, 0, 0, 1
));

const nextFrame = typeof requestAnimationFrame === 'function'
  ? (fn) => requestAnimationFrame(fn)
  : (fn) => setTimeout(() => fn(performance.now()), FRAME_MS);

// Throws if no WebGL 2 context can be had on this canvas; the caller falls back
export const createScene = async (canvas, options) => {
  const { width, height, dpr = 1, textureBase, view, route, emit = () => {} } = options;
  let reducedMotion = Boolean(options.reducedMotion);

  const attributes = { antialias: true, alpha: true, powerPreference: 'high-performance' };
  const context = canvas.getContext('webgl2', attributes);
  if (!context) throw new Error('WebGL 2 unavailable');

  const renderer = new WebGLRenderer({ canvas, context, ...attributes });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  camera.position.set(0, 0, CAMERA_Z);

  // The tier decides the sharpest colour map and the pixel ratio; the 2K maps come
  // first on every tier, so the first frame is never held up by the 4K one
  const tier = chooseTier({ renderer, width, height, dpr, route });
  const textures = createTextureLoader({ base: textureBase, renderer, ktx2: route !== 'main' });
  const [color, relief] = await Promise.all([textures.load('color-2k'), textures.load('normal-2k')]);
  const material = createLunarMaterial({ map: color, normalMap: relief });
  material.uniforms.sunIntensity.value = SUN_INTENSITY;
  material.uniforms.ambient.value.copy(AMBIENT);
  const moon = new Mesh(moonGeometry(), material);
  scene.add(moon);
  const glow = createGlow();
  scene.add(glow.mesh);

  // The true orientation of the moment, the photograph's (no libration), and the
  // drag the viewer has added on top
  const trueTurn = new Quaternion();
  const meanTurn = new Quaternion();
  const shownTurn = new Quaternion();
  const drag = new Quaternion();
  const resetFrom = new Quaternion();
  const sunDirection = new Vector3(1, 0, 0);

  // Under reduced motion the Moon simply starts at its true libration
  let settle = null; // { start } while nodding from the photograph's pose
  let settleProgress = reducedMotion ? 1 : 0;
  let reset = null; // { start }
  let pointer = null; // { x, y, t }
  const spin = { x: 0, y: 0 };
  let wasRotated = false;
  let pendingFrame = false;
  let lastFrameAt = 0;
  let wasAnimating = false;
  const pace = { frames: 0, total: 0 };
  let firstFrameSent = false;
  let disposed = false;

  let ratioCap = PIXEL_RATIO_CAP[tier];
  const size = { w: width, h: height, ratio: dpr };
  const setSize = (w, h, ratio) => {
    Object.assign(size, { w, h, ratio });
    renderer.setPixelRatio(Math.min(ratio || 1, ratioCap));
    renderer.setSize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    // Size the sphere so its outline, where the sight lines graze it, lands on the
    // flat Moon's edge
    const visibleWidth = VISIBLE_HEIGHT * camera.aspect;
    const outline = Math.min(OUTLINE_OF_HEIGHT * VISIBLE_HEIGHT, OUTLINE_OF_WIDTH * visibleWidth) / 2;
    const radius = outline / Math.sqrt(1 + (outline / CAMERA_Z) ** 2);
    moon.scale.setScalar(radius);
    glow.mesh.scale.setScalar(radius);
    glow.mesh.position.z = -1.05 * radius;
  };

  const applyView = (v) => {
    trueTurn.copy(quaternionFromRows(v.bodyToView));
    meanTurn.copy(quaternionFromRows(v.meanBodyToView));
    sunDirection.fromArray(v.sunView).normalize();
    material.uniforms.sunDirection.value.copy(sunDirection);
    glow.setSun(sunDirection);
    // Earth's lit fraction seen from the Moon is the Moon's unlit fraction seen from
    // Earth: 1 at New Moon, 0 at Full. sunView's z is the cosine of the phase angle.
    const unlit = 1 - (1 + sunDirection.z) / 2;
    material.uniforms.earthshine.value.copy(EARTHSHINE_COLOR).multiplyScalar(EARTHSHINE_MAX * unlit ** EARTHSHINE_FALLOFF);
  };

  const isRotated = () => Math.abs(drag.w) < 0.99999;
  const reportRotation = () => {
    const rotated = isRotated();
    if (rotated !== wasRotated) {
      wasRotated = rotated;
      emit('rotated', { rotated });
    }
  };

  const render = (now) => {
    pendingFrame = false;
    if (disposed) return;
    const dt = lastFrameAt ? Math.min((now - lastFrameAt) / FRAME_MS, 4) : 1;
    // Only back-to-back animation frames say anything about the device's pace
    if (wasAnimating && lastFrameAt) {
      pace.frames++;
      pace.total += now - lastFrameAt;
      if (pace.frames >= SLOW_SAMPLE) {
        if (pace.total / pace.frames > SLOW_FRAME_MS && ratioCap > 1) {
          ratioCap = Math.max(1, ratioCap - 0.5);
          setSize(size.w, size.h, size.ratio);
        }
        pace.frames = 0;
        pace.total = 0;
      }
    }
    lastFrameAt = now;
    let animating = false;

    // The nod from the photograph's pose into the libration of the moment
    if (settle) {
      settleProgress = reducedMotion ? 1 : Math.min(1, (now - settle.start) / SETTLE_MS);
      if (settleProgress < 1) animating = true;
      else settle = null;
    }
    shownTurn.slerpQuaternions(meanTurn, trueTurn, easeInOut(settleProgress));

    // Spin left by a flick, decaying by time rather than by frame, so a 120 Hz
    // screen doesn't stop it twice as soon
    if (!pointer && (spin.x || spin.y)) {
      if (reducedMotion) {
        spin.x = 0;
        spin.y = 0;
      } else {
        turnBy(spin.x * dt, spin.y * dt);
        const decay = SPIN_DECAY ** dt;
        spin.x *= decay;
        spin.y *= decay;
        if (Math.abs(spin.x) < SPIN_STOP && Math.abs(spin.y) < SPIN_STOP) {
          spin.x = 0;
          spin.y = 0;
        } else {
          animating = true;
        }
      }
    }

    // Springing back to the true orientation after a double-click
    if (reset) {
      const t = reducedMotion ? 1 : Math.min(1, (now - reset.start) / RESET_MS);
      drag.slerpQuaternions(resetFrom, new Quaternion(), easeOut(t));
      if (t < 1) animating = true;
      else {
        drag.identity();
        reset = null;
      }
    }

    moon.quaternion.multiplyQuaternions(drag, shownTurn);
    renderer.render(scene, camera);
    reportRotation();

    if (!firstFrameSent) {
      firstFrameSent = true;
      // Tell the page on the next frame, once this one is surely on screen
      nextFrame(() => emit('firstFrame'));
      sharpen();
    }
    wasAnimating = animating;
    if (animating) invalidate();
  };

  const invalidate = () => {
    if (pendingFrame || disposed) return;
    pendingFrame = true;
    nextFrame(render);
  };

  // On the high tier, swap in the 4K colour map once the first frame is up. The
  // upload happens here, on its own, rather than inside a frame that's animating.
  let sharpened = false;
  const sharpen = () => {
    if (sharpened || tier !== 'high' || !textures.canLoad('color-4k')) return;
    sharpened = true;
    textures.load('color-4k').then((sharp) => {
      if (disposed) {
        sharp.dispose();
        return;
      }
      renderer.initTexture(sharp);
      const previous = material.uniforms.map.value;
      material.uniforms.map.value = sharp;
      previous.dispose();
      invalidate();
    }).catch(() => {
      // The 2K map stays
    });
  };

  // Turn the Moon about the screen's axes, as the drag offset on top of the truth
  const yaw = new Quaternion();
  const pitch = new Quaternion();
  const Y = new Vector3(0, 1, 0);
  const X = new Vector3(1, 0, 0);
  const turnBy = (dx, dy) => {
    yaw.setFromAxisAngle(Y, dx);
    pitch.setFromAxisAngle(X, dy);
    drag.premultiply(yaw).premultiply(pitch).normalize();
  };

  applyView(view);
  setSize(width, height, dpr);

  // Compile the shaders off the critical path where the parallel-compile extension
  // exists, before the first frame needs them. Without it there is nothing to
  // gain, and three.js warns.
  if (renderer.extensions.has('KHR_parallel_shader_compile')) {
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      // Compiles on first render instead
    }
  }

  // A lost context (a GPU reset, too many tabs) leaves the flat Moon showing until
  // three.js has rebuilt everything on the restored one
  canvas.addEventListener?.('webglcontextlost', (event) => {
    event.preventDefault();
    emit('contextLost');
  });
  canvas.addEventListener?.('webglcontextrestored', () => {
    firstFrameSent = false;
    invalidate();
  });

  invalidate();

  return {
    setView(message) {
      applyView(message.view);
      invalidate();
    },
    resize({ width: w, height: h, dpr: ratio }) {
      setSize(w, h, ratio);
      invalidate();
    },
    setReducedMotion({ reducedMotion: value }) {
      reducedMotion = Boolean(value);
      invalidate();
    },
    pointer({ kind, x, y, t }) {
      if (kind === 'down') {
        pointer = { x, y, t };
        spin.x = 0;
        spin.y = 0;
        reset = null;
        return;
      }
      if (!pointer) return;
      if (kind === 'move') {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        turnBy(dx * DRAG_RADIANS_PER_PIXEL, dy * DRAG_RADIANS_PER_PIXEL);
        // The spin carried on release comes from speed, distance over time, smoothed
        // over the last few moves and expressed per 60 Hz frame. Android reports
        // moves far more often than iOS or a mouse, so a per-move measure left its
        // flicks with a fraction of the spin.
        const perFrame = FRAME_MS / Math.min(Math.max(t - pointer.t, 4), 64);
        spin.x = spin.x * 0.5 + dx * DRAG_RADIANS_PER_PIXEL * perFrame * 0.5;
        spin.y = spin.y * 0.5 + dy * DRAG_RADIANS_PER_PIXEL * perFrame * 0.5;
        pointer = { x, y, t };
        invalidate();
        return;
      }
      // Up or cancelled: a finger that came to rest before lifting doesn't fling
      if (t - pointer.t > REST_MS || kind === 'cancel') {
        spin.x = 0;
        spin.y = 0;
      }
      spin.x = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, spin.x));
      spin.y = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, spin.y));
      pointer = null;
      invalidate();
    },
    // The page has faded the first frame in: nod from the photograph's pose into
    // the libration of the moment
    settle() {
      if (settleProgress < 1 && !settle) {
        settle = { start: performance.now() };
        invalidate();
      }
    },
    // Spring back to the true orientation (a double-click or double-tap)
    reset() {
      if (!isRotated()) return;
      spin.x = 0;
      spin.y = 0;
      resetFrom.copy(drag);
      reset = { start: performance.now() };
      invalidate();
    },
    dispose() {
      disposed = true;
      moon.geometry.dispose();
      material.uniforms.map.value?.dispose();
      material.uniforms.normalMap.value?.dispose();
      material.dispose();
      glow.dispose();
      textures.dispose();
      renderer.dispose();
    }
  };
};
