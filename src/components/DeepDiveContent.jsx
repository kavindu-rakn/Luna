import React, { lazy, Suspense, useMemo } from 'react';
import DisplayPreferences from './DisplayPreferences';
import LunarData from './LunarData';
import SkyPosition from './SkyPosition';
import SceneBoundary from './SceneBoundary';
import { getSkyData } from '../utils/lunarCalc';

// The orbit diagram needs Three.js, so it waits for the first time the drawer opens
const OrbitalView = lazy(() => import('./OrbitalView'));

// Everything inside the Deep Dive drawer below its header. It is its own chunk, so
// neither these panels nor GSAP, which only they use, weigh on the first paint.
const DeepDiveContent = ({
  currentDate,
  location,
  lunarDetails,
  preferences,
  setPreference,
  isOpen,
  showOrbit,
  onShowPrivacy
}) => {
  const { clock, distanceUnit } = preferences;

  // The 24-hour transit is only shown here, so it is only worked out here
  const skyData = useMemo(
    () => (location ? getSkyData(currentDate, location.lat, location.lon, location.timeZone, clock) : null),
    [currentDate, location, clock]
  );

  return (
    <>
      {/* Every time and distance on this panel follows these */}
      <DisplayPreferences preferences={preferences} setPreference={setPreference} />

      {/* Telemetry Cards Stack */}
      <div className="telemetry-content">
        <LunarData lunarDetails={lunarDetails} distanceUnit={distanceUnit} />

        {skyData && (
          <SkyPosition skyData={skyData} locationName={location?.name} />
        )}

        {showOrbit && (
          <SceneBoundary name="Orbital diagram">
            <Suspense fallback={null}>
              <OrbitalView lunarDetails={lunarDetails} active={isOpen} distanceUnit={distanceUnit} />
            </Suspense>
          </SceneBoundary>
        )}

        <footer className="drawer-footer">
          Moon and Sun positions from Meeus&rsquo; <em>Astronomical Algorithms</em> and SunCalc.
          <br />
          <button type="button" className="text-link" onClick={onShowPrivacy}>
            Privacy
          </button>
        </footer>
      </div>
    </>
  );
};

export default DeepDiveContent;
