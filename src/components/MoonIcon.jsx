import React from 'react';

// SVG Moon with a terminator ellipse. Used for the timeline glyphs and, at full
// size, as the stand-in shown while the 3D scene loads or when WebGL is missing.
const MoonIcon = ({ phase, size = 20, title, style }) => {
  const r = size / 2;
  const illumination = phase <= 0.5 ? phase * 2 : 2 - phase * 2;
  const isWaxing = phase <= 0.5;
  const sweepOuter = isWaxing ? 1 : 0;
  const rx = Math.max(0.01, Math.abs(illumination * 2 - 1) * (r - 0.5));
  const sweepInner = illumination > 0.5 ? (isWaxing ? 1 : 0) : (isWaxing ? 0 : 1);

  const pathData = `M ${r},0.5 A ${r - 0.5},${r - 0.5} 0 0 ${sweepOuter} ${r},${size - 0.5} A ${rx},${r - 0.5} 0 0 ${sweepInner} ${r},0.5 Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx={r} cy={r} r={r - 0.5} fill="#111428" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />
      <path d={pathData} fill="#e2e8f0" />
    </svg>
  );
};

export default MoonIcon;
