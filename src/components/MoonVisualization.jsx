import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere } from '@react-three/drei';
import * as THREE from 'three';

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const MOON_TEXTURE_PATH = `${BASE_URL}/assets/textures/moon_1024.jpg`;

// Standard Three.js moon texture has Near Side (Prime Meridian) at U = 0.5.
// Rotating by -PI/2 aligns Prime Meridian with +Z facing camera.
const PRIME_MERIDIAN_Y = -Math.PI / 2;

// Polar Antialiasing: Blends polar image rows into uniform averages to eliminate UV starburst spoke lines
function processSeamlessMoonTexture(rawTexture) {
  if (!rawTexture || !rawTexture.image) return rawTexture;

  try {
    const img = rawTexture.image;
    const canvas = document.createElement('canvas');
    canvas.width = img.width || 1024;
    canvas.height = img.height || 512;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const width = canvas.width;
    const height = canvas.height;

    // 1. Calculate uniform average RGB for North Pole (Row 0)
    let nR = 0, nG = 0, nB = 0;
    for (let x = 0; x < width; x++) {
      const idx = x * 4;
      nR += data[idx];
      nG += data[idx + 1];
      nB += data[idx + 2];
    }
    nR = Math.round(nR / width);
    nG = Math.round(nG / width);
    nB = Math.round(nB / width);

    // 2. Calculate uniform average RGB for South Pole (Row height - 1)
    let sR = 0, sG = 0, sB = 0;
    const lastRowOffset = (height - 1) * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = lastRowOffset + x * 4;
      sR += data[idx];
      sG += data[idx + 1];
      sB += data[idx + 2];
    }
    sR = Math.round(sR / width);
    sG = Math.round(sG / width);
    sB = Math.round(sB / width);

    // 3. Smooth blend North Pole band (top 24 rows)
    const poleBand = 24;
    for (let y = 0; y < poleBand; y++) {
      const factor = Math.pow(1.0 - (y / poleBand), 1.5);
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x * 4;
        data[idx] = Math.round(data[idx] * (1 - factor) + nR * factor);
        data[idx + 1] = Math.round(data[idx + 1] * (1 - factor) + nG * factor);
        data[idx + 2] = Math.round(data[idx + 2] * (1 - factor) + nB * factor);
      }
    }

    // 4. Smooth blend South Pole band (bottom 24 rows)
    for (let i = 0; i < poleBand; i++) {
      const y = height - 1 - i;
      const factor = Math.pow(1.0 - (i / poleBand), 1.5);
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x * 4;
        data[idx] = Math.round(data[idx] * (1 - factor) + sR * factor);
        data[idx + 1] = Math.round(data[idx + 1] * (1 - factor) + sG * factor);
        data[idx + 2] = Math.round(data[idx + 2] * (1 - factor) + sB * factor);
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const seamlessTex = new THREE.CanvasTexture(canvas);
    seamlessTex.generateMipmaps = true;
    seamlessTex.minFilter = THREE.LinearMipmapLinearFilter;
    seamlessTex.magFilter = THREE.LinearFilter;
    seamlessTex.anisotropy = 8;
    seamlessTex.needsUpdate = true;
    return seamlessTex;
  } catch {
    return rawTexture;
  }
}

const MoonMesh = ({ phase, scale = 1 }) => {
  const moonRef = useRef();
  const isDragging = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });

  // Load raw texture using Drei's Suspense-integrated useTexture hook
  const rawTexture = useTexture(MOON_TEXTURE_PATH);

  // Process seamless polar texture once loaded
  const colorMap = useMemo(() => {
    return processSeamlessMoonTexture(rawTexture);
  }, [rawTexture]);

  // Directional sunlight illuminating from Earth observer's perspective
  const sunPosition = useMemo(() => {
    const theta = phase * Math.PI * 2;
    const distance = 16;
    return [
      Math.sin(theta) * distance,
      0, // Equator-aligned to give realistic natural terminator shadows
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

  useFrame(() => {
    if (!moonRef.current) return;

    if (!isDragging.current) {
      // Apply smooth rotational inertia and decay
      moonRef.current.rotation.y += velocity.current.x;
      moonRef.current.rotation.x += velocity.current.y;
      velocity.current.x *= 0.94;
      velocity.current.y *= 0.94;

      // Full natural tilt range (+/- 75 deg) to view polar regions cleanly
      moonRef.current.rotation.x = Math.max(-1.3, Math.min(1.3, moonRef.current.rotation.x));
    }
  });

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

      {/* 3D Moon Sphere */}
      <group ref={moonRef}>
        <Sphere args={[1.85, 128, 128]}>
          {/* No bumpMap: the only texture we ship is an albedo map, and feeding
              brightness in as height inverts the terrain — bright crater rays such
              as Tycho's rise as ridges while the dark maria sink into pits. Relief
              comes from the terminator and the directional sun vector instead. */}
          <meshStandardMaterial
            map={colorMap}
            roughness={0.92}
            metalness={0.04}
          />
        </Sphere>
      </group>

      {/* Interactive Raycast Hit Sphere for 360 Drag */}
      <Sphere
        args={[1.95, 32, 32]}
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDragging.current = true;
          previousPointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!isDragging.current || !moonRef.current) return;
          const deltaX = e.clientX - previousPointer.current.x;
          const deltaY = e.clientY - previousPointer.current.y;

          velocity.current.x = deltaX * 0.005;
          velocity.current.y = deltaY * 0.005;

          moonRef.current.rotation.y += velocity.current.x;
          moonRef.current.rotation.x = Math.max(-1.3, Math.min(1.3, moonRef.current.rotation.x + velocity.current.y));

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
            />
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default MoonVisualization;
