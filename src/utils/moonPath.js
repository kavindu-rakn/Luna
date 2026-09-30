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
  const rx = Math.max(0.01, Math.abs(Math.cos(phase * 2 * Math.PI)) * (r - 0.5));
  const sweepInner = moreThanHalf ? (isWaxing ? 1 : 0) : (isWaxing ? 0 : 1);
  return `M ${r},0.5 A ${r - 0.5},${r - 0.5} 0 0 ${sweepOuter} ${r},${size - 0.5} A ${rx},${r - 0.5} 0 0 ${sweepInner} ${r},0.5 Z`;
};
