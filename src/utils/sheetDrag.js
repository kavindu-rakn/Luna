import { settlesOpen } from './sheet';

// Dragging Deep Dive's sheet on phones (decision E2), loaded once the page has
// painted: the grabber, the sheet's top and its contents only need it once a finger
// is on them.

const TAP_PX = 6;
// Above its open height the sheet follows the finger this much
const RUBBER = 0.3;

// Begin, move and end a drag of the sheet: up from the grabber above the timeline,
// or down from the sheet's own top or its contents. What it needs to know at the
// moment comes through `latest`: { isOpen, setIsOpen }.
//
// Deep Dive's sheet slides open or closed by its CSS class. A sheet that animates
// itself (the overlays, src/components/overlay/Overlay.jsx) passes onBegin, to stop
// its own animation where it is as a finger takes it, and onSettle(open), to move
// it on from where the finger let go; its inline transform is left for it to read.
export const createSheetDrag = ({ latest, panelRef, onBegin, onSettle }) => {
  let gesture = null;
  const drag = {
    draggedAt: -Infinity,
    active: () => Boolean(gesture),
    // y in pixels; t is the event's own time, which a busy page doesn't skew
    begin(y, t = performance.now()) {
      const sheet = panelRef.current;
      if (!sheet) return false;
      const height = sheet.offsetHeight;
      // From wherever it is, even mid-slide
      const offset = Math.min(height, Math.max(0, new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42));
      onBegin?.();
      sheet.classList.add('is-dragging');
      sheet.style.transform = `translate3d(0, ${offset}px, 0)`;
      gesture = { y0: y, offset0: offset, offset, height, moved: false, samples: [{ y, t }] };
      return true;
    },
    move(y, t = performance.now()) {
      if (!gesture) return;
      if (Math.abs(y - gesture.y0) > TAP_PX) gesture.moved = true;
      let offset = gesture.offset0 + (y - gesture.y0);
      if (offset < 0) offset *= RUBBER;
      offset = Math.min(offset, gesture.height);
      gesture.offset = offset;
      panelRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
      gesture.samples.push({ y, t });
      while (gesture.samples.length > 2 && t - gesture.samples[0].t > 100) gesture.samples.shift();
    },
    // Returns whether it was a drag (rather than a tap)
    end() {
      const g = gesture;
      gesture = null;
      const sheet = panelRef.current;
      if (!g || !sheet) return false;
      let open = latest.current.isOpen;
      if (g.moved) {
        drag.draggedAt = performance.now();
        const first = g.samples[0];
        const last = g.samples[g.samples.length - 1];
        const speed = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
        open = settlesOpen(g.offset, speed, g.height);
      }
      sheet.classList.remove('is-dragging');
      if (onSettle) {
        onSettle(open);
      } else {
        // Hand the sheet back to its class, open or closed, and it slides there from
        // where the finger left it
        sheet.classList.toggle('is-open', open);
        sheet.style.transform = '';
      }
      if (open !== latest.current.isOpen) latest.current.setIsOpen(open);
      return g.moved;
    }
  };
  return drag;
};

// The contents: when they are scrolled to the top, a pull down hands the drag to the
// sheet; otherwise they scroll. Touch events, since only they can stop the scroll
// once a finger has started. Returns the undo.
export const followContents = (body, drag) => {
  let start = null;
  let decided = null;
  const onStart = (event) => {
    if (event.touches.length !== 1) return;
    start = { x: event.touches[0].clientX, y: event.touches[0].clientY, t: event.timeStamp };
    decided = null;
  };
  const onMove = (event) => {
    if (!start || event.touches.length !== 1) return;
    const { clientX: x, clientY: y } = event.touches[0];
    if (decided === null) {
      const dx = x - start.x;
      const dy = y - start.y;
      if (Math.hypot(dx, dy) < 4) return;
      const takes = dy > 0 && Math.abs(dy) > Math.abs(dx) && body.scrollTop <= 0;
      decided = takes && drag.begin(start.y, start.t) ? 'sheet' : 'scroll';
    }
    if (decided === 'sheet') {
      event.preventDefault();
      drag.move(y, event.timeStamp);
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
