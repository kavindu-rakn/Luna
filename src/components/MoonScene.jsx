import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { startScene } from '../scene/client';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { createTiltReader } from '../utils/tilt';
import { isOpenSky, moonRadius } from '../utils/skyTarget';
import { cue } from '../audio/sound';

// A little beyond the limb still counts, as it always has
const HIT_SLOP = 1.05;
// The page's fade-in (.sky-scene in index.css) plus a beat, before the Moon nods
// from the flat photograph's pose into its libration
const SETTLE_AFTER_MS = 700;
// Two taps this close in time and place reset the Moon, as a double-click does
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 30;
// Tilt changes smaller than this aren't worth a frame
const TILT_STEP = 0.002;

// "Drag to rotate" shows beside the Moon's ring until the first turn; that it has
// been seen stays on this device
const HINT_KEY = 'luna_moon_hint';
const readHintSeen = () => {
  try {
    return localStorage.getItem(HINT_KEY) === 'seen';
  } catch {
    return false;
  }
};
const storeHintSeen = () => {
  try {
    localStorage.setItem(HINT_KEY, 'seen');
  } catch {
    // Storage unavailable: it shows again next visit
  }
};
// The ring is for a mouse; touch screens keep their own way of turning the Moon
const hasMouse = () => typeof window !== 'undefined'
  && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);

const TEXTURE_PATH = `${import.meta.env.BASE_URL}assets/textures/`;
const SKY_PATH = `${import.meta.env.BASE_URL}assets/sky/`;

// Only what the scene draws from, so each message stays small
const sceneView = (view) => ({
  bodyToView: view.bodyToView,
  meanBodyToView: view.meanBodyToView,
  sunView: view.sunView,
  ra: view.ra,
  dec: view.dec,
  parallacticAngle: view.parallacticAngle,
  siderealTime: view.siderealTime,
  latitude: view.latitude,
  time: view.time
});

// The sky canvas covers the screen; the Moon's area is a box on it
const measure = (sky, area) => {
  const canvas = sky.getBoundingClientRect();
  const box = area.getBoundingClientRect();
  return {
    width: canvas.width,
    height: canvas.height,
    dpr: window.devicePixelRatio || 1,
    moon: { x: box.left - canvas.left, y: box.top - canvas.top, width: box.width, height: box.height }
  };
};

// The 3D Moon and the sky behind it. The scene runs in a worker where the browser
// allows (see src/scene/client.js) and draws on a canvas that covers the whole
// screen, behind the interface (skyHost, from App). This component owns that
// canvas, tells the scene what to show and where the Moon's area is, forwards
// drags from a hit area over the Moon, the mouse for the depth layers and the
// phone's tilt. It never loads three.js itself.
const MoonScene = ({ view, isReady, skyHost, tilt, onScene, onReady, onFail, onLost, onRotated }) => {
  const canvasRef = useRef(null);
  const areaRef = useRef(null);
  const sceneRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  // A canvas handed to a worker can't be drawn on again: falling back to the main
  // thread needs a fresh element, which a new key gives
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasWaiter = useRef(null);
  const dragRef = useRef(null);
  const lastTap = useRef(null);

  // Over the Moon a hairline ring stands in for the pointer (C3), with a word on
  // what it does: "Drag to rotate" until the first turn, then "Double-click to
  // reset" while the Moon is turned (F7)
  const [mouse] = useState(hasMouse);
  const [hintSeen, setHintSeen] = useState(readHintSeen);
  const [rotated, setRotated] = useState(false);
  const cursorRef = useRef(null);
  const showRing = mouse && isReady;
  const ringLabel = !hintSeen ? 'Drag to rotate' : rotated ? 'Double-click to reset' : null;

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

  // Start once. The view, the layout and the motion preference follow by message.
  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    const handle = startScene({
      canvas,
      ...measure(skyHost, area),
      reducedMotion: latest.current.reducedMotion,
      textureBase: new URL(TEXTURE_PATH, window.location.href).href,
      skyBase: new URL(SKY_PATH, window.location.href).href,
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
        else if (type === 'rotated') {
          setRotated(Boolean(data.rotated));
          latest.current.onRotated?.(data.rotated);
        }
      },
      replaceCanvas: () => new Promise((resolve) => {
        canvasWaiter.current = resolve;
        setCanvasKey((key) => key + 1);
      })
    });
    sceneRef.current = handle;

    // The Moon's area moves when anything around it changes size: the screen, the
    // stage, the phase name beneath it
    const relayout = () => handle.send('resize', measure(skyHost, area));
    const observer = new ResizeObserver(relayout);
    observer.observe(skyHost);
    observer.observe(area);
    const stage = area.parentElement?.parentElement;
    if (stage) {
      observer.observe(stage);
      for (const child of stage.children) observer.observe(child);
    }
    window.addEventListener('resize', relayout);

    // A mouse pulls the depth layers and, over open sky, lights the stars near it.
    // Touch doesn't: a tap would throw the sky towards the finger.
    const onMove = (event) => {
      if (event.pointerType !== 'mouse') return;
      handle.send('look', { x: event.clientX, y: event.clientY, inside: true, lit: isOpenSky(event.target) });
    };
    const onLeave = (event) => {
      if (!event.relatedTarget) handle.send('look', { inside: false });
    };
    const onBlur = () => handle.send('look', { inside: false });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onLeave);
    window.addEventListener('blur', onBlur);

    const onVisibility = () => handle.send('setVisible', { visible: !document.hidden });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', relayout);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onLeave);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      handle.dispose();
      sceneRef.current = null;
    };
  }, [skyHost]);

  useEffect(() => {
    sceneRef.current?.send('setView', { view: sceneView(view) });
  }, [view]);

  useEffect(() => {
    sceneRef.current?.send('setReducedMotion', { reducedMotion });
  }, [reducedMotion]);

  // The phone's tilt, while it's on and motion is welcome
  useEffect(() => {
    const scene = sceneRef.current;
    if (!tilt || reducedMotion || !scene) return undefined;
    const reader = createTiltReader();
    let sent = { x: 0, y: 0 };
    const onOrientation = (event) => {
      const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      const next = reader.read(event, angle, event.timeStamp || performance.now());
      if (!next || (Math.abs(next.x - sent.x) < TILT_STEP && Math.abs(next.y - sent.y) < TILT_STEP)) return;
      sent = next;
      scene.send('tilt', next);
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      scene.send('tilt', null);
    };
  }, [tilt, reducedMotion]);

  // Where a pointer is, relative to the Moon's area, and whether it is on the Moon
  const locate = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = moonRadius(rect) * HIT_SLOP;
    return { x, y, onMoon: Math.hypot(x - rect.width / 2, y - rect.height / 2) <= radius };
  };

  const sendPointer = (kind, event, at) => {
    sceneRef.current?.send('pointer', { kind, x: at.x, y: at.y, t: event.timeStamp || performance.now() });
  };

  // The ring follows the mouse exactly: it is the pointer, not something chasing it
  const placeRing = (event, over) => {
    const cursor = cursorRef.current;
    if (!showRing || event.pointerType !== 'mouse' || !cursor) return;
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    cursor.classList.toggle('is-shown', over);
    event.currentTarget.classList.toggle('is-on-moon', over);
  };

  useEffect(() => {
    if (!showRing) areaRef.current?.classList.remove('is-on-moon');
  }, [showRing]);

  const onPointerDown = (event) => {
    if (event.button > 0) return;
    const at = locate(event);
    if (!at.onMoon) return;
    dragRef.current = { id: event.pointerId, x: at.x, y: at.y, moved: false };
    // Keep the drag when the finger or mouse runs off the Moon's edge mid-swipe
    event.currentTarget.setPointerCapture?.(event.pointerId);
    sendPointer('down', event, at);
    cursorRef.current?.classList.add('is-grabbing');
    cue('felt');
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    const at = locate(event);
    placeRing(event, at.onMoon || Boolean(drag));
    if (!drag || drag.id !== event.pointerId) return;
    if (Math.hypot(at.x - drag.x, at.y - drag.y) > 6) drag.moved = true;
    sendPointer('move', event, at);
  };

  const onPointerLeave = (event) => {
    if (!dragRef.current) placeRing(event, false);
  };

  const onPointerEnd = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const at = locate(event);
    sendPointer(event.type === 'pointercancel' ? 'cancel' : 'up', event, at);
    cursorRef.current?.classList.remove('is-grabbing');
    placeRing(event, at.onMoon);
    if (drag.moved && !hintSeen) {
      setHintSeen(true);
      storeHintSeen();
    }
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

  return (
    <>
      {/* Over the Moon's area, where drags start; the Moon itself is drawn on the
          sky canvas behind the interface */}
      <div
        ref={areaRef}
        className="moon-hit"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
      />
      {showRing && createPortal(
        <div ref={cursorRef} className="moon-cursor" aria-hidden="true">
          <span className="moon-cursor-ring" />
          {ringLabel && <span className="moon-cursor-label">{ringLabel}</span>}
        </div>,
        document.body
      )}
      {/* Transparent until the scene has drawn its first frame, then faded in over
          the flat Moon */}
      {createPortal(
        <canvas key={canvasKey} ref={canvasRef} className={`sky-scene${isReady ? ' is-ready' : ''}`} />,
        skyHost
      )}
    </>
  );
};

export default MoonScene;
