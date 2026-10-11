// Builds the table that a first visit's place is guessed from (decision I3), from
// the IANA Time Zone Database (tzdata):
//
//   zone.tab   every country's time zones, each with the coordinates of the place
//              it is named after
//   backward   old names for zones, linked to the current ones
//
// Run it by hand to update to a newer tzdata release; its output is committed:
//
//   node scripts/zones/build.mjs
//
// It fetches IANA's latest release (about 480 KB) into scripts/zones/source/, which
// git ignores, then writes src/shell/zones.js.
//
// zone.tab rather than zone1970.tab: zone1970 merges zones that have agreed since
// 1970 across borders, so Europe/Stockholm there is Berlin's zone and a first visit
// from Sweden would open on a German city. zone.tab keeps one entry per country.
//
// The table goes inline in index.html, so it is packed tight: about 3 KB gzipped.
// Lighthouse's mobile run fetches the page in two round trips only while it stays
// under about 43 KB, so every kilobyte here counts.
// Zones are found by a hash of their name rather than by the name, since the page
// already has the name: it is what the browser reports, and the place is named
// after it (Asia/Colombo is Colombo).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { DIGITS, zoneHash } from '../../src/shell/guessPlace.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = path.join(ROOT, 'scripts/zones/source');
const RELEASE = 'https://data.iana.org/time-zones/tzdata-latest.tar.gz';

// The files that define every zone and link name tzdata has
const DATA = ['africa', 'antarctica', 'asia', 'australasia', 'europe', 'northamerica', 'southamerica', 'etcetera', 'backward', 'factory'];

// The place is named after the zone (Asia/Colombo is Colombo), except where the
// zone's name leaves out an accent or reads oddly
const CITY = {
  'Antarctica/DumontDUrville': 'Dumont d’Urville',
  'America/Argentina/Cordoba': 'Córdoba',
  'America/Argentina/Tucuman': 'Tucumán',
  'America/Araguaina': 'Araguaína',
  'America/Asuncion': 'Asunción',
  'America/Bahia_Banderas': 'Bahía de Banderas',
  'America/Belem': 'Belém',
  'America/Bogota': 'Bogotá',
  'America/Cancun': 'Cancún',
  'America/Ciudad_Juarez': 'Ciudad Juárez',
  'America/Cuiaba': 'Cuiabá',
  'America/Curacao': 'Curaçao',
  'America/Eirunepe': 'Eirunepé',
  'America/Lower_Princes': 'Lower Prince’s Quarter',
  'America/Maceio': 'Maceió',
  'America/Mazatlan': 'Mazatlán',
  'America/Merida': 'Mérida',
  'America/Santarem': 'Santarém',
  'America/Sao_Paulo': 'São Paulo',
  'America/St_Johns': 'St. John’s',
  'America/St_Thomas': 'St. Thomas',
  'America/Thule': 'Pituffik',
  'Africa/El_Aaiun': 'Laayoune',
  'Africa/Lome': 'Lomé',
  'Africa/Ndjamena': 'N’Djamena',
  'Africa/Sao_Tome': 'São Tomé',
  'Antarctica/Macquarie': 'Macquarie Island',
  'Asia/Ho_Chi_Minh': 'Ho Chi Minh City',
  'Asia/Macau': 'Macao',
  'Asia/Urumqi': 'Ürümqi',
  'Atlantic/Canary': 'Canary Islands',
  'Atlantic/Reykjavik': 'Reykjavík',
  'Australia/Lord_Howe': 'Lord Howe Island',
  'Europe/Busingen': 'Büsingen',
  'Europe/Chisinau': 'Chișinău',
  'Europe/Zurich': 'Zürich',
  'Indian/Mahe': 'Mahé',
  'Pacific/Easter': 'Easter Island',
  'Pacific/Galapagos': 'Galápagos',
  'Pacific/Gambier': 'Gambier Islands',
  'Pacific/Marquesas': 'Marquesas Islands',
  'Pacific/Midway': 'Midway Atoll',
  'Pacific/Noumea': 'Nouméa',
  'Pacific/Wake': 'Wake Island'
};

// Countries are named by the browser (Intl.DisplayNames), except where its English
// name is long or formal
const COUNTRY = {
  CD: 'DR Congo',
  CG: 'Congo',
  GS: 'South Georgia',
  HK: 'Hong Kong',
  MM: 'Myanmar',
  MO: 'Macao',
  PS: 'Palestine'
};

// backward links some old names to a zone that agreed with it after 1970, across a
// border (Africa/Asmera, in Eritrea, to Nairobi). Its "#=" notes name the right zone
// for most; these are the rest.
const LINK = {
  'Africa/Timbuktu': 'Africa/Bamako',
  'America/Coral_Harbour': 'America/Atikokan',
  'Antarctica/South_Pole': 'Antarctica/McMurdo',
  'Atlantic/Jan_Mayen': 'Arctic/Longyearbyen',
  'Pacific/Yap': 'Pacific/Chuuk'
};

// Old names are kept only where browsers report them. Every browser turns a link
// into its zone's own name before a page sees it: Firefox into tzdata's (Kolkata),
// Chrome and Safari into CLDR's, which keeps some old ones (Asia/Calcutta). Those
// are the zone names V8 knows, read here from Node's.
const REPORTED = new Set(Intl.supportedValuesOf('timeZone'));

const fetchRelease = async () => {
  const target = path.join(SOURCE, 'tzdata-latest.tar.gz');
  if (fs.existsSync(target)) return fs.readFileSync(target);
  fs.mkdirSync(SOURCE, { recursive: true });
  console.log(`fetching ${RELEASE}…`);
  const response = await fetch(RELEASE);
  if (!response.ok) throw new Error(`${RELEASE}: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(target, data);
  return data;
};

// The files in a tar archive: 512-byte headers, each followed by its file padded
// to 512 bytes
const untar = (archive) => {
  const files = {};
  for (let at = 0; at + 512 <= archive.length;) {
    const name = archive.toString('latin1', at, at + 100).replace(/\0.*$/s, '');
    if (!name) break;
    const size = parseInt(archive.toString('latin1', at + 124, at + 136).replace(/\0.*$/s, '').trim(), 8) || 0;
    files[name] = archive.subarray(at + 512, at + 512 + size).toString('utf8');
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
};

// ±DDMM[SS] or ±DDDMM[SS], as zone.tab writes them, in degrees
const degrees = (text) => {
  const sign = text[0] === '-' ? -1 : 1;
  const digits = text.slice(1);
  const whole = digits.length % 2 ? 3 : 2;
  return sign * (Number(digits.slice(0, whole)) + Number(digits.slice(whole, whole + 2)) / 60 +
    Number(digits.slice(whole + 2) || 0) / 3600);
};

const coordinates = (text) => {
  const split = text.slice(1).search(/[+-]/) + 1;
  return [degrees(text.slice(0, split)), degrees(text.slice(split))];
};

// A number in base 64, in a fixed number of digits
const encode = (value, width) => {
  let text = '';
  for (let i = 0; i < width; i++) {
    text = DIGITS[value & 63] + text;
    value >>= 6;
  }
  return text;
};

// The place's name as the zone gives it, before any correction
const zoneCity = (zone) => zone.split('/').pop().replace(/_/g, ' ');

const run = async () => {
  const files = untar(zlib.gunzipSync(await fetchRelease()));
  const version = files.version.trim();

  const zones = new Map();
  for (const line of files['zone.tab'].split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [country, where, zone] = line.split('\t');
    const [lat, lon] = coordinates(where);
    zones.set(zone, { country, lat, lon, city: CITY[zone] || zoneCity(zone) });
  }
  for (const zone of [...Object.keys(CITY), ...Object.values(LINK)]) {
    if (!zones.has(zone)) throw new Error(`${zone} is no longer in zone.tab`);
  }

  // Every name tzdata defines, and the names the browser's own data uses, so no
  // name a device could report shares a hash with a zone in the table
  const known = new Set(REPORTED);
  const links = new Map();
  for (const file of DATA) {
    for (const line of files[file].split('\n')) {
      const fields = line.split('#')[0].trim().split(/\s+/);
      if (fields[0] === 'Zone') known.add(fields[1]);
      if (fields[0] !== 'Link') continue;
      known.add(fields[2]);
      const note = line.match(/#=\s*(\S+)/)?.[1];
      links.set(fields[2], LINK[fields[2]] || (zones.has(note) ? note : fields[1]));
    }
  }
  const kept = [...links].filter(([name, target]) => !zones.has(name) && zones.has(target) && REPORTED.has(name));
  for (const name of REPORTED) {
    if (!zones.has(name) && !kept.some(([link]) => link === name) && name.includes('/') && !name.startsWith('Etc/')) {
      throw new Error(`${name} has no zone`);
    }
  }

  // A seed for the hash that gives every known name its own value, with the gaps
  // between the table's values small enough for two digits
  const names = [...zones.keys(), ...kept.map(([name]) => name)];
  let seed = 0x811c9dc5;
  for (; ; seed++) {
    const values = new Set([...known].map((name) => zoneHash(name, seed)));
    if (values.size < known.size) continue;
    const sorted = names.map((name) => zoneHash(name, seed)).sort((a, b) => a - b);
    if (sorted.every((value, i) => value - (i ? sorted[i - 1] : 0) < 4096)) break;
  }

  // Rows in order of hash, each starting with its gap from the last. A zone then
  // has its latitude and longitude (tenths of a degree, from -90 and -180, two
  // digits each), its country and any correction to its name. A link has ~ and the
  // row of its zone, then the zone's name when that is not the link's.
  const order = names.map((name) => ({ name, value: zoneHash(name, seed) })).sort((a, b) => a.value - b.value);
  const rowOf = new Map(order.map(({ name }, i) => [name, i]));
  const target = new Map(kept);
  let last = 0;
  const rows = order.map(({ name, value }) => {
    const gap = encode(value - last, 2);
    last = value;
    if (target.has(name)) {
      const zone = target.get(name);
      const city = zones.get(zone).city;
      return `${gap}~${encode(rowOf.get(zone), 2)}${city === zoneCity(name) ? '' : city}`;
    }
    const { country, lat, lon, city } = zones.get(name);
    const latitude = encode(Math.round((lat + 90) * 10), 2);
    const longitude = encode(Math.round((lon + 180) * 10), 2);
    return `${gap}${latitude}${longitude}${country}${city === zoneCity(name) ? '' : city}`;
  });

  const table = [
    seed,
    Object.entries(COUNTRY).map(([code, name]) => `${code}=${name}`).join(';'),
    rows.join(';')
  ].join('#');

  const source = `// Generated by scripts/zones/build.mjs from the IANA Time Zone Database, release
// ${version} (zone.tab and backward). Don't edit; the format is described there and
// read by src/shell/guessPlace.js.
export const ZONES = ${JSON.stringify(table)};
`;
  fs.writeFileSync(path.join(ROOT, 'src/shell/zones.js'), source);
  console.log(`zones.js (${version}): ${zones.size} zones, ${kept.length} old names, ` +
    `${table.length} characters (${zlib.gzipSync(table, { level: 9 }).length} gzipped)`);
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
