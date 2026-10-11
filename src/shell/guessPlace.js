// Inlined into index.html with paintNow and run before the first paint: a first
// visit opens on a place guessed from the device's time zone (decision I3), so
// Asia/Colombo opens on Colombo, Sri Lanka. It is worked out on the device from
// tzdata's table (src/shell/zones.js, built by scripts/zones/build.mjs); nothing is
// sent anywhere, and nothing is kept.
//
// The build inlines it with Function.prototype.toString, as it does paintNow, so it
// has to stay self-contained: no imports, nothing referenced from outside its own
// body, and syntax that Safari 15.4 parses.

// The base-64 digits the table is written in, and the hash its zones are found by
// (32-bit FNV-1a, its top 18 bits), for the build script. guessPlace has its own
// copies, since it is inlined alone; the tests check every zone is found.
export const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
export const zoneHash = (name, seed) => {
  let h = seed;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 14;
};

// The guessed place, or null for a zone that names no place (UTC) or a device that
// won't say. `zone` is for the tests; the page passes the device's.
export function guessPlace(table, zone) {
  try {
    zone = zone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
  if (!zone || typeof zone !== 'string') return null;

  var digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  var sections = table.split('#');
  var rows = sections[2].split(';');
  var read = function (text, at) {
    return digits.indexOf(text.charAt(at)) * 64 + digits.indexOf(text.charAt(at + 1));
  };

  var hash = +sections[0];
  for (var i = 0; i < zone.length; i++) hash = Math.imul(hash ^ zone.charCodeAt(i), 16777619);
  hash >>>= 14;

  // Each row starts with its hash's gap from the row before
  var value = 0;
  var row = null;
  for (i = 0; i < rows.length && value < hash; i++) {
    value += read(rows[i], 0);
    if (value === hash) row = rows[i].slice(2);
  }
  if (row === null) return null;

  // An old name points to its zone's row, and carries the zone's place name when
  // its own is out of date (Asia/Calcutta is Kolkata)
  var city;
  if (row.charAt(0) === '~') {
    city = row.slice(3);
    row = rows[read(row, 1)].slice(2);
  } else {
    city = row.slice(6);
  }
  city = city || zone.split('/').pop().replace(/_/g, ' ');

  var code = row.slice(4, 6);
  var country = (';' + sections[1]).split(';' + code + '=')[1];
  if (country) country = country.split(';')[0];
  else {
    try {
      country = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    } catch {
      country = '';
    }
  }

  // Singapore rather than "Singapore, Singapore", and the Faroe Islands rather than
  // "Faroe, Faroe Islands"
  var plain = function (text) {
    return text.normalize('NFD').replace(/[^a-z ]/gi, '').toLowerCase();
  };
  var name = !country ? city : plain(country).indexOf(plain(city)) === 0 ? country : city + ', ' + country;

  return {
    name: name,
    lat: (read(row, 0) - 900) / 10,
    lon: (read(row, 2) - 1800) / 10,
    timeZone: zone,
    guess: true
  };
}
