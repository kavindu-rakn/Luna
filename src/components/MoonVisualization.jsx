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

const MoonMesh = ({ phase, scale = 1, setIsCustomRotation, resetTrigger }) => {
  const moonRef = useRef();
  const isDragging = useRef(false);
  const isResetting = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  const colorMap = useTexture(MOON_TEXTURE);

  // Directional sunlight illuminating from Earth observer's perspective
  const sunPosition = useMemo(() => {
    const theta = phase * Math.PI * 2;
    const distance = 16;
    return [
      Math.sin(theta) * distance,
      0,
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

  // When reset button is clicked, start the one-time reset animation
  useEffect(() => {
    if (resetTrigger > 0) {
      isResetting.current = true;
      velocity.current = { x: 0, y: 0 };
    }
  }, [resetTrigger]);

  useFrame(() => {
    if (!moonRef.current) return;

    if (isResetting.current) {
      // Smoothly animate back to Prime Meridian (Earth View)
      moonRef.current.rotation.y = THREE.MathUtils.lerp(moonRef.current.rotation.y, PRIME_MERIDIAN_Y, 0.08);
      moonRef.current.rotation.x = THREE.MathUtils.lerp(moonRef.current.rotation.x, 0, 0.08);

      if (
        Math.abs(moonRef.current.rotation.y - PRIME_MERIDIAN_Y) < 0.003 &&
        Math.abs(moonRef.current.rotation.x) < 0.003
      ) {
        moonRef.current.rotation.y = PRIME_MERIDIAN_Y;
        moonRef.current.rotation.x = 0;
        isResetting.current = false;
        setIsCustomRotation(false);
      }
    } else if (!isDragging.current) {
      // Apply smooth rotational inertia and decay
      moonRef.current.rotation.y += velocity.current.x;
      moonRef.current.rotation.x += velocity.current.y;
      velocity.current.x *= 0.94;
      velocity.current.y *= 0.94;

      // Soft clamp on vertical tilt to allow looking at North/South poles (+/- 86 degrees)
      moonRef.current.rotation.x = Math.max(-1.5, Math.min(1.5, moonRef.current.rotation.x));
    }
  });

  // Custom shader hook to eliminate polar pinching/starburst artifacts on the poles
  const customMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: colorMap,
      bumpMap: colorMap,
      bumpScale: 0.02,
      roughness: 0.92,
      metalness: 0.04
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying vec3 vWorldNormal;
        ${shader.vertexShader}
      `.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldNormal = normalize(normal);
        `
      );

      shader.fragmentShader = `
        varying vec3 vWorldNormal;
        ${shader.fragmentShader}
      `.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        // Smooth polar antialiasing to eliminate triangle fan pinching
        float poleDist = abs(vWorldNormal.y);
        if (poleDist > 0.82) {
          float poleFactor = smoothstep(0.82, 0.98, poleDist);
          vec2 poleSampleUV = vec2(vMapUv.x, vWorldNormal.y > 0.0 ? 0.03 : 0.97);
          vec4 poleColor = texture2D(map, poleSampleUV);
          diffuseColor.rgb = mix(diffuseColor.rgb, poleColor.rgb, poleFactor * 0.7);
        }
        `
      );
    };

    return mat;
  }, [colorMap]);

  return (
    <group scale={scale}>
      {/* Subtle Earthshine illumination */}
      <ambientLight intensity={0.09} color="#7880ab" />

      {/* Direct Sunlight */}
      <directionalLight
        position={sunPosition}
        intensity={3.4}
        color="#ffffff"
      />

      {/* 3D Moon Sphere with custom seamless polar shader */}
      <group ref={moonRef}>
        <Sphere args={[1.85, 128, 128]} material={customMaterial} />
      </group>

      {/* Interactive Raycast Hit Sphere for 360 Full Orbit Drag */}
      <Sphere
        args={[1.95, 32, 32]}
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDragging.current = true;
          isResetting.current = false;
          previousPointer.current = { x: e.clientX, y: e.clientY };
          setIsCustomRotation(true);
        }}
        onPointerMove={(e) => {
          if (!isDragging.current || !moonRef.current) return;
          const deltaX = e.clientX - previousPointer.current.x;
          const deltaY = e.clientY - previousPointer.current.y;

          velocity.current.x = deltaX * 0.005;
          velocity.current.y = deltaY * 0.005;

          moonRef.current.rotation.y += velocity.current.x;
          moonRef.current.rotation.x = Math.max(-1.5, Math.min(1.5, moonRef.current.rotation.x + velocity.current.y));

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
  const [resetTrigger, setResetTrigger] = useState(0);

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

      {/* Floating "Reset View" Badge when rotated */}
      {isCustomRotation && (
        <button
          className="glass-button"
          onClick={() => setResetTrigger(c => c + 1)}
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
              resetTrigger={resetTrigger}
            />
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default MoonVisualization;
