import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { HelpCircle } from 'lucide-react';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const EARTH_TEXTURE = `${BASE_URL}/assets/textures/earth_atmos_2048.jpg`;
const MOON_TEXTURE = `${BASE_URL}/assets/textures/moon_1024.jpg`;

// Textured Earth with fixed Sun illumination
const Earth = () => {
  const earthRef = useRef();
  const earthTexture = useTexture(EARTH_TEXTURE);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0015;
    }
  });

  return (
    <Sphere ref={earthRef} args={[1.35, 48, 48]} position={[0, 0, 0]}>
      <meshStandardMaterial
        map={earthTexture}
        roughness={0.7}
        metalness={0.1}
      />
    </Sphere>
  );
};

// Orbiting Moon with exact synodic position
const OrbitalMoon = ({ phase }) => {
  const moonRef = useRef();
  const moonTexture = useTexture(MOON_TEXTURE);

  const orbitRadius = 4.8;
  const orbitalAngle = phase * Math.PI * 2;

  const moonPos = useMemo(() => [
    Math.cos(orbitalAngle) * orbitRadius,
    0,
    Math.sin(orbitalAngle) * orbitRadius
  ], [orbitalAngle]);

  return (
    <group position={moonPos}>
      <Sphere ref={moonRef} args={[0.42, 32, 32]}>
        <meshStandardMaterial
          map={moonTexture}
          roughness={0.9}
          metalness={0.05}
        />
      </Sphere>

      {/* Direction indicator glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#a5b4fc" transparent opacity={0.08} />
      </mesh>
    </group>
  );
};

// Orbital path ring
const OrbitPath = () => {
  const points = useMemo(() => {
    const pts = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * 4.8,
        0,
        Math.sin(angle) * 4.8
      ));
    }
    return pts;
  }, []);

  return (
    <Line
      points={points}
      color="#6366f1"
      lineWidth={1}
      transparent
      opacity={0.35}
    />
  );
};

// Parallel Sunlight from fixed +X direction
const SunLighting = () => {
  return (
    <>
      <directionalLight position={[18, 1, 0]} intensity={3.5} color="#ffffff" />
      <ambientLight intensity={0.07} color="#474f7a" />
    </>
  );
};

// Orbital View Scene with slow cinematic camera drift
const CameraRig = () => {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() * 0.04;
    camera.position.x = Math.sin(t) * 1.5;
    camera.position.y = 8.5 + Math.cos(t * 0.5) * 0.5;
    camera.position.z = 7.5 + Math.cos(t) * 1.2;
    camera.lookAt(0, 0, 0);
  });
  return null;
};

const OrbitalView = ({ lunarDetails }) => {
  const { phase, name, fraction, distanceKm } = lunarDetails;
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="glass-panel orbital-card" style={{ width: '100%', padding: '1.5rem' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="utility-label" style={{ margin: 0 }}>
            Earth–Moon Orbital Geometry
          </span>
        </div>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="ghost-control-btn"
          style={{ padding: '4px', minWidth: '28px', minHeight: '28px' }}
          title="Explain orbital view"
          aria-label="Toggle Orbital View Explanation"
        >
          <HelpCircle size={15} />
        </button>
      </div>

      {showExplanation && (
        <div
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '0.85rem',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Astronomical Context:</strong> Sunlight arrives from the right side (+X). As the Moon revolves counter-clockwise around Earth, the illuminated hemisphere seen from Earth creates the lunar phases.
        </div>
      )}

      {/* 3D Canvas */}
      <div
        style={{
          width: '100%',
          height: '280px',
          borderRadius: '14px',
          overflow: 'hidden',
          background: 'radial-gradient(circle at center, rgba(17, 21, 44, 0.6) 0%, rgba(5, 7, 14, 0.95) 100%)',
          position: 'relative'
        }}
      >
        <Canvas camera={{ position: [0, 9, 8], fov: 38 }} dpr={[1, 2]}>
          <React.Suspense fallback={null}>
            <SunLighting />
            <Earth />
            <OrbitalMoon phase={phase} />
            <OrbitPath />
            <CameraRig />
          </React.Suspense>
        </Canvas>

        {/* Overlay Telemetry Badges */}
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'rgba(5, 7, 14, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '0.4rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: 'var(--text-accent)'
          }}
        >
          <span>☀ Sunlight from Right</span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '0.75rem',
            left: '0.75rem',
            right: '0.75rem',
            background: 'rgba(5, 7, 14, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '0.65rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <div className="utility-label" style={{ opacity: 0.7 }}>Phase Name</div>
            <div className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {name}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="utility-label" style={{ opacity: 0.7 }}>Illumination</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-light)', fontFamily: 'var(--font-mono)' }}>
              {fraction}%
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="utility-label" style={{ opacity: 0.7 }}>Distance</div>
            <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {distanceKm ? distanceKm.toLocaleString() : '384,400'} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrbitalView;
