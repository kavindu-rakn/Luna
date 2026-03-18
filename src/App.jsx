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
      
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Luna</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem', fontWeight: 300 }}>
          Interactive Lunar Cycle Explorer
        </p>
      </div>

      <MoonVisualization lunarDetails={lunarDetails} />
      
      <LunarData lunarDetails={lunarDetails} />
      
      <DateControls currentDate={currentDate} setCurrentDate={setCurrentDate} />
      
      <footer style={{ marginTop: '3rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
        Data calculated astronomically. Moon texture represented stylistically.
      </footer>
    </>
  );
}

export default App;
