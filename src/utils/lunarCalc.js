import SunCalc from 'suncalc';

// Get moon illumination phase and useful data
export const getLunarDetails = (date = new Date()) => {
  const moonIllumination = SunCalc.getMoonIllumination(date);
  
  // Phase ranges from 0 to 1
  // 0: New Moon
  // 0.25: First Quarter
  // 0.5: Full Moon
  // 0.75: Last Quarter
  const phase = moonIllumination.phase;
  const fraction = moonIllumination.fraction; // 0.0 to 1.0 visible percentage
  const angle = moonIllumination.angle;
  
  // Moon cycle is approx 29.53 days
  const age = phase * 29.53;
  
  let name = "";
  if (phase === 0 || phase === 1) name = "New Moon";
  else if (phase < 0.25) name = "Waxing Crescent";
  else if (Math.abs(phase - 0.25) < 0.05) name = "First Quarter";
  else if (phase < 0.5) name = "Waxing Gibbous";
  else if (Math.abs(phase - 0.5) < 0.05) name = "Full Moon";
  else if (phase < 0.75) name = "Waning Gibbous";
  else if (Math.abs(phase - 0.75) < 0.05) name = "Last Quarter";
  else name = "Waning Crescent";

  return {
    date,
    phase,
    fraction: (fraction * 100).toFixed(1), // as percentage string
    angle: angle.toFixed(2),
    name,
    age: age.toFixed(1)
  };
};

export const getNextPhaseDates = (date = new Date()) => {
  // A simple strategy to find approx dates for the next major phases in a UI
  // Real astronomical calculations would be complex, but we can rough it out by jumping days for the visualization.
  const daysInCycle = 29.53;
  const current = getLunarDetails(date);
  
  const daysToFull = ((0.5 - current.phase + 1) % 1) * daysInCycle;
  const daysToNew = ((1 - current.phase) % 1) * daysInCycle;
  
  const nextFullDate = new Date(date);
  nextFullDate.setDate(nextFullDate.getDate() + daysToFull);
  
  const nextNewDate = new Date(date);
  nextNewDate.setDate(nextNewDate.getDate() + daysToNew);
  
  return { nextFullDate, nextNewDate };
};
