import { offsetFor, settleAt } from './sheet';

// Dragging Deep Dive's sheet on phones (decision E2), loaded once the page has
// painted: the peek and the contents only need it once a finger is on them.

const TAP_PX = 6;
// Past the top or the peek, the sheet follows the finger this much
const RUBBER = 0.3;

// Begin, move and end a drag of the sheet, from its peek or its contents. What it
// needs to know at the moment comes through `latest`: { room, detent, isOpen,
// setIsOpen }.
export const createSheetDrag = ({ latest, panelRef, setTall }) => {
  let gesture = null;
  const drag = {
    draggedAt: -Infinity,
    active: () => Boolean(gesture),
    begin(y) {
      const { room } = latest.current;
      const sheet = panelRef.current;
      if (!room || !sheet) return false;
      // From wherever it is, even mid-settle
      const top = new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
      sheet.classList.add('is-dragging');
      sheet.style.transform = `translate3d(0, ${top}px, 0)`;
      gesture = { y0: y, top0: top, top, moved: false, samples: [{ y, t: performance.now() }] };
      return true;
    },
    move(y) {
      const { room } = latest.current;
      if (!gesture || !room) return;
      if (Math.abs(y - gesture.y0) > TAP_PX) gesture.moved = true;
      const lowest = offsetFor('closed', room);
      let top = gesture.top0 + (y - gesture.y0);
      if (top < 0) top *= RUBBER;
      if (top > lowest) top = lowest + (top - lowest) * RUBBER;
      gesture.top = top;
      panelRef.current.style.transform = `translate3d(0, ${top}px, 0)`;
      const now = performance.now();
      gesture.samples.push({ y, t: now });
      while (gesture.samples.length > 2 && now - gesture.samples[0].t > 100) gesture.samples.shift();
    },
    end() {
      const g = gesture;
      gesture = null;
      const { room, detent, isOpen, setIsOpen } = latest.current;
      const sheet = panelRef.current;
      if (!g || !room || !sheet) return;
      sheet.classList.remove('is-dragging');
      if (!g.moved) {
        // A tap: back where it was, and the press is the summary's to handle
        sheet.style.transform = `translate3d(0, ${offsetFor(detent, room)}px, 0)`;
        return;
      }
      drag.draggedAt = performance.now();
      const first = g.samples[0];
      const last = g.samples[g.samples.length - 1];
      const speed = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
      const next = settleAt(g.top, speed, room);
      sheet.style.transform = `translate3d(0, ${offsetFor(next, room)}px, 0)`;
      if (next === 'closed') {
        if (isOpen) setIsOpen(false);
      } else {
        setTall(next === 'full');
        if (!isOpen) setIsOpen(true);
      }
    }
  };
  return drag;
};

// The contents: at half height a drag moves the sheet; at full they scroll, and a
// pull down from their top hands the drag back to the sheet. Touch events, since
// only they can stop the scroll once a finger has started. Returns the undo.
export const followContents = (body, drag, latest) => {
  let start = null;
  let decided = null;
  const onStart = (event) => {
    if (event.touches.length !== 1) return;
    start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    decided = null;
  };
  const onMove = (event) => {
    if (!start || event.touches.length !== 1) return;
    const { clientX: x, clientY: y } = event.touches[0];
    if (decided === null) {
      const dx = x - start.x;
      const dy = y - start.y;
      if (Math.hypot(dx, dy) < 4) return;
      const { detent } = latest.current;
      const vertical = Math.abs(dy) > Math.abs(dx);
      const takes = vertical && (detent === 'half' || (detent === 'full' && body.scrollTop <= 0 && dy > 0));
      decided = takes && drag.begin(start.y) ? 'sheet' : 'scroll';
    }
    if (decided === 'sheet') {
      event.preventDefault();
      drag.move(y);
    }
  };
  const onEnd = () => {
    if (decided === 'sheet') drag.end();
    start = null;
    decided = null;
  };
  body.addEventListener('touchstart', onStart, { passive: true });
  body.addEventListener('touchmove', onMove, { passive: false });
  body.addEventListener('touchend', onEnd);
  body.addEventListener('touchcancel', onEnd);
  return () => {
    body.removeEventListener('touchstart', onStart);
    body.removeEventListener('touchmove', onMove);
    body.removeEventListener('touchend', onEnd);
    body.removeEventListener('touchcancel', onEnd);
  };
};
