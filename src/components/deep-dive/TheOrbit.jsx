import React from 'react';
import Fresh from './Fresh';

// The diagram's own coordinates: Earth in the middle, sunlight from the right
const WIDTH = 360;
const HEIGHT = 216;
const EARTH = { x: WIDTH / 2, y: HEIGHT / 2, r: 14 };
const ORBIT_R = 84;
const MOON_R = 7;

// A disc lit on its right half, the side facing the Sun. Seen from above, the lit
// half of Earth and of the Moon always faces the Sun, wherever the Moon is.
const HalfLit = ({ x, y, r, day, night }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={night} />
    <path d={`M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} Z`} fill={day} />
  </g>
);

// The Orbit (decisions E3, E8): the Earth-Moon system from above Earth's north
// pole, as a flat diagram, and the one number only it shows, how far round from
// the Sun the Moon has come.
const TheOrbit = ({ lunarDetails }) => {
  const { phase, name } = lunarDetails;

  // The Moon's angle east of the Sun (its elongation) is its place on the orbit:
  // New Moon between Earth and the Sun, Full Moon on the far side. The Moon goes
  // round anticlockwise seen from the north; screen y runs down.
  const angle = phase * 2 * Math.PI;
  const moon = { x: EARTH.x + ORBIT_R * Math.cos(angle), y: EARTH.y - ORBIT_R * Math.sin(angle) };
  const elongation = phase * 360;
  const east = elongation <= 180;
  const degrees = Math.round(east ? elongation : 360 - elongation);
  // The Moon's label sits outside the orbit, away from Earth
  const label = { x: EARTH.x + (ORBIT_R + 20) * Math.cos(angle), y: EARTH.y - (ORBIT_R + 20) * Math.sin(angle) };

  return (
    <section className="dd-card" aria-labelledby="dd-orbit-heading">
      <h3 id="dd-orbit-heading" className="dd-card-title">The Orbit</h3>

      <div className="dd-orbit-frame">
        <svg
          className="dd-orbit"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`The Moon's place in its orbit, seen from above Earth's north pole with sunlight from the right: ${name}, ${degrees} degrees ${east ? 'east' : 'west'} of the Sun.`}
        >
          {/* Sunlight comes from the right, where the frame glows */}
          <text className="dd-orbit-label is-sun" x={WIDTH - 12} y={22} textAnchor="end">Sunlight</text>

          <circle className="dd-orbit-path" cx={EARTH.x} cy={EARTH.y} r={ORBIT_R} />
          <line className="dd-orbit-reach" x1={EARTH.x} y1={EARTH.y} x2={moon.x} y2={moon.y} />

          <HalfLit x={EARTH.x} y={EARTH.y} r={EARTH.r} day="#6f8fc7" night="#162238" />
          <text className="dd-orbit-label" x={EARTH.x} y={EARTH.y + EARTH.r + 14} textAnchor="middle">Earth</text>

          <HalfLit x={moon.x} y={moon.y} r={MOON_R} day="#e6e9f2" night="#2a2f3d" />
          <text
            className="dd-orbit-label"
            x={label.x}
            y={label.y + 4}
            textAnchor={Math.abs(label.x - EARTH.x) < 12 ? 'middle' : label.x > EARTH.x ? 'start' : 'end'}
          >
            Moon
          </text>
        </svg>
      </div>

      <dl className="dd-split">
        <div className="dd-tile">
          <dt>From the Sun</dt>
          <dd className="dd-value">
            <Fresh value={`${degrees} ${east}`}>{degrees}° {east ? 'east' : 'west'}</Fresh>
          </dd>
          <dd className="dd-sub">{east ? 'Follows the Sun into the evening' : 'Rises ahead of the Sun'}</dd>
        </div>
      </dl>

      <p className="dd-caption">
        Seen from above Earth&rsquo;s north pole. How much of the Moon&rsquo;s sunlit half faces Earth makes its phase.
      </p>
    </section>
  );
};

export default TheOrbit;
