// The moonlight halo's spring (the master prompt 5.6). The page draws the halo and
// the scene brightens the stars under it, each stepping this same spring from the
// same pointer, so the light and the stars it lifts move as one.
export const HALO_STIFFNESS = 170;
// Critically damped: it settles without overshooting the pointer
export const HALO_DAMPING = 26;

const STEP_S = 1 / 120;
const SETTLE_PX = 0.25;
const SETTLE_SPEED = 2;

// Moves { x, y, vx, vy } toward the target over dt seconds, in small steps so a
// long frame can't throw it. Returns true once it has settled on the target.
export const stepSpring = (spring, target, dt) => {
  const time = Math.min(Math.max(dt, 0), 0.1);
  const steps = Math.max(1, Math.ceil(time / STEP_S));
  const h = time / steps;
  for (let i = 0; i < steps; i++) {
    spring.vx += (HALO_STIFFNESS * (target.x - spring.x) - HALO_DAMPING * spring.vx) * h;
    spring.vy += (HALO_STIFFNESS * (target.y - spring.y) - HALO_DAMPING * spring.vy) * h;
    spring.x += spring.vx * h;
    spring.y += spring.vy * h;
  }
  const settled = Math.abs(target.x - spring.x) < SETTLE_PX && Math.abs(target.y - spring.y) < SETTLE_PX
    && Math.hypot(spring.vx, spring.vy) < SETTLE_SPEED;
  if (settled) {
    spring.x = target.x;
    spring.y = target.y;
    spring.vx = 0;
    spring.vy = 0;
  }
  return settled;
};

// Jump straight to a point, at rest: where the halo appears, it starts
export const placeSpring = (spring, point) => {
  spring.x = point.x;
  spring.y = point.y;
  spring.vx = 0;
  spring.vy = 0;
};
