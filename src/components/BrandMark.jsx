import React from 'react';

// Luna's crescent (decision B1), redrawn from the original artwork as vectors so it
// is sharp at any size and needs no image request. The shapes are fitted to the
// old 128 px mark: a dark disc with a lit rim, and the crescent cut from one circle
// by another, its horns reaching just past the rim. The glow is the page's
// (.brand-mark in index.css), so the same mark can be drawn plain elsewhere.
const BrandMark = ({ className = 'brand-mark' }) => (
  <svg className={className} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
    <circle cx="117.11" cy="137.39" r="104.56" fill="#04060b" stroke="#eef1f8" strokeOpacity="0.92" strokeWidth="7" />
    <path d="M151.2 17.9A92.42 92.42 0 1 0 240.2 143.5A80.84 80.84 0 1 1 151.2 17.9Z" fill="#eef1f8" />
  </svg>
);

export default BrandMark;
