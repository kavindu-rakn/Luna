import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the viewer's reduced-motion preference.
 *
 * A CSS media block can neutralise declarative animation, but Luna drives a great
 * deal of motion from JavaScript that CSS cannot reach: a 38-particle cursor trail
 * on requestAnimationFrame, the 3D Moon's spin and libration nod and the sky's
 * twinkle and depth layers in the scene's worker, and GSAP counters. Those need
 * to consult the preference directly.
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
