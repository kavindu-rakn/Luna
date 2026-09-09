import React, { useRef, useEffect } from 'react';
import { Moon, Sparkles, Orbit, Compass, ArrowUpRight, Calendar } from 'lucide-react';
import gsap from 'gsap';

const AnimatedNumber = ({ value, suffix = '', decimals = 1 }) => {
  const numRef = useRef();
  const valRef = useRef({ val: 0 });

  useEffect(() => {
    const targetValue = parseFloat(value) || 0;
    gsap.to(valRef.current, {
      val: targetValue,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.innerText = valRef.current.val.toFixed(decimals) + suffix;
        }
      }
    });
  }, [value, suffix, decimals]);

  return <span ref={numRef} className="font-mono">0.0{suffix}</span>;
};

const LunarData = ({ lunarDetails }) => {
  const {
    name,
    fraction,
    age,
    distanceKm,
    distancePercent,
    zodiac,
    nextPhases,
    isExactPrimary
  } = lunarDetails;

  const cardRef = useRef();
  const nameRef = useRef();

  useEffect(() => {
    gsap.fromTo(nameRef.current,
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }, [name]);

  // Identify the closest upcoming primary phase
  const nextPhaseList = [
    { label: 'Next Full Moon', ...nextPhases?.nextFullMoon },
    { label: 'Next New Moon', ...nextPhases?.nextNewMoon },
    { label: 'Next 1st Quarter', ...nextPhases?.nextFirstQuarter },
    { label: 'Next Last Quarter', ...nextPhases?.nextLastQuarter }
  ].filter(p => p.msRemaining !== undefined)
   .sort((a, b) => a.msRemaining - b.msRemaining);

  const upcomingPhase = nextPhaseList[0];

  return (
    <div ref={cardRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Core Phase Telemetry Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div className="utility-label" style={{ marginBottom: '0.35rem' }}>Current Phase</div>
            <div ref={nameRef} className="font-serif" style={{ fontSize: '2rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {name}
            </div>
          </div>
          {isExactPrimary && (
            <span
              style={{
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid var(--accent-light)',
                color: 'var(--text-accent)',
                borderRadius: '12px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Exact Quarter
            </span>
          )}
        </div>

        {/* 2-Column Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <Sparkles size={14} color="var(--accent-light)" />
              <span className="utility-label">Illumination</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <AnimatedNumber value={fraction} suffix="%" decimals={1} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <Orbit size={14} color="var(--accent-light)" />
              <span className="utility-label">Lunar Age</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <AnimatedNumber value={age} suffix="" decimals={1} /> <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>days</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Earth-Moon Distance & Orbital Position Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="utility-label">Distance to Earth</div>
          <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {distanceKm ? distanceKm.toLocaleString() : '384,400'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km</span>
          </div>
        </div>

        {/* Distance Gauge (Perigee to Apogee) */}
        <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                width: `${distancePercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
                borderRadius: '3px',
                transition: 'width 0.6s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span>Perigee (356k km)</span>
            <span>Apogee (406k km)</span>
          </div>
        </div>
      </div>

      {/* 3. Constellation & Upcoming Phase Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Zodiac Constellation */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <Compass size={14} color="var(--accent-light)" />
              <span className="utility-label">Constellation</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>{zodiac?.symbol}</span>
              <span>{zodiac?.name}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {zodiac?.degreeInSign} in sign
            </div>
          </div>

          {/* Next Key Phase Countdown */}
          {upcomingPhase && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <Calendar size={14} color="var(--accent-light)" />
                <span className="utility-label">{upcomingPhase.label}</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-accent)' }}>
                {upcomingPhase.countdown}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {upcomingPhase.formatted}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LunarData;
