import React from 'react';

const MoonVisualization = ({ lunarDetails }) => {
  const { phase, fraction } = lunarDetails;
  
  // Phase 0: New Moon
  // Phase 0.5: Full Moon
  // Phase 1.0: New Moon (again)
  
  // Calculate light gradient based on phase
  // We'll use CSS box-shadow and pseudo elements to create a 3D effect of the moon's terminator line.
  
  let lunarStyle = {};
  let isWaxing = phase <= 0.5;
  
  // A simple visual trick for CSS moon phases:
  // We have a dark circle (moon bg) and a light surface. We manipulate the size of the shadow
  // to give the illusion of the moon phase.
  
  // fraction ranges 0-100.
  const shadowSize = isWaxing ? (100 - fraction*2) : (fraction*2 - 100);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '4rem 0',
      position: 'relative'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: `radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)`,
        opacity: (fraction / 100) + 0.2,
        transition: 'opacity 0.5s ease',
        zIndex: 0
      }} />
      
      {/* Moon Orb */}
      <div style={{
        width: '240px',
        height: '240px',
        borderRadius: '50%',
        background: 'url("https://www.transparenttextures.com/patterns/stardust.png"), #111111', 
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `
          inset -10px -10px 40px rgba(0,0,0,0.8),
          0 0 20px rgba(255,255,255,${(fraction/100) * 0.4})
        `,
        zIndex: 1,
        transition: 'all 0.5s ease'
      }}>
        {/* The illuminated portion */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'url("https://www.transparenttextures.com/patterns/stardust.png"), #e8e8ed',
          opacity: 0.95,
          // CSS trick to clip the illuminated half:
          // We move it right or left based on waxing/waning, and skew it.
          // For simplicity and elegance, we'll use a dynamic box-shadow over a sphere instead.
          boxShadow: isWaxing 
            ? `inset ${-(120 - (fraction/100)*240)}px 0 30px rgba(0,0,0,0.9)` 
            : `inset ${(120 - (fraction/100)*240)}px 0 30px rgba(0,0,0,0.9)`,
            
          // A more robust pure CSS moon requires SVG or complex clip-paths.
          // Since we want premium, let's use a dual-hemisphere approach:
          clipPath: `circle(50% at 50% 50%)`,
        }} />
        
        {/* A true realistic CSS moon phase trick using absolute positioning */}
        {/* Background is the lit moon */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #d4d4dc 60%, #9a9a9f 100%)',
          boxShadow: 'inset -20px -20px 40px rgba(0,0,0,0.5)',
        }}>
          {/* Shadow Overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--color-bg-deep)',
            opacity: 0.95,
            transform: isWaxing ? `translateX(${fraction}%)` : `translateX(-${fraction}%)`,
            boxShadow: isWaxing ? '-20px 0 20px rgba(0,0,0,0.8)' : '20px 0 20px rgba(0,0,0,0.8)',
            transition: 'transform 0.5s ease-in-out',
            // this gives the crescent a rounded edge
            borderRadius: isWaxing 
              ? `${100 - fraction/2}% 50% 50% ${100 - fraction/2}%` 
              : `50% ${100 - fraction/2}% ${100 - fraction/2}% 50%`
          }} />

          {/* Core Terminator Shadow for smooth blending */}
           <div style={{
            position: 'absolute',
            top: 0,
            left: isWaxing ? `${fraction}%` : `${100 - fraction}%`,
            width: '200%',
            height: '100%',
            background: 'var(--color-bg-deep)',
            transform: isWaxing ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'left 0.5s ease-in-out',
           }}/>

        </div>
        
        {/* Detailed Moon Texture Trick */}
        <div style={{
          position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
          background: 'radial-gradient(circle at 70% 70%, transparent 40%, rgba(0,0,0,0.6) 100%)',
          mixBlendMode: 'multiply'
        }}/>
      </div>
      
    </div>
  );
};

export default MoonVisualization;
