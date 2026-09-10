import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link2, Check } from 'lucide-react';
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
    resetTimer.current = setTimeout(() => setStatus('idle'), 2200);
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
      : 'Copy a link to this view';

  return (
    <>
      <button
        type="button"
        className="glass-button"
        onClick={share}
        aria-label={label}
        title={label}
        style={{
          padding: 0,
          minHeight: '32px',
          minWidth: '32px',
          width: '32px',
          borderRadius: '50%',
          background: status === 'copied' ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
          border: status === 'copied' ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)'
        }}
      >
        {status === 'copied'
          ? <Check size={14} color="var(--accent-light)" />
          : <Link2 size={14} color={status === 'failed' ? '#fca5a5' : 'var(--text-secondary)'} />}
      </button>

      {/* Announce the outcome; a changing icon alone says nothing to a screen reader */}
      <span className="sr-only" aria-live="polite">
        {status === 'copied' ? 'Link copied to clipboard' : status === 'failed' ? 'Could not copy the link' : ''}
      </span>
    </>
  );
};

export default ShareButton;
