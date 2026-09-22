import React, { useRef } from 'react';
import { Sunrise, Sunset, ArrowUp, ArrowDown, MapPin, Moon } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const AltitudeArc = ({ altitudePoints, currentFraction, currentAltitude }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const width = 500;
  const height = 180;
  const padding = { top: 30, bottom: 40, left: 35, right: 35 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Find min and max altitudes across the 24 hours
  const minAlt = Math.min(-60, ...altitudePoints.map(p => p.altitude));
  const maxAlt = Math.max(70, ...altitudePoints.map(p => p.altitude));
  const range = maxAlt - minAlt || 1;

  // Map 48 data points to SVG coordinates
  const points = altitudePoints.map((p, i) => {
    const x = padding.left + (i / (altitudePoints.length - 1)) * innerW;
    const y = padding.top + innerH - ((p.altitude - minAlt) / range) * innerH;
    return { x, y, ...p };
  });

  // Smooth Bezier Curve Path
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return acc + ` C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, '');

  // Horizon line Y (altitude = 0)
  const horizonY = padding.top + innerH - ((0 - minAlt) / range) * innerH;

  // Marker for the SELECTED instant, placed within the location's own day.
  // Position, altitude and label all derive from one value, so they cannot contradict
  // each other the way a wall-clock marker on a time-travelled chart did.
  const aboveHorizon = currentAltitude > 0;
  const currentPoint = {
    x: padding.left + currentFraction * innerW,
    y: Math.max(
      padding.top,
      Math.min(padding.top + innerH, padding.top + innerH - ((currentAltitude - minAlt) / range) * innerH)
    ),
    altitude: parseFloat(currentAltitude.toFixed(1))
  };

  // Area under curve above horizon
  const areaPath = `${pathD} L ${points[points.length - 1].x},${horizonY} L ${points[0].x},${horizonY} Z`;

  return (
    <svg className="sky-altitude-chart" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {/* Day/Night Zone Gradients */}
        <linearGradient id="lunaArcGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-light)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
        </linearGradient>

        <linearGradient id="lunaCurveGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-light)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="var(--accent-light)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Filled Area above horizon */}
      <path d={areaPath} fill="url(#lunaArcGradient)" />

      {/* Horizon line (0° Altitude) */}
      <line
        x1={padding.left}
        y1={horizonY}
        x2={width - padding.right}
        y2={horizonY}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.25"
        strokeDasharray="4,4"
      />
      <text
        x={width - padding.right - 4}
        y={horizonY + 3}
        textAnchor="end"
        fill="var(--text-muted)"
        fontSize="10"
        fontFamily="var(--font-sans)"
        fontWeight="600"
      >
        0° Horizon
      </text>

      {/* Curve Path */}
      <path d={pathD} fill="none" stroke="url(#lunaCurveGradient)" strokeWidth="2.5" />

      {/* 4-Hour Time Ticks on X-Axis */}
      {points.filter((_, i) => i % 8 === 0).map((p, i) => (
        <g key={i}>
          <line x1={p.x} y1={height - 22} x2={p.x} y2={height - 18} stroke="rgba(255,255,255,0.2)" />
          <text
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {p.label}
          </text>
        </g>
      ))}

      {/* Live Current Time Marker */}
      {currentPoint && (
        <g>
          {/* Pulsing Aura */}
          <circle cx={currentPoint.x} cy={currentPoint.y} r="7" fill="var(--accent-light)" opacity="0.3">
            {/* SMIL keeps running regardless of the CSS media block, so gate it here */}
            {!prefersReducedMotion && (
              <>
                <animate attributeName="r" values="7;13;7" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2.2s" repeatCount="indefinite" />
              </>
            )}
          </circle>

          {/* Solid Point */}
          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="4"
            fill={aboveHorizon ? '#ffffff' : 'var(--accent-light)'}
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
          />

          {/* Tooltip Badge */}
          <g transform={`translate(${Math.min(width - 58, Math.max(58, currentPoint.x))}, ${currentPoint.y > horizonY ? currentPoint.y + 16 : currentPoint.y - 12})`}>
            <rect x="-56" y="-10" width="112" height="18" rx="4" fill="rgba(12,16,34,0.9)" stroke="var(--border-subtle)" />
            <text x="0" y="3" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600">
              {currentPoint.altitude > 0 ? `+${currentPoint.altitude}°` : `${currentPoint.altitude}°`} ({aboveHorizon ? 'Visible' : 'Below horizon'})
            </text>
          </g>
        </g>
      )}
    </svg>
  );
};

const StatItem = ({ icon, label, value, subValue, highlight = false }) => (
  <div className={`sky-stat${highlight ? ' is-highlighted' : ''}`}>
    <div className="sky-stat-icon" aria-hidden="true">
      {icon}
    </div>
    <div className="utility-label sky-stat-label">
      {label}
    </div>
    <div className="font-mono sky-stat-value">
      {value}
    </div>
    {subValue && (
      <div className="sky-stat-note">
        {subValue}
      </div>
    )}
  </div>
);

const SkyPosition = ({ skyData, locationName }) => {
  const cardRef = useRef();

  if (!skyData) return null;

  return (
    <section ref={cardRef} className="telemetry-section sky-position-panel">
      {/* Header */}
      <div className="sky-position-header">
        <div className="sky-position-heading">
          <Moon size={16} aria-hidden="true" />
          <h3 className="utility-label">
            24-Hour Sky Transit & Ephemeris
          </h3>
        </div>

        <div className="sky-position-context">
          <span className="sky-position-location">
            <MapPin size={12} aria-hidden="true" /> {locationName || 'Location'}
          </span>
          {skyData.timeZoneLabel && (
            <span className="sky-position-timezone">· {skyData.timeZoneLabel}</span>
          )}
        </div>
      </div>

      {/* Altitude Horizon Curve */}
      <div className="sky-position-chart-wrap">
        <AltitudeArc
          altitudePoints={skyData.altitudePoints}
          currentFraction={skyData.currentFraction}
          currentAltitude={skyData.currentMoonAltitudeValue}
        />
      </div>

      {/* Observational Ephemeris Grid */}
      <div className="sky-ephemeris-grid">
        <StatItem
          icon={<ArrowUp size={15} />}
          label="Moonrise"
          value={skyData.moonrise}
        />
        <StatItem
          icon={<ArrowDown size={15} />}
          label="Moonset"
          value={skyData.moonset}
        />
        <StatItem
          icon={<ArrowUp size={15} />}
          label="Peak Altitude"
          value={`${skyData.peakAltitude}°`}
          subValue={`${skyData.peakTime} (${skyData.peakCompass})`}
          highlight={true}
        />
        <StatItem
          icon={<Sunrise size={15} />}
          label="Sunrise"
          value={skyData.sunrise}
        />
        <StatItem
          icon={<Sunset size={15} />}
          label="Sunset"
          value={skyData.sunset}
        />
      </div>

      {/* Times belong to the observing location, not to the viewer's device */}
      {skyData.timeZone && (
        <div className="sky-position-timezone-note">
          All times shown in {skyData.timeZone} ({skyData.timeZoneLabel})
        </div>
      )}
    </section>
  );
};

export default SkyPosition;
