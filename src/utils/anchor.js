// Where a popover hangs from the control that opened it (decision E9): just below
// it, centred on it or with their right edges aligned, and kept on screen. When
// there is not room below but there is above (a control in the phone dock, at the
// foot of the screen), it opens above instead; when neither has room, it rises
// until it fits, over the control if need be. Returns its top-left corner and, for
// growing out of the control, the control's centre in the popover's own
// coordinates.
export const placeBelow = ({ anchor, width, height, viewport, align = 'center', gap = 8, margin = 12 }) => {
  const centre = anchor.left + anchor.width / 2;
  let left = align === 'end' ? anchor.right - width : centre - width / 2;
  left = Math.max(margin, Math.min(left, viewport.width - width - margin));
  let top = anchor.bottom + gap;
  const above = anchor.top - gap - height;
  if (top + height > viewport.height - margin) {
    top = above >= margin ? above : Math.max(margin, viewport.height - height - margin);
  }
  return {
    left,
    top,
    originX: centre - left,
    originY: anchor.top + anchor.height / 2 - top
  };
};
