// The glow around the Moon (decision F6): a soft halo off the lit limb, stronger
// near full. Worked out per pixel on one quad behind the Moon rather than by
// blurring a rendered frame, so it costs next to nothing on any tier. The Moon
// itself hides the part of the quad behind the disc.
//
// The canvas is transparent over the page, so the halo is drawn premultiplied:
// its alpha is its brightness, and the page's sky shows through around it.

import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

// How far out the quad reaches, in Moon radii
const REACH = 1.9;
const GLOW_COLOR = new Color('#d7def4');
// Strongest at full; a crescent keeps a faint rim on its lit side
const GLOW_MAX = 0.2;

const vertexShader = /* glsl */ `
varying vec2 vPlace;
void main() {
  vPlace = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 color;
uniform float strength;
uniform vec2 limb;
uniform float lit;
varying vec2 vPlace;

void main() {
  float r = length(vPlace);
  float out_ = max(r - 1.0, 0.0);
  // A tight rim and a wider, fainter falloff
  float halo = 0.65 * exp(-out_ / 0.07) + 0.35 * exp(-out_ / 0.35);
  // Gather it on the bright limb's side, and spread it round as the Moon fills
  float side = dot(vPlace / max(r, 1e-4), limb);
  float towardsSun = mix(0.12, 1.0, smoothstep(-0.3, 1.0, side));
  float alpha = clamp(halo * mix(towardsSun, 1.0, lit * lit) * strength, 0.0, 1.0);
  // Fade at the quad's edge so it never shows as a square
  alpha *= 1.0 - smoothstep(${(REACH * 0.8).toFixed(2)}, ${REACH.toFixed(2)}, r);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const createGlow = () => {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      color: { value: GLOW_COLOR.clone() },
      strength: { value: 0 },
      limb: { value: new Vector2(1, 0) },
      lit: { value: 0 }
    },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    toneMapped: false
  });
  // In Moon radii; the scene scales it with the Moon
  const mesh = new Mesh(new PlaneGeometry(2 * REACH, 2 * REACH), material);
  // Behind the Moon's middle, so the disc hides it; drawn after the Moon
  mesh.position.z = -1.05;
  mesh.renderOrder = 1;
  return {
    mesh,
    // From the Sun's direction on screen: x right, y up, z towards the viewer
    setSun(sun) {
      const lit = (1 + sun.z) / 2;
      material.uniforms.lit.value = lit;
      material.uniforms.strength.value = GLOW_MAX * lit ** 1.5;
      const across = Math.hypot(sun.x, sun.y);
      if (across > 1e-4) material.uniforms.limb.value.set(sun.x / across, sun.y / across);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    }
  };
};
