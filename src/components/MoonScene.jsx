import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { startScene } from '../scene/client';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

// The scene's own geometry, repeated here so the page can tell synchronously
// whether a press landed on the Moon (src/scene/scene.js sizes it the same way)
const OUTLINE_OF_HEIGHT = 0.92;
const OUTLINE_OF_WIDTH = 0.83;
// A little beyond the limb still counts, as it always has
const HIT_SLOP = 1.05;
// The page's fade-in (.moon-3d in index.css) plus a beat, before the Moon nods
// from the flat photograph's pose into its libration
const SETTLE_AFTER_MS = 700;
// Two taps this close in time and place reset the Moon, as a double-click does
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 30;

const TEXTURE_PATH = `${import.meta.env.BASE_URL}assets/textures/moon_1024.jpg`;

// Only what the scene draws from, so each message stays small
const sceneView = (view) => ({ bodyToView: view.bodyToView, meanBodyToView: view.meanBodyToView, sunView: view.sunView });

// The 3D Moon. The scene itself runs in a worker where the browser allows (see
// src/scene/client.js); this component owns the canvas, tells the scene what to
// show, and forwards drags. It never loads three.js itself.
const MoonScene = ({ view, fraction, isReady, onScene, onReady, onFail, onLost, onRotated }) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  // A canvas handed to a worker can't be drawn on again: falling back to the main
  // thread needs a fresh element, which a new key gives
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasWaiter = useRef(null);
  const dragRef = useRef(null);
  const lastTap = useRef(null);

  // The latest props, for callbacks made once at start
  const latest = useRef({ view, reducedMotion });
  useLayoutEffect(() => {
    latest.current = { view, reducedMotion, onReady, onFail, onLost, onRotated };
  });

  useLayoutEffect(() => {
    if (canvasWaiter.current && canvasKey > 0) {
      canvasWaiter.current(canvasRef.current);
      canvasWaiter.current = null;
    }
  }, [canvasKey]);

  // Mounting means this chunk has arrived
  useEffect(() => {
    onScene?.();
  }, [onScene]);

  // Start once. The view, size and motion preference follow by message.
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = canvas.getBoundingClientRect();
    const handle = startScene({
      canvas,
      width: box.width,
      height: box.height,
      dpr: window.devicePixelRatio || 1,
      reducedMotion: latest.current.reducedMotion,
      textureUrl: new URL(TEXTURE_PATH, window.location.href).href,
      view: sceneView(latest.current.view),
      onEvent: (type, data) => {
        if (type === 'firstFrame') {
          latest.current.onReady?.();
          // Counted from here, on the page's own clock: a busy main thread fades
          // the Moon in late, and the nod must not start before it shows
          setTimeout(() => sceneRef.current?.send('settle'), SETTLE_AFTER_MS);
        }
        else if (type === 'fallback') {
          console.warn('Keeping the flat Moon:', data?.reason || 'no WebGL 2');
          latest.current.onFail?.();
        } else if (type === 'contextLost') latest.current.onLost?.();
        else if (type === 'rotated') latest.current.onRotated?.(data.rotated);
      },
      replaceCanvas: () => new Promise((resolve) => {
        canvasWaiter.current = resolve;
        setCanvasKey((key) => key + 1);
      })
    });
    sceneRef.current = handle;

    const observer = new ResizeObserver(() => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) handle.send('resize', { width: rect.width, height: rect.height, dpr: window.devicePixelRatio || 1 });
    });
    observer.observe(canvas.parentElement);

    return () => {
      observer.disconnect();
      handle.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.send('setView', { view: sceneView(view) });
  }, [view]);

  useEffect(() => {
    sceneRef.current?.send('setReducedMotion', { reducedMotion });
  }, [reducedMotion]);

  // Where a pointer is, relative to the canvas, and whether it is on the Moon
  const locate = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = (Math.min(OUTLINE_OF_HEIGHT * rect.height, OUTLINE_OF_WIDTH * rect.width) / 2) * HIT_SLOP;
    return { x, y, onMoon: Math.hypot(x - rect.width / 2, y - rect.height / 2) <= radius };
  };

  const sendPointer = (kind, event, at) => {
    sceneRef.current?.send('pointer', { kind, x: at.x, y: at.y, t: event.timeStamp || performance.now() });
  };

  const onPointerDown = (event) => {
    if (event.button > 0) return;
    const at = locate(event);
    if (!at.onMoon) return;
    dragRef.current = { id: event.pointerId, x: at.x, y: at.y, moved: false };
    // Keep the drag when the finger or mouse runs off the Moon's edge mid-swipe
    event.currentTarget.setPointerCapture?.(event.pointerId);
    sendPointer('down', event, at);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const at = locate(event);
    if (Math.hypot(at.x - drag.x, at.y - drag.y) > 6) drag.moved = true;
    sendPointer('move', event, at);
  };

  const onPointerEnd = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const at = locate(event);
    sendPointer(event.type === 'pointercancel' ? 'cancel' : 'up', event, at);
    // A double-tap springs the Moon back. Mice have dblclick for that.
    if (event.pointerType !== 'mouse' && event.type === 'pointerup' && !drag.moved) {
      const tap = { t: event.timeStamp, x: at.x, y: at.y };
      const previous = lastTap.current;
      if (previous && tap.t - previous.t < DOUBLE_TAP_MS && Math.hypot(tap.x - previous.x, tap.y - previous.y) < DOUBLE_TAP_PX) {
        sceneRef.current?.send('reset');
        lastTap.current = null;
      } else {
        lastTap.current = tap;
      }
    }
  };

  const onDoubleClick = (event) => {
    if (locate(event).onMoon) sceneRef.current?.send('reset');
  };

  // The soft glow behind the Moon, larger on wide screens
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const onChange = (event) => setIsMobile(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const glowSize = isMobile ? '300px' : '440px';

  return (
    // Transparent until the scene has drawn its first frame, then faded in over
    // the flat Moon
    <div className={`moon-viz-wrapper moon-3d${isReady ? ' is-ready' : ''}`}>
      <div
        className="moon-aura"
        style={{ width: glowSize, height: glowSize, opacity: Math.max(0.12, parseFloat(fraction) / 100) }}
      />
      <div className="moon-canvas">
        <canvas
          key={canvasKey}
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onDoubleClick={onDoubleClick}
        />
      </div>
    </div>
  );
};

export default MoonScene;
