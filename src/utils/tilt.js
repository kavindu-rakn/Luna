// Turns a phone's orientation readings into the gentle pull the sky's depth layers
// follow (decisions G5, G6): small, with a dead zone so a resting hand doesn't
// shimmer the stars, and recentred within about a second once the phone settles,
// so holding it at a new angle leaves the sky where it belongs.
//
// The readings are angles of the device itself; the pull is along the screen's
// own axes, whichever way up the phone is turned.

// Degrees of tilt past the dead zone for the full pull
const RANGE = 15;
const DEAD_ZONE = 1.5;
// Turning slower than this, in degrees a second, for this long counts as settled
const SETTLED_SPEED = 8;
const SETTLE_AFTER_MS = 150;
// How quickly the rest pose follows the phone: slowly while it moves, so a tilt
// shows, and quickly once it has settled (95% within a second)
const FOLLOW_MOVING_S = 4;
const FOLLOW_SETTLED_S = 0.3;

// Device angles onto the screen's axes: x across, y up and down
export const screenTilt = ({ beta, gamma }, angle = 0) => {
  if (angle === 90) return { x: beta, y: -gamma };
  if (angle === 270 || angle === -90) return { x: -beta, y: gamma };
  if (angle === 180) return { x: -gamma, y: -beta };
  return { x: gamma, y: beta };
};

const pull = (delta) => {
  const past = Math.max(0, Math.abs(delta) - DEAD_ZONE);
  return Math.sign(delta) * Math.min(1, past / RANGE);
};

export const createTiltReader = () => {
  let rest = null;
  let last = null;
  let stillSince = null;

  return {
    // One reading in, the pull out: -1…1 on each axis, or null without a reading
    read(event, angle, t) {
      if (event.beta == null || event.gamma == null) return null;
      const now = screenTilt(event, angle);
      if (!rest) {
        rest = { ...now };
        last = { ...now, t };
        stillSince = t;
        return { x: 0, y: 0 };
      }
      const seconds = Math.max(1e-3, (t - last.t) / 1000);
      const speed = Math.hypot(now.x - last.x, now.y - last.y) / seconds;
      if (speed > SETTLED_SPEED) stillSince = null;
      else stillSince ??= t;
      const settled = stillSince !== null && t - stillSince >= SETTLE_AFTER_MS;
      const follow = 1 - Math.exp(-Math.min(seconds, 0.2) / (settled ? FOLLOW_SETTLED_S : FOLLOW_MOVING_S));
      rest.x += (now.x - rest.x) * follow;
      rest.y += (now.y - rest.y) * follow;
      last = { ...now, t };
      return { x: pull(now.x - rest.x), y: pull(now.y - rest.y) };
    },
    reset() {
      rest = null;
      last = null;
      stillSince = null;
    }
  };
};
