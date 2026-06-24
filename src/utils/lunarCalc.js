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

// Get the full lunar cycle (29 days) centered around the current date
// Returns an array of { date, phase, fraction, name, isCurrent } objects
export const getCyclePhases = (centerDate = new Date()) => {
  const daysInCycle = 30; // render 30 days total
  const halfCycle = Math.floor(daysInCycle / 2);
  const phases = [];

  for (let i = -halfCycle; i <= halfCycle; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    const details = getLunarDetails(d);
    phases.push({
      date: d,
      dayOffset: i,
      phase: details.phase,
      fraction: parseFloat(details.fraction),
      name: details.name,
      isCurrent: i === 0
    });
  }

  return phases;
};

// Get moon and sun sky position data for a specific date and location
export const getSkyData = (date = new Date(), lat = 0, lon = 0) => {
  // Moon times (rise, set)
  const moonTimes = SunCalc.getMoonTimes(date, lat, lon);
  // Sun times (rise, set)
  const sunTimes = SunCalc.getTimes(date, lat, lon);
  
  // Current moon position
  const moonPos = SunCalc.getMoonPosition(date, lat, lon);
  // Current sun position
  const sunPos = SunCalc.getPosition(date, lat, lon);
  
  // Convert radians to degrees
  const toDeg = (rad) => (rad * 180) / Math.PI;
  
  // Format time nicely
  const formatTime = (d) => {
    if (!d || isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Calculate hourly moon altitude for the arc visualization
  // From 6pm to 6am (night hours) in 1hr steps
  const altitudePoints = [];
  const startHour = 18; // 6 PM
  const totalHours = 12; // through to 6 AM
  
  for (let h = 0; h <= totalHours; h++) {
    const pointDate = new Date(date);
    pointDate.setHours(startHour + h, 0, 0, 0);
    const pos = SunCalc.getMoonPosition(pointDate, lat, lon);
    altitudePoints.push({
      hour: (startHour + h) % 24,
      altitude: toDeg(pos.altitude),
      azimuth: toDeg(pos.azimuth),
      label: pointDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
    });
  }
  
  // Find when the moon is highest
  const peakPoint = altitudePoints.reduce((max, p) => p.altitude > max.altitude ? p : max, altitudePoints[0]);

  return {
    moonrise: formatTime(moonTimes.rise),
    moonset: formatTime(moonTimes.set),
    sunrise: formatTime(sunTimes.sunrise),
    sunset: formatTime(sunTimes.sunset),
    moonAltitude: toDeg(moonPos.altitude).toFixed(1),
    moonAzimuth: toDeg(moonPos.azimuth).toFixed(1),
    sunAltitude: toDeg(sunPos.altitude).toFixed(1),
    isMoonUp: moonPos.altitude > 0,
    isSunUp: sunPos.altitude > 0,
    altitudePoints,
    peakAltitude: peakPoint.altitude.toFixed(1),
    peakTime: peakPoint.label
  };
};
