import React from 'react';
import Tonight from './deep-dive/Tonight';
import TheMoon from './deep-dive/TheMoon';
import TheOrbit from './deep-dive/TheOrbit';

// Everything inside Deep Dive below its header (decision E3): three chapters,
// The Moon, Tonight and The Orbit, each number shown once. The Moon comes first,
// the quickest to read; Tonight's chart after it. It is its own chunk, so none of
// it weighs on the first paint.
const DeepDiveContent = ({
  currentDate,
  location,
  lunarDetails,
  preferences,
  isLive,
  onSelectTime,
  onShowPrivacy
}) => {
  const { clock, distanceUnit } = preferences;

  return (
    <div className="dd">
      <TheMoon lunarDetails={lunarDetails} distanceUnit={distanceUnit} />

      {location && (
        <Tonight
          currentDate={currentDate}
          location={location}
          lunarDetails={lunarDetails}
          clock={clock}
          isLive={isLive}
          onSelectTime={onSelectTime}
        />
      )}

      <TheOrbit lunarDetails={lunarDetails} />

      <footer className="deep-dive-footer">
        Moon and Sun positions from Meeus&rsquo; <em>Astronomical Algorithms</em> and SunCalc.
        <br />
        Moon imagery: NASA&rsquo;s Scientific Visualization Studio.
        <br />
        Stars: the Bright Star Catalogue (Hoffleit &amp; Warren), via CDS Strasbourg. Planets: JPL.
        <br />
        <button type="button" className="text-link" onClick={onShowPrivacy}>
          Privacy
        </button>
      </footer>
    </div>
  );
};

export default DeepDiveContent;
