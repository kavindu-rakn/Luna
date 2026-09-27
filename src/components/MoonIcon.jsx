import React from 'react';
import { litPath } from '../utils/moonPath';

// SVG Moon with a terminator ellipse, for the timeline and calendar glyphs
const MoonIcon = ({ phase, size = 20, title, style }) => {
  const r = size / 2;
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
      <path d={litPath(phase, size)} fill="#e2e8f0" />
    </svg>
  );
};

export default MoonIcon;
