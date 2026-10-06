// Builds the Moon's textures from NASA's CGI Moon Kit (Scientific Visualization
// Studio, https://svs.gsfc.nasa.gov/4720, public domain):
//
//   lroc_color_16bit_srgb_4k.tif  LRO colour, the 2025 edition, 4096×2048
//   ldem_16_uint.tif              LOLA elevation, 5760×2880, in half-metres + 20,000
//
// Run it by hand after changing anything below; its output is committed:
//
//   node scripts/textures/build.mjs
//
// It fetches the two source maps (about 95 MB) into scripts/textures/source/,
// which git ignores, then writes:
//
//   public/assets/textures/moon-color-2k.ktx2, -4k.ktx2  colour, ETC1S, sRGB
//   public/assets/textures/moon-normal-2k.ktx2           relief, ETC1S, packed
//   public/assets/textures/moon-color-2k.jpg             the same for browsers
//   public/assets/textures/moon-normal-2k.jpg            that can't decode KTX2
//   public/moon-disc.webp                                 the flat Moon's photograph
//
// The map is albedo only: brightness and colour with no shading baked in. Craters
// and mountains come from the elevation, as a normal map the shader lights from
// the Sun's true direction, so relief stands out near the terminator and flattens
// towards full, as on the real Moon.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = path.join(ROOT, 'scripts/textures/source');
const TEXTURES = path.join(ROOT, 'public/assets/textures');
const NASA = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/';
const COLOR_TIF = 'lroc_color_16bit_srgb_4k.tif';
const ELEVATION_TIF = 'ldem_16_uint.tif';

const MOON_RADIUS_M = 1737400;
// Relief is exaggerated: at 2K a texel spans 5 km, where even crater walls slope
// gently, and true-scale relief all but vanished
export const RELIEF = 3;
// The pole's top and bottom texel rows each squeeze into a point, where their
// detail turns into a starburst of spokes. The outermost rows blend towards
// their mean.
const POLE_BAND = 24 / 512;

sharp.cache(false);
const open = (file) => sharp(path.join(SOURCE, file), { limitInputPixels: false });

const fetchSource = async (file) => {
  const target = path.join(SOURCE, file);
  if (fs.existsSync(target)) return;
  fs.mkdirSync(SOURCE, { recursive: true });
  console.log(`fetching ${file} from NASA SVS…`);
  const response = await fetch(NASA + file);
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
};

// Colour as 8-bit sRGB RGBA at the given width, poles blended
const colorAt = async (width) => {
  const { data, info } = await open(COLOR_TIF)
    .toColourspace('srgb')
    .resize(width, width / 2, { kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  blendPoles(data, info.width, info.height);
  return { data, width: info.width, height: info.height };
};

const blendPoles = (data, width, height) => {
  const band = Math.round(height * POLE_BAND);
  for (const north of [true, false]) {
    const edge = north ? 0 : height - 1;
    const mean = [0, 0, 0];
    for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) mean[c] += data[(edge * width + x) * 4 + c];
    for (let c = 0; c < 3; c++) mean[c] /= width;
    for (let i = 0; i < band; i++) {
      const y = north ? i : height - 1 - i;
      const f = (1 - i / band) ** 1.5;
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) data[o + c] = Math.round(data[o + c] * (1 - f) + mean[c] * f);
      }
    }
  }
};

// Heights in metres at the given width, averaged down from the 5760-wide grid
const heightsAt = async (width) => {
  const { data, info } = await open(ELEVATION_TIF)
    .toColourspace('grey16')
    .resize(width, width / 2, { kernel: 'cubic' })
    .raw({ depth: 'ushort' })
    .toBuffer({ resolveWithObject: true });
  const raw = new Uint16Array(data.buffer, data.byteOffset, info.width * info.height);
  const metres = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) metres[i] = (raw[i] - 20000) / 2;
  return { metres, width: info.width, height: info.height };
};

// Tangent-space normals from the heights: x along increasing u (east), y along
// increasing v (south, since row 0 is the north pole), z out of the surface.
// The shader builds the same frame from the sphere (see src/scene/lunarMaterial.js).
const normalsFrom = ({ metres, width, height }, relief) => {
  const out = new Uint8Array(width * height * 4);
  const dLon = (2 * Math.PI) / width;
  const dLat = Math.PI / height;
  const band = Math.round(height * POLE_BAND);
  for (let y = 0; y < height; y++) {
    const lat = Math.PI / 2 - (y + 0.5) * dLat;
    // Near the poles a texel is a sliver; keep the east-west spacing from
    // collapsing, and fade the relief out over the blended pole band
    const metresEast = MOON_RADIUS_M * Math.max(Math.cos(lat), 0.08) * dLon;
    const metresSouth = MOON_RADIUS_M * dLat;
    const fromPole = Math.min(y, height - 1 - y);
    const fade = fromPole >= band ? 1 : (fromPole / band) ** 1.5;
    const north = Math.max(y - 1, 0);
    const south = Math.min(y + 1, height - 1);
    for (let x = 0; x < width; x++) {
      const west = (x - 1 + width) % width;
      const east = (x + 1) % width;
      const dhdu = (metres[y * width + east] - metres[y * width + west]) / (2 * metresEast);
      const dhdv = (metres[south * width + x] - metres[north * width + x]) / ((south - north) * metresSouth);
      let nx = -dhdu * relief * fade;
      let ny = -dhdv * relief * fade;
      let nz = 1;
      const n = Math.hypot(nx, ny, nz);
      nx /= n; ny /= n; nz /= n;
      const o = (y * width + x) * 4;
      out[o] = Math.round((nx * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[o + 3] = 255;
    }
  }
  return { data: out, width, height };
};

// Relief in ETC1S, its two directions stored apart (packEastSouth). Compared on a
// quarter Moon's terminator at three times zoom: ETC1S with all three directions
// together was 450 KB and visibly soft; UASTC was crisp but 1.9 MB even with
// rate-distortion optimisation; split ETC1S was nearly as crisp at 663 KB.
// NORMAL_KTX2 (JSON) overrides it for such comparisons.
const NORMAL_KTX2 = JSON.parse(process.env.NORMAL_KTX2 || 'null') || {
  isUASTC: false, isNormalMap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false,
  qualityLevel: 128, compressionLevel: 2
};

// For KTX2 the two directions that matter are stored apart, east-west in the
// colour channels and north-south in alpha, so each gets ETC1S's codebook to
// itself; the shader rebuilds the third from them
const packEastSouth = ({ data, width, height }) => {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = out[i + 1] = out[i + 2] = data[i];
    out[i + 3] = data[i + 1];
  }
  return { data: out, width, height };
};

const ktx2 = async ({ data, width, height }, options) => {
  const bytes = await encodeToKTX2(new Uint8Array(1), {
    generateMipmap: true,
    imageDecoder: async () => ({ data, width, height }),
    ...options
  });
  return Buffer.from(bytes);
};

const write = (file, bytes) => {
  fs.writeFileSync(file, bytes);
  console.log(`${path.relative(ROOT, file).replaceAll('\\', '/')}: ${(bytes.length / 1024).toFixed(0)} KB`);
};

const rgbaToJpeg = ({ data, width, height }, quality) =>
  sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } })
    .removeAlpha()
    .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();

// The flat Moon: the near side projected orthographically, north up and
// selenographic east to the right, as getMoonView's mean pose shows it, and lit
// and tone-mapped as the 3D Moon lights a full Moon, so the two match where they
// cross-fade. Light direction changes with every phase while this photograph never
// does, so its relief is shading without a direction: steep slopes darken a
// little whichever way they face, which keeps craters legible without casting a
// shadow the wrong way for a waning Moon.
const DISC_SIZE = 512;
// SUN_INTENSITY in src/scene/scene.js, and the opposition surge a Moon a day or
// so from full gets there
const DISC_LIGHT = 0.62 * 1.1;
// The flat Moon's mask shows the photograph at about 90% across a Full Moon
// (SHADE_HEADROOM in src/utils/moonPath.js), so it is stored that much brighter
const DISC_FULL_LEVEL = 0.906;
export const DISC_SLOPE_SHADE = 2;

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
// three.js's ACESFilmicToneMapping (tonemapping_pars_fragment), exposure 1
const fitRRT = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
const aces = (r, g, b) => {
  r /= 0.6; g /= 0.6; b /= 0.6;
  const x = fitRRT(0.59719 * r + 0.35458 * g + 0.04823 * b);
  const y = fitRRT(0.076 * r + 0.90834 * g + 0.01566 * b);
  const z = fitRRT(0.0284 * r + 0.13383 * g + 0.83777 * b);
  return [1.60475 * x - 0.53108 * y - 0.07367 * z, -0.10208 * x + 1.10813 * y - 0.00605 * z, -0.00327 * x - 0.07276 * y + 1.07602 * z]
    .map((v) => Math.min(1, Math.max(0, v)));
};
const flatDisc = (color, normals) => {
  const N = DISC_SIZE;
  const out = Buffer.alloc(N * N * 4);
  const sample = (img, u, v, c) => {
    // Bilinear, wrapping in longitude
    const x = u * img.width - 0.5;
    const y = Math.min(Math.max(v * img.height - 0.5, 0), img.height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const at = (xx, yy) => img.data[((Math.min(yy, img.height - 1)) * img.width + ((xx % img.width) + img.width) % img.width) * 4 + c];
    return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
  };
  const SS = 3; // supersampled per pixel, for a clean limb and fine detail
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const acc = [0, 0, 0];
      let cover = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / N) * 2 - 1;
          const y = 1 - ((py + (sy + 0.5) / SS) / N) * 2;
          const d = x * x + y * y;
          if (d > 1) continue;
          const z = Math.sqrt(1 - d);
          const lat = Math.asin(y);
          const lon = Math.atan2(x, z);
          const u = 0.5 + lon / (2 * Math.PI);
          const v = 0.5 - lat / Math.PI;
          // How far the relief tilts away from the surface's own normal
          const nz = sample(normals, u, v, 2) / 255 * 2 - 1;
          const shade = Math.max(0, 1 - DISC_SLOPE_SHADE * (1 - nz));
          const lit = [0, 1, 2].map((c) => toLinear(sample(color, u, v, c) / 255) * DISC_LIGHT * shade);
          const mapped = aces(lit[0], lit[1], lit[2]);
          for (let c = 0; c < 3; c++) acc[c] += Math.min(1, toSrgb(mapped[c]) / DISC_FULL_LEVEL);
          cover++;
        }
      }
      const o = (py * N + px) * 4;
      if (cover) {
        for (let c = 0; c < 3; c++) out[o + c] = Math.round((255 * acc[c]) / cover);
        out[o + 3] = Math.round((255 * cover) / (SS * SS));
      }
    }
  }
  return sharp(out, { raw: { width: N, height: N, channels: 4 } }).webp({ quality: 75, alphaQuality: 100 }).toBuffer();
};

const main = async () => {
  await fetchSource(COLOR_TIF);
  await fetchSource(ELEVATION_TIF);
  fs.mkdirSync(TEXTURES, { recursive: true });
  const only = process.argv.slice(2);
  const wants = (name) => !only.length || only.includes(name);

  const color2k = await colorAt(2048);
  const normals2k = normalsFrom(await heightsAt(2048), RELIEF);

  if (wants('ktx2')) {
    const color4k = await colorAt(4096);
    const etc1s = { isUASTC: false, isSetKTX2SRGBTransferFunc: true, isPerceptual: true, qualityLevel: 230, compressionLevel: 2 };
    write(path.join(TEXTURES, 'moon-color-2k.ktx2'), await ktx2(color2k, etc1s));
    write(path.join(TEXTURES, 'moon-color-4k.ktx2'), await ktx2(color4k, etc1s));
  }
  if (wants('ktx2') || wants('normal')) {
    write(path.join(TEXTURES, 'moon-normal-2k.ktx2'), await ktx2(packEastSouth(normals2k), NORMAL_KTX2));
  }
  if (wants('jpeg')) {
    write(path.join(TEXTURES, 'moon-color-2k.jpg'), await rgbaToJpeg(color2k, 86));
    write(path.join(TEXTURES, 'moon-normal-2k.jpg'), await rgbaToJpeg(normals2k, 80));
  }
  if (wants('disc')) {
    write(path.join(ROOT, 'public/moon-disc.webp'), await flatDisc(color2k, normals2k));
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
