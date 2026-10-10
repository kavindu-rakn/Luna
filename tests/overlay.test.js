import { describe, it, expect, afterEach } from 'vitest';
import { placeBelow } from '../src/utils/anchor';
import { pushOverlay, topOverlay, closeTopOverlay, isModalOpen, pressOutside } from '../src/components/overlay/overlayStack';

const viewport = { width: 1440, height: 900 };
// The date button in the middle of the header, as on a 1440 x 900 window
const date = { left: 594, top: 16, right: 846, bottom: 56, width: 252, height: 40 };

describe('placeBelow', () => {
  it('hangs a popover centred under its control, growing out of the control', () => {
    const spot = placeBelow({ anchor: date, width: 352, height: 491, viewport });
    expect(spot.left).toBe(544);
    expect(spot.top).toBe(64);
    // The control's centre, in the popover's own coordinates
    expect(spot.originX).toBe(176);
    expect(spot.originY).toBe(-28);
  });

  it('lines up right edges for the menu', () => {
    const menu = { left: 1376, top: 16, right: 1416, bottom: 56, width: 40, height: 40 };
    const spot = placeBelow({ anchor: menu, width: 296, height: 343, viewport, align: 'end' });
    expect(spot.left + 296).toBe(1416);
  });

  it('stays on screen beside an edge', () => {
    const corner = { left: 1400, top: 16, right: 1440, bottom: 56, width: 40, height: 40 };
    const spot = placeBelow({ anchor: corner, width: 336, height: 200, viewport });
    expect(spot.left).toBe(1440 - 336 - 12);
    // Still grows out of the control, now off-centre
    expect(spot.originX).toBe(1420 - spot.left);
  });

  it('rises until it fits when there is not room below or above', () => {
    const short = { width: 1280, height: 600 };
    const spot = placeBelow({ anchor: date, width: 352, height: 560, viewport: short });
    expect(spot.top).toBe(600 - 560 - 12);
    // Taller than the screen: from the top margin
    expect(placeBelow({ anchor: date, width: 352, height: 700, viewport: short }).top).toBe(12);
  });

  it('opens above a control at the foot of the screen, growing up out of it', () => {
    // The date in the phone dock of a 700 x 1000 window
    const docked = { left: 208, top: 760, right: 492, bottom: 804, width: 284, height: 44 };
    const spot = placeBelow({ anchor: docked, width: 352, height: 491, viewport: { width: 700, height: 1000 } });
    expect(spot.top).toBe(760 - 8 - 491);
    // The control's centre is below the popover, so it grows upward
    expect(spot.originY).toBe(782 - spot.top);
    expect(spot.originY).toBeGreaterThan(491);
  });
});

describe('overlayStack', () => {
  const undo = [];
  const open = (name, modal = false, inside = []) => {
    const entry = { name, modal, closed: 0, close() { this.closed += 1; }, contains: (target) => inside.includes(target) };
    undo.push(pushOverlay(entry));
    return entry;
  };
  afterEach(() => {
    while (undo.length) undo.pop()();
  });

  it('closes the top overlay only, and says when there was none', () => {
    expect(closeTopOverlay()).toBe(false);
    const location = open('location');
    const privacy = open('privacy', true);
    expect(topOverlay()).toBe(privacy);
    expect(closeTopOverlay()).toBe(true);
    expect(privacy.closed).toBe(1);
    expect(location.closed).toBe(0);
  });

  it('knows when the page behind is shut off', () => {
    open('calendar');
    expect(isModalOpen()).toBe(false);
    open('shortcuts', true);
    expect(isModalOpen()).toBe(true);
  });

  it('closes a popover on a press outside it, but not on itself or its control', () => {
    const panel = {};
    const trigger = {};
    const menu = open('menu', false, [panel, trigger]);
    pressOutside({ target: panel });
    pressOutside({ target: trigger });
    expect(menu.closed).toBe(0);
    pressOutside({ target: {} });
    expect(menu.closed).toBe(1);
  });

  it('leaves a press on the page to a modal overlay, whose dimmed page takes it', () => {
    const location = open('location', false, []);
    const privacy = open('privacy', true, []);
    pressOutside({ target: {} });
    expect(privacy.closed).toBe(0);
    expect(location.closed).toBe(0);
  });

  it('takes an overlay off wherever it is in the stack', () => {
    const a = open('a');
    const b = open('b');
    // The one underneath closes first: the top one stays on top
    undo.splice(0, 1)[0]();
    expect(topOverlay()).toBe(b);
    undo.splice(0, 1)[0]();
    expect(topOverlay()).toBe(null);
    expect(a.closed + b.closed).toBe(0);
  });
});
