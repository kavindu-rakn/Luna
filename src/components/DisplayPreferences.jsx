import React from 'react';
import { CLOCKS, DISTANCE_UNITS } from '../utils/units';

// A two-way choice drawn as a pill. Underneath it is a plain radio group, so the
// browser supplies what a custom widget would have to rebuild: one Tab stop, arrow
// keys between the options, and "12h, radio button, checked, 1 of 2" when read aloud.
const Segmented = ({ legend, name, options, value, onChange }) => (
  <fieldset className="segmented">
    <legend className="utility-label">{legend}</legend>
    <div className="segmented-track">
      {options.map((option) => (
        <label key={option} className="segmented-option">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

const DisplayPreferences = ({ preferences, setPreference }) => (
  <div className="display-preferences">
    <Segmented
      legend="Clock"
      name="luna-clock"
      options={CLOCKS}
      value={preferences.clock}
      onChange={(value) => setPreference('clock', value)}
    />
    <Segmented
      legend="Distance"
      name="luna-distance"
      options={DISTANCE_UNITS}
      value={preferences.distanceUnit}
      onChange={(value) => setPreference('distanceUnit', value)}
    />
  </div>
);

export default DisplayPreferences;
