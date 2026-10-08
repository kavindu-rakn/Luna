import React, { useEffect, useRef } from 'react';
import Icon from './icons/Icon';
import DisplayPreferences from './DisplayPreferences';

// The one menu (decision D2): everything the header used to hold, plus the small
// settings E4 asked for. A disclosure rather than an ARIA menu: it holds actions,
// a switch and two radio groups, which plain buttons and fieldsets already make
// keyboard- and screen-reader-friendly. Sound joins it in 2c; About in Phase 5.
const AppMenu = ({
  isOpen,
  setIsOpen,
  onDeepDive,
  onShare,
  tilt,
  showTilt,
  onShortcuts,
  onPrivacy,
  preferences,
  setPreference
}) => {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const wasOpen = useRef(false);

  // Focus the first item on open; on close, hand focus back to the button if it
  // was inside the menu (an action that opens something else keeps its own focus)
  useEffect(() => {
    if (isOpen) {
      panelRef.current?.querySelector('button')?.focus();
    } else if (wasOpen.current) {
      const active = document.activeElement;
      if (!active || active === document.body || panelRef.current?.contains(active)) triggerRef.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Close on a press anywhere else
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, setIsOpen]);

  // An action closes the menu, then does its thing: still inside the press, so the
  // share sheet and the motion permission can ask for it
  const act = (action) => () => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="app-menu">
      <button
        ref={triggerRef}
        type="button"
        className="glass-button icon-button menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="app-menu-panel"
        aria-label="Menu"
        title="Menu"
      >
        <Icon name={isOpen ? 'close' : 'menu'} />
      </button>

      {isOpen && (
        <div id="app-menu-panel" ref={panelRef} className="menu-panel" role="group" aria-label="Menu">
          <ul className="menu-list">
            <li>
              <button type="button" className="menu-item" onClick={act(onDeepDive)} aria-keyshortcuts="D">
                <Icon name="readings" />
                <span>Deep Dive</span>
                <kbd className="menu-key" aria-hidden="true">D</kbd>
              </button>
            </li>
            <li>
              <button type="button" className="menu-item" onClick={act(onShare)}>
                <Icon name="share" />
                <span>Share this view</span>
              </button>
            </li>
            {showTilt && (
              <li>
                <button type="button" className="menu-item" role="switch" aria-checked={tilt.on} onClick={tilt.toggle}>
                  <Icon name="tilt" />
                  <span>Tilt to look around</span>
                  <span className="menu-switch" aria-hidden="true" />
                </button>
              </li>
            )}
            {/* Only where there is a keyboard to use them with (see .menu-keyboard) */}
            <li className="menu-keyboard">
              <button type="button" className="menu-item" onClick={act(onShortcuts)} aria-keyshortcuts="?">
                <Icon name="keyboard" />
                <span>Keyboard shortcuts</span>
                <kbd className="menu-key" aria-hidden="true">?</kbd>
              </button>
            </li>
            <li>
              <button type="button" className="menu-item" onClick={act(onPrivacy)}>
                <Icon name="privacy" />
                <span>Privacy</span>
              </button>
            </li>
          </ul>
          <div className="menu-settings">
            <DisplayPreferences preferences={preferences} setPreference={setPreference} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppMenu;
