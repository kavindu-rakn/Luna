import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './icons/Icon';
import { offsetFor, shownAt } from '../utils/sheet';

// Deep Dive's frame (decisions E1, E2; the master prompt 6.5). On a wide screen it
// is a panel on the right, and the stage re-centres in the space beside it
// (.main-view-container.drawer-open in index.css). On a phone it is a sheet above
// the timeline with three heights:
// - peek: a row of the key numbers, always there, and the way in
// - half: the Moon re-framed above it, the timeline still in reach
// - full: the contents scroll
// The peek drags the sheet, as do its contents at half height; how fast a drag is
// let go decides where it settles (src/utils/sheetDrag.js). At full height the
// contents scroll, and a pull down from their top takes the sheet down with it.

const WIDE = '(min-width: 960px)';
// A phone on its side: too short for a peek or a half height (index.css matches)
const SHORT = '(max-width: 959px) and (max-height: 560px) and (orientation: landscape)';
// At half height the Moon keeps at least this much room above the sheet
const MIN_MOON = 140;

const matches = (query) => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);

const useMedia = (query) => {
  const [match, setMatch] = useState(() => matches(query));
  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return undefined;
    const update = () => setMatch(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return match;
};

const sameRoom = (a, b) => a && a.height === b.height && a.peek === b.peek && a.short === b.short && a.halfMax === b.halfMax;

const DeepDive = ({ isOpen, setIsOpen, summary, panelRef, headingRef, children }) => {
  const wide = useMedia(WIDE);
  const short = useMedia(SHORT);
  const frameRef = useRef(null);
  const peekRef = useRef(null);
  const bodyRef = useRef(null);
  const dragRef = useRef(null);
  // Phones: at full height rather than half
  const [tall, setTall] = useState(false);
  // Phones: the sheet's room above the timeline, and its peek's height
  const [measured, setMeasured] = useState(null);
  const room = wide ? null : measured;

  // Closing always reopens at half; on its side a phone has only full height
  if (!isOpen && tall) setTall(false);
  const detent = !isOpen ? 'closed' : tall || short ? 'full' : 'half';

  const latest = useRef(null);
  useLayoutEffect(() => {
    latest.current = { room, detent, isOpen, setIsOpen };
  });

  // The room: from just under the top of the screen down to the timeline
  useLayoutEffect(() => {
    if (wide) return undefined;
    const frame = frameRef.current;
    const peek = peekRef.current;
    const dock = document.querySelector('.timeline-dock');
    const moon = document.querySelector('.moon-container');
    const stage = moon?.parentElement;
    const measure = () => {
      // The timeline's height: the sheet stands on it, and the toasts clear both
      document.documentElement.style.setProperty('--dock-height', `${dock ? dock.offsetHeight : 0}px`);
      const height = frame.clientHeight;
      // Half height stops where the Moon would have less than MIN_MOON: below the
      // Moon's top, it needs that and what sits under it (the phase name)
      let halfMax = Infinity;
      if (dock && moon && stage) {
        const moonBox = moon.getBoundingClientRect();
        const under = stage.getBoundingClientRect().bottom - moonBox.bottom;
        halfMax = Math.round(dock.getBoundingClientRect().top - moonBox.top - MIN_MOON - under);
      }
      const next = { height, peek: peek.offsetHeight, short: matches(SHORT), halfMax };
      setMeasured((current) => (sameRoom(current, next) ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(peek);
    if (dock) observer.observe(dock);
    return () => observer.disconnect();
  }, [wide, short]);

  // Set the sheet at its height, and keep that much of the stage clear for it:
  // the peek's height when closed, half when open (at full it covers the Moon)
  useLayoutEffect(() => {
    const sheet = panelRef.current;
    const root = document.documentElement;
    if (!room) {
      sheet.style.transform = '';
      root.style.removeProperty('--sheet-reserve');
      return;
    }
    sheet.style.transform = `translate3d(0, ${offsetFor(detent, room)}px, 0)`;
    const reserve = room.short ? 0 : detent === 'closed' ? room.peek : shownAt('half', room);
    root.style.setProperty('--sheet-reserve', `${reserve}px`);
  }, [room, detent, panelRef]);

  useEffect(() => () => document.documentElement.style.removeProperty('--sheet-reserve'), []);

  // Phones: the drag arrives just after the page has painted
  useEffect(() => {
    if (wide) return undefined;
    let cancelled = false;
    let unfollow = null;
    import('../utils/sheetDrag').then(({ createSheetDrag, followContents }) => {
      if (cancelled) return;
      dragRef.current = createSheetDrag({ latest, panelRef, setTall });
      unfollow = followContents(bodyRef.current, dragRef.current, latest);
    }).catch(() => {
      // Without it the peek still opens and closes the sheet with a press
    });
    return () => {
      cancelled = true;
      unfollow?.();
      dragRef.current = null;
    };
  }, [wide, panelRef]);

  const onPeekDown = (event) => {
    if (wide || (event.pointerType === 'mouse' && event.button > 0)) return;
    if (!dragRef.current?.begin(event.clientY)) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPeekMove = (event) => {
    if (dragRef.current?.active()) dragRef.current.move(event.clientY);
  };
  const onPeekUp = () => {
    if (dragRef.current?.active()) dragRef.current.end();
  };

  // A wheel at half height means "show me more"
  const onWheel = (event) => {
    if (!wide && detent === 'half' && event.deltaY > 0) setTall(true);
  };

  // A press on the peek opens or closes; the end of a drag isn't a press
  const onSummary = () => {
    if (performance.now() - (dragRef.current?.draggedAt ?? -Infinity) < 350) return;
    setIsOpen(!isOpen);
  };

  // Closed on a phone, only the peek is there to reach; on its side, nothing is
  const hidden = !wide && !isOpen;
  const label = summary
    ? `Deep Dive: ${summary.lit}% lit, ${summary.age} days old, ${summary.next.name} ${summary.next.when}`
    : 'Deep Dive';

  return (
    <div ref={frameRef} className="deep-dive-frame">
      <aside
        ref={panelRef}
        id="deep-dive"
        className={`deep-dive is-${detent}${isOpen ? ' is-open' : ''}`}
        aria-labelledby="deep-dive-heading"
        inert={hidden && short}
      >
        {/* Phones: the handle, and the numbers at a glance */}
        <div
          ref={peekRef}
          className="deep-dive-peek"
          onPointerDown={onPeekDown}
          onPointerMove={onPeekMove}
          onPointerUp={onPeekUp}
          onPointerCancel={onPeekUp}
        >
          <span className="deep-dive-grip" aria-hidden="true" />
          <button
            type="button"
            className="deep-dive-summary"
            onClick={onSummary}
            aria-expanded={isOpen}
            aria-controls="deep-dive-body"
            aria-label={label}
          >
            {summary && (
              <>
                <span className="deep-dive-figure">
                  <span className="deep-dive-value">{summary.lit}%</span>
                  <span className="deep-dive-key">lit</span>
                </span>
                <span className="deep-dive-figure">
                  <span className="deep-dive-value">{summary.age} days</span>
                  <span className="deep-dive-key">old</span>
                </span>
                <span className="deep-dive-figure">
                  <span className="deep-dive-value">{summary.next.name}</span>
                  <span className="deep-dive-key">{summary.next.when}</span>
                </span>
              </>
            )}
          </button>
        </div>

        <div className="deep-dive-header" inert={hidden}>
          <h2 id="deep-dive-heading" ref={headingRef} tabIndex={-1} className="deep-dive-title">
            Deep Dive
          </h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="glass-button icon-button deep-dive-close"
            aria-label="Close Deep Dive (Esc)"
            title="Close (Esc)"
          >
            <Icon name="close" />
          </button>
        </div>

        <div ref={bodyRef} id="deep-dive-body" className="deep-dive-body" inert={hidden} onWheel={onWheel}>
          {children}
        </div>
      </aside>
    </div>
  );
};

export default DeepDive;
