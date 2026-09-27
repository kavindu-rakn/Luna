import React from 'react';
import { litPath } from '../utils/moonPath';

// A photograph of the near side (public/moon-disc.webp: moon_1024.jpg projected
// orthographically, north up, 360px WebP) with the phase cut out of it. It is the
// Moon of the first frame, the stand-in while the 3D Moon loads, and the Moon itself
// where WebGL is missing. Regenerate it whenever the Moon texture changes.
//
// The build inlines the image into the prerendered page, so the first frame paints
// it without another request; it is that frame's largest paint. Picking up the same
// data: URI here means the live app draws the image the browser already has
// decoded, rather than fetching it again and flickering.
const shellImage = typeof document !== 'undefined'
  ? document.querySelector('.moon-viz-fallback image')?.getAttribute('href')
  : null;
const DISC_SRC = shellImage?.startsWith('data:') ? shellImage : `${import.meta.env.BASE_URL}moon-disc.webp`;

const SIZE = 200;

const MoonDisc = ({ phase }) => (
  <svg
    width={SIZE}
    height={SIZE}
    viewBox={`0 0 ${SIZE} ${SIZE}`}
    style={{ display: 'block', width: '100%', height: '100%' }}
    aria-hidden="true"
  >
    {/* One photograph through an alpha mask: fully shown where lit, and faintly
        on the night side, as earthshine shows it. Drawing it twice instead would
        put the inlined image in the page twice. */}
    <defs>
      <mask id="moon-disc-phase" style={{ maskType: 'alpha' }}>
        <rect width={SIZE} height={SIZE} fill="#fff" fillOpacity="0.12" />
        <path d={litPath(phase, SIZE)} fill="#fff" />
      </mask>
    </defs>
    {/* The Moon is solid: its night side hides the stars behind it */}
    <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 0.5} fill="#07090f" />
    {/* Decoded with the frame that first shows it, not after: left to decode on
        its own, the first frame painted without it and the photo waited behind
        the app's start-up work, which made it the page's slowest paint */}
    <image href={DISC_SRC} width={SIZE} height={SIZE} mask="url(#moon-disc-phase)" decoding="sync" />
  </svg>
);

export default MoonDisc;
