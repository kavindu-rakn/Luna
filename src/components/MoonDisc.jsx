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

// SVG turns clockwise; the angles here are anticlockwise from straight up
const turn = (angle) => `rotate(${+angle.toFixed(2)} ${SIZE / 2} ${SIZE / 2})`;

// The Moon as getMoonView (src/utils/moonView.js) says it stands in the sky: the
// photograph turned so its north pole points where the Moon's does with the
// observer's zenith up, and the lit shape turned so the bright limb faces the Sun.
// The photograph shows the mean near side; the 3D Moon fades in at that same pose
// and then nods into the libration of the moment. Mirrored in src/shell/paintNow.js.
const MoonDisc = ({ view: { litPhase, limbAngle, poleAngle } }) => (
  <svg
    width={SIZE}
    height={SIZE}
    viewBox={`0 0 ${SIZE} ${SIZE}`}
    style={{ display: 'block', width: '100%', height: '100%' }}
    aria-hidden="true"
  >
    <defs>
      {/* The day side brightens in steps from the terminator (see shadePhases),
          drawn with the bright limb on the right and turned to face the Sun */}
      <mask id="moon-disc-phase" style={{ maskType: 'alpha' }}>
        <g transform={turn(270 - limbAngle)}>
          {shadePhases(litPhase).map((shifted, step) => (
            <path key={step} d={litPath(shifted, SIZE)} fill="#fff" fillOpacity={(1 / (SHADE_STEPS - step)).toFixed(4)} />
          ))}
        </g>
      </mask>
      {/* Earthshine as the 3D Moon renders it at New Moon: dark and cool, with
          the maria sinking towards black while the highlands still show. Fitted
          to the 3D Moon's own lighting and tone curve, to within two levels in
          255; the night side's opacity scales it down for other phases. */}
      <filter id="moon-disc-earthshine" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="0.255" exponent="3.05" offset="0.0145" />
          <feFuncG type="gamma" amplitude="0.294" exponent="2.9" offset="0.0205" />
          <feFuncB type="gamma" amplitude="0.405" exponent="2.75" offset="0.0446" />
        </feComponentTransfer>
      </filter>
    </defs>
    {/* The Moon is solid: its night side hides the stars behind it */}
    <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 0.5} fill="#000104" />
    {/* The one photograph, drawn twice: once more through the earthshine filter
        for the night side, then as itself through the day side's mask. <use>
        draws it again without putting the inlined image in the page twice. */}
    <use href="#moon-disc-photo" filter="url(#moon-disc-earthshine)" opacity={earthshine(litPhase).toFixed(4)} />
    <g mask="url(#moon-disc-phase)">
      {/* Decoded with the frame that first shows it, not after: left to decode on
          its own, the first frame painted without it and the photo waited behind
          the app's start-up work, which made it the page's slowest paint */}
      <image id="moon-disc-photo" href={DISC_SRC} width={SIZE} height={SIZE} transform={turn(-poleAngle)} decoding="sync" />
    </g>
  </svg>
);

export default MoonDisc;
