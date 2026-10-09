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

// The Moon (decisions E3, E5): its phase, how much of it is lit and how old it is
// as the chapter's figures, then where it is in its orbit's range, against the
// zodiac, and when the next exact phase comes.
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
    <section className="dd-chapter" aria-labelledby="dd-moon-heading">
      <h3 id="dd-moon-heading" className="dd-chapter-title">The Moon</h3>

      <div className="dd-phase">
        <Fresh value={name} className="dd-phase-name font-serif" />
        {isExactPrimary && <span className="dd-exact">Exact</span>}
      </div>

      <div className="dd-figures">
        <div className="dd-figure">
          <span className="dd-figure-value font-serif">
            <Fresh value={fraction} />
            <span className="dd-figure-unit">%</span>
          </span>
          <span className="dd-figure-key">lit</span>
        </div>
        <div className="dd-figure">
          <span className="dd-figure-value font-serif">
            <Fresh value={age} />
            <span className="dd-figure-unit"> days</span>
          </span>
          {/* The length of this particular cycle, New Moon to New Moon: they run
              from about 29.3 to 29.8 days */}
          <span className="dd-figure-key">old, of a {cycleDays.toFixed(2)}-day cycle</span>
        </div>
      </div>

      <dl className="dd-rows">
        <div className="dd-row dd-row-distance">
          <dt>Distance</dt>
          <dd><Fresh value={distance} /> <span className="dd-note">{distanceUnit}</span></dd>
          <div className="dd-scale" aria-hidden="true">
            <span className="dd-scale-track">
              <span className="dd-scale-mark" style={{ left: `${distancePercent}%` }} />
            </span>
            <span className="dd-scale-ends">
              <span>Perigee {formatDistanceThousands(MIN_MOON_DISTANCE, distanceUnit)}</span>
              <span>Apogee {formatDistanceThousands(MAX_MOON_DISTANCE, distanceUnit)}</span>
            </span>
          </div>
        </div>
        <div className="dd-row">
          <dt>Zodiac</dt>
          <dd>
            <span className="zodiac-glyph" aria-hidden="true">{zodiac?.symbol}</span>{' '}
            <Fresh value={`${zodiac?.name} ${zodiac?.degreeInSign}`}>{zodiac?.name} {zodiac?.degreeInSign}</Fresh>
            {zodiac?.sidereal && (
              <span className="dd-note dd-sub">tropical · {zodiac.sidereal.name} {zodiac.sidereal.degreeInSign} sidereal</span>
            )}
          </dd>
        </div>
        {next && (
          <div className="dd-row">
            <dt>Next</dt>
            <dd>
              <Fresh value={`${next.label} ${next.countdown}`}>{next.label} {next.countdown}</Fresh>
              <span className="dd-note dd-sub">{next.formatted}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
};

export default TheMoon;
