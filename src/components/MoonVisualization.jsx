import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere } from '@react-three/drei';

const Moon = ({ phase }) => {
  const moonRef = useRef();
  const isHovered = useRef(false);
  const isDragging = useRef(false);
  const previousX = useRef(0);
  
  // Load high-res NASA texture from three.js examples
  const colorMap = useTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg');
  
  // Calculate sun (light) position based on lunar phase
  // phase ranges from 0 to 1
  const sunPosition = useMemo(() => {
    // phase 0 is New Moon, 0.5 is Full Moon
    const theta = phase * Math.PI * 2;
    const distance = 15;
    return [
      Math.sin(theta) * distance,
      0, // Keeping the sun level with the moon
      -Math.cos(theta) * distance
    ];
  }, [phase]);

  useEffect(() => {
    const handleMove = (e) => {
      if (isDragging.current && moonRef.current) {
        const deltaX = e.clientX - previousX.current;
        // Spin horizontally based on mouse movement
        moonRef.current.rotation.y += deltaX * 0.005; 
        previousX.current = e.clientX;
      }
    };
    const handleUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  useFrame(() => {
    if (!moonRef.current) return;
    
    // Subtle idle rotation when not being actively dragged
    if (!isDragging.current) {
      moonRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      {/* Earthshine: Faint ambient light illuminating the dark side of the moon */}
      <ambientLight intensity={0.05} color="#8a8db5" />
      
      {/* The Sun: Directional light causing the primary illumination and terminator line */}
      <directionalLight 
        position={sunPosition} 
        intensity={2.5} 
        color="#ffffff" 
      />
      
      <group ref={moonRef}>
        <Sphere args={[2, 64, 64]}>
          <meshStandardMaterial 
            map={colorMap} 
            bumpMap={colorMap} 
            bumpScale={0.015}
            roughness={0.9} 
            metalness={0.1}
          />
        </Sphere>
      </group>

      {/* Invisible stationary hit box for raycasting and interaction */}
      <Sphere 
        args={[2.05, 32, 32]}
        visible={false}
        onPointerDown={(e) => {
          e.stopPropagation();
          isDragging.current = true;
          previousX.current = e.clientX;
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          isHovered.current = true;
          const dot = document.getElementById('custom-cursor-dot');
          if (dot) {
            dot.style.transform = 'translate(-50%, -50%) scale(3.75)';
          }
          const trails = document.querySelectorAll('.custom-cursor-trail');
          trails.forEach(t => t.style.opacity = '0');
        }}
        onPointerOut={(e) => {
          isHovered.current = false;
          const dot = document.getElementById('custom-cursor-dot');
          if (dot) {
            dot.style.transform = 'translate(-50%, -50%) scale(1)';
          }
          const trails = document.querySelectorAll('.custom-cursor-trail');
          const numTrails = 38; // Must match CustomCursor.jsx
          trails.forEach((t, i) => t.style.opacity = `${1 - (i / numTrails)}`);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </Sphere>
    </group>
  );
};

const MoonVisualization = ({ lunarDetails }) => {
  const { phase, fraction } = lunarDetails;
  
  return (
    <div style={{
      width: '100%',
      height: '55vh',
      minHeight: '350px',
      maxHeight: '600px',
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {/* Background Glow based on illumination fraction */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: `radial-gradient(circle, var(--color-accent-glow) 0%, transparent 60%)`,
        opacity: (parseFloat(fraction) / 100) + 0.1,
        transition: 'opacity 0.8s ease',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* R3F Canvas Container */}
      <div style={{ width: '100%', height: '100%', zIndex: 1 }}>
        <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
          <React.Suspense fallback={null}>
            <Moon phase={phase} />
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default MoonVisualization;
