// Builds the sky's data from two catalogues at CDS Strasbourg and one set of
// constellation figures:
//
//   V/50   The Bright Star Catalogue, 5th revised ed. (Hoffleit & Warren 1991),
//          distributed by NASA's Astronomical Data Center
//   VI/42  Identification of a constellation from a position (Roman 1987): the
//          IAU constellation boundaries (Delporte 1930), arranged for lookup
//   d3-celestial's constellations.lines.json (Olaf Frohn, BSD-3-Clause): each
//          constellation's stick figure, as lines between J2000 positions
//
// Run it by hand after changing anything below; its output is committed:
//
//   node scripts/sky/build.mjs
//
// It fetches the sources (about 700 KB) into scripts/sky/source/, which git
// ignores, then writes:
//
//   public/assets/sky/stars.bin        every star to magnitude 6, brightest first
//   public/assets/sky/stars-faint.bin  those from 6 to 6.5, the dark-sky limit, for
//                                      "Your eyes adjust" (Phase 6c)
//   src/sky/boundaries.js              the boundary table, for naming the
//                                      constellation
//   src/sky/lines.js                   every constellation's figure, for "The
//                                      constellation draws itself" (Phase 6c)
//
// stars.bin holds 6 bytes a star, little-endian: right ascension (uint16, a full
// turn in 65,536 steps, 20″ each), declination (int16, ±90° in ±32,767 steps),
// V magnitude × 20 (int8) and B−V colour × 50 (int8). stars-faint.bin is the same,
// but holds V − 5 rather than V, which a byte holds only up to 6.35. Positions are J2000. Proper
// motion is left out: the fastest of these stars has moved about 2′ since 2000,
// a fraction of a pixel on screen.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { FULL_NAMES } from '../../src/sky/constellations.js';
import { FAINT_OFFSET } from '../../src/sky/stars.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = path.join(ROOT, 'scripts/sky/source');
const CDS = 'https://cdsarc.cds.unistra.fr/ftp/';
const LINES_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';

// The faintest stars kept: about what the eye sees from a dark site, and around
// 5,000 of them
export const MAGNITUDE_LIMIT = 6;
// And the faint file's: the limit a dark-adapted eye reaches under a dark sky, the
// one meteor counts assume
export const FAINT_LIMIT = 6.5;
// Stars with no measured colour are drawn as the Sun's
const DEFAULT_BV = 0.65;

const fetchSource = async (url, file) => {
  const target = path.join(SOURCE, file);
  if (fs.existsSync(target)) return fs.readFileSync(target);
  fs.mkdirSync(SOURCE, { recursive: true });
  console.log(`fetching ${url}…`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(target, data);
  return data;
};

// Fixed-width fields, counted from 1 as the ReadMe counts them
const field = (line, from, to) => line.slice(from - 1, to).trim();

const readStars = (text) => {
  const stars = [];
  for (const line of text.split('\n')) {
    const vmag = field(line, 103, 107);
    const raH = field(line, 76, 77);
    // Novae and galaxies kept only for their numbers have no position or magnitude
    if (!vmag || !raH) continue;
    const ra = (Number(raH) + Number(field(line, 78, 79)) / 60 + Number(field(line, 80, 83)) / 3600) * 15;
    const sign = field(line, 84, 84) === '-' ? -1 : 1;
    const dec = sign * (Number(field(line, 85, 86)) + Number(field(line, 87, 88)) / 60 + Number(field(line, 89, 90)) / 3600);
    const bv = field(line, 110, 114);
    stars.push({ hr: Number(field(line, 1, 4)), ra, dec, vmag: Number(vmag), bv: bv ? Number(bv) : DEFAULT_BV });
  }
  return stars;
};

// The stars fainter than `from` and no fainter than `to`, their magnitudes stored
// less `offset`
const packStars = (stars, from, to, offset = 0) => {
  const kept = stars.filter((s) => s.vmag > from && s.vmag <= to).sort((a, b) => a.vmag - b.vmag || a.hr - b.hr);
  const buffer = Buffer.alloc(kept.length * 6);
  kept.forEach((s, i) => {
    const o = i * 6;
    buffer.writeUInt16LE(Math.round((s.ra / 360) * 65536) % 65536, o);
    buffer.writeInt16LE(Math.round((s.dec / 90) * 32767), o + 2);
    buffer.writeInt8(Math.round((s.vmag - offset) * 20), o + 4);
    buffer.writeInt8(Math.max(-128, Math.min(127, Math.round(s.bv * 50))), o + 5);
  });
  return { buffer, count: kept.length };
};

const writeBoundaries = (text) => {
  const rows = text.split('\n').filter((line) => line.trim()).map((line) => {
    const [raLow, raHigh, decLow, name] = line.trim().split(/\s+/);
    return [Number(raLow), Number(raHigh), Number(decLow), name];
  });
  const names = [...new Set(rows.map((row) => row[3]))].sort();
  // Four numbers a row: the arc's eastern and western right ascension (hours) and
  // its declination (degrees), all at the equinox of B1875, and the
  // constellation's index in NAMES
  const table = rows.map(([lo, hi, dec, name]) => `${lo},${hi},${dec},${names.indexOf(name)}`).join(',');
  const source = `// Generated by scripts/sky/build.mjs from Roman (1987), CDS VI/42. Don't edit.
//
// The IAU constellation boundaries, each constellation's southern edges in order
// of declination: RA from, RA to (hours), the edge's declination (degrees), all
// for the equinox of B1875.0, and the constellation's index in NAMES. A position
// belongs to the first row it lies within, east of RA from, west of RA to and
// north of the edge.
export const NAMES = ${JSON.stringify(names)};

export const BOUNDARIES = [${table}];
`;
  fs.writeFileSync(path.join(ROOT, 'src/sky/boundaries.js'), source);
  return rows.length;
};

// Every constellation, not only the ones the Moon passes through: the Moon is drawn
// many times its true size and hides most of its own, so its neighbours draw too
const writeLines = (json) => {
  const wanted = new Set(Object.values(FULL_NAMES));
  const byAbbreviation = new Map(Object.entries(FULL_NAMES));
  const figures = {};
  for (const feature of JSON.parse(json).features) {
    const name = byAbbreviation.get(feature.id);
    if (!wanted.has(name)) continue;
    // Longitudes run -180 to 180; right ascension 0 to 360. Two decimals is 36″.
    figures[name] = feature.geometry.coordinates.map((line) =>
      line.flatMap(([lon, lat]) => [Number(((lon + 360) % 360).toFixed(2)), Number(lat.toFixed(2))]));
  }
  const missing = [...wanted].filter((name) => !figures[name]);
  const source = `// Generated by scripts/sky/build.mjs from d3-celestial's constellation lines
// (Olaf Frohn, https://github.com/ofrohn/d3-celestial, BSD-3-Clause). Don't edit.
//
// Every constellation's stick figure, by name: each a list of lines, each line
// its points' J2000 right ascension and declination in degrees, one after the
// other.
export const LINES = ${JSON.stringify(figures)};
`;
  fs.writeFileSync(path.join(ROOT, 'src/sky/lines.js'), source);
  return { count: Object.keys(figures).length, missing };
};

const run = async () => {
  const catalogue = zlib.gunzipSync(await fetchSource(`${CDS}V/50/catalog.gz`, 'bsc5-catalog.gz')).toString('latin1');
  await fetchSource(`${CDS}V/50/ReadMe`, 'bsc5-ReadMe');
  const boundaries = (await fetchSource(`${CDS}VI/42/data.dat`, 'boundaries-data.dat')).toString('latin1');
  await fetchSource(`${CDS}VI/42/ReadMe`, 'boundaries-ReadMe');
  const lines = (await fetchSource(LINES_URL, 'constellations.lines.json')).toString('utf8');

  const stars = readStars(catalogue);
  fs.mkdirSync(path.join(ROOT, 'public/assets/sky'), { recursive: true });
  for (const [file, from, to, offset] of [['stars.bin', -Infinity, MAGNITUDE_LIMIT, 0], ['stars-faint.bin', MAGNITUDE_LIMIT, FAINT_LIMIT, FAINT_OFFSET]]) {
    const { buffer, count } = packStars(stars, from, to, offset);
    fs.writeFileSync(path.join(ROOT, 'public/assets/sky', file), buffer);
    console.log(`${file}: ${count} of ${stars.length} stars, ${buffer.length} bytes (${zlib.brotliCompressSync(buffer).length} brotli)`);
  }

  fs.mkdirSync(path.join(ROOT, 'src/sky'), { recursive: true });
  console.log(`boundaries.js: ${writeBoundaries(boundaries)} rows`);
  const figures = writeLines(lines);
  console.log(`lines.js: ${figures.count} figures${figures.missing.length ? `, none for ${figures.missing.join(', ')}` : ''}`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
