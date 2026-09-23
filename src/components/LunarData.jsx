import React, { useRef, useEffect } from 'react';
import { Moon, Sparkles, Orbit, Compass, ArrowUpRight, Calendar } from 'lucide-react';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { MIN_MOON_DISTANCE, MAX_MOON_DISTANCE, MEAN_MOON_DISTANCE } from '../utils/lunarCalc';
import { formatDistance, formatDistanceThousands } from '../utils/units';

const AnimatedNumber = ({ value, suffix = '', decimals = 1 }) => {
  const numRef = useRef();
  const valRef = useRef({ val: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const targetValue = parseFloat(value) || 0;

    // Reduced motion: show the figure, skip the count-up
    if (prefersReducedMotion) {
      valRef.current.val = targetValue;
      if (numRef.current) {
        numRef.current.innerText = targetValue.toFixed(decimals) + suffix;
      }
      return undefined;
    }

    const tween = gsap.to(valRef.current, {
      val: targetValue,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) {
          numRef.current.innerText = valRef.current.val.toFixed(decimals) + suffix;
        }
      }
    });

    // Without this, StrictMode's double-invoked effect leaves two tweens
    // fighting over the same object
    return () => tween.kill();
  }, [value, suffix, decimals, prefersReducedMotion]);

  return <span ref={numRef} className="font-mono">0.0{suffix}</span>;
};

const LunarData = ({ lunarDetails, distanceUnit = 'km' }) => {
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

  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      gsap.set(nameRef.current, { opacity: 1, y: 0 });
      return undefined;
    }
    const tween = gsap.fromTo(nameRef.current,
      { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
    return () => tween.kill();
  }, [name, prefersReducedMotion]);

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
    <div ref={cardRef} className="telemetry-stack">
      {/* 1. Core Phase Telemetry Card */}
      <section className="telemetry-section telemetry-phase">
        <div className="telemetry-section-header">
          <div>
            <h3 className="utility-label telemetry-section-label">Current Phase</h3>
            <div ref={nameRef} className="font-serif telemetry-phase-name">
              {name}
            </div>
          </div>
          {isExactPrimary && (
            <span className="telemetry-exact-badge">
              Exact Quarter
            </span>
          )}
        </div>

        {/* 2-Column Stats */}
        <div className="telemetry-measurements">
          <div>
            <div className="telemetry-measurement-heading">
              <Sparkles size={14} aria-hidden="true" />
              <span className="utility-label">Illumination</span>
            </div>
            <div className="telemetry-measurement-value">
              <AnimatedNumber value={fraction} suffix="%" decimals={1} />
            </div>
          </div>

          <div>
            <div className="telemetry-measurement-heading">
              <Orbit size={14} aria-hidden="true" />
              <span className="utility-label">Lunar Age</span>
            </div>
            <div className="telemetry-measurement-value">
              <AnimatedNumber value={age} suffix="" decimals={1} /> <span className="telemetry-unit">days</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Earth-Moon Distance & Orbital Position Card */}
      <section className="telemetry-section telemetry-distance">
        <div className="telemetry-section-header telemetry-distance-header">
          <h3 className="utility-label telemetry-section-label">Distance to Earth</h3>
          <div className="font-mono telemetry-distance-value">
            {formatDistance(distanceKm || MEAN_MOON_DISTANCE, distanceUnit)} <span className="telemetry-unit">{distanceUnit}</span>
          </div>
        </div>

        {/* Distance Gauge (Perigee to Apogee) */}
        <div className="distance-gauge-wrap">
          <div className="distance-gauge-track">
            <div
              className="distance-gauge-fill"
              style={{
                width: `${distancePercent}%`,
              }}
            />
          </div>
          <div className="distance-gauge-labels">
            <span>Perigee ({formatDistanceThousands(MIN_MOON_DISTANCE, distanceUnit)})</span>
            <span>Apogee ({formatDistanceThousands(MAX_MOON_DISTANCE, distanceUnit)})</span>
          </div>
        </div>
      </section>

      {/* 3. Constellation & Upcoming Phase Card */}
      <section className="telemetry-section telemetry-context">
        <div className="telemetry-context-grid">
          {/* Zodiac Constellation */}
          <div className="telemetry-context-block">
            <div className="telemetry-context-heading">
              <Compass size={14} aria-hidden="true" />
              <h3 className="utility-label">Zodiac Sign</h3>
            </div>
            <div className="telemetry-context-title">
              <span className="zodiac-glyph" aria-hidden="true">{zodiac?.symbol}</span>
              <span>{zodiac?.name}</span>
            </div>
            <div className="telemetry-context-note">
              {zodiac?.degreeInSign} tropical
            </div>
            {zodiac?.sidereal && (
              <div className="telemetry-context-note is-sidereal">
                {zodiac.sidereal.name} {zodiac.sidereal.degreeInSign} sidereal
              </div>
            )}
          </div>

          {/* Next Key Phase Countdown */}
          {upcomingPhase && (
            <div className="telemetry-context-block">
              <div className="telemetry-context-heading">
                <Calendar size={14} aria-hidden="true" />
                <h3 className="utility-label">{upcomingPhase.label}</h3>
              </div>
              <div className="telemetry-context-title is-accent">
                {upcomingPhase.countdown}
              </div>
              <div className="telemetry-context-note">
                {upcomingPhase.formatted}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LunarData;
