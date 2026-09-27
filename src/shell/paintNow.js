// Inlined into index.html and run before first paint, before any bundle has
// arrived. The page is prerendered at build time, so without this the first frame
// would show the day of the build. It writes today's date (or a shared link's),
// the phase name and the 2D Moon into the shell; React takes over moments later
// with exact values.
//
// The build inlines it with Function.prototype.toString, so it has to stay
// self-contained: no imports, nothing referenced from outside its own body, and
// syntax that Safari 15.4 parses. Called without a document it only returns what
// it computed, which is how the tests check it against lunarCalc.
export function paintNow(win, doc) {
  var rad = Math.PI / 180;
  var params = new URLSearchParams(win.location.search);

  // Where: a shared link's place, else the saved place, else Greenwich
  var place;
  var at = params.get('at');
  var coords = at ? at.split(',').map(Number) : null;
  if (coords && coords.length === 2 && coords.every(isFinite)) {
    place = {
      name: params.get('n') ||
        Math.abs(coords[0]).toFixed(2) + '°' + (coords[0] >= 0 ? 'N' : 'S') + ', ' +
        Math.abs(coords[1]).toFixed(2) + '°' + (coords[1] >= 0 ? 'E' : 'W'),
      timeZone: params.get('tz')
    };
  } else {
    try {
      place = JSON.parse(win.localStorage.getItem('luna_location'));
    } catch {
      place = null;
    }
  }
  if (!place || typeof place !== 'object') place = { name: 'Greenwich, UK', timeZone: 'Europe/London' };

  var timeZone = place.timeZone || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timeZone });
  } catch {
    timeZone = 'UTC';
  }

  // When: a shared day (its noon, near enough) or instant, else now
  var when = new Date();
  var d = params.get('d');
  var day = d && /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (day) when = new Date(Date.UTC(+day[1], +day[2] - 1, +day[3], 12));
  else if (d && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(d) && !isNaN(Date.parse(d))) when = new Date(d);

  // Elongation from Meeus's low-precision series (ch. 48): the mean elongation
  // plus its six largest periodic terms, good to a fraction of a degree
  var T = (when.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;
  var D = (297.8501921 + 445267.1114034 * T) * rad;
  var M = (357.5291092 + 35999.0502909 * T) * rad;
  var Mp = (134.9633964 + 477198.8675055 * T) * rad;
  var elongation = D / rad + 6.289 * Math.sin(Mp) - 2.1 * Math.sin(M) + 1.274 * Math.sin(2 * D - Mp) +
    0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * Mp) + 0.11 * Math.sin(D);
  elongation = ((elongation % 360) + 360) % 360;
  var phase = elongation / 360;
  var fraction = (1 - Math.cos(elongation * rad)) / 2;

  // The same names and thresholds as classifyPhase
  var name = phase <= 0.015 || phase >= 0.985 ? 'New Moon'
    : Math.abs(phase - 0.25) <= 0.015 ? 'First Quarter'
    : Math.abs(phase - 0.5) <= 0.015 ? 'Full Moon'
    : Math.abs(phase - 0.75) <= 0.015 ? 'Last Quarter'
    : phase < 0.25 ? 'Waxing Crescent'
    : phase < 0.5 ? 'Waxing Gibbous'
    : phase < 0.75 ? 'Waning Gibbous'
    : 'Waning Crescent';

  if (!doc) return { when: when, timeZone: timeZone, place: place, elongation: elongation, phase: phase, fraction: fraction, name: name };

  var setText = function (selector, text) {
    var el = doc.querySelector(selector);
    if (el && text) el.textContent = text;
  };
  var format = function (options) {
    options.timeZone = timeZone;
    return new Intl.DateTimeFormat('en-US', options).format(when);
  };

  setText('.hero-phase-name span', name);
  setText('.date-text-desktop', format({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  setText('.date-text-mobile', format({ month: 'short', day: 'numeric', year: 'numeric' }));
  setText('.location-trigger-label', place.name);

  var moon = doc.querySelector('.moon-container');
  if (moon) moon.setAttribute('aria-label', 'The Moon: ' + name + ', ' + (fraction * 100).toFixed(1) + ' percent illuminated');

  // The terminator, drawn exactly as litPath (src/utils/moonPath.js) draws it
  var path = doc.querySelector('.moon-viz-fallback svg path');
  var svg = path && path.ownerSVGElement;
  if (path && svg) {
    var size = +svg.getAttribute('width') || 200;
    var r = size / 2;
    var waxing = phase <= 0.5;
    var rx = Math.max(0.01, Math.abs(Math.cos(phase * 2 * Math.PI)) * (r - 0.5));
    var inner = phase > 0.25 && phase < 0.75 ? (waxing ? 1 : 0) : (waxing ? 0 : 1);
    path.setAttribute('d', 'M ' + r + ',0.5 A ' + (r - 0.5) + ',' + (r - 0.5) + ' 0 0 ' + (waxing ? 1 : 0) + ' ' +
      r + ',' + (size - 0.5) + ' A ' + rx + ',' + (r - 0.5) + ' 0 0 ' + inner + ' ' + r + ',0.5 Z');
  }
  return null;
}
