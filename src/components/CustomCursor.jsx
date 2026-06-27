import React, { useRef, useEffect } from 'react';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const glowRef = useRef(null);
  const trailRefs = useRef([]);
  const numTrails = 38;

  useEffect(() => {
    const dot = dotRef.current;
    const glow = glowRef.current;
    const trails = trailRefs.current;

    let mouseX = -100, mouseY = -100;
    let lastMouseX = -100, lastMouseY = -100;
    
    // History array to store past mouse positions for perfect path tracking (no corner cutting)
    let history = [];
    const historySize = 100; // Max history length
    const spacing = 2; // Distance between trail beads in history points

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseEnter = () => {
      dot.style.opacity = '1';
      trails.forEach((t, i) => { if (t) t.style.opacity = `${1 - (i / numTrails)}`; });
    };

    const handleMouseLeave = () => {
      dot.style.opacity = '0';
      trails.forEach(t => { if (t) t.style.opacity = '0'; });
    };

    const handlePointerOver = (e) => {
      const target = e.target;
      if (target.closest('button, a, [role="button"], .glass-button')) {
        dot.style.transform = 'translate(-50%, -50%) scale(3.75)';
        dot.style.background = 'rgba(255, 255, 255, 1)';
        trails.forEach(t => { if (t) t.style.opacity = '0'; });
      }
    };

    const handlePointerOut = (e) => {
      const target = e.target;
      if (target.closest('button, a, [role="button"], .glass-button')) {
        dot.style.transform = 'translate(-50%, -50%) scale(1)';
        dot.style.background = 'rgba(255, 255, 255, 1)';
        trails.forEach((t, i) => { if (t) t.style.opacity = `${1 - (i / numTrails)}`; });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);

    let animId;
    const animate = () => {
      // Interpolate between last recorded mouse position and current mouse position
      // to ensure history points are physically close together for a continuous solid line.
      if (lastMouseX === -100) {
        history.unshift({ x: mouseX, y: mouseY });
        lastMouseX = mouseX;
        lastMouseY = mouseY;
      } else {
        const dx = mouseX - lastMouseX;
        const dy = mouseY - lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          // Insert a point every ~1.5 pixels
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
          // Mouse is stationary, continue adding points so the tail catches up and disappears
          history.unshift({ x: mouseX, y: mouseY });
        }
      }
      
      // Keep array size capped
      if (history.length > historySize) {
        history.length = historySize;
      }

      // Main dot has ZERO lag, perfectly follows mouse
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';

      // Trail particles read from exact past positions
      for (let i = 0; i < numTrails; i++) {
        // Calculate the exact frame to pull from history
        const historyIdx = Math.min((i + 1) * spacing, history.length - 1);
        
        if (history[historyIdx] && trails[i]) {
          trails[i].style.left = history[historyIdx].x + 'px';
          trails[i].style.top = history[historyIdx].y + 'px';
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
    };
  }, []);

  // Only show custom cursor on non-touch devices
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice) return null;

  return (
    <>
      {/* Trail particles */}
      {Array.from({ length: numTrails }).map((_, i) => (
        <div
          key={i}
          className="custom-cursor-trail"
          ref={el => trailRefs.current[i] = el}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: `${10 * (1 - i / numTrails)}px`,
            height: `${10 * (1 - i / numTrails)}px`,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            boxShadow: `0 0 ${10 * (1 - i / numTrails)}px var(--color-accent-glow)`,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 9998 - i,
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.3s ease',
            mixBlendMode: 'screen',
            filter: 'blur(1px)'
          }}
        />
      ))}

      {/* Core dot */}
      <div
        id="custom-cursor-dot"
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'white',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0,
          transform: 'translate(-50%, -50%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          mixBlendMode: 'difference'
        }}
      />
    </>
  );
};

export default CustomCursor;
