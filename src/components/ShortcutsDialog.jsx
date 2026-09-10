import React from 'react';
import ModalDialog from './ModalDialog';

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

// The keyboard shortcuts, in the app's modal dialog
const ShortcutsDialog = ({ isOpen, onClose }) => (
  <ModalDialog isOpen={isOpen} onClose={onClose} title="Keyboard shortcuts" titleId="shortcuts-title">
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
  </ModalDialog>
);

export default ShortcutsDialog;
