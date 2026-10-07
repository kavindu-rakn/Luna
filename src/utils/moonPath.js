// The lit part of a Moon of the given phase, as an SVG path over a size×size box:
// the bright limb's half-circle closed by the terminator's half-ellipse. Shared by
// MoonIcon and the photographic MoonDisc, and mirrored in src/shell/paintNow.js,
// which has to repeat it because it runs before any bundle.
//
// The terminator is a half-ellipse whose width follows the cosine of the elongation,
// so the lit area is exactly the illuminated fraction, (1 - cos) / 2. It used to be
// linear in phase, which drew a 16% crescent about 27% lit.
export const litPath = (phase, size) => {
  const r = size / 2;
  const isWaxing = phase <= 0.5;
  const moreThanHalf = phase > 0.25 && phase < 0.75;
  const sweepOuter = isWaxing ? 1 : 0;
  // To a hundredth: MoonDisc's mask holds dozens of these, and full precision
  // doubled their length for nothing visible
  const rx = +Math.max(0.01, Math.abs(Math.cos(phase * 2 * Math.PI)) * (r - 0.5)).toFixed(2);
  const sweepInner = moreThanHalf ? (isWaxing ? 1 : 0) : (isWaxing ? 0 : 1);
  return `M ${r},0.5 A ${r - 0.5},${r - 0.5} 0 0 ${sweepOuter} ${r},${size - 0.5} A ${rx},${r - 0.5} 0 0 ${sweepInner} ${r},0.5 Z`;
};

// The photographic MoonDisc fades its light towards the terminator as the 3D Moon
// does, so that one can stand in for the other. Lunar dust reflects by the
// Lommel-Seeliger law: with the sun at elongation E, ground δ of longitude past the
// terminator shines in proportion to 2 sin δ / (sin δ + sin(E − δ)), whatever its
// latitude. On screen the 3D Moon comes out close to the square root of that, with
// a toe that darkens the faintest light a little more. Its relief, which this
// can't follow, sits within that: sunlit crater rims near the terminator, shadows
// that darken rough ground some 20-35° in by about a fifth. The law is 1 all over a
// Full Moon but more towards a crescent's bright limb, so the photograph is stored
// brighter than the 3D Moon's Full Moon, shows at full strength where the law
// reaches SHADE_HEADROOM, and at 90% across a Full Moon.
//
// Equal steps of brightness therefore fall along meridians, and each is a lit
// shape of its own: the Moon's lit part with the sun δ further round. The disc
// stacks SHADE_STEPS of them in its mask, with opacities 1/n, 1/(n-1), … 1/1, so
// every step inwards from the terminator is 1/SHADE_STEPS brighter. Ten steps
// showed as stripes across the smooth maria; at 32 they don't. Each step
// starts where the light is half a step below its own level, so it shows the mean
// of the light it covers rather than its brightest; a Full Moon falls in the
// middle of a step, so a nearly full one has no step across its face. Mirrored in
// src/shell/paintNow.js, and measured against the 3D Moon's pixels.
export const SHADE_STEPS = 32;
export const SHADE_HEADROOM = 1.193;
export const SHADE_TOE = 0.1;

export const shadePhases = (phase) => {
  const waxing = phase <= 0.5;
  const elongation = (waxing ? phase : 1 - phase) * 2 * Math.PI;
  return Array.from({ length: SHADE_STEPS }, (_, step) => {
    // The law's value where the step starts, then the δ where it has that value.
    // Steps brighter than the Moon gets (all but the first at Full Moon) come out
    // as δ = E, an empty shape.
    const level = (step + 0.5) / SHADE_STEPS;
    const t = step ? SHADE_HEADROOM * (SHADE_TOE + (1 - SHADE_TOE) * level) ** 2 : 0;
    const delta = Math.atan2(t * Math.sin(elongation), 2 - t + t * Math.cos(elongation)) / (2 * Math.PI);
    return waxing ? phase - delta : phase + delta;
  });
};

// Earthshine on the night side, as the 3D Moon has it: Earth's lit fraction seen
// from the Moon (the Moon's unlit fraction seen from Earth), cubed so it is faint
// and shows only around thin crescents (F3). 1 at New Moon, 0 at Full. Mirrored in
// src/shell/paintNow.js.
export const earthshine = (phase) => ((1 + Math.cos(phase * 2 * Math.PI)) / 2) ** 3;

// The glow off the Moon's lit limb (decision F6): a soft halo, strongest at full,
// gathered on the bright limb's side while the Moon is thin. The page draws it
// behind the flat Moon (.moon-glow in index.css), from the first frame; the 3D
// scene draws the same gradient in its own sky (src/scene/sky.js), where it can
// drift with the Moon. Returns its CSS variables: the strength, and how far the
// halo's centre leans towards the bright limb, as a share of the glow's box.
// Mirrored in src/shell/paintNow.js.
export const GLOW_MAX = 0.2;
// In the box's own units, which span 3.8 Moon radii: up to a third of a radius
export const GLOW_LEAN = 0.33 / 3.8;

export const glowStyle = ({ litPhase, limbAngle }) => {
  const lit = (1 - Math.cos(litPhase * 2 * Math.PI)) / 2;
  const lean = GLOW_LEAN * (1 - lit) * 100;
  const a = (limbAngle * Math.PI) / 180;
  return {
    '--glow': (GLOW_MAX * lit ** 1.5).toFixed(3),
    '--glow-x': `${(-Math.sin(a) * lean).toFixed(2)}%`,
    '--glow-y': `${(-Math.cos(a) * lean).toFixed(2)}%`
  };
};
