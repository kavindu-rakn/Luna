import { useEffect, useState } from 'react';

// Whether the page's first frame with content is on screen yet. What can wait
// (the 3D Moon's scene, the service worker) starts after it, so nothing it fetches
// or runs competes with that frame: the 2D Moon is that frame's Moon.
//
// Read from the browser's paint timing. A browser that never reports it gets on
// after a moment rather than waiting for ever.
const BACKSTOP_MS = 1500;

export const useFirstPaint = (enabled) => {
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setPainted(true);
    };
    let observer;
    try {
      observer = new PerformanceObserver(finish);
      observer.observe({ type: 'paint', buffered: true });
    } catch {
      // No paint timing here: the backstop below
    }
    const timer = setTimeout(finish, BACKSTOP_MS);
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
    };
  }, [enabled]);

  return painted;
};
