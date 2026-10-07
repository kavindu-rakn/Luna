import React, { useEffect, useRef, useState } from 'react';
import { CATALOGUE_FILE, decodeStars, starColor, starLight } from '../sky/stars';
import { focalLength, project, skyFrame } from '../sky/frame';
import { getPlanets } from '../sky/planets';

const SKY_PATH = `${import.meta.env.BASE_URL}assets/sky/`;
// The scene sizes the Moon's outline the same way (src/scene/scene.js)
const OUTLINE_OF_HEIGHT = 0.92;
const OUTLINE_OF_WIDTH = 0.83;

// The sky for a browser without WebGL: the same stars and planets in the same
// places, drawn once onto a 2D canvas and again only when the view or the screen
// changes. Static, as the 2D Moon is: no twinkle, no drift.
const SkyFallback = ({ view, skyHost, areaRef }) => {
  const canvasRef = useRef(null);
  const [stars, setStars] = useState(null);
  const [drawn, setDrawn] = useState(false);
  const [size, setSize] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(SKY_PATH + CATALOGUE_FILE)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then((buffer) => { if (!cancelled) setStars(decodeStars(buffer)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Redrawn whenever the screen or the Moon's area changes size
  useEffect(() => {
    const observer = new ResizeObserver(() => setSize((n) => n + 1));
    observer.observe(skyHost);
    if (areaRef.current) observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, [skyHost, areaRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!stars || !canvas || !area) return;
    const sky = skyHost.getBoundingClientRect();
    const box = area.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(sky.width * ratio);
    canvas.height = Math.round(sky.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, sky.width, sky.height);

    const cx = box.left - sky.left + box.width / 2;
    const cy = box.top - sky.top + box.height / 2;
    // Nothing is drawn behind the Moon: it hides the stars it passes in front of
    const hidden = Math.min(OUTLINE_OF_HEIGHT * box.height, OUTLINE_OF_WIDTH * box.width) / 2;
    const frame = skyFrame(view);
    const focal = focalLength(sky.width, sky.height);

    const draw = (direction, magnitude, colorIndex) => {
      const at = project(frame, focal, direction);
      if (!at) return;
      const x = cx + at[0];
      const y = cy + at[1];
      if (x < -8 || y < -8 || x > sky.width + 8 || y > sky.height + 8 || Math.hypot(x - cx, y - cy) < hidden) return;
      const { peak, sigma, halo } = starLight(magnitude);
      const [r, g, b] = starColor(colorIndex).map((c) => Math.round(c * 255));
      if (halo) {
        const reach = sigma * 8;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, reach);
        glow.addColorStop(0, `rgb(${r} ${g} ${b} / ${halo})`);
        glow.addColorStop(0.25, `rgb(${r} ${g} ${b} / ${halo * 0.37})`);
        glow.addColorStop(0.5, `rgb(${r} ${g} ${b} / ${halo * 0.14})`);
        glow.addColorStop(1, `rgb(${r} ${g} ${b} / 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);
      }
      // A Gaussian, as the WebGL sky draws it, out to three widths
      const radius = Math.max(0.6, sigma) * 3;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgb(${r} ${g} ${b} / ${peak})`);
      gradient.addColorStop(0.33, `rgb(${r} ${g} ${b} / ${peak * 0.61})`);
      gradient.addColorStop(0.67, `rgb(${r} ${g} ${b} / ${peak * 0.14})`);
      gradient.addColorStop(1, `rgb(${r} ${g} ${b} / 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };

    for (let i = 0; i < stars.count; i++) {
      draw(stars.directions.subarray(i * 3, i * 3 + 3), stars.magnitudes[i], stars.colorIndices[i]);
    }
    for (const planet of getPlanets(view.time)) draw(planet.direction, planet.magnitude, planet.colorIndex);
    setDrawn(true);
  }, [stars, view, size, skyHost, areaRef]);

  return <canvas ref={canvasRef} className={`sky-flat${drawn ? ' is-drawn' : ''}`} />;
};

export default SkyFallback;
