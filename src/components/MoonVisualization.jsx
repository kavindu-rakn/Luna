import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture, Sphere } from '@react-three/drei';

const Moon = ({ phase }) => {
  const moonRef = useRef();
  const isHovered = useRef(false);
  
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

  useFrame((state) => {
    if (!moonRef.current) return;
    
    // 1. Subtle idle rotation (moon rotating on its axis)
    moonRef.current.rotation.y += 0.001;
    
    // 2. Mouse Parallax (tilting the moon based on cursor position ONLY when hovered)
    let targetTiltX = 0;
    let targetTiltZ = 0;

    if (isHovered.current) {
      targetTiltX = (state.pointer.y * Math.PI) / 10;
      targetTiltZ = -(state.pointer.x * Math.PI) / 10;
    }
    
    // Smooth interpolation for the tilt (returns to zero when not hovered)
    moonRef.current.rotation.x += (targetTiltX - moonRef.current.rotation.x) * 0.05;
    moonRef.current.rotation.z += (targetTiltZ - moonRef.current.rotation.z) * 0.05;
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
      
      <Sphere 
        ref={moonRef} 
        args={[2, 64, 64]}
        onPointerOver={(e) => {
          e.stopPropagation();
          isHovered.current = true;
          const dot = document.getElementById('custom-cursor-dot');
          if (dot) {
            dot.style.transform = 'translate(-50%, -50%) scale(3.75)';
          }
        }}
        onPointerOut={(e) => {
          isHovered.current = false;
          const dot = document.getElementById('custom-cursor-dot');
          if (dot) {
            dot.style.transform = 'translate(-50%, -50%) scale(1)';
          }
        }}
      >
        <meshStandardMaterial 
          map={colorMap} 
          bumpMap={colorMap} // Use color map as a weak bump map for surface texture
          bumpScale={0.015}
          roughness={0.9} 
          metalness={0.1}
        />
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
