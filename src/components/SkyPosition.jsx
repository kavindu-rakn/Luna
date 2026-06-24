import React from 'react';
import { Sunrise, Sunset, ArrowUp, ArrowDown, MapPin } from 'lucide-react';

// SVG arc showing the moon's altitude path across the night sky
const AltitudeArc = ({ altitudePoints, isMoonUp }) => {
  const width = 500;
  const height = 160;
  const padding = { top: 30, bottom: 40, left: 30, right: 30 };
  
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Normalize altitudes to SVG coordinates
  const maxAlt = Math.max(...altitudePoints.map(p => p.altitude), 10); // min 10 to avoid flat line
  const minAlt = Math.min(...altitudePoints.map(p => p.altitude), 0);
  const range = maxAlt - minAlt || 1;

  const points = altitudePoints.map((p, i) => {
    const x = padding.left + (i / (altitudePoints.length - 1)) * innerW;
    const y = padding.top + innerH - ((p.altitude - minAlt) / range) * innerH;
    return { x, y, ...p };
  });

  // Create smooth curve path
  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return acc + ` C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }, '');

  // Horizon line Y position (altitude = 0)
  const horizonY = padding.top + innerH - ((0 - minAlt) / range) * innerH;

  // Find current time position on the arc
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  // Map current hour to the 6PM-6AM range (18-30)
  let normalizedHour = currentHour;
  if (currentHour < 6) normalizedHour += 24; // wrap past midnight
  const arcStart = 18;
  const arcEnd = 30;
  const fraction = Math.max(0, Math.min(1, (normalizedHour - arcStart) / (arcEnd - arcStart)));
  const currentPointIdx = Math.round(fraction * (points.length - 1));
  const currentPoint = points[Math.min(currentPointIdx, points.length - 1)];

  // Area under the curve (above horizon)
  const areaPath = pathD + ` L ${points[points.length - 1].x},${horizonY} L ${points[0].x},${horizonY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        <linearGradient id="arcGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
          <stop offset="30%" stopColor="var(--color-accent)" stopOpacity="1" />
          <stop offset="70%" stopColor="var(--color-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Filled area under curve */}
      <path d={areaPath} fill="url(#arcGradient)" />

      {/* Horizon line */}
      <line
        x1={padding.left} y1={horizonY}
        x2={width - padding.right} y2={horizonY}
        stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4"
      />
      <text x={width - padding.right + 5} y={horizonY + 4} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Inter, sans-serif">
        horizon
      </text>

      {/* The altitude curve */}
      <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="2" />

      {/* Time labels on the X axis */}
      {points.filter((_, i) => i % 3 === 0).map((p, i) => (
        <text key={i} x={p.x} y={height - 8} textAnchor="middle"
          fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="Inter, sans-serif">
          {p.label}
        </text>
      ))}

      {/* Dots at each hour */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5}
          fill={p.altitude > 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.15)'}
        />
      ))}

      {/* Current time indicator */}
      {normalizedHour >= arcStart && normalizedHour <= arcEnd && (
        <g>
          <circle cx={currentPoint.x} cy={currentPoint.y} r="5"
            fill="var(--color-accent)" opacity="0.3">
            <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={currentPoint.x} cy={currentPoint.y} r="3"
            fill={isMoonUp ? '#ffffff' : 'var(--color-accent)'}
            stroke="var(--color-accent)" strokeWidth="1"
          />
        </g>
      )}
    </svg>
  );
};

const StatItem = ({ icon, label, value, subValue, highlight = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', textAlign: 'center' }}>
    <div style={{ color: highlight ? 'var(--color-accent)' : 'var(--color-text-secondary)', marginBottom: '0.15rem' }}>
      {icon}
    </div>
    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}>
      {label}
    </div>
    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
      {value}
    </div>
    {subValue && (
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', opacity: 0.7 }}>
        {subValue}
      </div>
    )}
  </div>
);

const SkyPosition = ({ skyData, locationName }) => {
  if (!skyData) return null;

  return (
    <div className="glass-panel" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-secondary)' }}>
          Sky Position
        </span>
        {locationName && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-accent)', opacity: 0.8 }}>
            <MapPin size={12} /> {locationName}
          </span>
        )}
      </div>

      {/* Altitude Arc */}
      <div style={{ marginBottom: '1.5rem' }}>
        <AltitudeArc altitudePoints={skyData.altitudePoints} isMoonUp={skyData.isMoonUp} />
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '1.25rem'
      }}>
        <StatItem
          icon={<ArrowUp size={16} />}
          label="Moonrise"
          value={skyData.moonrise}
        />
        <StatItem
          icon={<ArrowDown size={16} />}
          label="Moonset"
          value={skyData.moonset}
        />
        <StatItem
          icon={<Sunrise size={16} />}
          label="Sunrise"
          value={skyData.sunrise}
        />
        <StatItem
          icon={<Sunset size={16} />}
          label="Sunset"
          value={skyData.sunset}
        />
        <StatItem
          icon={<ArrowUp size={16} />}
          label="Peak Alt."
          value={`${skyData.peakAltitude}°`}
          subValue={skyData.peakTime}
          highlight={true}
        />
      </div>
    </div>
  );
};

export default SkyPosition;
