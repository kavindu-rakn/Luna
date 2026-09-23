import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import '../utils/threeConsole';
import { HelpCircle } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { MEAN_MOON_DISTANCE } from '../utils/lunarCalc';
import { formatDistance } from '../utils/units';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const EARTH_TEXTURE = `${BASE_URL}/assets/textures/earth_atmos_2048.jpg`;
const MOON_TEXTURE = `${BASE_URL}/assets/textures/moon_1024.jpg`;

// Earth radius & rotation
const Earth = () => {
  const earthRef = useRef();
  const earthTexture = useTexture(EARTH_TEXTURE);
  const prefersReducedMotion = usePrefersReducedMotion();

  useFrame(() => {
    if (prefersReducedMotion) return;
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002;
    }
  });

  return (
    <Sphere ref={earthRef} args={[0.95, 48, 48]} position={[0, 0, 0]}>
      <meshStandardMaterial
        map={earthTexture}
        roughness={0.7}
        metalness={0.08}
      />
    </Sphere>
  );
};

// Orbiting Moon with exact synodic position along fitted orbit
const ORBIT_RADIUS = 3.3;

const OrbitalMoon = ({ phase }) => {
  const moonRef = useRef();
  const moonTexture = useTexture(MOON_TEXTURE);

  const orbitalAngle = phase * Math.PI * 2;

  const moonPos = useMemo(() => [
    Math.cos(orbitalAngle) * ORBIT_RADIUS,
    0,
    Math.sin(orbitalAngle) * ORBIT_RADIUS
  ], [orbitalAngle]);

  return (
    <group position={moonPos}>
      <Sphere ref={moonRef} args={[0.3, 32, 32]}>
        <meshStandardMaterial
          map={moonTexture}
          roughness={0.9}
          metalness={0.04}
        />
      </Sphere>

      {/* Subtle position halo */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial color="#a5b4fc" transparent opacity={0.12} />
      </mesh>
    </group>
  );
};

// Orbital path ring fully contained in viewport
const OrbitPath = () => {
  const points = useMemo(() => {
    const pts = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * ORBIT_RADIUS,
        0,
        Math.sin(angle) * ORBIT_RADIUS
      ));
    }
    return pts;
  }, []);

  return (
    <Line
      points={points}
      color="#8d9dd6"
      lineWidth={1.2}
      transparent
      opacity={0.45}
    />
  );
};

// Fixed Parallel Sunlight from +X (Right)
const SunLighting = () => {
  return (
    <>
      <directionalLight position={[15, 0, 0]} intensity={3.5} color="#ffffff" />
      <ambientLight intensity={0.08} color="#474f7a" />
    </>
  );
};

// Cinematic angle looking at orbital plane
const CameraRig = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  useFrame(({ camera, clock }) => {
    if (prefersReducedMotion) {
      // Hold one vantage point instead of drifting around the orbital plane
      camera.position.set(0, 7.8, 6.2);
      camera.lookAt(0, 0, 0);
      return;
    }
    const t = clock.getElapsedTime() * 0.03;
    camera.position.x = Math.sin(t) * 0.8;
    camera.position.y = 7.8 + Math.cos(t * 0.5) * 0.3;
    camera.position.z = 6.2 + Math.cos(t) * 0.6;
    camera.lookAt(0, 0, 0);
  });
  return null;
};

const OrbitalView = ({ lunarDetails, active = true, distanceUnit = 'km' }) => {
  const { phase, name, fraction, distanceKm } = lunarDetails;
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <section className="telemetry-section orbital-card">
      {/* Card Header */}
      <div className="orbital-header">
        <h3 className="utility-label orbital-title">
          Earth–Moon Orbital Geometry
        </h3>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="ghost-control-btn orbital-explain"
          title="Explain orbital view"
          aria-label="Toggle Orbital View Explanation"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {showExplanation && (
        <div className="orbital-explanation">
          <strong>Astronomical Context:</strong> Sunlight arrives from the right side (+X). As the Moon revolves around Earth, the illuminated portion visible from Earth produces the lunar phase cycle.
        </div>
      )}

      {/* 3D Orbit View Canvas (100% Unobstructed) */}
      <div className="orbital-canvas-wrap">
        {/* frameloop never while the drawer is shut: the diagram used to redraw at
            60fps behind a closed drawer for the life of the page */}
        <Canvas camera={{ position: [0, 8, 6.5], fov: 42 }} dpr={[1, 2]} frameloop={active ? 'always' : 'never'}>
          <React.Suspense fallback={null}>
            <SunLighting />
            <Earth />
            <OrbitalMoon phase={phase} />
            <OrbitPath />
            <CameraRig />
          </React.Suspense>
        </Canvas>

        {/* Sunlight Direction Indicator Badge */}
        <div className="orbital-sunlight" aria-hidden="true">
          ☀ Sunlight from Right
        </div>
      </div>

      {/* Current phase context, kept alongside the orbital figure */}
      <div className="orbital-readout">
        <div className="orbital-reading orbital-reading-phase">
          <div className="utility-label orbital-reading-label">Phase Name</div>
          <div className="font-serif orbital-phase-value">
            {name}
          </div>
        </div>

        <div className="orbital-reading orbital-reading-illumination">
          <div className="utility-label orbital-reading-label">Illumination</div>
          <div className="orbital-illumination-value">
            {fraction}%
          </div>
        </div>

        <div className="orbital-reading orbital-reading-distance">
          <div className="utility-label orbital-reading-label">Distance</div>
          <div className="orbital-distance-value">
            {formatDistance(distanceKm || MEAN_MOON_DISTANCE, distanceUnit)} <span>{distanceUnit}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrbitalView;
