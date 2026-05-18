import React, { useState, useEffect } from 'react';
import MoonVisualization from './components/MoonVisualization';
import LunarData from './components/LunarData';
import DateControls from './components/DateControls';
import { getLunarDetails } from './utils/lunarCalc';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lunarDetails, setLunarDetails] = useState(getLunarDetails(currentDate));

  useEffect(() => {
    setLunarDetails(getLunarDetails(currentDate));
  }, [currentDate]);

  return (
    <>
      <div className="stars"></div>
      <div className="nebula"></div>
      
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: 'clamp(2rem, 5vh, 3.25rem)', marginBottom: '0.25rem' }}>Luna</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'clamp(0.9rem, 2vh, 1.15rem)', fontWeight: 300 }}>
          Interactive Lunar Cycle Explorer
        </p>
      </div>

      <MoonVisualization lunarDetails={lunarDetails} />
      
      <LunarData lunarDetails={lunarDetails} />
      
      <DateControls currentDate={currentDate} setCurrentDate={setCurrentDate} />
      
      <footer style={{ marginTop: 'clamp(1rem, 3vh, 2.5rem)', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
        Data calculated astronomically. Moon texture represented stylistically.
      </footer>
    </>
  );
}

export default App;
