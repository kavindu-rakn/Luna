// The timeline's soft detents (decision H4). Positions run 0 to 1 along the drawn
// rail, with the exact phases on fixed marks.

// How close a release has to come to an exact phase for the thumb to settle into
// it: six tenths of a day along the rail, held between 6 and 12 px on screen, so a
// phase icon is easy to land on without a nearby day becoming hard to choose
const DETENT_DAYS = 0.6;
const MIN_PX = 6;
const MAX_PX = 12;

// The mark a release at `position` settles into, or null. `width` is the rail's
// width in px; `cycleDays` the cycle's length.
export const settleTarget = (position, marks, width, cycleDays) => {
  if (!(width > 0) || !(cycleDays > 0)) return null;
  const dayPx = width / cycleDays;
  const reach = Math.min(MAX_PX, Math.max(MIN_PX, DETENT_DAYS * dayPx)) / width;
  let best = null;
  for (const mark of marks) {
    const distance = Math.abs(mark.position - position);
    if (distance <= reach && (!best || distance < best.distance)) best = { ...mark, distance };
  }
  return best;
};

// Whether a drag from one position to the next crossed (or arrived on) a mark
export const crossesMark = (from, to, marks) => {
  if (from === null || from === undefined || from === to) return false;
  return marks.some((mark) => (from - mark.position) * (to - mark.position) <= 0 && to !== from && from !== mark.position);
};
