import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// What each key does, grouped by where it works. Written out rather than generated
// from the handlers, so each line can say what a person sees happen.
const GROUPS = [
  {
    title: 'Anywhere',
    items: [
      { keys: ['←', '→'], does: 'Previous or next day' },
      { modifier: 'Shift', keys: ['←', '→'], does: 'Previous or next New, First Quarter, Full or Last Quarter Moon' },
      { keys: ['T'], does: 'Back to now' },
      { keys: ['D'], does: 'Open or close Deep Dive' },
      { keys: ['?'], does: 'Show these shortcuts' },
      { keys: ['Esc'], does: 'Close whatever is open' }
    ]
  },
  {
    title: 'On the timeline',
    items: [
      { keys: ['Home', 'End'], does: 'Start or end of this lunar cycle' }
    ]
  },
  {
    title: 'In the calendar',
    items: [
      { keys: ['←', '→', '↑', '↓'], does: 'Move by a day or a week' },
      { keys: ['Home', 'End'], does: 'Start or end of the week' },
      { keys: ['Page Up', 'Page Down'], does: 'Previous or next month' },
      { keys: ['Enter'], does: 'Choose the day' }
    ]
  }
];

// Arrows are read aloud by name; the glyphs alone come out as "leftwards arrow" or nothing
const SPOKEN = { '←': 'Left arrow', '→': 'Right arrow', '↑': 'Up arrow', '↓': 'Down arrow', Esc: 'Escape' };

const ARROWS = new Set(['←', '→', '↑', '↓']);

const Key = ({ name }) => (
  <kbd className={ARROWS.has(name) ? 'is-arrow' : undefined}>
    {SPOKEN[name] ? (
      <>
        <span aria-hidden="true">{name}</span>
        <span className="sr-only">{SPOKEN[name]}</span>
      </>
    ) : name}
  </kbd>
);

// "Shift + ← / →": a modifier held with any one of the keys
const Keys = ({ modifier, keys }) => (
  <>
    {modifier && (
      <>
        <Key name={modifier} />
        <span className="shortcuts-sep" aria-hidden="true">+</span>
        <span className="sr-only"> plus </span>
      </>
    )}
    {keys.map((key, i) => (
      <React.Fragment key={key}>
        {i > 0 && (
          <>
            <span className="shortcuts-sep" aria-hidden="true">/</span>
            <span className="sr-only"> or </span>
          </>
        )}
        <Key name={key} />
      </React.Fragment>
    ))}
  </>
);

/**
 * The keyboard shortcuts, in a native modal <dialog>. showModal() traps focus, makes
 * the page behind it inert, closes on Esc and hands focus back to wherever it was.
 */
const ShortcutsDialog = ({ isOpen, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // closedby="any" closes the dialog on a click outside it. Safari does not support
  // that yet; there, a click whose target is the dialog element itself but which
  // lands outside its box can only have been on the backdrop.
  const handleClick = (e) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const box = dialog.getBoundingClientRect();
    const inside = box.top <= e.clientY && e.clientY <= box.bottom && box.left <= e.clientX && e.clientX <= box.right;
    if (!inside) dialog.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="shortcuts-dialog"
      closedby="any"
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={handleClick}
    >
      <div className="shortcuts-header">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        {/* A plain button rather than <form method="dialog">: the page's CSP sets
            form-action 'none', and a dialog close is no place to test how each
            browser reads that */}
        <button
          type="button"
          className="ghost-control-btn"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-medium)',
            borderRadius: '50%',
            minWidth: '34px',
            minHeight: '34px',
            padding: 0
          }}
        >
          <X size={16} />
        </button>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="shortcuts-group">
          <h3 className="utility-label">{group.title}</h3>
          <dl className="shortcuts-list">
            {group.items.map((item) => (
              <div key={item.does} className="shortcuts-row">
                <dt><Keys modifier={item.modifier} keys={item.keys} /></dt>
                <dd>{item.does}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <p className="shortcuts-note">
        In the calendar, type a year into the year picker to jump straight to it.
      </p>
    </dialog>
  );
};

export default ShortcutsDialog;
