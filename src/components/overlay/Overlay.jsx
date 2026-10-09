import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMedia, PHONE_OVERLAYS } from '../../hooks/useMedia';
import { placeBelow } from '../../utils/anchor';
import { cue } from '../../audio/sound';
import { pushOverlay } from './overlayStack';

// How it moves. Arriving decelerates into place (--ease-out); leaving accelerates
// away, quicker, so nothing lingers once it has been dismissed.
const ARRIVE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const LEAVE = 'cubic-bezier(0.4, 0, 1, 1)';
const MOTION = {
  sheet: { open: 380, close: 240 },
  popover: { open: 200, close: 140 },
  modal: { open: 200, close: 140 }
};
const SCRIM = { open: 320, close: 220 };

// The panel at rest, open, and put away: a sheet below the screen; a popover or a
// dialog shrunk a little into its control (or its centre) and faded out
const SHOWN = { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 };
const hidden = (mode) => (mode === 'sheet'
  ? { transform: 'translate3d(0, 100%, 0) scale(1)', opacity: 1 }
  : { transform: 'translate3d(0, 0, 0) scale(0.94)', opacity: 0 });

// How long a close may take before the overlay is put away regardless
const CLOSE_FALLBACK_MS = 600;

const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// One overlay system for the calendar, the location picker, the menu, the keyboard
// shortcuts and privacy (decisions E9, E10; the master prompt 6.7). Each is a
// <dialog> on <body>, so it always opens above Deep Dive and the timeline:
//
// - popover (wide screens): hangs from the control that opened it, grows out of
//   that control and shrinks back into it. Nothing behind it dims.
// - modal (wide screens): a centred dialog over a dimmed page (shortcuts, privacy).
// - sheet (phones): every one of them rises from the bottom over a dimmed page, and
//   drags down to close like Deep Dive's sheet (src/utils/sheetDrag.js). A tall
//   sheet reaches to just under the top of the screen, so a search field at its top
//   stays above the keyboard.
//
// The panels and the dimming are moved with the Web Animations API: each move starts
// the moment it is asked for, from exactly where the panel is (halfway through the
// opposite move, or where a finger let go), so nothing depends on when the browser
// notices a class change. Sheets and popovers are fixed to the screen, not to the
// dialog around them.
//
// Modal ones are in the top layer and shut off the page behind. Esc and a press
// outside close the top overlay only (overlayStack.js), and focus goes back to
// whatever opened it.
const Overlay = ({
  open,
  onClose,
  // The control it hangs from and grows out of
  anchorRef,
  // Where focus goes on close if what opened it has gone, as a menu item has
  returnFocusRef,
  align = 'center',
  modal = false,
  sheet = 'fit',
  label,
  labelledBy,
  className = '',
  // Stays put above the contents as they scroll: a dialog's title and close button
  header = null,
  children
}) => {
  const phone = useMedia(PHONE_OVERLAYS);
  const mode = phone ? 'sheet' : modal ? 'modal' : 'popover';

  // Kept on the page while it closes, so it can leave the way it came
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const dialogRef = useRef(null);
  const panelRef = useRef(null);
  const scrimRef = useRef(null);
  const bodyRef = useRef(null);
  const openerRef = useRef(null);
  const dragRef = useRef(null);
  // The moves under way: { panel, scrim } Animations
  const moving = useRef({ panel: null, scrim: null });

  const latest = useRef(null);
  useLayoutEffect(() => {
    latest.current = {
      isOpen: open,
      mode,
      onClose,
      // For the sheet's drag, which settles it open or closed
      setIsOpen: (next) => {
        if (!next) onClose();
      }
    };
  });

  // Move the panel, and the dimming behind it, to shown or put away. From where it
  // is now unless told to start from put away. Resolves when it has arrived.
  const moveRef = useRef(null);
  useLayoutEffect(() => {
    moveRef.current = (showing, { fromHidden = false } = {}) => {
      const panel = panelRef.current;
      const scrim = scrimRef.current;
      if (!panel?.animate) return Promise.resolve();
      const m = latest.current.mode;
      const quick = reducedMotion();
      const duration = quick ? 1 : MOTION[m][showing ? 'open' : 'close'];
      const easing = showing ? ARRIVE : LEAVE;
      const now = getComputedStyle(panel);
      const from = fromHidden
        ? hidden(m)
        : { transform: now.transform === 'none' ? SHOWN.transform : now.transform, opacity: Number(now.opacity) };
      const scrimFrom = scrim ? (fromHidden ? 0 : Number(getComputedStyle(scrim).opacity)) : 0;
      moving.current.panel?.cancel();
      moving.current.scrim?.cancel();
      // The finger's inline transform gives way to the move, which starts from it
      panel.style.transform = '';
      const panelMove = panel.animate([from, showing ? SHOWN : hidden(m)], { duration, easing, fill: 'both' });
      const scrimMove = scrim?.animate(
        [{ opacity: scrimFrom }, { opacity: showing ? 1 : 0 }],
        { duration: quick ? 1 : SCRIM[showing ? 'open' : 'close'], easing: showing ? ARRIVE : 'linear', fill: 'both' }
      ) ?? null;
      moving.current = { panel: panelMove, scrim: scrimMove };
      return panelMove.finished.then(() => {
        // Arrived and open: back to its resting styles, so a finger can take it
        if (showing && moving.current.panel === panelMove) {
          panelMove.cancel();
          scrimMove?.cancel();
          moving.current = { panel: null, scrim: null };
        }
      });
    };
  });

  // Hang it from its control, kept on screen
  const place = () => {
    const panel = panelRef.current;
    if (!panel) return;
    const anchor = anchorRef?.current;
    if (mode !== 'popover' || !anchor) {
      panel.style.left = '';
      panel.style.top = '';
      panel.style.transformOrigin = '';
      return;
    }
    const spot = placeBelow({
      anchor: anchor.getBoundingClientRect(),
      width: panel.offsetWidth,
      height: panel.offsetHeight,
      viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
      align
    });
    panel.style.left = `${spot.left}px`;
    panel.style.top = `${spot.top}px`;
    panel.style.transformOrigin = `${spot.originX}px ${spot.originY}px`;
  };
  const placeRef = useRef(place);
  useLayoutEffect(() => {
    placeRef.current = place;
  });

  // Show the dialog: in the top layer when it shuts off the page behind
  const shownAs = useRef(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted || !dialog) return;
    const wantModal = mode !== 'popover';
    if (dialog.open && shownAs.current !== wantModal) dialog.close();
    if (!dialog.open) {
      if (wantModal) dialog.showModal();
      else dialog.show();
      shownAs.current = wantModal;
    }
  }, [mounted, mode]);

  // Open: from put away, or from wherever it was on its way out
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !mounted || !panel) return;
    const active = document.activeElement;
    if (active && active !== document.body && !panel.contains(active)) openerRef.current = active;
    placeRef.current();
    panel.inert = false;
    const returning = Boolean(moving.current.panel);
    moveRef.current(true, { fromHidden: !returning }).catch(() => {});
  }, [open, mounted, mode]);

  // Close: back the way it came, then off the page. Focus goes home first if it
  // was inside, unless the page behind is still shut off, in which case it goes
  // once the dialog has closed.
  useEffect(() => {
    if (open || !mounted) return undefined;
    const panel = panelRef.current;
    const dialog = dialogRef.current;
    const home = () => [openerRef.current, anchorRef?.current, returnFocusRef?.current]
      .find((el) => el?.isConnected && !el.closest('[inert]'));
    const focusHome = () => home()?.focus({ preventScroll: true });
    const active = document.activeElement;
    const inside = !active || active === document.body || panel?.contains(active);
    if (panel) {
      if (inside && shownAs.current === false) focusHome();
      panel.inert = true;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      const lost = document.activeElement;
      dialog?.close();
      const now = document.activeElement;
      if (inside && (!now || now === document.body || now === lost)) focusHome();
      openerRef.current = null;
      moving.current = { panel: null, scrim: null };
      setMounted(false);
    };
    moveRef.current(false).then(finish).catch(() => {});
    const timer = setTimeout(finish, CLOSE_FALLBACK_MS);
    return () => {
      // Opened again on the way out: the open turns it round from where it is
      done = true;
      clearTimeout(timer);
    };
  }, [open, mounted, anchorRef, returnFocusRef]);

  // Heard as well as seen: a glass tap and a felt press, or on a phone, where they
  // are sheets, Deep Dive's sheet sounds (cue is silent while Sound is off)
  const heard = useRef(open);
  useEffect(() => {
    if (heard.current === open) return;
    heard.current = open;
    if (mode === 'sheet') cue(open ? 'sheet-open' : 'sheet-close');
    else cue(open ? 'glass' : 'felt');
  }, [open, mode]);

  // On the stack while open: Esc and a press outside close the top one
  useEffect(() => {
    if (!open) return undefined;
    return pushOverlay({
      modal: mode !== 'popover',
      close: () => latest.current.onClose(),
      contains: (target) => Boolean(panelRef.current?.contains(target) || anchorRef?.current?.contains(target))
    });
  }, [open, mode, anchorRef]);

  // A popover follows its control when the window changes, when its own size does,
  // and frame by frame while the page around the control moves (the stage
  // narrowing as Deep Dive opens beside it)
  useEffect(() => {
    if (!mounted || mode !== 'popover') return undefined;
    const update = () => placeRef.current();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    if (panelRef.current) observer?.observe(panelRef.current);
    let transitions = 0;
    let frame = 0;
    const follow = () => {
      update();
      frame = transitions > 0 ? requestAnimationFrame(follow) : 0;
    };
    const around = (event) => event.target instanceof Element && event.target.contains(anchorRef?.current);
    const onRun = (event) => {
      if (!around(event)) return;
      transitions += 1;
      if (!frame) frame = requestAnimationFrame(follow);
    };
    const onEnd = (event) => {
      if (!around(event)) return;
      transitions = Math.max(0, transitions - 1);
      if (transitions === 0) update();
    };
    document.addEventListener('transitionrun', onRun, true);
    document.addEventListener('transitionend', onEnd, true);
    document.addEventListener('transitioncancel', onEnd, true);
    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
      document.removeEventListener('transitionrun', onRun, true);
      document.removeEventListener('transitionend', onEnd, true);
      document.removeEventListener('transitioncancel', onEnd, true);
      cancelAnimationFrame(frame);
    };
  }, [mounted, mode, anchorRef]);

  // A sheet drags down to close, with Deep Dive's own drag. A finger stops the
  // sheet's move where it is; let go, it moves on from there: back up if it stays
  // open, and down with the close if not.
  useEffect(() => {
    if (!mounted || mode !== 'sheet') return undefined;
    let cancelled = false;
    let unfollow = null;
    import('../../utils/sheetDrag').then(({ createSheetDrag, followContents }) => {
      if (cancelled) return;
      dragRef.current = createSheetDrag({
        latest,
        panelRef,
        onBegin: () => {
          moving.current.panel?.cancel();
          moving.current.scrim?.cancel();
          moving.current = { panel: null, scrim: null };
        },
        onSettle: (stays) => {
          if (stays) moveRef.current(true).catch(() => {});
        }
      });
      unfollow = followContents(bodyRef.current, dragRef.current);
    }).catch(() => {
      // Without it, the grip, the dimmed page and Esc still close it
    });
    return () => {
      cancelled = true;
      unfollow?.();
      dragRef.current = null;
    };
  }, [mounted, mode]);

  if (!mounted || typeof document === 'undefined') return null;

  const onHandleDown = (event) => {
    if (event.pointerType === 'mouse' && event.button > 0) return;
    if (!dragRef.current?.begin(event.clientY, event.timeStamp)) return;
    if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onHandleMove = (event) => {
    if (dragRef.current?.active()) dragRef.current.move(event.clientY, event.timeStamp);
  };
  const onHandleUp = () => {
    if (dragRef.current?.active()) dragRef.current.end();
  };
  // A tap, not the end of a drag
  const tapped = () => performance.now() - (dragRef.current?.draggedAt ?? -Infinity) > 350;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`overlay is-${mode}${sheet === 'tall' ? ' is-tall' : ''}`}
      aria-label={label}
      aria-labelledby={labelledBy}
      // Esc on a modal one: closed through onClose, so it leaves the way it came
      onCancel={(event) => {
        event.preventDefault();
        latest.current.onClose();
      }}
      // Closed by the browser regardless (a second Esc in Chrome). Not when it was
      // only shown again the other way, after the window crossed into or out of
      // phone sizes: it is open again by the time this arrives.
      onClose={() => {
        if (latest.current.isOpen && !dialogRef.current?.open) latest.current.onClose();
      }}
    >
      {mode !== 'popover' && (
        <div ref={scrimRef} className="overlay-scrim" aria-hidden="true" onClick={() => latest.current.onClose()} />
      )}
      <div ref={panelRef} className={`overlay-panel${className ? ` ${className}` : ''}`}>
        {mode === 'sheet' && (
          <div
            className="overlay-top"
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
          >
            <button
              type="button"
              className="overlay-grip"
              aria-label="Close"
              onClick={() => {
                if (tapped()) latest.current.onClose();
              }}
            >
              <span className="overlay-pill" />
            </button>
          </div>
        )}
        {header && <div className="overlay-head">{header}</div>}
        <div ref={bodyRef} className="overlay-body">
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  );
};

export default Overlay;
