import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './icons/Icon';

// Deep Dive's frame (decisions E1, E2; the master prompt 6.5). On a wide screen it
// is a panel on the right, and the stage re-centres in the space beside it
// (.main-view-container.drawer-open in index.css).
//
// On a phone it is a sheet with one height, as settled in chat on 8 Oct 2026: a
// slim grabber above the timeline is the way up, and the sheet rises from there to
// just under the top of the screen, stopping at the timeline so the timeline can
// still be scrubbed while it is open. Its top and, from the top of its contents, a
// pull down take it back down; how fast a drag is let go decides open or closed
// (src/utils/sheetDrag.js). The sheet is laid out with the stage, not measured, so
// it meets the timeline the same way on every phone. The phase name, the menu and
// D open it too.

const WIDE = '(min-width: 960px)';

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

const DeepDive = ({ isOpen, setIsOpen, panelRef, headingRef, children }) => {
  const wide = useMedia(WIDE);
  const bodyRef = useRef(null);
  const dragRef = useRef(null);

  const latest = useRef(null);
  useLayoutEffect(() => {
    latest.current = { isOpen, setIsOpen };
  });

  // Phones: the drag arrives once the page has loaded and the browser is idle, so
  // it never competes with the Moon for the network. A first touch before then
  // fetches it at once; until it is here a tap on the grabber still opens.
  const loadDrag = useRef(null);
  useEffect(() => {
    if (wide) return undefined;
    let cancelled = false;
    let unfollow = null;
    let loading = null;
    const load = () => {
      loading ??= import('../utils/sheetDrag').then(({ createSheetDrag, followContents }) => {
        if (cancelled) return;
        dragRef.current = createSheetDrag({ latest, panelRef });
        unfollow = followContents(bodyRef.current, dragRef.current);
      }).catch(() => {
        // Without it the grabber, the phase name and the close button still work
        loading = null;
      });
    };
    loadDrag.current = load;
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    let handle = null;
    const whenLoaded = () => {
      handle = idle(load, { timeout: 4000 });
    };
    if (document.readyState === 'complete') whenLoaded();
    else window.addEventListener('load', whenLoaded, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', whenLoaded);
      if (handle) cancelIdle(handle);
      unfollow?.();
      dragRef.current = null;
      loadDrag.current = null;
    };
  }, [wide, panelRef]);

  // The grabber and the sheet's top both drag it. A press on a button (the close
  // button) is the button's own.
  const onHandleDown = (event) => {
    if (wide || (event.pointerType === 'mouse' && event.button > 0)) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    if (!dragRef.current) loadDrag.current?.();
    if (!dragRef.current?.begin(event.clientY, event.timeStamp)) return;
    // Touch keeps its own pointer on the handle; a mouse needs holding on to
    if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onHandleMove = (event) => {
    if (dragRef.current?.active()) dragRef.current.move(event.clientY, event.timeStamp);
  };
  const onHandleUp = () => {
    if (dragRef.current?.active()) dragRef.current.end();
  };
  const handle = {
    onPointerDown: onHandleDown,
    onPointerMove: onHandleMove,
    onPointerUp: onHandleUp,
    onPointerCancel: onHandleUp
  };
  // A tap, not the end of a drag
  const tapped = () => performance.now() - (dragRef.current?.draggedAt ?? -Infinity) > 350;

  return (
    <>
      {/* Phones: the grabber above the timeline. For keyboards and screen readers
          the phase name, just above it, does the same. */}
      <div
        className="deep-dive-grabber"
        aria-hidden="true"
        {...handle}
        onClick={() => {
          if (tapped()) setIsOpen(true);
        }}
      >
        <span className="deep-dive-pill" />
      </div>

      <div className="deep-dive-frame">
        <aside
          ref={panelRef}
          id="deep-dive"
          className={`deep-dive${isOpen ? ' is-open' : ''}`}
          aria-labelledby="deep-dive-heading"
        >
          <div className="deep-dive-top" {...handle}>
            {/* Phones: the sheet's own grabber; a tap on it lets the sheet down */}
            <span
              className="deep-dive-pill deep-dive-grip"
              aria-hidden="true"
              onClick={() => {
                if (tapped()) setIsOpen(false);
              }}
            />
            <div className="deep-dive-header">
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
          </div>

          <div ref={bodyRef} id="deep-dive-body" className="deep-dive-body">
            {children}
          </div>
        </aside>
      </div>
    </>
  );
};

export default DeepDive;
