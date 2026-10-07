import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from './icons/Icon';
import {
  searchPlaces,
  resolveTimeZone,
  placeFromPosition,
  loadSavedPlaces,
  storeSavedPlaces,
  isSamePlace
} from '../utils/location';

// Nominatim's usage policy caps requests at one per second and forbids bulk use,
// so we wait for a deliberate pause and a query worth sending.
const DEBOUNCE_MS = 600;
const MIN_QUERY = 3;

const LocationPicker = ({ location, setLocation, isOpen, setIsOpen, onShowPrivacy }) => {
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
        // Rounded to about a kilometre before anything else sees it
        setLocation(await placeFromPosition(position.coords));
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

  return (
    <div className="location-picker">
      <button
        ref={triggerRef}
        type="button"
        className={`glass-button location-trigger${isOpen ? ' is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Observing from ${location?.name || 'an unset location'}. Change location.`}
      >
        <Icon name="location" size={18} />
        <span className="location-trigger-label">
          {location?.name || 'Set location'}
        </span>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose an observing location"
          className="location-panel"
        >
          {/* Search */}
          <div className="location-search-field">
            <Icon name="search" size={18} />
            <input
              className="location-search"
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
            />
          </div>

          {/* Use my location */}
          <button type="button" className="location-row" onClick={useMyLocation} disabled={isLocating}>
            {isLocating
              ? <Icon name="spinner" size={18} className="is-spinning" />
              : <Icon name="locateMe" size={18} />}
            <span>{isLocating ? 'Finding you…' : 'Use my location'}</span>
          </button>

          {/* Status */}
          {status === 'searching' && (
            <div className="location-status">
              Searching…
            </div>
          )}
          {status === 'empty' && (
            <div className="location-status">
              No places matched “{query.trim()}”.
            </div>
          )}
          {status === 'error' && (
            <div className="location-status is-error">
              {errorMessage}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="location-results">
              {results.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className="location-row"
                  onClick={() => applyPlace(place)}
                  title={place.detail}
                >
                  <Icon name="location" size={18} className="is-muted" />
                  <span className="location-row-name">
                    {place.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Saved places */}
          <div className="location-saved">
            <div className="location-saved-header">
              <span className="utility-label">Saved places</span>
              <button
                type="button"
                onClick={toggleSaved}
                className="ghost-control-btn"
                aria-pressed={isCurrentSaved}
                aria-label={isCurrentSaved ? 'Remove this location from saved places' : 'Save this location'}
                title={isCurrentSaved ? 'Remove from saved places' : 'Save this location'}
              >
                <Icon name={isCurrentSaved ? 'savedPlaceFilled' : 'savedPlace'} size={18} />
              </button>
            </div>

            {savedPlaces.length === 0 ? (
              <p className="location-note">
                Star a location to keep it here.
              </p>
            ) : (
              savedPlaces.map((place) => (
                <div key={`${place.lat},${place.lon}`} className="location-saved-row">
                  <button
                    type="button"
                    className="location-row"
                    onClick={() => applyPlace(place)}
                  >
                    <Icon name="savedPlaceFilled" size={18} className="is-muted" />
                    <span className="location-row-name">
                      {place.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSaved(place)}
                    className="ghost-control-btn"
                    aria-label={`Remove ${place.name} from saved places`}
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="location-credit">
            Place search by Nominatim, data ©{' '}
            <a className="text-link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
            .{' '}
            {/* Said where the data is handed over, not only in a page nobody opens */}
            <button type="button" className="text-link" onClick={onShowPrivacy}>
              What is sent, and what stays on your device
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
