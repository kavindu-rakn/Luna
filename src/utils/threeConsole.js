import { setConsoleFunction } from 'three';

// @react-three/fiber 9 gives every canvas a THREE.Clock, which Three.js r183
// deprecated in favour of THREE.Timer, so each scene logged a deprecation warning
// as it mounted. Nothing in Luna constructs a Clock and fiber has no option to use
// a Timer instead, so the warning is only noise here. Drop that exact message and
// pass every other Three.js log through as it would have printed. Delete this file
// once fiber stops creating a Clock: the warning simply returns if it is removed early.
const CLOCK_DEPRECATION = 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

setConsoleFunction((type, message, ...params) => {
  if (message === CLOCK_DEPRECATION) return;
  // Three's own logger prints TSL stack traces as an Error; keep that behaviour
  const [first] = params;
  if (first?.isStackTrace) console[type](first.getError(message));
  else console[type](message, ...params);
});
