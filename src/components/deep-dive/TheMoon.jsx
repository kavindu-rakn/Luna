import React, { useMemo } from 'react';
import Fresh from './Fresh';
import { MIN_MOON_DISTANCE, MAX_MOON_DISTANCE, MEAN_MOON_DISTANCE, getSynodicCycle } from '../../utils/lunarCalc';
import { formatDistance, formatDistanceThousands } from '../../utils/units';

const NEXT_PHASES = [
  ['nextNewMoon', 'New Moon'],
  ['nextFirstQuarter', 'First Quarter'],
  ['nextFullMoon', 'Full Moon'],
  ['nextLastQuarter', 'Last Quarter']
];

// The Moon (decisions E3, E5): three quiet cards. Its phase, with how much of it is
// lit and how old it is as the chapter's figures; how far away it is, between
// perigee and apogee; and where it is against the zodiac, with when the next exact
// phase comes.
const TheMoon = ({ lunarDetails, distanceUnit }) => {
  const { date, name, isExactPrimary, fraction, age, distanceKm, distancePercent, zodiac, nextPhases } = lunarDetails;
  // The same solved cycle the timeline spans, so the two always agree
  const cycleDays = useMemo(() => getSynodicCycle(date).durationDays, [date]);

  let next = null;
  for (const [key, label] of NEXT_PHASES) {
    const phase = nextPhases?.[key];
    if (phase && (!next || phase.msRemaining < next.msRemaining)) next = { label, ...phase };
  }
  const distance = formatDistance(distanceKm || MEAN_MOON_DISTANCE, distanceUnit);

  return (
    <section className="dd-group" aria-labelledby="dd-moon-heading">
      <div className="dd-card">
        <div className="dd-card-head">
          <h3 id="dd-moon-heading" className="dd-card-title">The Moon</h3>
          {isExactPrimary && <span className="dd-exact">Exact</span>}
        </div>
        <Fresh value={name} className="dd-phase-name font-serif" />
        <dl className="dd-grid dd-split">
          <div className="dd-tile">
            <dt>Illumination</dt>
            <dd className="dd-figure font-serif">
              <Fresh value={fraction} />
              <span className="dd-unit is-attached">%</span>
            </dd>
          </div>
          <div className="dd-tile">
            <dt>Age</dt>
            <dd className="dd-figure font-serif">
              <Fresh value={age} />
              <span className="dd-unit">days</span>
            </dd>
            {/* The length of this particular cycle, New Moon to New Moon: they run
                from about 29.3 to 29.8 days */}
            <dd className="dd-sub">of a {cycleDays.toFixed(2)}-day cycle</dd>
          </div>
        </dl>
      </div>

      <div className="dd-card">
        <div className="dd-card-head">
          <h4 className="dd-card-title">Distance</h4>
          <span className="dd-value">
            <Fresh value={distance} /> <span className="dd-unit">{distanceUnit}</span>
          </span>
        </div>
        <div className="dd-gauge" aria-hidden="true">
          <span className="dd-gauge-fill" style={{ width: `${distancePercent}%` }} />
        </div>
        <div className="dd-gauge-ends">
          <span>Perigee {formatDistanceThousands(MIN_MOON_DISTANCE, distanceUnit)}</span>
          <span>Apogee {formatDistanceThousands(MAX_MOON_DISTANCE, distanceUnit)}</span>
        </div>
      </div>

      <dl className="dd-card dd-grid is-roomy">
        <div className="dd-tile">
          <dt>Zodiac</dt>
          <dd className="dd-value">
            <span className="zodiac-glyph" aria-hidden="true">{zodiac?.symbol}</span>{' '}
            <Fresh value={zodiac?.name} />
          </dd>
          <dd className="dd-sub">{zodiac?.degreeInSign} tropical</dd>
          {zodiac?.sidereal && (
            <dd className="dd-sub">{zodiac.sidereal.name} {zodiac.sidereal.degreeInSign} sidereal</dd>
          )}
        </div>
        {next && (
          <div className="dd-tile">
            <dt>Next {next.label}</dt>
            <dd className="dd-value"><Fresh value={next.countdown} /></dd>
            <dd className="dd-sub">{next.formatted}</dd>
          </div>
        )}
      </dl>
    </section>
  );
};

export default TheMoon;
