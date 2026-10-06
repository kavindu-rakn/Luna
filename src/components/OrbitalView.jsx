import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { MEAN_MOON_DISTANCE } from '../utils/lunarCalc';
import { formatDistance } from '../utils/units';

// The diagram's own coordinates: Earth in the middle, sunlight from the right
const WIDTH = 400;
const HEIGHT = 240;
const EARTH = { x: WIDTH / 2, y: HEIGHT / 2, r: 15 };
const ORBIT_R = 92;
const MOON_R = 7;

// A disc lit on its right half, the side facing the Sun. Seen from above, the lit
// half of Earth and of the Moon always faces the Sun, wherever the Moon is.
const HalfLit = ({ x, y, r, day, night }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={night} />
    <path d={`M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} Z`} fill={day} />
  </g>
);

// The Earth-Moon system from above Earth's north pole, as a flat diagram. It used
// to be a second WebGL scene with a 512 KB Earth texture and its own render loop;
// this says the same thing, crisply, at any size (decision E8).
const OrbitalView = ({ lunarDetails, distanceUnit = 'km' }) => {
  const { phase, name, fraction, distanceKm } = lunarDetails;
  const [showExplanation, setShowExplanation] = useState(false);

  // The Moon's angle east of the Sun (its elongation) is its place on the orbit:
  // New Moon between Earth and the Sun, Full Moon on the far side. The Moon goes
  // round anticlockwise seen from the north; screen y runs down.
  const angle = phase * 2 * Math.PI;
  const moon = { x: EARTH.x + ORBIT_R * Math.cos(angle), y: EARTH.y - ORBIT_R * Math.sin(angle) };

  return (
    <section className="telemetry-section orbital-card">
      <div className="orbital-header">
        <h3 className="utility-label orbital-title">
          Earth–Moon Orbital Geometry
        </h3>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="ghost-control-btn orbital-explain"
          title="Explain orbital view"
          aria-label="Toggle Orbital View Explanation"
          aria-expanded={showExplanation}
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {showExplanation && (
        <div className="orbital-explanation">
          <strong>Astronomical Context:</strong> Seen from above Earth&rsquo;s north pole, sunlight arrives from the right. As the Moon revolves around Earth, the illuminated portion visible from Earth produces the lunar phase cycle.
        </div>
      )}

      <div className="orbital-canvas-wrap">
        <svg
          className="orbital-diagram"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`The Moon's place in its orbit, seen from above Earth's north pole with sunlight from the right: ${name}.`}
        >
          {/* Sunlight: faint parallel rays from the right */}
          <g stroke="rgba(255, 236, 196, 0.16)" strokeWidth="1" strokeLinecap="round">
            {[-72, -36, 0, 36, 72].map((dy) => (
              <line key={dy} x1={WIDTH - 12} y1={EARTH.y + dy} x2={WIDTH - 58} y2={EARTH.y + dy} />
            ))}
          </g>

          {/* The orbit, and the line from Earth to the Moon */}
          <circle cx={EARTH.x} cy={EARTH.y} r={ORBIT_R} fill="none" stroke="rgba(141, 157, 214, 0.45)" strokeWidth="1" />
          <line x1={EARTH.x} y1={EARTH.y} x2={moon.x} y2={moon.y} stroke="rgba(165, 180, 252, 0.28)" strokeWidth="1" strokeDasharray="2 4" />

          <HalfLit x={EARTH.x} y={EARTH.y} r={EARTH.r} day="#6f8fc7" night="#162238" />

          {/* A soft halo marks the Moon's place */}
          <circle cx={moon.x} cy={moon.y} r={MOON_R + 6} fill="rgba(165, 180, 252, 0.1)" />
          <HalfLit x={moon.x} y={moon.y} r={MOON_R} day="#e6e9f2" night="#2a2f3d" />
        </svg>

        <div className="orbital-sunlight" aria-hidden="true">
          ☀ Sunlight from Right
        </div>
      </div>

      {/* Current phase context, kept alongside the orbital figure */}
      <div className="orbital-readout">
        <div className="orbital-reading orbital-reading-phase">
          <div className="utility-label orbital-reading-label">Phase Name</div>
          <div className="font-serif orbital-phase-value">
            {name}
          </div>
        </div>

        <div className="orbital-reading orbital-reading-illumination">
          <div className="utility-label orbital-reading-label">Illumination</div>
          <div className="orbital-illumination-value">
            {fraction}%
          </div>
        </div>

        <div className="orbital-reading orbital-reading-distance">
          <div className="utility-label orbital-reading-label">Distance</div>
          <div className="orbital-distance-value">
            {formatDistance(distanceKm || MEAN_MOON_DISTANCE, distanceUnit)} <span>{distanceUnit}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrbitalView;
