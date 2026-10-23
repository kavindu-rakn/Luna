// The reward for staying (Phase 6c): three prototypes for the owner to choose
// between, each a quiet change in the sky after a while on the page.
//
//   eyes    Your eyes adjust: over a minute and a half the fainter stars come out,
//           down to magnitude 6.5, and the Moon's night side brightens a touch, as
//           they do when you stay out under a dark sky
//   lines   The constellation draws itself: the stick figures of the constellation
//           the Moon is in and its neighbours on screen trace themselves, its name
//           fades in, and all fade away. The Moon is drawn many times its true
//           size, so it hides most of its own constellation: alone, Aries or
//           Cancer would draw entirely behind it.
//   halo    A lunar halo: a faint ring 22° from the Moon, as ice crystals in high
//           thin cloud make it, glows up and fades
//
// How each one runs, in seconds, shared by the scene (which draws it) and the page
// (which names the constellation). Pure, so the tests run it.

export const REWARDS = ['eyes', 'lines', 'halo'];

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Dark adaptation takes far longer, but its first stage is a few minutes
export const EYES_S = 90;
// How far it has come, 0 to 1. It stays: the eyes keep it while you stay.
export const eyesAt = (t) => smooth(t / EYES_S);
// The Moon's night side at full adaptation, against before
export const EARTHSHINE_GAIN = 1.6;

export const LINES_S = { draw: 4, hold: 8, fade: 3 };
// How much of the figure is drawn (0 to 1) and how strongly it shows; null once
// it has gone
export const linesAt = (t) => {
  const { draw, hold, fade } = LINES_S;
  if (t >= draw + hold + fade) return null;
  return {
    drawn: smooth(t / draw),
    light: Math.min(1, t / 0.5) * (1 - smooth((t - draw - hold) / fade))
  };
};
// The name fades in as the drawing finishes, and out with it
export const NAME_IN_S = LINES_S.draw * 0.6;
export const NAME_OUT_S = LINES_S.draw + LINES_S.hold;

export const HALO_S = { rise: 6, hold: 10, fade: 8 };
// The 22° halo's radius: the least deviation of light through ice's 60° prisms
export const HALO_RADIUS = 22;
// How strongly it shows, 0 to 1; null once it has gone
export const haloAt = (t) => {
  const { rise, hold, fade } = HALO_S;
  if (t >= rise + hold + fade) return null;
  return smooth(t / rise) * (1 - smooth((t - rise - hold) / fade));
};

// Figures' lines as segments, each with how far along its own figure it starts
// and ends (0 to 1), and which figure it belongs to: every figure draws at the same
// time, each at one steady pace. A figure is a list of lines, each J2000 right
// ascension and declination pairs in degrees, one after another; toVector turns a
// pair into a unit vector.
export const figureSegments = (figures, toVector) => figures.flatMap((lines, figure) => {
  const segments = [];
  let total = 0;
  for (const line of lines) {
    for (let i = 0; i + 3 < line.length; i += 2) {
      const a = toVector(line[i], line[i + 1]);
      const b = toVector(line[i + 2], line[i + 3]);
      const angle = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      segments.push({ a, b, from: total, to: total + angle });
      total += angle;
    }
  }
  return segments.map((s) => ({ ...s, figure, from: s.from / total, to: s.to / total }));
});

// How strongly a figure's segment shows: the Moon's own constellation fully, its
// neighbours less, and less still towards the screen's edges, so the drawing
// gathers round the Moon. `reach` is the segment's middle's distance from the
// Moon, as a share of half the screen's diagonal.
export const segmentLight = (figure, reach) =>
  figure === 0 ? 1 : 0.7 * (1 - smooth((reach - 0.4) / 0.55));

// Where to name a figure on screen, in pixels from the Moon's centre: the middle of
// its points that are on screen, with the whole name clear of the Moon (a circle of
// radius `clear`) and inside `bounds` ([left, right, top, bottom], from the Moon's
// centre). `half` is half the name's width and height. Pushed straight out from
// the Moon if it falls on it; above the Moon if the sides have no room, as on a
// phone, where the Moon all but fills the width; below if above has none either.
export const namePlace = (points, clear, half, bounds) => {
  if (!points.length) return null;
  const [hw, hh] = half;
  const [left, right, top, bottom] = bounds;
  const within = ([x, y]) => [Math.max(left + hw, Math.min(right - hw, x)), Math.max(top + hh, Math.min(bottom - hh, y))];
  const onMoon = ([x, y]) => Math.hypot(Math.max(Math.abs(x) - hw, 0), Math.max(Math.abs(y) - hh, 0)) < clear;
  let x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  let y = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const r = Math.hypot(x, y);
  if (r < 1) [x, y] = [0, -1];
  if (onMoon([x, y])) {
    const [ux, uy] = r < 1 ? [0, -1] : [x / r, y / r];
    const reach = clear + Math.abs(ux) * hw + Math.abs(uy) * hh;
    [x, y] = [ux * reach, uy * reach];
  }
  const place = within([x, y]);
  if (!onMoon(place)) return place;
  const above = within([0, -(clear + hh)]);
  return onMoon(above) ? within([0, clear + hh]) : above;
};
