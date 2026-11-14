// The reward for staying (Phase 6c): your eyes adjust. After three minutes with the
// page in view, the fainter stars come out over a minute and a half, down to
// magnitude 6.5, and the Moon's night side brightens a touch, as they do when you
// stay out under a dark sky. Nothing announces it: it is there for whoever keeps
// looking. The owner chose it on 7 Nov 2026 over a lunar halo and a constellation
// drawing itself.
//
// Its timing, shared by the page (which counts the time) and the scene (which
// draws it). Pure, so the tests run it.

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// How long the page must be in view first
export const STAY_S = 180;

// Dark adaptation takes far longer, but its first stage is a few minutes
export const EYES_S = 90;
// How far it has come, 0 to 1. It stays: the eyes keep it while you stay.
export const eyesAt = (t) => smooth(t / EYES_S);
// The Moon's night side at full adaptation, against before
export const EARTHSHINE_GAIN = 1.6;
