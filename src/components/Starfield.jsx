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

    // Parallax shift in pixels, eased toward a target set by the mouse on a desktop
    // and by how the device is tilted on a phone
    let offsetX = 0;
    let offsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;

    // Only a real mouse steers. A tap fires compatibility mouse events at the finger,
    // which used to throw the sky toward wherever the screen was touched.
    const handlePointerMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      targetOffsetX = (e.clientX - width / 2) * 0.025;
      targetOffsetY = (e.clientY - height / 2) * 0.025;
    };

    const TILT_RANGE = 25; // degrees of tilt for the full shift
    const TILT_SHIFT = 22; // pixels at full tilt, before each star's depth
    let rest = null; // the way the phone is being held, which the shift is measured from

    const handleOrientation = (e) => {
      if (e.beta == null || e.gamma == null) return;

      // Tilt along the screen's own axes, whichever way up it is turned
      const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      let x = e.gamma;
      let y = e.beta;
      if (angle === 90) { x = e.beta; y = -e.gamma; }
      else if (angle === 270 || angle === -90) { x = -e.beta; y = e.gamma; }
      else if (angle === 180) { x = -e.gamma; y = -e.beta; }

      // The rest pose follows slowly, so a phone settled at a new angle recentres
      // over a few seconds instead of leaving the sky pinned to one side
      if (!rest) rest = { x, y };
      rest.x += (x - rest.x) * 0.005;
      rest.y += (y - rest.y) * 0.005;

      const unit = (v) => Math.max(-1, Math.min(1, v / TILT_RANGE));
      targetOffsetX = unit(x - rest.x) * TILT_SHIFT;
      targetOffsetY = unit(y - rest.y) * TILT_SHIFT;
    };

    // iOS hands out motion only after the visitor allows it, and only when asked from
    // a tap. Android and the rest send it without asking.
    let disposed = false;
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
    const needsPermission = typeof DeviceOrientationEvent !== 'undefined'
      && typeof DeviceOrientationEvent.requestPermission === 'function';

    const askForTilt = () => {
      window.removeEventListener('touchend', askForTilt);
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === 'granted' && !disposed) {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(() => {});
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
      offsetX += (targetOffsetX - offsetX) * 0.035;
      offsetY += (targetOffsetY - offsetY) * 0.035;

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
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      if (isTouch) {
        if (needsPermission) window.addEventListener('touchend', askForTilt);
        else window.addEventListener('deviceorientation', handleOrientation);
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
      render();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchend', askForTilt);
      window.removeEventListener('deviceorientation', handleOrientation);
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
