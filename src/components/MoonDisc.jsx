import React from 'react';
import { litPath, shadePhases, earthshine, SHADE_STEPS } from '../utils/moonPath';

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
    <defs>
      {/* The day side brightens in steps from the terminator (see shadePhases) */}
      <mask id="moon-disc-phase" style={{ maskType: 'alpha' }}>
        {shadePhases(phase).map((shifted, step) => (
          <path key={step} d={litPath(shifted, SIZE)} fill="#fff" fillOpacity={(1 / (SHADE_STEPS - step)).toFixed(4)} />
        ))}
      </mask>
      {/* Earthshine as the 3D Moon renders it at New Moon: dark and cool, with
          the maria sinking to black while the highlands still show. Fitted to its
          pixels; the night side's opacity scales it down for other phases. */}
      <filter id="moon-disc-earthshine" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="linear" slope="0.24" intercept="-0.104" />
          <feFuncG type="linear" slope="0.3" intercept="-0.129" />
          <feFuncB type="linear" slope="0.4" intercept="-0.139" />
        </feComponentTransfer>
      </filter>
    </defs>
    {/* The Moon is solid: its night side hides the stars behind it */}
    <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 0.5} fill="#000104" />
    {/* The one photograph, drawn twice: once more through the earthshine filter
        for the night side, then as itself through the day side's mask. <use>
        draws it again without putting the inlined image in the page twice. */}
    <use href="#moon-disc-photo" filter="url(#moon-disc-earthshine)" opacity={earthshine(phase).toFixed(4)} />
    <g mask="url(#moon-disc-phase)">
      {/* Decoded with the frame that first shows it, not after: left to decode on
          its own, the first frame painted without it and the photo waited behind
          the app's start-up work, which made it the page's slowest paint */}
      <image id="moon-disc-photo" href={DISC_SRC} width={SIZE} height={SIZE} decoding="sync" />
    </g>
  </svg>
);

export default MoonDisc;
