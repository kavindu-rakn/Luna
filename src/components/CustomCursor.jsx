import React, { useRef, useEffect } from 'react';

const CustomCursor = () => {
  const dotRef = useRef(null);
  const glowRef = useRef(null);
  const trailRefs = useRef([]);
  const numTrails = 6;

  useEffect(() => {
    const dot = dotRef.current;
    const glow = glowRef.current;
    const trails = trailRefs.current;

    let mouseX = -100, mouseY = -100;
    let dotX = -100, dotY = -100;
    const trailPositions = Array.from({ length: numTrails }, () => ({ x: -100, y: -100 }));

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseEnter = () => {
      dot.style.opacity = '1';
      trails.forEach(t => { if (t) t.style.opacity = '1'; });
    };

    const handleMouseLeave = () => {
      dot.style.opacity = '0';
      trails.forEach(t => { if (t) t.style.opacity = '0'; });
    };

    // Scale up on interactive elements
    const handlePointerOver = (e) => {
      const target = e.target;
      if (target.closest('button, a, [role="button"], .glass-button, canvas')) {
        dot.style.transform = 'translate(-50%, -50%) scale(5)';
        dot.style.background = 'rgba(255, 255, 255, 1)';
      }
    };

    const handlePointerOut = (e) => {
      const target = e.target;
      if (target.closest('button, a, [role="button"], .glass-button, canvas')) {
        dot.style.transform = 'translate(-50%, -50%) scale(1)';
        dot.style.background = 'rgba(255, 255, 255, 1)';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);

    let animId;
    const animate = () => {
      // Smooth follow for main dot
      dotX += (mouseX - dotX) * 0.2;
      dotY += (mouseY - dotY) * 0.2;
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';

      // Trail particles follow with increasing delay
      for (let i = 0; i < numTrails; i++) {
        const target = i === 0 ? { x: dotX, y: dotY } : trailPositions[i - 1];
        trailPositions[i].x += (target.x - trailPositions[i].x) * (0.15 - i * 0.015);
        trailPositions[i].y += (target.y - trailPositions[i].y) * (0.15 - i * 0.015);

        if (trails[i]) {
          trails[i].style.left = trailPositions[i].x + 'px';
          trails[i].style.top = trailPositions[i].y + 'px';
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
          ref={el => trailRefs.current[i] = el}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: `${4 - i * 0.4}px`,
            height: `${4 - i * 0.4}px`,
            borderRadius: '50%',
            background: 'white',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 9997,
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 0.3s ease',
            mixBlendMode: 'difference'
          }}
        />
      ))}

      {/* Core dot */}
      <div
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
