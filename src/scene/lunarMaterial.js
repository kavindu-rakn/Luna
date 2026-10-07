// The Moon's own shader (decision F2). three.js's standard material models
// plastic and paint; the Moon is dust, and shines differently:
//
// - Lommel-Seeliger reflectance, brightness ∝ cos i / (cos i + cos e), with a
//   little Lambert mixed in. It keeps a crescent as wide as its lit area and a
//   full Moon evenly bright to its edge, as the real one is.
// - Relief from LOLA elevation, as a normal map in a frame built from the sphere
//   itself (east and south along the texture's u and v), so it needs no tangents.
// - A small opposition surge: dust brightens sharply as the Sun gets directly
//   behind the viewer, which is part of why a full Moon looks so bright.
// - Earthshine on the night side, faint, and visible only around thin crescents
//   (F3); the scene sets its strength from the phase.
//
// The colour map is albedo only, sampled as sRGB and lit in linear light, then
// tone-mapped and encoded by three.js's own chunks like any built-in material.

import { ShaderMaterial, Color, Vector3 } from 'three';

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vEast;
varying vec3 vSouth;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  // The sphere is built in the Moon's own axes, x to the near side's middle,
  // y to 90° east, z to the north pole
  vec3 n = normalize(position);
  vec3 east = vec3(-n.y, n.x, 0.0);
  float len = length(east);
  east = len > 1e-5 ? east / len : vec3(0.0, 1.0, 0.0);
  vec3 north = cross(n, east);
  vNormal = normalize(normalMatrix * n);
  vEast = normalize(normalMatrix * east);
  vSouth = normalize(normalMatrix * -north);
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D map;
uniform sampler2D normalMap;
uniform bool hasNormalMap;
// KTX2 relief keeps east-west in the colour channels and north-south in alpha;
// the JPEG fallback keeps them in red and green
uniform bool normalPacked;
uniform float relief;
uniform vec3 sunDirection;
uniform float sunIntensity;
uniform float lambertShare;
uniform float surge;
uniform float surgeWidth;
uniform vec3 earthshine;
uniform vec3 ambient;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vEast;
varying vec3 vSouth;
varying vec3 vViewPosition;

void main() {
  vec3 albedo = texture2D(map, vUv).rgb;
  vec3 sphere = normalize(vNormal);
  vec3 V = normalize(vViewPosition);
  vec3 L = normalize(sunDirection);
  // How squarely this part of the sphere faces the viewer: the cosine of the
  // emission angle. Taken from the sphere, not the relief: near the limb both
  // angles approach 90° and a relief-tilted ratio between them turned to noise.
  float facing = dot(sphere, V);
  // The angle between the Sun and the viewer, seen from the Moon
  float phaseAngle = acos(clamp(dot(L, V), -1.0, 1.0));

  vec3 N = sphere;
  if (hasNormalMap) {
    vec4 stored = texture2D(normalMap, vUv);
    vec2 slope = (normalPacked ? stored.ra : stored.rg) * 2.0 - 1.0;
    vec3 t = vec3(slope, sqrt(max(1.0 - dot(slope, slope), 0.0)));
    // Relief fades out where the real Moon hides it. Near full, the slopes facing
    // away from the Sun also face away from the viewer, hidden behind their own
    // crater walls, which is why a full Moon looks flat; a normal map can't hide
    // them, and drew them black. And seen edge-on, near the limb, relief is
    // foreshortened to nothing but noise.
    float tilt = relief * smoothstep(0.05, 0.45, facing) * smoothstep(0.04, 0.4, phaseAngle);
    N = normalize(t.x * tilt * normalize(vEast) + t.y * tilt * normalize(vSouth) + t.z * sphere);
  }

  float cosI = max(dot(N, L), 0.0);
  float cosE = max(facing, 1e-3);
  float lommelSeeliger = 2.0 * cosI / (cosI + cosE);
  float light = mix(lommelSeeliger, cosI, lambertShare);
  // Relief may tilt a slope towards the Sun, but nothing past the sphere's own
  // terminator is lit: the curve of the Moon shadows it
  light *= smoothstep(-0.015, 0.03, dot(sphere, L));

  // Opposition surge, by phase angle
  light *= 1.0 + surge * exp(-phaseAngle / surgeWidth);

  vec3 radiance = albedo * (sunIntensity * light + earthshine + ambient);
  gl_FragColor = vec4(radiance, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const createLunarMaterial = ({ map, normalMap = null }) => new ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    map: { value: map },
    normalMap: { value: normalMap },
    hasNormalMap: { value: Boolean(normalMap) },
    normalPacked: { value: Boolean(normalMap?.userData.packed) },
    relief: { value: 1 },
    sunDirection: { value: new Vector3(1, 0, 0) },
    sunIntensity: { value: 1 },
    lambertShare: { value: 0.15 },
    surge: { value: 0.18 },
    surgeWidth: { value: 0.09 },
    earthshine: { value: new Color(0, 0, 0) },
    ambient: { value: new Color(0, 0, 0) }
  }
});
