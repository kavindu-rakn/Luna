import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

// Textured Earth with day/night terminator
const Earth = () => {
  const earthRef = useRef();
  const colorMap = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002;
    }
  });

  return (
    <Sphere ref={earthRef} args={[1.5, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial
        map={colorMap}
        roughness={0.8}
        metalness={0.1}
      />
    </Sphere>
  );
};

// Small orbiting Moon
const OrbitalMoon = ({ phase }) => {
  const moonRef = useRef();
  const groupRef = useRef();
  const colorMap = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg');

  // Moon orbital position based on phase
  const orbitalAngle = phase * Math.PI * 2;
  const orbitRadius = 5;
  const moonPos = useMemo(() => [
    Math.sin(orbitalAngle) * orbitRadius,
    0,
    -Math.cos(orbitalAngle) * orbitRadius
  ], [orbitalAngle]);

  useFrame(() => {
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere ref={moonRef} args={[0.4, 32, 32]} position={moonPos}>
        <meshStandardMaterial
          map={colorMap}
          bumpMap={colorMap}
          bumpScale={0.01}
          roughness={0.9}
          metalness={0.1}
        />
      </Sphere>
      {/* Small glow behind the moon */}
      <mesh position={moonPos}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color="#6b77e8" transparent opacity={0.06} />
      </mesh>
    </group>
  );
};

// Orbital path ring
const OrbitPath = () => {
  const points = useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.sin(angle) * 5,
        0,
        -Math.cos(angle) * 5
      ));
    }
    return pts;
  }, []);

  return (
    <Line
      points={points}
      color="rgba(107, 119, 232, 0.15)"
      lineWidth={0.5}
      transparent
      opacity={0.2}
    />
  );
};

// Sun direction indicator (small bright dot far away)
const SunIndicator = ({ phase }) => {
  const theta = phase * Math.PI * 2;
  const distance = 12;
  const sunPos = [
    Math.sin(theta) * distance,
    2,
    -Math.cos(theta) * distance
  ];

  return (
    <>
      <pointLight position={sunPos} intensity={60} color="#ffffff" distance={50} />
      <ambientLight intensity={0.08} color="#8a8db5" />
    </>
  );
};

// Labels for the orbital view
const OrbitalLabels = ({ phase }) => {
  const orbitalAngle = phase * Math.PI * 2;
  const moonPos = [
    Math.sin(orbitalAngle) * 5,
    0,
    -Math.cos(orbitalAngle) * 5
  ];

  return (
    <>
      <Html position={[0, -2.2, 0]} center>
        <div style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.7rem',
          fontFamily: 'Inter, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          Earth
        </div>
      </Html>
      <Html position={[moonPos[0], moonPos[1] - 0.8, moonPos[2]]} center>
        <div style={{
          color: 'var(--color-accent)',
          fontSize: '0.65rem',
          fontFamily: 'Inter, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          Moon
        </div>
      </Html>
    </>
  );
};

// Camera controller that slowly orbits
const CameraOrbit = () => {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() * 0.1;
    const radius = 12;
    camera.position.x = Math.sin(t) * radius * 0.3;
    camera.position.y = 4 + Math.sin(t * 0.5) * 1;
    camera.position.z = Math.cos(t) * radius * 0.3 + radius * 0.7;
    camera.lookAt(0, 0, 0);
  });
  return null;
};

const OrbitalView = ({ lunarDetails }) => {
  const { phase, name, fraction } = lunarDetails;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="glass-panel" style={{ width: '100%', padding: '1.5rem' }}>
      {/* Header with toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isExpanded ? '1rem' : '0'
      }}>
        <span style={{
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-text-secondary)'
        }}>
          Earth–Moon Orbit
        </span>
        <button
          className="glass-button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
        >
          {isExpanded ? 'Collapse' : 'Expand View'}
        </button>
      </div>

      {/* 3D Orbital Canvas */}
      <div style={{
        width: '100%',
        height: isExpanded ? '450px' : '0px',
        overflow: 'hidden',
        transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '16px',
        position: 'relative'
      }}>
        <Canvas camera={{ position: [0, 5, 10], fov: 40 }}>
          <React.Suspense fallback={null}>
            <SunIndicator phase={phase} />
            <Earth sunDirection={phase} />
            <OrbitalMoon phase={phase} />
            <OrbitPath />
            <OrbitalLabels phase={phase} />
            <CameraOrbit />
          </React.Suspense>
        </Canvas>

        {/* Overlay info */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          display: 'flex',
          gap: '1.5rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-secondary)',
          pointerEvents: 'none'
        }}>
          <div>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{name}</span>
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>Phase: </span>
            <span style={{ color: 'var(--color-accent)' }}>{(phase * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span style={{ opacity: 0.6 }}>Illumination: </span>
            <span>{fraction}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrbitalView;
