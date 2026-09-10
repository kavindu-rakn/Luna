import { getMoonPhaseFraction, getNoonInZone, getStartOfDayInZone } from './lunarCalc';

// The four principal phases, as fractions of the synodic cycle
export const PRINCIPAL_PHASES = [
  { target: 0, key: 'new_moon', name: 'New Moon' },
  { target: 0.25, key: 'first_quarter', name: 'First Quarter' },
  { target: 0.5, key: 'full_moon', name: 'Full Moon' },
  { target: 0.75, key: 'last_quarter', name: 'Last Quarter' }
];

// How far a phase sits past a target, in cycles, wrapped into [-0.5, 0.5)
const phaseOffset = (phase, target) => ((phase - target + 1.5) % 1) - 0.5;

// Bisect to the second at which the Moon reaches a target phase between two instants
const findPhaseCrossing = (startMs, endMs, target) => {
  let lo = startMs;
  let hi = endMs;
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (phaseOffset(getMoonPhaseFraction(new Date(mid)), target) < 0) lo = mid;
    else hi = mid;
  }
  return new Date(Math.round((lo + hi) / 2));
};

/**
 * One month as a place's calendar reads it: the Moon's phase at local noon on every
 * day, and each principal phase with the day it falls on and its exact instant.
 *
 * A phase belongs to the day whose local midnights bracket it, so the same Full Moon
 * can land on the 25th in Honolulu and the 26th in Tokyo. The phase is the same
 * elongation the rest of the app uses, so the instants agree with the drawer.
 */
export const getMonthPhases = (year, month, timeZone) => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Noon on each day, and the local midnight that starts it, plus the midnight
  // that ends the month. Midnights come from noon because some zones skip 00:00
  // on the day their clocks change.
  const noons = [];
  const midnights = [];
  for (let day = 1; day <= daysInMonth + 1; day++) {
    const noon = getNoonInZone(year, month, day, timeZone);
    noons.push(noon);
    midnights.push(getStartOfDayInZone(noon, timeZone));
  }

  const days = [];
  const events = [];
  let startPhase = getMoonPhaseFraction(new Date(midnights[0]));

  for (let i = 0; i < daysInMonth; i++) {
    const endPhase = getMoonPhaseFraction(new Date(midnights[i + 1]));
    // Unwrap across New Moon, where the phase runs from just under 1 back to 0
    const unwrappedEnd = endPhase < startPhase ? endPhase + 1 : endPhase;

    let event = null;
    for (const principal of PRINCIPAL_PHASES) {
      const crossing = principal.target || 1;
      if (startPhase < crossing && crossing <= unwrappedEnd) {
        event = {
          ...principal,
          day: i + 1,
          date: findPhaseCrossing(midnights[i], midnights[i + 1], principal.target)
        };
        events.push(event);
      }
    }

    days.push({ day: i + 1, phase: getMoonPhaseFraction(noons[i]), event });
    startPhase = endPhase;
  }

  return { days, events };
};
