import React, { useMemo, useRef } from 'react';
import Fresh from './Fresh';
import { getStartOfDayInZone, formatTimeString } from '../../utils/lunarCalc';
import { compassWord, getSkyDay } from '../../utils/skyDay';

// The chart's own coordinates. Altitude runs from 60° below the horizon to the
// zenith, so the horizon sits two fifths of the way up.
const WIDTH = 360;
const HEIGHT = 168;
const TOP = 10;
const BOTTOM = 144;
const LOW = -60;
const HIGH = 90;
const yOf = (altitude) => TOP + ((HIGH - Math.max(LOW, Math.min(HIGH, altitude))) / (HIGH - LOW)) * (BOTTOM - TOP);
const HORIZON = yOf(0);

// Steps for the keyboard, in minutes
const STEP = 15;
const BIG_STEP = 60;

const altitudeWords = (altitude) => {
  const degrees = Math.round(Math.abs(altitude));
  return altitude >= 0 ? `${degrees}° above the horizon` : `${degrees}° below the horizon`;
};

// Tonight (decisions E3, E7): the Moon's day at this place, as a chart and a few
// plain rows. Behind the Moon's altitude, the Sun's day and twilights; on it, where
// the Moon rises and sets; and a marker in the "now" amber that is the time being
// looked at. Dragging the marker, or the arrow keys on it, moves the time of day
// and everything else follows.
const Tonight = ({ currentDate, location, lunarDetails, clock, isLive, onSelectTime }) => {
  const { lat, lon, timeZone, name: placeName } = location;
  const dayStartMs = getStartOfDayInZone(currentDate, timeZone);
  // The day's sky depends on the day, not the time within it
  const sky = useMemo(
    () => getSkyDay(new Date(dayStartMs + 3600000), lat, lon, timeZone, clock),
    [dayStartMs, lat, lon, timeZone, clock]
  );
  const length = sky.dayEndMs - sky.dayStartMs;
  const fraction = Math.min(1, Math.max(0, (currentDate.getTime() - sky.dayStartMs) / length));
  const altitude = parseFloat(lunarDetails.altitude);
  const direction = compassWord(parseFloat(lunarDetails.azimuth));
  const time = formatTimeString(currentDate, timeZone, clock);
  const minutes = Math.round((fraction * length) / 60000);
  const where = altitude >= 0 ? `${altitudeWords(altitude)}, in the ${direction}` : altitudeWords(altitude);

  const title = isLive
    ? 'Tonight'
    : new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(currentDate);

  // The curve, and the parts above and below the horizon
  const line = sky.curve.map((p) => `${(p.fraction * WIDTH).toFixed(1)},${yOf(p.altitude).toFixed(1)}`).join(' ');
  const above = `M 0,${HORIZON} L ${line.replaceAll(' ', ' L ')} L ${WIDTH},${HORIZON} Z`;

  // Dragging the marker
  const chartRef = useRef(null);
  const dragging = useRef(false);
  // A time in the day, to the minute, stopping a minute short of the next midnight
  const timeAt = (f) => new Date(Math.round((sky.dayStartMs + Math.min(length - 60000, Math.max(0, f * length))) / 60000) * 60000);
  const fromPointer = (event) => {
    const rect = chartRef.current.getBoundingClientRect();
    onSelectTime(timeAt((event.clientX - rect.left) / rect.width));
  };
  const onPointerDown = (event) => {
    if (event.button > 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    fromPointer(event);
  };
  const onPointerMove = (event) => {
    if (dragging.current) fromPointer(event);
  };
  const onPointerEnd = () => {
    dragging.current = false;
  };
  const onKeyDown = (event) => {
    const step = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP, PageDown: -BIG_STEP, PageUp: BIG_STEP }[event.key];
    let next = null;
    if (step !== undefined) next = minutes + (event.shiftKey ? step * 4 : step);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = length / 60000 - 1;
    if (next === null) return;
    event.preventDefault();
    onSelectTime(timeAt((next * 60000) / length));
  };

  const sunWhenNone = sky.bands.length === 1
    ? (sky.bands[0].kind === 'day' ? 'Stays up all day' : 'Stays down all day')
    : 'None today';

  return (
    <section className="dd-chapter" aria-labelledby="dd-tonight-heading">
      <h3 id="dd-tonight-heading" className="dd-chapter-title">{title}</h3>

      <p className="dd-now-line">
        {isLive
          ? <>It&rsquo;s <span className="dd-now-time">{time}</span>. The Moon is {where}.</>
          : <>At <span className="dd-now-time">{time}</span> the Moon is {where}.</>}
      </p>

      <div
        ref={chartRef}
        className="dd-chart"
        role="slider"
        tabIndex={0}
        aria-label="Time of day"
        aria-valuemin={0}
        aria-valuemax={Math.round(length / 60000) - 1}
        aria-valuenow={minutes}
        aria-valuetext={`${time}, the Moon ${where}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="dd-above">
              <rect x="0" y="0" width={WIDTH} height={HORIZON} />
            </clipPath>
            <clipPath id="dd-below">
              <rect x="0" y={HORIZON} width={WIDTH} height={HEIGHT - HORIZON} />
            </clipPath>
          </defs>

          {/* The Sun's day and twilights, lightest by day */}
          {sky.bands.filter((b) => b.kind !== 'night').map((b) => (
            <rect
              key={`${b.kind}-${b.from}`}
              className={`dd-band is-${b.kind}`}
              x={b.from * WIDTH}
              y={TOP}
              width={Math.max(0, (b.to - b.from) * WIDTH)}
              height={BOTTOM - TOP}
            />
          ))}

          <line className="dd-horizon" x1="0" y1={HORIZON} x2={WIDTH} y2={HORIZON} />
          <text className="dd-chart-label" x="4" y={HORIZON - 5}>Horizon</text>

          {/* The Moon's altitude: bright above the horizon, faint below */}
          <path className="dd-curve-fill" d={above} clipPath="url(#dd-above)" />
          <polyline className="dd-curve is-up" points={line} clipPath="url(#dd-above)" />
          <polyline className="dd-curve is-down" points={line} clipPath="url(#dd-below)" />

          {/* Where it rises and sets */}
          {[sky.rise, sky.set].filter(Boolean).map((e) => (
            <circle key={e.fraction} className="dd-crossing" cx={e.fraction * WIDTH} cy={HORIZON} r="3" />
          ))}

          {/* The time being looked at */}
          <line className="dd-marker-line" x1={fraction * WIDTH} y1={TOP} x2={fraction * WIDTH} y2={BOTTOM} />
          <circle className="dd-marker-glow" cx={fraction * WIDTH} cy={yOf(altitude)} r="9" />
          <circle className="dd-marker" cx={fraction * WIDTH} cy={yOf(altitude)} r="4.5" />

          {sky.ticks.map((t) => (
            <text
              key={t.fraction}
              className="dd-tick"
              x={Math.max(0, t.fraction * WIDTH)}
              y={HEIGHT - 4}
              textAnchor={t.fraction < 0.02 ? 'start' : 'middle'}
            >
              {t.label}
            </text>
          ))}
        </svg>
      </div>

      <dl className="dd-rows">
        <div className="dd-row">
          <dt>Moonrise</dt>
          <dd>
            {sky.rise
              ? <><Fresh value={sky.rise.time} /> <span className="dd-note">{sky.rise.direction}</span></>
              : <span className="dd-note">None today</span>}
          </dd>
        </div>
        <div className="dd-row">
          <dt>Moonset</dt>
          <dd>
            {sky.set
              ? <><Fresh value={sky.set.time} /> <span className="dd-note">{sky.set.direction}</span></>
              : <span className="dd-note">None today</span>}
          </dd>
        </div>
        <div className="dd-row">
          <dt>Highest</dt>
          <dd>
            {sky.peak.altitude >= 0 ? (
              <>
                <Fresh value={`${Math.round(sky.peak.altitude)}° ${sky.peak.time}`}>
                  {Math.round(sky.peak.altitude)}° <span className="dd-note">at</span> {sky.peak.time}
                </Fresh>
                {' '}<span className="dd-note">{sky.peak.direction}</span>
              </>
            ) : (
              <span className="dd-note">Below the horizon all day</span>
            )}
          </dd>
        </div>
        <div className="dd-row">
          <dt>Sunrise</dt>
          <dd>{sky.sunrise ? <Fresh value={sky.sunrise} /> : <span className="dd-note">{sunWhenNone}</span>}</dd>
        </div>
        <div className="dd-row">
          <dt>Sunset</dt>
          <dd>{sky.sunset ? <Fresh value={sky.sunset} /> : <span className="dd-note">{sunWhenNone}</span>}</dd>
        </div>
      </dl>

      <p className="dd-caption">Times for {placeName} · {sky.timeZoneLabel}</p>
    </section>
  );
};

export default Tonight;
