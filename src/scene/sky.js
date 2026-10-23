// The sky pass: everything drawn straight onto the full-screen canvas, back to
// front. The stars (G1), the five naked-eye planets, a shower's meteors (6b), the
// glow off the Moon's lit limb (F6), and the Moon itself, which the scene renders
// into a box of its own first and this pass lays down at whole pixels (see
// scene.js).
//
// Every shader here places its geometry in device pixels from uniforms, so the
// pass needs no camera of its own, and nothing in it is depth-tested: each layer
// is laid over the last with premultiplied alpha, as the page composites.

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Matrix3,
  Mesh,
  NormalBlending,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4
} from 'three';
import { MIN_FORWARD } from '../sky/frame.js';
import { starColor, starDepth, starLight } from '../sky/stars.js';

// Stars near the pointer brighten a little, under the moonlight halo the cursor
// carries (the master prompt, 5.6), by up to this much at its centre
const POINTER_GAIN = 0.35;
const POINTER_RADIUS = 240;

const layer = (material, order) => {
  material.transparent = true;
  // Premultiplied "over", as the page composites the canvas itself
  material.blending = NormalBlending;
  material.premultipliedAlpha = true;
  material.depthTest = false;
  material.depthWrite = false;
  material.toneMapped = false;
  return order;
};

const starVertex = /* glsl */ `
uniform mat3 frame;
uniform vec2 center;
uniform vec2 parallax;
uniform float focal;
uniform vec2 viewport;
uniform float pixelRatio;
uniform vec3 pointer;
uniform float pointerRadius;
uniform int twinkleIndex;
uniform float twinkleGain;
uniform vec3 twinkleTint;

// Peak brightness, Gaussian width in CSS pixels, and depth layer; then the halo's
// strength
attribute vec3 look;
attribute float halo;
attribute vec3 tint;

varying vec3 vColor;
varying float vPeak;
varying float vSigma;
varying float vHalo;
varying float vSize;

void main() {
  vec3 v = frame * position;
  if (v.z < ${MIN_FORWARD.toFixed(2)}) {
    // Too far round to draw: off screen
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 1.0;
    return;
  }
  // Device pixels, y down, as the page lays things out; the sky slides behind
  // the still Moon by each star's distance behind it
  vec2 p = center + parallax * (1.0 - look.z) + focal * vec2(v.x, -v.y) / v.z;

  float peak = look.x;
  float near = 1.0 - smoothstep(0.0, pointerRadius, distance(p, pointer.xy));
  peak *= 1.0 + ${POINTER_GAIN.toFixed(2)} * pointer.z * near * near;
  vec3 color = tint;
  if (gl_VertexID == twinkleIndex) {
    peak *= twinkleGain;
    color *= twinkleTint;
  }

  // Never narrower than this, or a faint star would flicker between pixels as
  // the sky drifts
  vSigma = max(look.y * pixelRatio, 0.6);
  // Wide enough that the light has faded to nothing at the sprite's square edge:
  // four Gaussian widths each way, or the halo's reach, fading out before the edge
  vSize = min(ceil(vSigma * (halo > 0.0 ? 16.0 : 8.0)) + 1.0, 63.0);
  vPeak = min(peak, 1.0);
  vHalo = halo * min(peak, 1.5);
  vColor = color;
  gl_PointSize = vSize;
  gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, 0.0, 1.0);
}
`;

const starFragment = /* glsl */ `
varying vec3 vColor;
varying float vPeak;
varying float vSigma;
varying float vHalo;
varying float vSize;

void main() {
  vec2 d = (gl_PointCoord - 0.5) * vSize;
  float a = vPeak * exp(-dot(d, d) / (2.0 * vSigma * vSigma));
  float edge = 1.0 - smoothstep(0.4, 0.5, length(gl_PointCoord - 0.5));
  a = min(1.0, a + vHalo * edge * exp(-length(d) / (2.0 * vSigma)));
  if (a < 0.002) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

// A meteor (6b): a train that brightens towards a round head, laid along its path
// as a quad. Corners come in device pixels; local is each corner's place along the
// path from the tail and across it, in device pixels too.
const meteorVertex = /* glsl */ `
uniform vec2 viewport;
attribute vec2 local;
attribute vec3 shape;
attribute vec3 tint;
varying vec2 vLocal;
varying vec3 vShape;
varying vec3 vTint;

void main() {
  vLocal = local;
  vShape = shape;
  vTint = tint;
  gl_Position = vec4(position.x / viewport.x * 2.0 - 1.0, 1.0 - position.y / viewport.y * 2.0, 0.0, 1.0);
}
`;

const meteorFragment = /* glsl */ `
// The train's length, its Gaussian width and the meteor's light
varying vec2 vLocal;
varying vec3 vShape;
varying vec3 vTint;

void main() {
  float len = vShape.x;
  float sigma = vShape.y;
  float s = clamp(vLocal.x / max(len, 1.0), 0.0, 1.0);
  float across = exp(-vLocal.y * vLocal.y / (2.0 * sigma * sigma));
  float train = vLocal.x >= 0.0 && vLocal.x <= len ? 0.75 * s * s * across : 0.0;
  vec2 h = vec2(vLocal.x - len, vLocal.y);
  float head = exp(-dot(h, h) / (4.0 * sigma * sigma));
  float a = vShape.z * max(train, head);
  if (a < 0.003) discard;
  gl_FragColor = vec4(vTint * a, a);
}
`;

// The most meteors in flight at once
export const MAX_METEORS = 4;

// The glow: the same gradient the page draws behind the flat Moon (.moon-glow in
// index.css, set by glowStyle in src/utils/moonPath.js), stop for stop, so the
// hand-over from one to the other doesn't show. The box is 3.8 Moon radii across;
// the gradient's radius is the distance from its leaning centre to the box's
// nearest side, as CSS's closest-side is.
const glowVertex = /* glsl */ `
uniform vec2 center;
uniform float halfSize;
uniform vec2 viewport;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec2 p = center + (uv * 2.0 - 1.0) * vec2(halfSize, -halfSize);
  gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, 0.0, 1.0);
}
`;

const glowFragment = /* glsl */ `
uniform float strength;
uniform vec2 lean;
uniform vec3 color;
varying vec2 vUv;

const int STOPS = 8;
const float AT[STOPS] = float[](0.52, 0.54, 0.57, 0.62, 0.70, 0.80, 0.90, 1.0);
const float ALPHA[STOPS] = float[](1.0, 0.77, 0.47, 0.26, 0.14, 0.08, 0.035, 0.0);

void main() {
  vec2 centre = vec2(0.5) + lean;
  float radius = 0.5 - max(abs(lean.x), abs(lean.y));
  float r = distance(vUv, centre) / radius;
  float a = r <= AT[0] ? 1.0 : 0.0;
  for (int i = 1; i < STOPS; i++) {
    if (r > AT[i - 1] && r <= AT[i]) {
      a = mix(ALPHA[i - 1], ALPHA[i], (r - AT[i - 1]) / (AT[i] - AT[i - 1]));
    }
  }
  a *= strength;
  if (a < 0.0005) discard;
  gl_FragColor = vec4(color * a, a);
}
`;

// The Moon's box, copied texel for texel at whole device pixels
const moonVertex = /* glsl */ `
uniform vec4 box;
uniform vec2 viewport;

void main() {
  vec2 p = box.xy + vec2(uv.x, 1.0 - uv.y) * box.zw;
  gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, 0.0, 1.0);
}
`;

const moonFragment = /* glsl */ `
uniform sampler2D moon;
uniform vec4 box;
uniform vec2 viewport;

void main() {
  ivec2 origin = ivec2(int(box.x), int(viewport.y - box.y - box.w));
  gl_FragColor = texelFetch(moon, ivec2(gl_FragCoord.xy) - origin, 0);
}
`;

const pointAttributes = (geometry, count) => {
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('look', new Float32BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('halo', new Float32BufferAttribute(new Float32Array(count), 1));
  geometry.setAttribute('tint', new Float32BufferAttribute(new Float32Array(count * 3), 3));
};

// Fill a geometry's look and tint from magnitudes and colour indices
const fillLooks = (geometry, magnitudes, colorIndices) => {
  const look = geometry.getAttribute('look');
  const halo = geometry.getAttribute('halo');
  const tint = geometry.getAttribute('tint');
  for (let i = 0; i < magnitudes.length; i++) {
    const light = starLight(magnitudes[i]);
    look.setXYZ(i, light.peak, light.sigma, starDepth(magnitudes[i]));
    halo.setX(i, light.halo);
    const [r, g, b] = starColor(colorIndices[i]);
    tint.setXYZ(i, r, g, b);
  }
  look.needsUpdate = true;
  halo.needsUpdate = true;
  tint.needsUpdate = true;
};

export const createSky = ({ stars = null, starCount = 0 } = {}) => {
  const scene = new Scene();
  const camera = new OrthographicCamera();

  // Shared by stars and planets, so one update moves both
  const shared = {
    frame: { value: new Matrix3() },
    center: { value: new Vector2() },
    parallax: { value: new Vector2() },
    focal: { value: 1 },
    viewport: { value: new Vector2(1, 1) },
    pixelRatio: { value: 1 },
    pointer: { value: new Vector3(-1e4, -1e4, 0) },
    pointerRadius: { value: POINTER_RADIUS },
    twinkleGain: { value: 1 },
    twinkleTint: { value: new Vector3(1, 1, 1) }
  };
  const starMaterial = (twinkles) => new ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    uniforms: { ...shared, twinkleIndex: { value: twinkles ? -1 : -2 } }
  });

  let starPoints = null;
  if (stars) {
    const geometry = new BufferGeometry();
    pointAttributes(geometry, stars.count);
    geometry.setAttribute('position', new Float32BufferAttribute(stars.directions, 3));
    fillLooks(geometry, stars.magnitudes, stars.colorIndices);
    geometry.setDrawRange(0, starCount || stars.count);
    const material = starMaterial(true);
    starPoints = new Points(geometry, material);
    starPoints.renderOrder = layer(material, 0);
    starPoints.frustumCulled = false;
    scene.add(starPoints);
  }

  const planetGeometry = new BufferGeometry();
  pointAttributes(planetGeometry, 5);
  // Planets shine steadily: their discs are too wide to twinkle as stars do
  const planetMaterial = starMaterial(false);
  const planets = new Points(planetGeometry, planetMaterial);
  planets.renderOrder = layer(planetMaterial, 1);
  planets.frustumCulled = false;
  scene.add(planets);

  // The meteors' quads, four corners each, rewritten every frame one flies
  const meteorGeometry = new BufferGeometry();
  const meteorAttribute = (size) => new BufferAttribute(new Float32Array(MAX_METEORS * 4 * size), size).setUsage(DynamicDrawUsage);
  meteorGeometry.setAttribute('position', meteorAttribute(3));
  meteorGeometry.setAttribute('local', meteorAttribute(2));
  meteorGeometry.setAttribute('shape', meteorAttribute(3));
  meteorGeometry.setAttribute('tint', meteorAttribute(3));
  const quads = [];
  for (let i = 0; i < MAX_METEORS; i++) quads.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3);
  meteorGeometry.setIndex(quads);
  meteorGeometry.setDrawRange(0, 0);
  const meteorMaterial = new ShaderMaterial({
    vertexShader: meteorVertex,
    fragmentShader: meteorFragment,
    uniforms: { viewport: shared.viewport },
    // A path can run any way across the screen
    side: DoubleSide
  });
  const meteors = new Mesh(meteorGeometry, meteorMaterial);
  meteors.renderOrder = layer(meteorMaterial, 1.5);
  meteors.frustumCulled = false;
  meteors.visible = false;
  scene.add(meteors);

  const glowMaterial = new ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    uniforms: {
      // On the Moon, which holds still while the stars slide
      center: { value: new Vector2() },
      viewport: shared.viewport,
      halfSize: { value: 0 },
      strength: { value: 0 },
      lean: { value: new Vector2() },
      color: { value: new Color(215 / 255, 222 / 255, 244 / 255) }
    }
  });
  const glow = new Mesh(new PlaneGeometry(2, 2), glowMaterial);
  glow.renderOrder = layer(glowMaterial, 2);
  glow.frustumCulled = false;
  scene.add(glow);

  const moonMaterial = new ShaderMaterial({
    vertexShader: moonVertex,
    fragmentShader: moonFragment,
    uniforms: { moon: { value: null }, box: { value: new Vector4() }, viewport: shared.viewport }
  });
  const moon = new Mesh(new PlaneGeometry(1, 1), moonMaterial);
  moon.renderOrder = layer(moonMaterial, 3);
  moon.frustumCulled = false;
  moon.visible = false;
  scene.add(moon);

  return {
    scene,
    camera,
    // J2000 → screen right, up, forward, as nine numbers row by row
    setFrame(rows) {
      shared.frame.value.set(...rows);
    },
    setPlanets(list) {
      const position = planetGeometry.getAttribute('position');
      list.forEach((planet, i) => position.setXYZ(i, ...planet.direction));
      position.needsUpdate = true;
      fillLooks(planetGeometry, list.map((p) => p.magnitude), list.map((p) => p.colorIndex));
    },
    // Device pixels: the canvas, the Moon's centre on it, the Moon's outline
    // radius, and the projection's focal length
    setLayout({ width, height, ratio, center: at, outline, focal }) {
      shared.viewport.value.set(width, height);
      shared.pixelRatio.value = ratio;
      shared.focal.value = focal;
      shared.center.value.set(at[0], at[1]);
      glowMaterial.uniforms.center.value.set(at[0], at[1]);
      glowMaterial.uniforms.halfSize.value = 1.9 * outline;
      shared.pointerRadius.value = POINTER_RADIUS * ratio;
    },
    // How far the sky has slid behind the Moon, in device pixels, at the very
    // back; each star slides by its own distance behind the Moon
    setParallax(x, y) {
      shared.parallax.value.set(x, y);
    },
    setPointer(x, y, strength) {
      shared.pointer.value.set(x, y, strength);
    },
    setTwinkle(index, gain, tint) {
      if (starPoints) starPoints.material.uniforms.twinkleIndex.value = index;
      shared.twinkleGain.value = gain;
      shared.twinkleTint.value.set(...tint);
    },
    // The meteors in flight, each its tail and head in device pixels, its train's
    // Gaussian width in device pixels, its light (0-1) and its colour
    setMeteors(list) {
      const position = meteorGeometry.getAttribute('position');
      const local = meteorGeometry.getAttribute('local');
      const shape = meteorGeometry.getAttribute('shape');
      const tint = meteorGeometry.getAttribute('tint');
      const count = Math.min(list.length, MAX_METEORS);
      for (let i = 0; i < count; i++) {
        const { tail, head, along, sigma, light, color } = list[i];
        const length = Math.hypot(head[0] - tail[0], head[1] - tail[1]);
        // Along the path even before the train has any length: its direction
        const [ux, uy] = along;
        const pad = 4 * sigma;
        const corners = [[-pad, -pad], [-pad, pad], [length + pad, -pad], [length + pad, pad]];
        corners.forEach(([a, c], k) => {
          const v = i * 4 + k;
          position.setXYZ(v, tail[0] + ux * a - uy * c, tail[1] + uy * a + ux * c, 0);
          local.setXY(v, a, c);
          shape.setXYZ(v, length, sigma, light);
          tint.setXYZ(v, ...color);
        });
      }
      for (const attribute of [position, local, shape, tint]) attribute.needsUpdate = true;
      meteorGeometry.setDrawRange(0, count * 6);
      meteors.visible = count > 0;
    },
    setGlow(strength, leanX, leanY) {
      glowMaterial.uniforms.strength.value = strength;
      glowMaterial.uniforms.lean.value.set(leanX, leanY);
      glow.visible = strength > 0.0005;
    },
    // The Moon's rendered box: a texture and where it goes, in whole device pixels
    setMoon(texture, x, y, width, height) {
      moonMaterial.uniforms.moon.value = texture;
      moonMaterial.uniforms.box.value.set(x, y, width, height);
      moon.visible = true;
    },
    dispose() {
      starPoints?.geometry.dispose();
      starPoints?.material.dispose();
      planetGeometry.dispose();
      planetMaterial.dispose();
      meteorGeometry.dispose();
      meteorMaterial.dispose();
      glow.geometry.dispose();
      glowMaterial.dispose();
      moon.geometry.dispose();
      moonMaterial.dispose();
    }
  };
};
