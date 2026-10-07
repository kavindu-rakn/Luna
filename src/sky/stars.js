// The star catalogue as the sky draws it: public/assets/sky/stars.bin, built by
// scripts/sky/build.mjs from the Bright Star Catalogue (5,080 stars to magnitude 6,
// brightest first), and how bright, how large and what colour each star looks.
// The WebGL sky and the flat one drawn without WebGL both read it from here.

export const CATALOGUE_FILE = 'stars.bin';
const RECORD = 6;

// Six bytes a star: RA as a uint16 turn, Dec as an int16 quarter-turn, V × 20 and
// B−V × 50 as int8s
export const decodeStars = (buffer) => {
  const view = new DataView(buffer);
  const count = Math.floor(buffer.byteLength / RECORD);
  const directions = new Float32Array(count * 3);
  const magnitudes = new Float32Array(count);
  const colorIndices = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * RECORD;
    const ra = (view.getUint16(o, true) / 65536) * 2 * Math.PI;
    const dec = (view.getInt16(o + 2, true) / 32767) * (Math.PI / 2);
    directions[i * 3] = Math.cos(dec) * Math.cos(ra);
    directions[i * 3 + 1] = Math.cos(dec) * Math.sin(ra);
    directions[i * 3 + 2] = Math.sin(dec);
    magnitudes[i] = view.getInt8(o + 4) / 20;
    colorIndices[i] = view.getInt8(o + 5) / 50;
  }
  return { count, directions, magnitudes, colorIndices };
};

// How many of the (brightest-first) stars are at least this bright
export const countBrighterThan = (magnitudes, limit) => {
  let n = 0;
  while (n < magnitudes.length && magnitudes[n] <= limit) n++;
  return n;
};

// Magnitude on a power curve (decision G1's brief): the light a star gives on
// screen grows by 10^(0.4 × GAMMA) a magnitude rather than the true 2.512, which
// would leave the faintest stars invisible next to Sirius. A star brightens first,
// then, at full brightness, grows. Sizes are Gaussian widths in CSS pixels.
const GAMMA = 0.55;
const FAINTEST = { peak: 0.28, sigma: 0.6 };
const MAX_SIGMA = 2.3;
// The brightest also gather a faint halo, as they do to the eye and in a photograph,
// so a planet or Sirius reads as brilliant rather than just larger
const HALO_FROM = 2;
const HALO_MAX = 0.2;
export const starLight = (magnitude) => {
  const energy = 10 ** (0.4 * GAMMA * (6 - magnitude));
  const peak = Math.min(1, FAINTEST.peak * Math.sqrt(energy));
  const sigma = Math.min(MAX_SIGMA, FAINTEST.sigma * Math.sqrt((energy * FAINTEST.peak) / peak));
  const halo = HALO_MAX * Math.min(1, Math.max(0, (HALO_FROM - magnitude) / 3));
  return { peak, sigma, halo };
};

// Depth layers (G4): how far back each star sits, with the Moon at 1. The Moon
// holds still, as the interface does, and the sky slides behind it, each star by
// how far behind the Moon it sits: the faintest, furthest back, slide most
export const starDepth = (magnitude) => {
  const t = Math.min(1, Math.max(0, (magnitude - 1) / 5));
  return 0.6 - 0.3 * t * t * (3 - 2 * t);
};

// A star's colour from its B−V index: its temperature (Ballesteros 2012), then a
// black body's colour at that temperature (Helland's fit), kept to its hue at full
// brightness and softened towards white, as the eye sees star colours at night
const SATURATION = 0.6;
export const starColor = (bv) => {
  const kelvin = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  const t = kelvin / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const rgb = [r, g, b].map((c) => Math.max(0, Math.min(255, c)));
  const top = Math.max(...rgb);
  return rgb.map((c) => 1 - SATURATION + (SATURATION * c) / top);
};
