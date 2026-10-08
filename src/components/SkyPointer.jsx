import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { placeSpring, stepSpring } from '../utils/spring';
import { isEmptySky, isOpenSky } from '../utils/skyTarget';
import { cue } from '../audio/sound';

// A fast flick across empty sky: this far, this fast, this straight
const FLICK_WINDOW_MS = 140;
const FLICK_MIN_PX = 300;
const FLICK_MIN_SHARE = 0.22; // of the window's width, on narrower windows
const FLICK_SPEED = 3; // px per ms
const FLICK_STRAIGHTNESS = 0.9;
const FLICK_MIN_SAMPLES = 4;
// Rare: at most one meteor this often
const METEOR_EVERY_MS = 45000;
// The streak runs on past the flick, while the sky ahead stays empty
const METEOR_RUN_ON_PX = 260;
const METEOR_TAIL_PX = 150;
// Matched to the meteor's sound, which sparks as it burns out at 0.95 s
const METEOR_MS = 950;
const SPARK_MS = 380;
// Once the halo has been out this long, it comes back at the pointer rather than
// gliding there; the scene does the same with its starlight
const DARK_RESET_MS = 750;

const stereo = (x) => Math.max(-0.85, Math.min(0.85, (x / window.innerWidth) * 2 - 1));

// The cursor over the sky, on desktops (C1, C2; the master prompt 5.6): a soft
// moonlight halo that trails the pointer on a spring, drawn beneath the Moon so it
// lights only the sky, fading over controls, text and panels; and, rarely, a
// meteor when the pointer is flung across empty sky. The native pointer stays.
// Mounted only with a mouse, and not when motion is unwelcome.
const SkyPointer = ({ skyHost }) => {
  const haloRef = useRef(null);

  useEffect(() => {
    const halo = haloRef.current;
    if (!halo) return undefined;
    const spring = { x: 0, y: 0, vx: 0, vy: 0 };
    const pointer = { x: 0, y: 0 };
    let lit = false;
    let shown = false;
    let frame = 0;
    let lastFrameAt = 0;
    let darkSince = 0;

    const draw = () => {
      halo.style.transform = `translate3d(${spring.x}px, ${spring.y}px, 0)`;
    };
    const step = (now) => {
      const settled = stepSpring(spring, pointer, (now - lastFrameAt) / 1000);
      lastFrameAt = now;
      draw();
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const run = () => {
      if (frame) return;
      lastFrameAt = performance.now();
      frame = requestAnimationFrame(step);
    };
    const light = (on) => {
      if (on === shown) return;
      shown = on;
      halo.classList.toggle('is-lit', on);
      if (!on) darkSince = performance.now();
    };

    // The flick so far: recent samples over empty sky
    let samples = [];
    let nextMeteorAt = 0;

    const launch = (from, to) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length;
      const uy = dy / length;
      // Run on past the pointer while the sky ahead is empty and on screen
      let end = { x: to.x, y: to.y };
      for (let run = 52; run <= METEOR_RUN_ON_PX; run += 52) {
        const x = to.x + ux * run;
        const y = to.y + uy * run;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) break;
        if (!isEmptySky(document.elementFromPoint(x, y), x, y)) break;
        end = { x, y };
      }
      const angle = Math.atan2(dy, dx);
      const streak = document.createElement('div');
      streak.className = 'meteor';
      const spark = document.createElement('div');
      spark.className = 'meteor-spark';
      skyHost.append(streak, spark);
      const at = (p, s) => `translate(${p.x - METEOR_TAIL_PX}px, ${p.y - 1}px) rotate(${angle}rad) scaleX(${s})`;
      const travel = streak.animate([
        { transform: at(from, 0.15), opacity: 0 },
        { transform: at({ x: from.x + (end.x - from.x) * 0.15, y: from.y + (end.y - from.y) * 0.15 }, 0.7), opacity: 1, offset: 0.15 },
        { transform: at({ x: from.x + (end.x - from.x) * 0.8, y: from.y + (end.y - from.y) * 0.8 }, 1), opacity: 0.85, offset: 0.8 },
        { transform: at(end, 0.6), opacity: 0 }
      ], { duration: METEOR_MS, easing: 'linear' });
      spark.style.transform = `translate(${end.x}px, ${end.y}px)`;
      const burn = spark.animate([
        { opacity: 0, scale: 0.4 },
        { opacity: 1, scale: 1, offset: 0.25 },
        { opacity: 0, scale: 1.6 }
      ], { duration: SPARK_MS, delay: METEOR_MS - 60, easing: 'ease-out', fill: 'backwards' });
      travel.finished.catch(() => {}).finally(() => streak.remove());
      burn.finished.catch(() => {}).finally(() => spark.remove());
      cue('meteor', { from: stereo(from.x), to: stereo(end.x) });
    };

    const watchFlick = (event) => {
      if (!isEmptySky(event.target, event.clientX, event.clientY)) {
        samples = [];
        return;
      }
      const t = event.timeStamp;
      samples.push({ x: event.clientX, y: event.clientY, t });
      while (samples.length && t - samples[0].t > FLICK_WINDOW_MS) samples.shift();
      if (t < nextMeteorAt || samples.length < FLICK_MIN_SAMPLES) return;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const elapsed = last.t - first.t;
      const chord = Math.hypot(last.x - first.x, last.y - first.y);
      if (elapsed <= 0 || chord < Math.min(FLICK_MIN_PX, window.innerWidth * FLICK_MIN_SHARE)) return;
      if (chord / elapsed < FLICK_SPEED) return;
      let path = 0;
      for (let i = 1; i < samples.length; i++) {
        path += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
      }
      if (chord / path < FLICK_STRAIGHTNESS) return;
      samples = [];
      nextMeteorAt = t + METEOR_EVERY_MS;
      launch(first, last);
    };

    const onMove = (event) => {
      if (event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      lit = isOpenSky(event.target);
      // Where the light comes up after a while away, it starts at the pointer
      if (lit && !shown && performance.now() - darkSince > DARK_RESET_MS) {
        placeSpring(spring, pointer);
        draw();
      }
      light(lit);
      run();
      watchFlick(event);
    };
    const onLeave = (event) => {
      if (event.relatedTarget) return;
      light(false);
      samples = [];
    };
    const onBlur = () => light(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onLeave);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onLeave);
      window.removeEventListener('blur', onBlur);
    };
  }, [skyHost]);

  return createPortal(<div ref={haloRef} className="sky-halo" />, skyHost);
};

export default SkyPointer;
