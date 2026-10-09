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

// How far a finger moves, in pixels, before it counts as a drag rather than a tap
const TOUCH_SLOP = 6;

// Where the Moon is, in one short line that never wraps, so dragging through the
// day never changes its height
const whereWords = (altitude, direction) => {
  const degrees = Math.round(Math.abs(altitude));
  if (degrees === 0) return 'The Moon is on the horizon';
  return altitude > 0 ? `The Moon is ${degrees}° up in the ${direction}` : `The Moon is ${degrees}° below the horizon`;
};

// How light the sky is, from night to day. Twilight fades from one to the next,
// so it is drawn as a gradient with a stop in the middle of each twilight.
const SKY_LIGHT = { night: 0, astronomical: 0.03, nautical: 0.06, civil: 0.1, day: 0.14 };
const skyStops = (bands) => bands.flatMap((b) => (b.kind === 'day' || b.kind === 'night'
  ? [{ offset: b.from, opacity: SKY_LIGHT[b.kind] }, { offset: b.to, opacity: SKY_LIGHT[b.kind] }]
  : [{ offset: (b.from + b.to) / 2, opacity: SKY_LIGHT[b.kind] }]));

// Tonight (decisions E3, E7): the Moon's day at this place. First where it is at
// the time being looked at, then the chart, then when it rises and sets. Behind the
// Moon's altitude, the Sun's day fading through twilight; on it, where the Moon
// rises and sets and how high it gets; and the Moon itself, at the time being
// looked at. Dragging across the chart, or the arrow keys on it, moves the time of
// day and everything else follows.
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
  const where = whereWords(altitude, direction);

  const title = isLive
    ? 'Tonight'
    : new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(currentDate);

  // The curve, and the parts above and below the horizon
  const line = sky.curve.map((p) => `${(p.fraction * WIDTH).toFixed(1)},${yOf(p.altitude).toFixed(1)}`).join(' ');
  const above = `M 0,${HORIZON} L ${line.replaceAll(' ', ' L ')} L ${WIDTH},${HORIZON} Z`;

  // Dragging across the chart. A mouse or pen moves the time from the press; a
  // finger only once it moves sideways, so a swipe up or down that starts on the
  // chart scrolls the sheet and leaves the time alone. A tap sets the time too.
  const chartRef = useRef(null);
  const press = useRef(null);
  // A time in the day, to the minute, stopping a minute short of the next midnight
  const timeAt = (f) => new Date(Math.round((sky.dayStartMs + Math.min(length - 60000, Math.max(0, f * length))) / 60000) * 60000);
  const fromPointer = (event) => {
    const rect = chartRef.current.getBoundingClientRect();
    onSelectTime(timeAt((event.clientX - rect.left) / rect.width));
  };
  const onPointerDown = (event) => {
    if (event.button > 0) return;
    const finger = event.pointerType === 'touch';
    press.current = { x: event.clientX, y: event.clientY, dragging: !finger };
    if (finger) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    fromPointer(event);
  };
  const onPointerMove = (event) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      const dx = Math.abs(event.clientX - p.x);
      const dy = Math.abs(event.clientY - p.y);
      // Up or down first: a scroll, which the sheet takes
      if (dy >= TOUCH_SLOP && dy > dx) press.current = null;
      if (dx < TOUCH_SLOP || dx <= dy) return;
      p.dragging = true;
    }
    fromPointer(event);
  };
  const onPointerUp = (event) => {
    const p = press.current;
    press.current = null;
    if (p && !p.dragging) fromPointer(event);
  };
  const onPointerCancel = () => {
    press.current = null;
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
    ? (sky.bands[0].kind === 'day' ? 'Up all day' : 'Down all day')
    : 'None today';

  // How high the Moon gets, written on the chart at the top of its arc: above it,
  // or just under it when the arc nearly reaches the top
  const peak = sky.peak.altitude >= 0 ? {
    x: sky.peak.fraction * WIDTH,
    y: yOf(sky.peak.altitude) >= TOP + 18 ? yOf(sky.peak.altitude) - 8 : yOf(sky.peak.altitude) + 16,
    anchor: sky.peak.fraction < 0.14 ? 'start' : sky.peak.fraction > 0.86 ? 'end' : 'middle',
    text: `${Math.round(sky.peak.altitude)}° at ${sky.peak.time}`
  } : null;

  return (
    <section className="dd-card" aria-labelledby="dd-tonight-heading">
      <h3 id="dd-tonight-heading" className="dd-card-title">{title}</h3>

      <p className="dd-readout">
        <span className="dd-readout-time">{time}</span>
        <span className="dd-readout-where">{where}</span>
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
        aria-valuetext={`${time}. ${where}.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
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
            <linearGradient id="dd-sky-light">
              {skyStops(sky.bands).map((s, i) => (
                <stop key={i} offset={s.offset} className="dd-sky-stop" stopOpacity={s.opacity} />
              ))}
            </linearGradient>
          </defs>

          {/* The Sun's day, fading through twilight into night */}
          <rect x="0" y={TOP} width={WIDTH} height={BOTTOM - TOP} fill="url(#dd-sky-light)" />

          <line className="dd-horizon" x1="0" y1={HORIZON} x2={WIDTH} y2={HORIZON} />
          <text className="dd-chart-label" x="0" y={HORIZON - 5}>Horizon</text>

          {/* The Moon's altitude: bright above the horizon, faint below */}
          <path className="dd-curve-fill" d={above} clipPath="url(#dd-above)" />
          <polyline className="dd-curve is-up" points={line} clipPath="url(#dd-above)" />
          <polyline className="dd-curve is-down" points={line} clipPath="url(#dd-below)" />

          {/* Where it rises and sets, and how high it gets */}
          {[sky.rise, sky.set].filter(Boolean).map((e) => (
            <circle key={e.fraction} className="dd-crossing" cx={e.fraction * WIDTH} cy={HORIZON} r="3" />
          ))}
          {peak && (
            <text className="dd-chart-label is-peak" x={peak.x} y={peak.y} textAnchor={peak.anchor}>{peak.text}</text>
          )}

          {/* The Moon, at the time being looked at */}
          <line className="dd-marker-line" x1={fraction * WIDTH} y1={TOP} x2={fraction * WIDTH} y2={BOTTOM} />
          <circle className="dd-marker" cx={fraction * WIDTH} cy={yOf(altitude)} r="5" />

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

      {/* A rise or set that doesn't happen keeps its line for the direction, so
          stepping through the days never changes the card's height */}
      <dl className="dd-grid">
        <div className="dd-tile">
          <dt>Moonrise</dt>
          {sky.rise
            ? <><dd className="dd-value"><Fresh value={sky.rise.time} /></dd><dd className="dd-sub">{sky.rise.direction}</dd></>
            : <><dd className="dd-value is-none">None today</dd><dd className="dd-sub" aria-hidden="true">&nbsp;</dd></>}
        </div>
        <div className="dd-tile">
          <dt>Moonset</dt>
          {sky.set
            ? <><dd className="dd-value"><Fresh value={sky.set.time} /></dd><dd className="dd-sub">{sky.set.direction}</dd></>
            : <><dd className="dd-value is-none">None today</dd><dd className="dd-sub" aria-hidden="true">&nbsp;</dd></>}
        </div>
        <div className="dd-tile">
          <dt>Sunrise</dt>
          {sky.sunrise
            ? <dd className="dd-value"><Fresh value={sky.sunrise} /></dd>
            : <dd className="dd-value is-none">{sunWhenNone}</dd>}
        </div>
        <div className="dd-tile">
          <dt>Sunset</dt>
          {sky.sunset
            ? <dd className="dd-value"><Fresh value={sky.sunset} /></dd>
            : <dd className="dd-value is-none">{sunWhenNone}</dd>}
        </div>
      </dl>

      <p className="dd-caption">Times for {placeName} · {sky.timeZoneLabel}</p>
    </section>
  );
};

export default Tonight;
