// What a change of date sounds like (the master prompt 4.4): a tick for each day
// crossed while scrubbing or stepping, and a chime on arriving at an exact phase,
// by scrub, step or jump. Pure, so it can be tested without sound.

// Within this much of a quarter (in quarters; about 20 minutes) counts as on it
const ON_PHASE = 0.002;
// Scrubbing and stepping move a few days at most. Further than this is a jump,
// which chimes only if it lands exactly on a phase.
const NEAR_DAYS = 3;
const DAY_MS = 86400000;

// The quarter a phase fraction (0…1) sits on, or -1
export const quarterAt = (phase) => {
  const q = phase * 4;
  const nearest = Math.round(q);
  return Math.abs(q - nearest) < ON_PHASE ? nearest % 4 : -1;
};

// prev and next: { ms, phase, day }, where phase is the fraction of the synodic
// cycle (0 New, 0.25 First Quarter…) and day names the calendar day at the place.
// Returns { kind: 'chime', index } with the quarter (0 New, 1 First Quarter,
// 2 Full, 3 Last Quarter), { kind: 'tick' }, or null.
export const dateCue = (prev, next) => {
  if (!prev || !next || prev.ms === next.ms) return null;
  const from = quarterAt(prev.phase);
  const landed = quarterAt(next.phase);
  if (landed >= 0 && landed !== from) return { kind: 'chime', index: landed };

  const forward = next.ms > prev.ms;
  if (Math.abs(next.ms - prev.ms) > NEAR_DAYS * DAY_MS) return null;

  // Unwrap the phase the way time went, so New Moon's 1 → 0 wrap is a crossing
  const moved = forward
    ? (((next.phase - prev.phase) % 1) + 1) % 1
    : (((prev.phase - next.phase) % 1) + 1) % 1;
  const before = Math.floor(prev.phase * 4);
  const after = Math.floor((forward ? prev.phase + moved : prev.phase - moved) * 4);
  if (after !== before) {
    // The boundary passed: the one ahead when going forward, the one left behind
    // when going back
    const index = (((forward ? after : before) % 4) + 4) % 4;
    // Already sitting on it (just chimed by landing there) isn't arriving again
    if (index !== from) return { kind: 'chime', index };
  }

  return prev.day !== next.day ? { kind: 'tick' } : null;
};

export const dayKey = ({ year, month, day }) => `${year}-${month}-${day}`;
