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
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
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
        x={width - padding.right + 6}
        y={horizonY + 3}
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', textAlign: 'center' }}>
    <div style={{ color: highlight ? 'var(--text-accent)' : 'var(--text-muted)', marginBottom: '0.1rem' }}>
      {icon}
    </div>
    <div className="utility-label" style={{ marginBottom: '0.15rem' }}>
      {label}
    </div>
    <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1 }}>
      {value}
    </div>
    {subValue && (
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
        {subValue}
      </div>
    )}
  </div>
);

const SkyPosition = ({ skyData, locationName }) => {
  const cardRef = useRef();

  if (!skyData) return null;

  return (
    <div ref={cardRef} className="glass-panel" style={{ width: '100%', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Moon size={16} color="var(--accent-light)" />
          <h3 className="utility-label" style={{ margin: 0 }}>
            24-Hour Sky Transit & Ephemeris
          </h3>
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-accent)' }}>
          <MapPin size={12} /> {locationName || 'Location'}
          {skyData.timeZoneLabel && (
            <span style={{ color: 'var(--text-muted)' }}>· {skyData.timeZoneLabel}</span>
          )}
        </span>
      </div>

      {/* Altitude Horizon Curve */}
      <div style={{ marginBottom: '1.25rem' }}>
        <AltitudeArc
          altitudePoints={skyData.altitudePoints}
          currentFraction={skyData.currentFraction}
          currentAltitude={skyData.currentMoonAltitudeValue}
        />
      </div>

      {/* Observational Ephemeris Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border-subtle)'
        }}
      >
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
        <div style={{ marginTop: '0.85rem', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          All times shown in {skyData.timeZone} ({skyData.timeZoneLabel})
        </div>
      )}
    </div>
  );
};

export default SkyPosition;
