import React from 'react';
import Tonight from './deep-dive/Tonight';
import TheMoon from './deep-dive/TheMoon';
import TheOrbit from './deep-dive/TheOrbit';
import './deep-dive/deepDive.css';

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
  onShowAbout,
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

      {/* Whose work this stands on is said once, in About */}
      <footer className="deep-dive-footer">
        <button type="button" className="text-link" onClick={onShowAbout}>
          About Luna
        </button>
        <span aria-hidden="true"> &middot; </span>
        <button type="button" className="text-link" onClick={onShowPrivacy}>
          Privacy
        </button>
      </footer>
    </div>
  );
};

export default DeepDiveContent;
