// Deep Dive's sheet on phones (decision E2): how much of it shows at each height.
// `room` is { height, peek, short, halfMax }:
// - height: the space from just under the top of the screen down to the timeline
// - peek: the peek's own height
// - short: a phone on its side, where the sheet has no peek and no half height
//   and opens straight to full, so the Moon keeps its size
// - halfMax: the most half height may show and still leave the Moon some room
// All in pixels.

// Half height, as a share of the room
const HALF_SHARE = 0.45;
// Half always shows this much above the peek
const HALF_MIN_OVER_PEEK = 100;

export const DETENTS = ['closed', 'half', 'full'];

export const shownAt = (detent, room) => {
  if (detent === 'closed') return room.short ? 0 : room.peek;
  if (detent === 'full' || room.short) return room.height;
  const half = Math.min(Math.round(room.height * HALF_SHARE), room.halfMax ?? Infinity);
  return Math.max(room.peek + HALF_MIN_OVER_PEEK, half);
};

// How far down the sheet sits for a height
export const offsetFor = (detent, room) => room.height - shownAt(detent, room);

// Where a drag let go settles: the nearest height to where it would have carried
// on to at its speed. `top` is the sheet's offset at release, `speed` in pixels per
// millisecond, downward positive.
const FLICK_MS = 220;
export const settleAt = (top, speed, room) => {
  const shown = room.height - (top + speed * FLICK_MS);
  const detents = room.short ? ['closed', 'full'] : DETENTS;
  let best = detents[0];
  for (const detent of detents) {
    if (Math.abs(shownAt(detent, room) - shown) < Math.abs(shownAt(best, room) - shown)) best = detent;
  }
  return best;
};
