import React, { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const LOGO_SRC = `${BASE_URL}/icon-192.png`; // 192px source for a 96px slot at 2x DPR

const LoadingScreen = () => {
  const { progress } = useProgress();
  const [isFading, setIsFading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smoothly interpolate display progress
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev < progress) {
          const step = Math.max(1, Math.ceil((progress - prev) * 0.2));
          return Math.min(100, prev + step);
        }
        return prev;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [progress]);

  // When assets are 100% ready, trigger smooth dissolve transition
  useEffect(() => {
    if (progress >= 100 && displayProgress >= 95) {
      const fadeTimeout = setTimeout(() => {
        setIsFading(true);
      }, 350);

      const removeTimeout = setTimeout(() => {
        setIsDone(true);
      }, 1000); // 350ms wait + 650ms fade

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(removeTimeout);
      };
    }
  }, [progress, displayProgress]);

  if (isDone) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#04060d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: isFading ? 'none' : 'auto',
        overflow: 'hidden'
      }}
    >
      {/* Background Ambient Cosmic Glows */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
          animation: 'pulse-ring 4s ease-in-out infinite',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          zIndex: 1
        }}
      >
        {/* World-Class Luminous App Logo */}
        <div
          style={{
            position: 'relative',
            width: '108px',
            height: '108px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Outer Breathing Halo */}
          <div
            style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '34px',
              background: 'radial-gradient(circle, rgba(165, 180, 252, 0.3) 0%, transparent 70%)',
              filter: 'blur(8px)',
              animation: 'pulse-ring 3s ease-in-out infinite'
            }}
          />

          <img
            src={LOGO_SRC}
            alt="Luna Logo"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '24px',
              objectFit: 'cover',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12)',
              position: 'relative',
              zIndex: 2
            }}
          />
        </div>

        {/* Brand Title */}
        <div style={{ textAlign: 'center' }}>
          <h1
            className="text-gradient"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              margin: 0,
              lineHeight: 1
            }}
          >
            LUNA
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginTop: '0.5rem',
              marginBottom: 0
            }}
          >
            {displayProgress < 100 ? 'Initializing Celestial Ephemeris' : 'Cosmos Ready'}
          </p>
        </div>

        {/* Cosmic Progress Bar */}
        <div
          style={{
            width: '200px',
            height: '3px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '0.5rem',
            position: 'relative'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${displayProgress}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8, #c7d2fe)',
              boxShadow: '0 0 12px var(--accent-light)',
              borderRadius: '4px',
              transition: 'width 0.15s ease-out'
            }}
          />
        </div>

        {/* Numerical Percentage Counter */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--text-accent)',
            letterSpacing: '0.05em'
          }}
        >
          {displayProgress}%
        </span>
      </div>
    </div>
  );
};

export default LoadingScreen;
