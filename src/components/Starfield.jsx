import React, { useRef, useEffect } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const Starfield = () => {
  const canvasRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    // Generate normalized stars (0 to 1) so resize never creates empty gaps
    const numStars = width < 768 ? 180 : 350;
    const stars = [];

    for (let i = 0; i < numStars; i++) {
      stars.push({
        nx: Math.random(),
        ny: Math.random(),
        radius: Math.random() * 1.1 + 0.35,
        alpha: Math.random() * 0.75 + 0.25,
        speedAlpha: (Math.random() * 0.012) + 0.003,
        z: Math.random() * 1.4 + 0.4
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Smooth parallax easing
      mouseX += (targetMouseX - mouseX) * 0.035;
      mouseY += (targetMouseY - mouseY) * 0.035;

      const offsetX = (mouseX - width / 2) * 0.025;
      const offsetY = (mouseY - height / 2) * 0.025;

      const margin = 40; // Pixel margin overshoot for smooth wrapping without edge popping

      stars.forEach(star => {
        // Twinkle
        star.alpha += star.speedAlpha;
        if (star.alpha > 0.95 || star.alpha < 0.2) {
          star.speedAlpha = -star.speedAlpha;
        }

        let px = (star.nx * width) - (offsetX * star.z);
        let py = (star.ny * height) - (offsetY * star.z);

        // Smooth cyclic wrap around viewport
        if (px < -margin) px += (width + margin * 2);
        if (px > width + margin) px -= (width + margin * 2);
        if (py < -margin) py += (height + margin * 2);
        if (py > height + margin) py -= (height + margin * 2);

        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.abs(star.alpha)})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Reduced motion: paint the sky once, with no twinkle and no parallax drift.
    // The stars stay, the movement goes.
    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.nx * width, star.ny * height, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${Math.abs(star.alpha)})`;
        ctx.fill();
      });
    };

    const onResize = () => {
      resize();
      if (prefersReducedMotion) drawStatic();
    };
    window.addEventListener('resize', onResize, { passive: true });

    if (prefersReducedMotion) {
      drawStatic();
    } else {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('visibilitychange', handleVisibilityChange);
      render();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -2,
        pointerEvents: 'none'
      }}
    />
  );
};

export default Starfield;
