import React, { useState, useEffect, useRef } from 'react';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const LOGO_SRC = `${BASE_URL}/icon-192.png`; // 192px source for a 96px slot at 2x DPR

// Progress follows the real load stages. The old bar tracked drei's texture
// counter, which sat at 0% through the slowest part of startup (downloading and
// parsing the JavaScript) and, by importing drei, pulled all of Three.js into the
// very first chunk just to draw a progress bar.
//   shell  the app is on screen
//   scene  the 3D chunk has arrived and the canvas exists
//   ready  the Moon's texture is decoded and drawn
//   failed the scene gave way to its 2D fallback
const STAGE_PROGRESS = { shell: 34, scene: 72, ready: 100, failed: 100 };

// If the scene has not reported by now, get out of the way. Every panel works
// without the 3D Moon, so a slow network must never mean a permanent black screen.
const FAILSAFE_MS = 9000;
const FADE_MS = 450;

const LoadingScreen = ({ stage = 'shell' }) => {
  const [timedOut, setTimedOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressRef = useRef(0);

  const finished = stage === 'ready' || stage === 'failed' || timedOut;
  const target = timedOut ? 100 : (STAGE_PROGRESS[stage] ?? 0);

  // Dismissal depends only on the stage. The old version also waited for the
  // animated counter to reach 95, so a throttled background tab could hold it up.
  const isFading = finished;

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FAILSAFE_MS);
    return () => clearTimeout(timer);
  }, []);

  // Ease the counter toward the target, stopping once it arrives instead of
  // polling on a 20ms interval for as long as the screen exists
  useEffect(() => {
    let frame = 0;
    const step = () => {
      const prev = progressRef.current;
      if (prev >= target) return;
      const next = Math.min(target, prev + Math.max(1, Math.ceil((target - prev) * 0.18)));
      progressRef.current = next;
      setDisplayProgress(next);
      if (next < target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  // Fade straight away. The old version held for 350ms first, a fixed tax on
  // every single load, warm cache included.
  useEffect(() => {
    if (!finished) return undefined;
    const timer = setTimeout(() => setIsDone(true), FADE_MS);
    return () => clearTimeout(timer);
  }, [finished]);

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
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
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
