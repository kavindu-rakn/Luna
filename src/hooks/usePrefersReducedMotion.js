import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the viewer's reduced-motion preference.
 *
 * A CSS media block can neutralise declarative animation, but Luna drives a great
 * deal of motion from JavaScript that CSS cannot reach: a 38-particle cursor trail
 * on requestAnimationFrame, a twinkling parallax starfield on a 2D canvas, a
 * drifting orbital camera and a spinning Earth inside useFrame, and GSAP counters.
 * Those need to consult the preference directly.
 */
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = (event) => setPrefersReducedMotion(event.matches);

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return prefersReducedMotion;
};

export default usePrefersReducedMotion;
