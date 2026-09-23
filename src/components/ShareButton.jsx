import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Check, CircleAlert } from 'lucide-react';
import { buildShareUrl } from '../utils/shareUrl';

// The async Clipboard API needs a secure context and a user gesture, and some
// embedded browsers refuse it outright. The old selection-based copy still works
// almost everywhere, so it stays as the fallback.
const copyWithSelection = (text) => {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  let ok;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(field);
  return ok;
};

const ShareButton = ({ date, location }) => {
  const [status, setStatus] = useState('idle'); // idle | copied | failed
  const resetTimer = useRef(null);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const flash = useCallback((next) => {
    setStatus(next);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus('idle'), 2600);
  }, []);

  const share = useCallback(async () => {
    const url = buildShareUrl(date, location);

    // Touch devices get the native share sheet; everyone else gets the clipboard,
    // which is what a desktop user reaching for "share" almost always wants.
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ title: `The Moon from ${location.name}`, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return; // the sheet was dismissed
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      flash('copied');
    } catch {
      flash(copyWithSelection(url) ? 'copied' : 'failed');
    }
  }, [date, location, flash]);

  const label = status === 'copied'
    ? 'Link copied'
    : status === 'failed'
      ? 'Could not copy the link'
      : 'Share a link to this view';

  return (
    <>
      <button
        type="button"
        className="glass-button icon-button"
        onClick={share}
        aria-label={label}
        title={label}
        style={{
          padding: 0,
          borderRadius: '50%',
          background: status === 'copied' ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
          border: status === 'copied' ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)'
        }}
      >
        {status === 'copied'
          ? <Check size={14} color="var(--accent-light)" />
          : <Share2 size={14} color={status === 'failed' ? '#fca5a5' : 'var(--text-secondary)'} />}
      </button>

      {/* The tick on the button sits right under the cursor that clicked it, so say
          it where it can be seen too. The same element is the live region that
          announces it, and it stays mounted so a screen reader hears each change. */}
      <div className={`share-toast${status === 'idle' ? '' : ' is-visible'}`} role="status" aria-live="polite">
        {status === 'copied' && (
          <>
            <Check size={15} aria-hidden="true" />
            <span>Link copied to clipboard</span>
          </>
        )}
        {status === 'failed' && (
          <>
            <CircleAlert size={15} aria-hidden="true" />
            <span>Could not copy the link</span>
          </>
        )}
      </div>
    </>
  );
};

export default ShareButton;
