import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const MOON_TEXTURE = `${BASE_URL}/assets/textures/moon_1024.jpg`;

// Standard Three.js moon texture has Near Side (Prime Meridian) at U = 0.5.
// Rotating by -PI/2 aligns Prime Meridian with +Z facing camera.
const PRIME_MERIDIAN_Y = -Math.PI / 2;

const MoonMesh = ({ phase, scale = 1, isCustomRotation, setIsCustomRotation, resetCount }) => {
  const moonRef = useRef();
  const isDragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  const colorMap = useTexture(MOON_TEXTURE);

  // Sunlight position illuminating from Earth observer's perspective
  const sunPosition = useMemo(() => {
    const theta = phase * Math.PI * 2;
    const distance = 16;
    return [
      Math.sin(theta) * distance,
      0, // Equator aligned to prevent polar lighting artifacts
      -Math.cos(theta) * distance
    ];
  }, [phase]);

  // Initial Prime Meridian orientation
  useEffect(() => {
    if (moonRef.current) {
      moonRef.current.rotation.y = PRIME_MERIDIAN_Y;
      moonRef.current.rotation.x = 0;
      moonRef.current.rotation.z = 0;
    }
  }, []);

  // Smooth reset to Prime Meridian on reset trigger
  useEffect(() => {
    if (resetCount > 0 && moonRef.current) {
      velocity.current = { x: 0, y: 0 };
    }
  }, [resetCount]);

  useFrame(() => {
    if (!moonRef.current) return;

    if (resetCount > 0 && !isDragging.current && isCustomRotation) {
      // Smoothly animate back to Prime Meridian
      moonRef.current.rotation.y = THREE.MathUtils.lerp(moonRef.current.rotation.y, PRIME_MERIDIAN_Y, 0.1);
      moonRef.current.rotation.x = THREE.MathUtils.lerp(moonRef.current.rotation.x, 0, 0.1);

      if (Math.abs(moonRef.current.rotation.y - PRIME_MERIDIAN_Y) < 0.005 && Math.abs(moonRef.current.rotation.x) < 0.005) {
        moonRef.current.rotation.y = PRIME_MERIDIAN_Y;
        moonRef.current.rotation.x = 0;
        setIsCustomRotation(false);
      }
    } else if (!isDragging.current) {
      // Apply momentum decay
      moonRef.current.rotation.y += velocity.current.x;
      moonRef.current.rotation.x += velocity.current.y;
      velocity.current.x *= 0.93;
      velocity.current.y *= 0.93;

      // Lock vertical tilt within natural lunar libration range (+/- 14 deg)
      // This prevents the poles from tipping directly into camera view
      moonRef.current.rotation.x = Math.max(-0.25, Math.min(0.25, moonRef.current.rotation.x));
    }
  });

  return (
    <group scale={scale}>
      {/* Earthshine subtle illumination */}
      <ambientLight intensity={0.09} color="#7880ab" />

      {/* Direct Sunlight */}
      <directionalLight
        position={sunPosition}
        intensity={3.4}
        color="#ffffff"
      />

      {/* 3D Moon Sphere (128x128 high-density mesh) */}
      <group ref={moonRef}>
        <Sphere args={[1.85, 128, 128]}>
          <meshStandardMaterial
            map={colorMap}
            bumpMap={colorMap}
            bumpScale={0.02}
            roughness={0.92}
            metalness={0.04}
          />
        </Sphere>
      </group>

      {/* Direct 360 Drag Interaction Hit Sphere */}
      <Sphere
        args={[1.92, 32, 32]}
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDragging.current = true;
          previousPointer.current = { x: e.clientX, y: e.clientY };
          setIsCustomRotation(true);
        }}
        onPointerMove={(e) => {
          if (!isDragging.current || !moonRef.current) return;
          const deltaX = e.clientX - previousPointer.current.x;
          const deltaY = e.clientY - previousPointer.current.y;

          velocity.current.x = deltaX * 0.005;
          velocity.current.y = deltaY * 0.003;

          moonRef.current.rotation.y += velocity.current.x;
          moonRef.current.rotation.x = Math.max(-0.25, Math.min(0.25, moonRef.current.rotation.x + velocity.current.y));

          previousPointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          isDragging.current = false;
        }}
        onPointerLeave={() => {
          isDragging.current = false;
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </Sphere>
    </group>
  );
};

const FallbackSphere = ({ scale = 1 }) => (
  <Sphere args={[1.85 * scale, 32, 32]}>
    <meshStandardMaterial color="#2d3047" roughness={0.9} />
  </Sphere>
);

const MoonVisualization = ({ lunarDetails }) => {
  const { phase, fraction } = lunarDetails;
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  const [isCustomRotation, setIsCustomRotation] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const updateIsMobile = (e) => setIsMobile(e.matches);
    if (media.addEventListener) {
      media.addEventListener('change', updateIsMobile);
      return () => media.removeEventListener('change', updateIsMobile);
    } else {
      media.addListener(updateIsMobile);
      return () => media.removeListener(updateIsMobile);
    }
  }, []);

  const moonScale = isMobile ? 0.8 : 1.0;
  const glowSize = isMobile ? '300px' : '440px';

  return (
    <div className="moon-viz-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Background Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          background: `radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)`,
          opacity: Math.max(0.12, parseFloat(fraction) / 100),
          transition: 'opacity 0.6s ease',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Floating "Reset to Earth View" Badge when rotated */}
      {isCustomRotation && (
        <button
          className="glass-button"
          onClick={() => setResetCount(c => c + 1)}
          style={{
            position: 'absolute',
            top: '0.4rem',
            zIndex: 15,
            padding: '0.3rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--accent-light)',
            boxShadow: '0 4px 16px var(--accent-glow)',
            animation: 'fadeIn 0.25s ease-out'
          }}
          title="Reset to Earth observation perspective (Prime Meridian)"
          aria-label="Reset to Earth observation view"
        >
          <RotateCcw size={12} color="var(--accent-light)" />
          <span>Reset View</span>
        </button>
      )}

      {/* Three.js R3F Canvas Container */}
      <div style={{ width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas
          camera={{ position: [0, 0, 5.8], fov: 40 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <React.Suspense fallback={<FallbackSphere scale={moonScale} />}>
            <MoonMesh
              phase={phase}
              scale={moonScale}
              isCustomRotation={isCustomRotation}
              setIsCustomRotation={setIsCustomRotation}
              resetCount={resetCount}
            />
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default MoonVisualization;
