import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, WifiOff, X } from 'lucide-react';

// How often an open tab asks whether a new version has been deployed. Someone who
// leaves Luna open on a phone for an evening should still hear about a fix.
const UPDATE_CHECK_MS = 60 * 60 * 1000;
const OFFLINE_READY_MS = 6000;

/**
 * Registers the service worker and reports on it.
 *
 * "Ready offline" appears once, after the first install, and dismisses itself.
 * "Updated" waits for the viewer: until they reload, they keep a complete and
 * consistent copy of the version they are running.
 */
const UpdatePrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => {
        // Skip the check while offline or backgrounded; it would only fail
        if (navigator.onLine && document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      // Luna works without a service worker, just not offline
      console.warn('Offline support unavailable:', error?.message || error);
    }
  });

  useEffect(() => {
    if (!offlineReady || needRefresh) return undefined;
    const timer = setTimeout(() => setOfflineReady(false), OFFLINE_READY_MS);
    return () => clearTimeout(timer);
  }, [offlineReady, needRefresh, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="update-prompt"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: 'calc(8.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {needRefresh
        ? <RefreshCw size={15} color="var(--accent-light)" style={{ flexShrink: 0 }} />
        : <WifiOff size={15} color="var(--accent-light)" style={{ flexShrink: 0 }} />}

      <span style={{ flex: 1, lineHeight: 1.4 }}>
        {needRefresh ? 'A new version of Luna is ready.' : 'Luna is ready to work offline.'}
      </span>

      {needRefresh && (
        <button
          type="button"
          className="glass-button"
          onClick={() => updateServiceWorker(true)}
          style={{ padding: '0.25rem 0.75rem', fontSize: '0.78rem' }}
        >
          Reload
        </button>
      )}

      <button
        type="button"
        className="ghost-control-btn"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ padding: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default UpdatePrompt;
