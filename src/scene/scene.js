// The Moon and the sky behind it, in plain three.js and nothing else: no React, no
// DOM. It takes a canvas (an OffscreenCanvas in a worker, or a page canvas on the
// main thread) that covers the whole screen, and is driven by small messages, so
// exactly the same code runs in either place. See src/scene/client.js for how the
// page picks one.
//
// Each frame is two steps. The Moon is rendered into a box of its own, the size of
// the page's Moon area, with its own antialiasing; then the sky pass lays down the
// stars, the planets, the glow and that box onto the canvas (src/scene/sky.js).
// The canvas itself needs no antialiasing and no depth, which saves most of the
// memory a full-screen canvas would cost, and a frame where only the sky changes,
// a star twinkling, reuses the Moon's box as it was.
//
// Nothing renders unless something changed: a new view, a drag and the spin that
// follows it, a reset, the settle after the first frame, a sharper texture
// arriving, a resize, the sky sliding with the pointer or the phone's tilt, or a
// star twinkling (at most fifteen times a second, and only now and then). With
// software WebGL (PageSpeed, blocklisted GPUs) a frame costs tens of
// milliseconds, so a loop running at rest would hold its thread for the life of
// the page.

import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';
import { createLunarMaterial } from './lunarMaterial.js';
import { chooseTier, createTextureLoader, PIXEL_RATIO_CAP } from './textures.js';
import { createSky } from './sky.js';
import { CATALOGUE_FILE, countBrighterThan, decodeStars } from '../sky/stars.js';
import { apply, focalLength, skyFrame, zenithDirection } from '../sky/frame.js';
import { getPlanets } from '../sky/planets.js';
import { GLOW_LEAN, GLOW_MAX } from '../utils/moonPath.js';
import { placeSpring, stepSpring } from '../utils/spring.js';

// The camera stands far off with a narrow lens. From Earth the Moon is seen as good
// as face-on, which is also how the flat Moon's photograph is projected; a near
// camera saw well under half the sphere, so a crescent's lit edge wrapped out of
// view and the outline looked larger than the flat Moon. This keeps the framing a
// 40° lens had from 5.8 units, from 300 units away, where perspective moves nothing
// on the disc by more than a fraction of a pixel.
const CAMERA_Z = 300;
const VISIBLE_HEIGHT = 2 * 5.8 * Math.tan((40 * Math.PI) / 360);
const CAMERA_FOV = (2 * Math.atan(VISIBLE_HEIGHT / 2 / CAMERA_Z) * 180) / Math.PI;

// The Moon's outline fills 92% of its area's height, or 83% of its width on a
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
// Samples per pixel for the Moon's edge
const MOON_SAMPLES = 4;

// The low tier draws the bright stars only, about 900 of them
const LOW_TIER_MAGNITUDE = 4.5;

// Depth layers (G4): the Moon holds still with the interface, the subject the
// eye rests on, and the sky slides behind it, the way the background moves when a
// camera circles its subject. At full deflection the very back of the sky would
// slide this many CSS pixels; each star slides by its distance behind the Moon
// (src/sky/stars.js), so the faintest move about 7 and the brightest about 4. The
// owner chose this on 7 Oct 2026 over moving the Moon most, which read as a
// gimmick: a Moon that follows the hand is a target that slides away from a drag.
// The pull is a spring, a little short of critically damped, so it settles in
// about half a second.
const PARALLAX_PX = 10;
const SPRING_RATE = 7;
const SPRING_DAMPING = 0.9;
// The cursor's light on the stars eases in and out over about a quarter second
const POINTER_FADE_S = 0.25;

// Scintillation (G2): now and then one bright star twinkles for a moment, more
// strongly the lower it stands, as starlight crosses more air there. Time-based,
// fifteen updates a second at most, off in the background and under reduced motion.
const TWINKLE_MAGNITUDE = 2.2;
const TWINKLE_GAP_MS = [3500, 9000];
const TWINKLE_LENGTH_MS = [1400, 2600];
const TWINKLE_FRAME_MS = 1000 / 15;

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
const between = ([low, high]) => low + Math.random() * (high - low);
const clampUnit = (v) => Math.max(-1, Math.min(1, v));

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

const loadStars = async (base) => {
  try {
    const response = await fetch(base + CATALOGUE_FILE);
    if (!response.ok) throw new Error(`${CATALOGUE_FILE}: HTTP ${response.status}`);
    return decodeStars(await response.arrayBuffer());
  } catch {
    // The Moon is drawn without its stars rather than not at all
    return null;
  }
};

// Throws if no WebGL 2 context can be had on this canvas; the caller falls back
export const createScene = async (canvas, options) => {
  const { width, height, dpr = 1, textureBase, skyBase, view, route, emit = () => {} } = options;
  let reducedMotion = Boolean(options.reducedMotion);

  // The canvas covers the screen, so it carries no antialiasing and no depth of
  // its own: the Moon brings both in its box, and the stars draw their own soft
  // edges
  const attributes = { antialias: false, alpha: true, depth: false, stencil: false, powerPreference: 'high-performance' };
  const context = canvas.getContext('webgl2', attributes);
  if (!context) throw new Error('WebGL 2 unavailable');

  const renderer = new WebGLRenderer({ canvas, context, ...attributes });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  const moonScene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 1000);
  camera.position.set(0, 0, CAMERA_Z);
  // Copied texel for texel onto the sky, never filtered
  const moonBox = new WebGLRenderTarget(1, 1, {
    samples: MOON_SAMPLES, depthBuffer: true, stencilBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter
  });

  // The tier decides the sharpest colour map, the pixel ratio and how many stars;
  // the 2K maps come first on every tier, so the first frame is never held up by
  // the 4K one
  const area = options.moon ?? { x: 0, y: 0, width, height };
  const tier = chooseTier({ renderer, width: area.width, height: area.height, dpr, route });
  const textures = createTextureLoader({ base: textureBase, renderer, ktx2: route !== 'main' });
  const [color, relief, stars] = await Promise.all([
    textures.load('color-2k'),
    textures.load('normal-2k'),
    skyBase ? loadStars(skyBase) : null
  ]);
  const material = createLunarMaterial({ map: color, normalMap: relief });
  material.uniforms.sunIntensity.value = SUN_INTENSITY;
  material.uniforms.ambient.value.copy(AMBIENT);
  const moon = new Mesh(moonGeometry(), material);
  moonScene.add(moon);

  const starCount = stars ? (tier === 'low' ? countBrighterThan(stars.magnitudes, LOW_TIER_MAGNITUDE) : stars.count) : 0;
  const sky = createSky({ stars, starCount });
  // The bright stars that may twinkle, the brightest first
  const twinklers = stars ? countBrighterThan(stars.magnitudes, TWINKLE_MAGNITUDE) : 0;

  // The true orientation of the moment, the photograph's (no libration), and the
  // drag the viewer has added on top
  const trueTurn = new Quaternion();
  const meanTurn = new Quaternion();
  const shownTurn = new Quaternion();
  const drag = new Quaternion();
  const resetFrom = new Quaternion();
  const sunDirection = new Vector3(1, 0, 0);
  let frame = null;
  let zenith = [0, 0, 1];
  let skyTime = null;

  // Under reduced motion the Moon simply starts at its true libration
  let settle = null; // { start } while nodding from the photograph's pose
  let settleProgress = reducedMotion ? 1 : 0;
  let reset = null; // { start }
  let pointer = null; // { x, y, t } while the Moon is being dragged
  const spin = { x: 0, y: 0 };
  let wasRotated = false;
  let pendingFrame = false;
  let lastFrameAt = 0;
  let wasAnimating = false;
  const pace = { frames: 0, total: 0 };
  let firstFrameSent = false;
  let disposed = false;
  let hidden = false;
  // The Moon's box needs drawing again
  let moonDirty = true;

  // Where the sky is being pulled: by the pointer on a desktop, by the tilt on a
  // phone, as -1…1 across the screen. The slide follows on a spring.
  const look = { x: 0, y: 0, inside: false, mouse: false, lit: false };
  let tilt = null; // { x, y } while tilt is on
  const drift = { x: 0, y: 0, vx: 0, vy: 0 };
  const halo = { x: -1e4, y: -1e4, strength: 0 };
  // Where the halo is, in CSS pixels: it trails the pointer on the same spring as
  // the halo the page draws (src/utils/spring.js)
  const haloSpring = { x: 0, y: 0, vx: 0, vy: 0 };
  let twinkle = null; // { index, start, length, amount, colour, shown }
  let twinkleTimer = null;
  let twinkleFrame = null;

  let ratioCap = PIXEL_RATIO_CAP[tier];
  // In CSS pixels: the canvas, and the Moon's area on it
  const layout = { width, height, dpr, moon: { ...area } };
  // In device pixels: the drawing buffer and the scale from CSS
  const buffer = new Vector2();
  let scale = 1;
  let boxSize = [1, 1];
  let placed = null; // the Moon's last box: { x, y, fx, fy }

  const setSize = () => {
    const { width: w, height: h, dpr: ratio, moon: m } = layout;
    renderer.setPixelRatio(Math.min(ratio || 1, ratioCap));
    renderer.setSize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), false);
    renderer.getDrawingBufferSize(buffer);
    scale = buffer.x / Math.max(1, Math.round(w));

    camera.aspect = m.width / Math.max(1, m.height);
    // Size the sphere so its outline, where the sight lines graze it, lands on the
    // flat Moon's edge
    const visibleWidth = VISIBLE_HEIGHT * camera.aspect;
    const outlineWorld = Math.min(OUTLINE_OF_HEIGHT * VISIBLE_HEIGHT, OUTLINE_OF_WIDTH * visibleWidth) / 2;
    moon.scale.setScalar(outlineWorld / Math.sqrt(1 + (outlineWorld / CAMERA_Z) ** 2));

    // The box is a pixel wider than the area on each side, so the area can sit at
    // any fraction of a pixel inside it
    boxSize = [Math.ceil(m.width * scale) + 2, Math.ceil(m.height * scale) + 2];
    moonBox.setSize(boxSize[0], boxSize[1]);

    const outline = (Math.min(OUTLINE_OF_HEIGHT * m.height, OUTLINE_OF_WIDTH * m.width) / 2) * scale;
    sky.setLayout({
      width: buffer.x,
      height: buffer.y,
      ratio: scale,
      center: [(m.x + m.width / 2) * scale, (m.y + m.height / 2) * scale],
      outline,
      focal: focalLength(w, h) * scale
    });
    placed = null;
    moonDirty = true;
  };

  const applyView = (v) => {
    trueTurn.copy(quaternionFromRows(v.bodyToView));
    meanTurn.copy(quaternionFromRows(v.meanBodyToView));
    sunDirection.fromArray(v.sunView).normalize();
    material.uniforms.sunDirection.value.copy(sunDirection);
    // Earth's lit fraction seen from the Moon is the Moon's unlit fraction seen from
    // Earth: 1 at New Moon, 0 at Full. sunView's z is the cosine of the phase angle.
    const lit = (1 + sunDirection.z) / 2;
    material.uniforms.earthshine.value.copy(EARTHSHINE_COLOR).multiplyScalar(EARTHSHINE_MAX * (1 - lit) ** EARTHSHINE_FALLOFF);

    // The glow, as glowStyle sets it for the page: leaning towards the bright limb
    const limb = Math.hypot(sunDirection.x, sunDirection.y);
    const lean = limb > 1e-6 ? (GLOW_LEAN * (1 - lit)) / limb : 0;
    sky.setGlow(GLOW_MAX * lit ** 1.5, sunDirection.x * lean, sunDirection.y * lean);

    if (v.ra !== undefined) {
      frame = skyFrame(v);
      sky.setFrame(frame);
      zenith = zenithDirection(v);
      if (v.time !== skyTime) {
        skyTime = v.time;
        sky.setPlanets(getPlanets(v.time));
      }
    }
    moonDirty = true;
  };

  const isRotated = () => Math.abs(drag.w) < 0.99999;
  const reportRotation = () => {
    const rotated = isRotated();
    if (rotated !== wasRotated) {
      wasRotated = rotated;
      emit('rotated', { rotated });
    }
  };

  // Pick a bright star on screen, clear of the Moon, favouring the low ones
  const pickTwinkler = () => {
    if (!frame || !twinklers) return -1;
    const { width: w, height: h, moon: m } = layout;
    const focal = focalLength(w, h);
    const cx = m.x + m.width / 2;
    const cy = m.y + m.height / 2;
    const clear = (Math.min(OUTLINE_OF_HEIGHT * m.height, OUTLINE_OF_WIDTH * m.width) / 2) * 1.15;
    const choices = [];
    let total = 0;
    for (let i = 0; i < Math.min(twinklers, starCount); i++) {
      const d = [stars.directions[i * 3], stars.directions[i * 3 + 1], stars.directions[i * 3 + 2]];
      const v = apply(frame, d);
      if (v[2] < 0.3) continue;
      const x = cx + (focal * v[0]) / v[2];
      const y = cy - (focal * v[1]) / v[2];
      if (x < 16 || y < 16 || x > w - 16 || y > h - 16 || Math.hypot(x - cx, y - cy) < clear) continue;
      const altitude = Math.max(0.2, d[0] * zenith[0] + d[1] * zenith[1] + d[2] * zenith[2]);
      const weight = 1 / altitude;
      choices.push([i, weight, altitude]);
      total += weight;
    }
    let pick = Math.random() * total;
    for (const [i, weight, altitude] of choices) {
      pick -= weight;
      if (pick <= 0) return { index: i, altitude };
    }
    return -1;
  };

  const scheduleTwinkle = () => {
    clearTimeout(twinkleTimer);
    twinkleTimer = null;
    if (!twinklers || reducedMotion || hidden || disposed) return;
    twinkleTimer = setTimeout(() => {
      twinkleTimer = null;
      const choice = pickTwinkler();
      if (choice === -1) {
        scheduleTwinkle();
        return;
      }
      // Low stars twinkle harder and change colour more
      const low = 1 - Math.min(1, choice.altitude);
      twinkle = {
        index: choice.index,
        start: performance.now(),
        length: between(TWINKLE_LENGTH_MS),
        amount: 0.18 + 0.2 * low,
        colour: 0.03 + 0.1 * low,
        shown: 0
      };
      invalidate();
    }, between(TWINKLE_GAP_MS));
  };

  const endTwinkle = () => {
    twinkle = null;
    clearTimeout(twinkleFrame);
    twinkleFrame = null;
    sky.setTwinkle(-1, 1, [1, 1, 1]);
  };

  // The slide's spring, stepped by elapsed time; true while still moving
  const stepDrift = (seconds) => {
    const target = reducedMotion ? { x: 0, y: 0 } : tilt ?? (look.inside && look.mouse ? look : { x: 0, y: 0 });
    // While the Moon is being dragged the sky holds still
    if (pointer) return false;
    let left = Math.min(seconds, 0.1);
    while (left > 0) {
      const h = Math.min(left, 1 / 120);
      for (const axis of ['x', 'y']) {
        const v = `v${axis}`;
        const accel = SPRING_RATE ** 2 * (target[axis] - drift[axis]) - 2 * SPRING_DAMPING * SPRING_RATE * drift[v];
        drift[v] += accel * h;
        drift[axis] += drift[v] * h;
      }
      left -= h;
    }
    const still = Math.abs(target.x - drift.x) < 1e-3 && Math.abs(target.y - drift.y) < 1e-3
      && Math.abs(drift.vx) < 1e-3 && Math.abs(drift.vy) < 1e-3;
    if (still) {
      Object.assign(drift, { x: target.x, y: target.y, vx: 0, vy: 0 });
      return false;
    }
    return true;
  };

  const render = (now) => {
    pendingFrame = false;
    if (disposed) return;
    const elapsed = lastFrameAt ? Math.min(now - lastFrameAt, 4 * FRAME_MS) : FRAME_MS;
    const dt = elapsed / FRAME_MS;
    // Only back-to-back animation frames say anything about the device's pace
    if (wasAnimating && lastFrameAt) {
      pace.frames++;
      pace.total += now - lastFrameAt;
      if (pace.frames >= SLOW_SAMPLE) {
        if (pace.total / pace.frames > SLOW_FRAME_MS && ratioCap > 1) {
          ratioCap = Math.max(1, ratioCap - 0.5);
          setSize();
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
      moonDirty = true;
    }

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
      moonDirty = true;
      if (t < 1) animating = true;
      else {
        drag.identity();
        reset = null;
      }
    }

    if (stepDrift(elapsed / 1000)) animating = true;

    // The cursor's light on the stars: under the halo, so only over open sky, and
    // following it on its spring
    const haloTarget = look.inside && look.mouse && look.lit && !reducedMotion ? 1 : 0;
    // Nearly out: where it comes up again, it starts at the pointer (as the page's
    // halo does once it has faded, SkyPointer.jsx)
    const wasDark = halo.strength < 0.05;
    if (halo.strength !== haloTarget) {
      const k = 1 - Math.exp(-elapsed / 1000 / POINTER_FADE_S);
      halo.strength += (haloTarget - halo.strength) * k;
      if (Math.abs(haloTarget - halo.strength) < 0.01) halo.strength = haloTarget;
      else animating = true;
    }
    if (look.inside) {
      const point = { x: look.px, y: look.py };
      // Where the light comes up, it starts at the pointer rather than flying in
      if (wasDark) placeSpring(haloSpring, point);
      else if (!stepSpring(haloSpring, point, elapsed / 1000)) animating = true;
      halo.x = haloSpring.x * scale;
      halo.y = haloSpring.y * scale;
    }
    sky.setPointer(halo.x, halo.y, halo.strength);

    // A star twinkling: random flicker under a swell, fifteen times a second
    if (twinkle) {
      const t = (now - twinkle.start) / twinkle.length;
      if (t >= 1 || reducedMotion || hidden) {
        endTwinkle();
        scheduleTwinkle();
      } else {
        if (now - twinkle.shown >= TWINKLE_FRAME_MS - 1) {
          twinkle.shown = now;
          const swell = Math.sin(Math.PI * t) ** 2;
          const flicker = () => 1 + twinkle.colour * swell * (Math.random() * 2 - 1);
          sky.setTwinkle(twinkle.index, 1 + twinkle.amount * swell * (Math.random() * 2 - 1), [flicker(), flicker(), flicker()]);
        }
        if (!twinkleFrame) {
          twinkleFrame = setTimeout(() => {
            twinkleFrame = null;
            invalidate();
          }, TWINKLE_FRAME_MS);
        }
      }
    }

    // The sky slides; the Moon stays where the page put it. Its box sits at whole
    // pixels, with the fraction rendered into it, so the Moon only renders again
    // when it changes, never because the stars moved.
    sky.setParallax(drift.x * PARALLAX_PX * scale, drift.y * PARALLAX_PX * scale);
    const m = layout.moon;
    const mx = m.x * scale;
    const my = m.y * scale;
    const bx = Math.floor(mx) - 1;
    const by = Math.floor(my) - 1;
    const fx = bx - mx;
    const fy = by - my;
    if (!placed || Math.abs(placed.fx - fx) > 1e-3 || Math.abs(placed.fy - fy) > 1e-3) moonDirty = true;
    placed = { x: bx, y: by, fx, fy };

    if (moonDirty) {
      shownTurn.slerpQuaternions(meanTurn, trueTurn, easeInOut(settleProgress));
      moon.quaternion.multiplyQuaternions(drag, shownTurn);
      camera.setViewOffset(m.width * scale, m.height * scale, fx, fy, boxSize[0], boxSize[1]);
      renderer.setRenderTarget(moonBox);
      renderer.clear();
      renderer.render(moonScene, camera);
      renderer.setRenderTarget(null);
      moonDirty = false;
    }
    sky.setMoon(moonBox.texture, bx, by, boxSize[0], boxSize[1]);
    renderer.clear();
    renderer.render(sky.scene, sky.camera);
    reportRotation();

    if (!firstFrameSent) {
      firstFrameSent = true;
      // Tell the page on the next frame, once this one is surely on screen
      nextFrame(() => emit('firstFrame'));
      sharpen();
      scheduleTwinkle();
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
      moonDirty = true;
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
    moonDirty = true;
  };

  applyView(view);
  setSize();

  // Compile the shaders off the critical path where the parallel-compile extension
  // exists, before the first frame needs them. Without it there is nothing to
  // gain, and three.js warns.
  if (renderer.extensions.has('KHR_parallel_shader_compile')) {
    try {
      renderer.setRenderTarget(moonBox);
      await renderer.compileAsync(moonScene, camera);
      renderer.setRenderTarget(null);
      await renderer.compileAsync(sky.scene, sky.camera);
    } catch {
      // Compiles on first render instead
    }
    renderer.setRenderTarget(null);
  }

  // A lost context (a GPU reset, too many tabs) leaves the flat Moon showing until
  // three.js has rebuilt everything on the restored one
  canvas.addEventListener?.('webglcontextlost', (event) => {
    event.preventDefault();
    emit('contextLost');
  });
  canvas.addEventListener?.('webglcontextrestored', () => {
    firstFrameSent = false;
    moonDirty = true;
    invalidate();
  });

  invalidate();

  return {
    setView(message) {
      applyView(message.view);
      invalidate();
    },
    resize({ width: w, height: h, dpr: ratio, moon: m }) {
      Object.assign(layout, { width: w, height: h, dpr: ratio });
      if (m) layout.moon = { ...m };
      setSize();
      invalidate();
    },
    setReducedMotion({ reducedMotion: value }) {
      reducedMotion = Boolean(value);
      if (reducedMotion) endTwinkle();
      else if (firstFrameSent && !twinkleTimer) scheduleTwinkle();
      invalidate();
    },
    // The page is in the background, or back: nothing twinkles unseen
    setVisible({ visible }) {
      hidden = !visible;
      if (hidden) {
        clearTimeout(twinkleTimer);
        twinkleTimer = null;
        endTwinkle();
      } else if (firstFrameSent) {
        scheduleTwinkle();
        invalidate();
      }
    },
    // Where a mouse is over the page, in CSS pixels, for the depth layers and the
    // cursor's light; inside is false once it leaves the window, and lit is false
    // over controls, text and panels, where the halo fades
    look({ x, y, inside, lit = true }) {
      look.inside = Boolean(inside);
      look.lit = Boolean(lit);
      look.mouse = true;
      if (look.inside) {
        look.px = x;
        look.py = y;
        // Towards the pointer, as if the eye moved that way around the Moon: what
        // lies behind it shifts with the eye
        look.x = clampUnit((x - layout.width / 2) / (layout.width / 2));
        look.y = clampUnit((y - layout.height / 2) / (layout.height / 2));
      }
      invalidate();
    },
    // The phone's tilt, -1…1 on each screen axis, already past its dead zone and
    // recentred by the page; null once tilt is off
    tilt(message) {
      tilt = message && message.x !== undefined ? { x: clampUnit(message.x), y: clampUnit(message.y) } : null;
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
      clearTimeout(twinkleTimer);
      clearTimeout(twinkleFrame);
      moon.geometry.dispose();
      material.uniforms.map.value?.dispose();
      material.uniforms.normalMap.value?.dispose();
      material.dispose();
      moonBox.dispose();
      sky.dispose();
      textures.dispose();
      renderer.dispose();
    }
  };
};
