import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, LocateFixed, Star, X, Loader } from 'lucide-react';
import {
  searchPlaces,
  resolveTimeZone,
  reverseGeocodeCached,
  loadSavedPlaces,
  storeSavedPlaces,
  isSamePlace
} from '../utils/location';

// Nominatim's usage policy caps requests at one per second and forbids bulk use,
// so we wait for a deliberate pause and a query worth sending.
const DEBOUNCE_MS = 600;
const MIN_QUERY = 3;

const LocationPicker = ({ location, setLocation, isOpen, setIsOpen }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | searching | error | empty
  const [errorMessage, setErrorMessage] = useState('');
  const [savedPlaces, setSavedPlaces] = useState(() => loadSavedPlaces());
  const [isLocating, setIsLocating] = useState(false);

  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const wasOpen = useRef(false);

  const close = useCallback(() => setIsOpen(false), [setIsOpen]);

  // Focus the field on open, and hand focus back to the trigger on close
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Close on a click outside the panel
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen, close]);

  // Debounced search, with the in-flight request cancelled when the query moves on
  useEffect(() => {
    // Clearing on a short query happens in the change handler; setting state
    // straight from an effect body would cascade an extra render.
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('searching');
      try {
        const found = await searchPlaces(trimmed, { signal: controller.signal });
        setResults(found);
        setStatus(found.length ? 'idle' : 'empty');
      } catch (error) {
        if (error.name === 'AbortError') return;
        // Clear the previous results: left in place they read as if the failed
        // search had returned them, e.g. an error above 'Tokyo' after typing 'Kyoto'
        setResults([]);
        setStatus('error');
        setErrorMessage('Could not reach the place search. Check your connection.');
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const applyPlace = useCallback(async (place) => {
    const timeZone = await resolveTimeZone(place.lat, place.lon);
    setLocation({ lat: place.lat, lon: place.lon, name: place.name, timeZone });
    setQuery('');
    setResults([]);
    close();
  }, [setLocation, close]);

  // Geolocation is asked for here, on a deliberate press, rather than fired at
  // first paint before the viewer knows what the app even is.
  const useMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setErrorMessage('This browser does not offer location access.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const [place, timeZone] = await Promise.all([
          reverseGeocodeCached(latitude, longitude),
          resolveTimeZone(latitude, longitude)
        ]);
        setLocation({ lat: latitude, lon: longitude, name: place.name, timeZone });
        setIsLocating(false);
        close();
      },
      () => {
        setIsLocating(false);
        setStatus('error');
        setErrorMessage('Location permission was declined.');
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, [setLocation, close]);

  const isCurrentSaved = savedPlaces.some((place) => isSamePlace(place, location));

  const toggleSaved = useCallback(() => {
    setSavedPlaces((current) => {
      const next = current.some((place) => isSamePlace(place, location))
        ? current.filter((place) => !isSamePlace(place, location))
        : [location, ...current];
      storeSavedPlaces(next);
      return next;
    });
  }, [location]);

  const removeSaved = useCallback((place) => {
    setSavedPlaces((current) => {
      const next = current.filter((entry) => !isSamePlace(entry, place));
      storeSavedPlaces(next);
      return next;
    });
  }, []);

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    width: '100%',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '10px',
    padding: '0.5rem 0.6rem',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)'
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className="glass-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Observing from ${location?.name || 'an unset location'}. Change location.`}
        style={{
          padding: '0.35rem 0.85rem',
          minHeight: '32px',
          borderRadius: '16px',
          background: isOpen ? 'var(--bg-surface-elevated)' : 'var(--bg-surface-1)',
          border: isOpen ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
          gap: '0.4rem',
          fontSize: '0.78rem',
          fontWeight: 500,
          maxWidth: '13rem'
        }}
      >
        <MapPin size={13} color="var(--accent-light)" style={{ flexShrink: 0 }} />
        <span
          className="location-trigger-label"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {location?.name || 'Set location'}
        </span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose an observing location"
          style={{
            position: 'absolute',
            top: '2.75rem',
            right: 0,
            width: 'min(21rem, calc(100vw - 2rem))',
            background: 'rgba(9, 12, 28, 0.96)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid var(--border-medium)',
            borderRadius: '16px',
            padding: '0.9rem',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15)',
            zIndex: 120,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
            <Search
              size={14}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (value.trim().length < MIN_QUERY) {
                  setResults([]);
                  setStatus('idle');
                }
              }}
              placeholder="Search for a town or city"
              aria-label="Search for a town or city"
              style={{
                width: '100%',
                padding: '0.55rem 0.6rem 0.55rem 2rem',
                borderRadius: '10px',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none'
              }}
            />
          </div>

          {/* Use my location */}
          <button type="button" onClick={useMyLocation} disabled={isLocating} style={rowStyle}>
            {isLocating
              ? <Loader size={14} color="var(--accent-light)" />
              : <LocateFixed size={14} color="var(--accent-light)" />}
            <span>{isLocating ? 'Finding you…' : 'Use my location'}</span>
          </button>

          {/* Status */}
          {status === 'searching' && (
            <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Searching…
            </div>
          )}
          {status === 'empty' && (
            <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No places matched “{query.trim()}”.
            </div>
          )}
          {status === 'error' && (
            <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.8rem', color: '#fca5a5' }}>
              {errorMessage}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={{ marginTop: '0.35rem', maxHeight: '13rem', overflowY: 'auto' }}>
              {results.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => applyPlace(place)}
                  title={place.detail}
                  style={rowStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <MapPin size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {place.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Saved places */}
          <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span className="utility-label" style={{ fontSize: '0.66rem' }}>Saved places</span>
              <button
                type="button"
                onClick={toggleSaved}
                className="ghost-control-btn"
                style={{ minWidth: '26px', minHeight: '26px', padding: 0 }}
                aria-label={isCurrentSaved ? 'Remove this location from saved places' : 'Save this location'}
                title={isCurrentSaved ? 'Remove from saved' : 'Save this location'}
              >
                <Star
                  size={13}
                  color={isCurrentSaved ? 'var(--accent-light)' : 'var(--text-muted)'}
                  fill={isCurrentSaved ? 'var(--accent-light)' : 'none'}
                />
              </button>
            </div>

            {savedPlaces.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Star a location to keep it here.
              </p>
            ) : (
              savedPlaces.map((place) => (
                <div key={`${place.lat},${place.lon}`} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => applyPlace(place)}
                    style={{ ...rowStyle, flex: 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Star size={12} color="var(--accent-light)" fill="var(--accent-light)" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {place.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSaved(place)}
                    className="ghost-control-btn"
                    style={{ minWidth: '26px', minHeight: '26px', padding: 0 }}
                    aria-label={`Remove ${place.name} from saved places`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <p style={{ marginTop: '0.7rem', marginBottom: 0, fontSize: '0.66rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Place search by Nominatim, data © OpenStreetMap contributors.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
