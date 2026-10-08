// Deep Dive's sheet on phones (decision E2, as settled in chat on 8 Oct 2026): one
// height, open or closed. It rises from a grabber above the timeline and stops at
// the timeline, so the timeline can still be scrubbed while it is open.

// A release carries on at its speed for this long when choosing open or closed
const FLICK_MS = 220;

// Whether a drag let go leaves the sheet open: where it would have carried on to at
// its speed is past halfway up. `offset` is how far down it sits (0 open, `height`
// closed), `speed` in pixels per millisecond, downward positive.
export const settlesOpen = (offset, speed, height) => offset + speed * FLICK_MS < height / 2;
