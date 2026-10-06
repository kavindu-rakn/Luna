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

  // How the Moon stands in this place's sky, as getMoonView works it out
  // (src/utils/moonView.js) but to the Astronomical Almanac's low precision, a few
  // tenths of a degree: the lit shape's phase, which way its bright limb faces, and
  // where its north pole points, both anticlockwise from the zenith
  var lat = coords ? coords[0] : isFinite(place.lat) ? +place.lat : 51.4769;
  var lon = coords ? coords[1] : isFinite(place.lon) ? +place.lon : -0.0005;
  lat = Math.max(-89.999, Math.min(89.999, lat));
  var sin = function (x) { return Math.sin(x * rad); };
  var cos = function (x) { return Math.cos(x * rad); };
  var lam = 218.32 + 481267.881 * T + 6.29 * sin(135 + 477198.87 * T) - 1.27 * sin(259.3 - 413335.36 * T) +
    0.66 * sin(235.7 + 890534.22 * T) + 0.21 * sin(269.9 + 954397.74 * T) - 0.19 * sin(357.5 + 35999.05 * T) -
    0.11 * sin(186.5 + 966404.03 * T);
  var bet = 5.13 * sin(93.3 + 483202.02 * T) + 0.28 * sin(228.2 + 960400.89 * T) - 0.28 * sin(318.3 + 6003.15 * T) -
    0.17 * sin(217.6 - 407332.21 * T);
  var ms = 357.529 + 35999.05 * T;
  var lamSun = 280.466 + 36000.77 * T + 1.915 * sin(ms) + 0.02 * sin(2 * ms);
  var eps = 23.439 - 0.013 * T;
  var equatorial = function (l, b) {
    return [
      Math.atan2(sin(l) * cos(eps) - Math.tan(b * rad) * sin(eps), cos(l)) / rad,
      Math.asin(sin(b) * cos(eps) + cos(b) * sin(eps) * sin(l)) / rad
    ];
  };
  var moonEq = equatorial(lam, bet);
  var sunEq = equatorial(lamSun, 0);
  var hour = 280.46061837 + 360.98564736629 * T * 36525 + lon - moonEq[0];
  var q = Math.atan2(sin(hour), Math.tan(lat * rad) * cos(moonEq[1]) - sin(moonEq[1]) * cos(hour)) / rad;
  var limb = Math.atan2(cos(sunEq[1]) * sin(sunEq[0] - moonEq[0]),
    sin(sunEq[1]) * cos(moonEq[1]) - cos(sunEq[1]) * sin(moonEq[1]) * cos(sunEq[0] - moonEq[0])) / rad;
  var node = 125.045 - 1934.136 * T;
  var inc = 1.54242;
  var libB = Math.asin(-sin(lam - node) * cos(bet) * sin(inc) - sin(bet) * cos(inc)) / rad;
  var axX = sin(inc) * sin(node);
  var axY = sin(inc) * cos(node) * cos(eps) - cos(inc) * sin(eps);
  var axis = Math.asin(Math.sqrt(axX * axX + axY * axY) * cos(moonEq[0] - Math.atan2(axX, axY) / rad) / cos(libB)) / rad;
  var view = {
    litPhase: Math.acos(cos(bet) * cos(lam - lamSun)) / rad / 360,
    limbAngle: (((limb - q) % 360) + 360) % 360,
    poleAngle: ((((axis - q) % 360) + 540) % 360) - 180
  };

  if (!doc) return { when: when, timeZone: timeZone, place: place, elongation: elongation, phase: phase, fraction: fraction, name: name, view: view };

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

  // The 2D Moon, as MoonDisc draws it: earthshine on the night side, as earthshine
  // sets it; the lit part in its shading steps, as shadePhases and litPath draw them
  // with the bright limb on the right (src/utils/moonPath.js), turned to face the
  // Sun; and the photograph turned to the Moon's tilt
  var litPhase = view.litPhase;
  var night = doc.querySelector('.moon-viz-fallback svg use');
  if (night) night.setAttribute('opacity', ((1 + Math.cos(litPhase * 2 * Math.PI)) / 2).toFixed(4));
  var turn = function (selector, angle) {
    var el = doc.querySelector(selector);
    if (el) el.setAttribute('transform', 'rotate(' + +angle.toFixed(2) + ' 100 100)');
  };
  turn('.moon-viz-fallback mask g', 270 - view.limbAngle);
  turn('.moon-viz-fallback image', -view.poleAngle);
  var paths = doc.querySelectorAll('.moon-viz-fallback svg path');
  var svg = paths.length && paths[0].ownerSVGElement;
  if (svg) {
    var size = +svg.getAttribute('width') || 200;
    var r = size / 2;
    var E = litPhase * 2 * Math.PI;
    for (var step = 0; step < paths.length; step++) {
      var t = step ? 1.193 * Math.pow(0.1 + 0.9 * (step + 0.5) / paths.length, 2) : 0;
      var p = litPhase - Math.atan2(t * Math.sin(E), 2 - t + t * Math.cos(E)) / (2 * Math.PI);
      var rx = +Math.max(0.01, Math.abs(Math.cos(p * 2 * Math.PI)) * (r - 0.5)).toFixed(2);
      paths[step].setAttribute('d', 'M ' + r + ',0.5 A ' + (r - 0.5) + ',' + (r - 0.5) + ' 0 0 1 ' +
        r + ',' + (size - 0.5) + ' A ' + rx + ',' + (r - 0.5) + ' 0 0 ' + (p > 0.25 ? 1 : 0) + ' ' + r + ',0.5 Z');
    }
  }
  return null;
}
