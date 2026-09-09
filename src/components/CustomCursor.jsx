import React, { useRef, useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const trailRefs = useRef([]);
  const numTrails = 38;

  const prefersReducedMotion = usePrefersReducedMotion();

  const [isTouchDevice] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    if (isTouchDevice || prefersReducedMotion || !dotRef.current) return;

    const dot = dotRef.current;
    const trails = trailRefs.current;

    let mouseX = -100, mouseY = -100;
    let lastMouseX = -100, lastMouseY = -100;
    let isVisible = false;

    // History array for continuous comet tail tracking
    let history = [];
    const historySize = 100;
    const spacing = 2;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        dot.style.opacity = '1';
        trails.forEach((t, i) => {
          if (t) t.style.opacity = `${0.9 * (1 - i / numTrails)}`;
        });
      }
    };

    const handleMouseEnter = () => {
      isVisible = true;
      dot.style.opacity = '1';
      trails.forEach((t, i) => {
        if (t) t.style.opacity = `${0.9 * (1 - i / numTrails)}`;
      });
    };

    const handleMouseLeave = () => {
      isVisible = false;
      dot.style.opacity = '0';
      trails.forEach(t => {
        if (t) t.style.opacity = '0';
      });
    };

    const handlePointerOver = (e) => {
      const target = e.target;
      if (target.closest('button, a, [role="button"], .glass-button, .ghost-control-btn, input')) {
        dot.style.transform = 'translate(-50%, -50%) scale(1.35)';
      }
    };

    const handlePointerOut = (e) => {
      const target = e.target;
      if (target.closest('button, a, [role="button"], .glass-button, .ghost-control-btn, input')) {
        dot.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);

    let animId;
    const animate = () => {
      // Sub-pixel linear interpolation to create a continuous combustion tail
      if (lastMouseX === -100) {
        history.unshift({ x: mouseX, y: mouseY });
        lastMouseX = mouseX;
        lastMouseY = mouseY;
      } else {
        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const steps = Math.max(1, Math.floor(dist / 1.5));
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            history.unshift({
              x: lastMouseX + dx * t,
              y: lastMouseY + dy * t
            });
          }
          lastMouseX = mouseX;
          lastMouseY = mouseY;
        } else {
          history.unshift({ x: mouseX, y: mouseY });
        }
      }

      if (history.length > historySize) {
        history.length = historySize;
      }

      // Zero-lag positioning of core inversion dot
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;

      // Position comet tail particles
      for (let i = 0; i < numTrails; i++) {
        const historyIdx = Math.min((i + 1) * spacing, history.length - 1);
        if (history[historyIdx] && trails[i]) {
          trails[i].style.left = `${history[historyIdx].x}px`;
          trails[i].style.top = `${history[historyIdx].y}px`;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
    };
  }, [isTouchDevice, prefersReducedMotion]);

  // A 38-particle comet chasing the pointer is exactly what reduced motion means
  if (isTouchDevice || prefersReducedMotion) return null;

  return (
    <>
      {/* 38-Particle Combustion Comet Tail */}
      {Array.from({ length: numTrails }).map((_, i) => {
        const factor = 1 - i / numTrails;
        return (
          <div
            key={i}
            className="custom-cursor-trail"
            ref={el => { trailRefs.current[i] = el; }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: `${Math.max(2, 11 * factor)}px`,
              height: `${Math.max(2, 11 * factor)}px`,
              borderRadius: '50%',
              background: i < 8 ? '#e0e7ff' : i < 20 ? '#818cf8' : '#6366f1',
              boxShadow: `0 0 ${12 * factor}px var(--accent-glow), 0 0 ${4 * factor}px rgba(255, 255, 255, 0.8)`,
              opacity: 0,
              pointerEvents: 'none',
              zIndex: 9990 - i,
              transform: 'translate(-50%, -50%)',
              mixBlendMode: 'screen',
              filter: 'blur(0.8px)',
              willChange: 'left, top'
            }}
          />
        );
      })}

      {/* Black-Hole / Inversion Core Dot */}
      <div
        id="custom-cursor-dot"
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#ffffff',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
          mixBlendMode: 'difference',
          willChange: 'left, top, transform'
        }}
      />
    </>
  );
};

export default CustomCursor;
