// The meteors drawn in the sky (Phase 6b): how often they come, which shower each
// belongs to, where in the field it starts, which way it flies, how long it burns
// and how bright it is. Pure, so the scene runs it in either thread
// (src/scene/scene.js) and the tests run it here.
//
// A shower's meteors all fly away from its radiant: carried backwards, each path
// passes through it. One that starts near the radiant comes almost straight at the
// observer and is seen end-on, short; one far from it is seen side-on, long.

import { apply, focalLength, transpose } from './frame.js';

const rad = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// The IMO: "about 98% of all meteors are witnessed within an almost circular field
// of around 50° radius", the observer's effective field of view, over which a
// shower's hourly rate is counted (https://www.imo.net/major/observation)
export const OBSERVER_FIELD_SR = 2 * Math.PI * (1 - Math.cos(50 * rad));

// As the owner chose: the real rate's rise and fall, ten times as often, so a
// minute's watching on a good night shows a few
export const SPEED_UP = 10;

// The share of an observer's meteors that fall in the field on screen: the solid
// angle the screen's rectangle covers through the sky's projection (frame.js),
// over the observer's field. About 0.42 on a wide screen, 0.36 on a phone.
export const fieldShare = (width, height) => {
  const focal = focalLength(width, height);
  const x = width / 2 / focal;
  const y = height / 2 / focal;
  return Math.min(1, (4 * Math.atan((x * y) / Math.sqrt(1 + x * x + y * y))) / OBSERVER_FIELD_SR);
};

// Meteors a second on screen, from the showers' visible hourly rates
export const meteorsPerSecond = (showers, width, height) =>
  (showers.reduce((sum, shower) => sum + shower.rate, 0) * fieldShare(width, height) * SPEED_UP) / 3600;

// Which shower the next meteor belongs to, in proportion to their rates
export const pickShower = (showers, random = Math.random) => {
  const total = showers.reduce((sum, shower) => sum + shower.rate, 0);
  let pick = random() * total;
  for (const shower of showers) {
    pick -= shower.rate;
    if (pick <= 0) return shower;
  }
  return showers[showers.length - 1] ?? null;
};

// The J2000 direction under a point on screen, in CSS pixels from the Moon's
// centre (x right, y down): the inverse of frame.js's project
export const directionAt = (frame, focal, x, y) => {
  const v = [x / focal, -y / focal, 1];
  const length = Math.hypot(...v);
  return apply(transpose(frame), v.map((c) => c / length));
};

// Visual meteors light up at about 100 km and burn out some tens of km lower,
// over 20 to 50 km of air
const LAYER_KM = 100;
const PATH_KM = [20, 50];

// A meteor that starts in direction `start` (a J2000 unit vector): it flies away
// from the radiant along the great circle through both, over an angle that
// shrinks towards the radiant, at the shower's own speed in km/s. Null right at
// the radiant or its opposite, where a meteor shows no path at all.
export const meteorPath = ({ radiant, speed }, start, random = Math.random) => {
  const cosine = Math.max(-1, Math.min(1, dot(radiant, start)));
  const away = start.map((s, i) => s * cosine - radiant[i]);
  const norm = Math.hypot(...away);
  if (norm < Math.sin(2 * rad)) return null;
  const km = PATH_KM[0] + random() * (PATH_KM[1] - PATH_KM[0]);
  const angle = (km / LAYER_KM) * norm;
  const end = start.map((s, i) => s * Math.cos(angle) + (away[i] / norm) * Math.sin(angle));
  return { from: start, to: end, angle, seconds: km / speed };
};

// How bright, in magnitudes: each magnitude fainter there are `population` times
// as many meteors, down to the faintest the sky shows tonight
export const meteorMagnitude = ({ population, faintest }, random = Math.random) =>
  Math.max(-4, faintest + Math.log(1 - random()) / Math.log(population));

// How a meteor of that magnitude is drawn: the head's brightness (0-1) and the
// train's width (a Gaussian's, in CSS pixels). Most meteors are faint, near the
// limit of the eye, so the scale is gentler than the stars' and even the faintest
// still reads as a streak.
export const meteorLight = (magnitude) => ({
  peak: Math.min(1, Math.max(0.42, 0.42 + 0.12 * (5 - magnitude))),
  sigma: 0.65 + 0.12 * Math.min(5, Math.max(0, 3 - magnitude))
});

// A meteor's colour: slow ones (the Geminids, 35 km/s) a warm white, fast ones
// (the Leonids, 71 km/s) a cool one
export const meteorTint = (speed) => {
  const t = Math.min(1, Math.max(0, (speed - 35) / 36));
  return [1 - 0.12 * t, 0.96 + 0.01 * t, 0.88 + 0.12 * t];
};

// How much of a meteor shows at a moment, `t` seconds after it lit, as `head` and
// `tail` (0 to 1 along its path) and its light (0 to 1). It brightens fast, fades
// as it goes, and its train lingers a moment after the head has burnt out.
const TRAIN = 0.4;
const RISE = 0.12;
export const LINGER_S = 0.2;
export const meteorAt = (seconds, t) => {
  const p = t / seconds;
  if (p < 1) {
    return { head: p, tail: Math.max(0, p - TRAIN), light: Math.min(1, p / RISE) * (1 - 0.7 * p ** 3) };
  }
  const after = (t - seconds) / LINGER_S;
  if (after >= 1) return null;
  return { head: 1, tail: Math.min(1, 1 - TRAIN + TRAIN * after), light: 0.3 * (1 - after) };
};

// How near the segment from a to b comes to a point, in the same units
export const segmentDistance = (point, a, b) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(a[0] + dx * t - point[0], a[1] + dy * t - point[1]);
};
