import React from 'react';
import Icon from './icons/Icon';
import Overlay from './overlay/Overlay';

/**
 * A modal overlay with a title and a close button (keyboard shortcuts, privacy): a
 * centred dialog over a dimmed page on wide screens, a sheet on phones. It shuts off
 * the page behind; Esc, the button, the dimmed page or, on a phone, a swipe down
 * close it, and focus goes back to what opened it.
 */
const ModalDialog = ({ isOpen, onClose, title, titleId, className = '', sheet = 'fit', returnFocusRef, children }) => (
  <Overlay
    open={isOpen}
    onClose={onClose}
    modal
    sheet={sheet}
    labelledBy={titleId}
    returnFocusRef={returnFocusRef}
    className={`modal-dialog ${className}`.trim()}
    // The title and close button stay in view while a long dialog scrolls, and the
    // close button is the first thing focus meets
    header={(
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="glass-button icon-button" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
    )}
  >
    {children}
  </Overlay>
);

export default ModalDialog;
