import React, { useEffect, useState } from 'react';
import Icon from './icons/Icon';
import DisplayPreferences from './DisplayPreferences';
import Overlay from './overlay/Overlay';

// The one menu (decision D2): everything the header used to hold, plus the small
// settings E4 asked for. A disclosure rather than an ARIA menu: it holds actions,
// a switch and two radio groups, which plain buttons and fieldsets already make
// keyboard- and screen-reader-friendly. It hangs from its button, right edges
// aligned, or rises as a sheet on a phone (Overlay). About joins it in Phase 5.
const AppMenu = ({
  onDeepDive,
  onShare,
  sound,
  tilt,
  showTilt,
  onShortcuts,
  onPrivacy,
  preferences,
  setPreference,
  // The menu button, which App also hands focus back to when a dialog opened from
  // the menu closes
  triggerRef
}) => {
  // Its own, so opening the menu re-renders the menu rather than the app
  const [isOpen, setIsOpen] = useState(false);

  // Focus the first item on open
  useEffect(() => {
    if (isOpen) document.getElementById('app-menu-panel')?.querySelector('button')?.focus({ preventScroll: true });
  }, [isOpen]);

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

      <Overlay
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        align="end"
        label="Menu"
        className="menu-panel"
      >
        <div id="app-menu-panel">
          <ul className="menu-list">
            <li>
              <button type="button" className="menu-item" onClick={act(onDeepDive)} aria-keyshortcuts="D" data-sound="glass">
                <Icon name="readings" />
                <span>Deep Dive</span>
                <kbd className="menu-key" aria-hidden="true">D</kbd>
              </button>
            </li>
            <li>
              <button type="button" className="menu-item" onClick={act(onShare)} data-sound="glass">
                <Icon name="share" />
                <span>Share this view</span>
              </button>
            </li>
            {/* Plays its own switch sound, once the sounds have arrived */}
            {sound.supported && (
              <li>
                <button type="button" className="menu-item" role="switch" aria-checked={sound.on} onClick={sound.toggle}>
                  <Icon name={sound.on ? 'soundOn' : 'soundOff'} />
                  <span>Sound</span>
                  <span className="menu-switch" aria-hidden="true" />
                </button>
              </li>
            )}
            {showTilt && (
              <li>
                <button
                  type="button"
                  className="menu-item"
                  role="switch"
                  aria-checked={tilt.on}
                  onClick={tilt.toggle}
                  data-sound={tilt.on ? 'switch-off' : 'switch-on'}
                >
                  <Icon name="tilt" />
                  <span>Tilt to look around</span>
                  <span className="menu-switch" aria-hidden="true" />
                </button>
              </li>
            )}
            {/* Only where there is a keyboard to use them with (see .menu-keyboard) */}
            <li className="menu-keyboard">
              <button type="button" className="menu-item" onClick={act(onShortcuts)} aria-keyshortcuts="?" data-sound="glass">
                <Icon name="keyboard" />
                <span>Keyboard shortcuts</span>
                <kbd className="menu-key" aria-hidden="true">?</kbd>
              </button>
            </li>
            <li>
              <button type="button" className="menu-item" onClick={act(onPrivacy)} data-sound="glass">
                <Icon name="privacy" />
                <span>Privacy</span>
              </button>
            </li>
          </ul>
          <div className="menu-settings">
            <DisplayPreferences preferences={preferences} setPreference={setPreference} />
          </div>
        </div>
      </Overlay>
    </div>
  );
};

export default AppMenu;
