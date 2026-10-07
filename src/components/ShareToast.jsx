import React from 'react';
import Icon from './icons/Icon';

// Says how a share went, where it can be seen: the menu that started it has closed.
// The same element is the live region that announces it, and it stays mounted so a
// screen reader hears each change.
const ShareToast = ({ status }) => (
  <div className={`share-toast${status === 'idle' ? '' : ' is-visible'}`} role="status" aria-live="polite">
    {status === 'copied' && (
      <>
        <Icon name="check" size={18} />
        <span>Link copied to clipboard</span>
      </>
    )}
    {status === 'failed' && (
      <>
        <Icon name="alert" size={18} />
        <span>Could not copy the link</span>
      </>
    )}
  </div>
);

export default ShareToast;
