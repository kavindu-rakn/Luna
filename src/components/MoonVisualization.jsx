import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Compass, RotateCw, Eye } from 'lucide-react';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const MOON_TEXTURE = `${BASE_URL}/assets/textures/moon_1024.jpg`;

const MoonMesh = ({ phase, scale = 1, isFreeMode = false, resetTrigger = 0 }) => {
  const moonRef = useRef();
  const isDragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  // Load local texture using resolved base URL
  const colorMap = useTexture(MOON_TEXTURE);

  // Calculate sun directional light position based on lunar phase
  const sunPosition = useMemo(() => {
    const theta = phase * Math.PI * 2;
    const distance = 16;
    return [
      -Math.sin(theta) * distance,
      0.5,
      -Math.cos(theta) * distance
    ];
  }, [phase]);

  // Reset to tidally-locked Earth view when resetTrigger changes or freeMode is toggled off
  useEffect(() => {
    if (!isFreeMode && moonRef.current) {
      moonRef.current.rotation.x = 0;
      moonRef.current.rotation.y = 0;
      moonRef.current.rotation.z = 0;
      velocity.current = { x: 0, y: 0 };
    }
  }, [isFreeMode, resetTrigger]);

  // Inertia and damping for free exploration mode
  useFrame(() => {
    if (!moonRef.current) return;

    if (isFreeMode) {
      if (!isDragging.current) {
        moonRef.current.rotation.y += velocity.current.x;
        moonRef.current.rotation.x += velocity.current.y;
        velocity.current.x *= 0.94;
        velocity.current.y *= 0.94;
      }
    } else {
      moonRef.current.rotation.y = THREE.MathUtils.lerp(moonRef.current.rotation.y, 0, 0.1);
      moonRef.current.rotation.x = THREE.MathUtils.lerp(moonRef.current.rotation.x, 0, 0.1);
    }
  });

  return (
    <group scale={scale}>
      {/* Earthshine: Subtle da Vinci glow on the dark side facing Earth */}
      <ambientLight intensity={0.09} color="#7880ab" />

      {/* The Sun: Directional light causing exact phase illumination and terminator line */}
      <directionalLight
        position={sunPosition}
        intensity={3.2}
        color="#ffffff"
      />

      {/* 3D Moon Sphere */}
      <group ref={moonRef}>
        <Sphere args={[2, 64, 64]}>
          <meshStandardMaterial
            map={colorMap}
            bumpMap={colorMap}
            bumpScale={0.02}
            roughness={0.92}
            metalness={0.05}
          />
        </Sphere>
      </group>

      {/* Interactive Raycast Hit Area */}
      <Sphere
        args={[2.08, 32, 32]}
        visible={false}
        onPointerDown={(e) => {
          if (!isFreeMode) return;
          e.stopPropagation();
          isDragging.current = true;
          previousPointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!isFreeMode || !isDragging.current || !moonRef.current) return;
          const deltaX = e.clientX - previousPointer.current.x;
          const deltaY = e.clientY - previousPointer.current.y;
          
          velocity.current.x = deltaX * 0.005;
          velocity.current.y = deltaY * 0.005;

          moonRef.current.rotation.y += velocity.current.x;
          moonRef.current.rotation.x += velocity.current.y;

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
  <Sphere args={[2 * scale, 32, 32]}>
    <meshStandardMaterial color="#2d3047" roughness={0.9} />
  </Sphere>
);

const MoonVisualization = ({ lunarDetails }) => {
  const { phase, fraction } = lunarDetails;
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  const [isFreeMode, setIsFreeMode] = useState(false);
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

  const moonScale = isMobile ? 0.78 : 1.05;
  const glowSize = isMobile ? '320px' : '460px';

  return (
    <div className="moon-viz-wrapper" style={{ position: 'relative' }}>
      {/* Background Radial Glow proportional to phase illumination */}
      <div
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          background: `radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)`,
          opacity: Math.max(0.15, parseFloat(fraction) / 100),
          transition: 'opacity 0.6s ease',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* View Mode Switcher Pill */}
      <div
        style={{
          position: 'absolute',
          top: '0.75rem',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-surface-1)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '0.3rem 0.5rem'
        }}
      >
        <button
          className={`mode-toggle-btn ${!isFreeMode ? 'active' : ''}`}
          onClick={() => {
            setIsFreeMode(false);
            setResetCount(c => c + 1);
          }}
          title="Tidally locked: View Moon as seen from Earth"
          aria-label="Earth Observation View"
        >
          <Eye size={13} />
          <span>Earth View</span>
        </button>

        <button
          className={`mode-toggle-btn ${isFreeMode ? 'active' : ''}`}
          onClick={() => setIsFreeMode(true)}
          title="Freely rotate 360° to inspect craters and far side"
          aria-label="Free 3D Globe Mode"
        >
          <Compass size={13} />
          <span>3D Globe</span>
        </button>

        {isFreeMode && (
          <button
            className="mode-reset-btn"
            onClick={() => setResetCount(c => c + 1)}
            title="Reset to Prime Meridian"
            aria-label="Reset Rotation"
          >
            <RotateCw size={12} />
          </button>
        )}
      </div>

      {/* Three.js R3F Canvas Container */}
      <div style={{ width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <React.Suspense fallback={<FallbackSphere scale={moonScale} />}>
            <MoonMesh
              phase={phase}
              scale={moonScale}
              isFreeMode={isFreeMode}
              resetTrigger={resetCount}
            />
          </React.Suspense>
        </Canvas>
      </div>

      {/* Free Mode Hint */}
      {isFreeMode && (
        <div
          className="utility-label"
          style={{
            position: 'absolute',
            bottom: '0.5rem',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            zIndex: 10,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          Drag to explore surface
        </div>
      )}
    </div>
  );
};

export default MoonVisualization;
