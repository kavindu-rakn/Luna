import React, { useRef, useState } from 'react';
import ModalDialog from './ModalDialog';
import { forgetStoredData } from '../utils/storage';

const OSMF_PRIVACY = 'https://osmfoundation.org/wiki/Privacy_Policy';
const GITHUB_PRIVACY = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';

const ExternalLink = ({ href, children }) => (
  <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

const Section = ({ title, children }) => (
  <div className="privacy-section">
    <h3 className="utility-label">{title}</h3>
    {children}
  </div>
);

/**
 * What Luna sends, what it keeps, and a way to forget it. Every statement here
 * describes what the code does; change one and the other has to change with it.
 */
const PrivacyDialog = ({ isOpen, onClose }) => {
  const [confirming, setConfirming] = useState(false);
  const forgetButtonRef = useRef(null);

  // However the dialog closes, it opens next time without a half-made decision
  const handleClose = () => {
    setConfirming(false);
    onClose();
  };

  const forget = () => {
    forgetStoredData();
    // Restart from the bare address: the current one names a place, which would
    // come straight back from the URL
    window.location.assign(import.meta.env.BASE_URL);
  };

  const cancel = () => {
    setConfirming(false);
    forgetButtonRef.current?.focus();
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={handleClose} title="Privacy" titleId="privacy-title" className="privacy-dialog">
      <p className="privacy-lead">
        No accounts, no cookies, no analytics and no ads. Every calculation runs on your device.
      </p>

      <Section title="Your location">
        <p>
          Luna asks for it only when you press <strong>Use my location</strong>. It is rounded to
          about a kilometre the moment it arrives, so your exact position is never stored, sent or
          put in a link. To name the place, that rounded position is sent to OpenStreetMap&rsquo;s
          Nominatim service.
        </p>
      </Section>

      <Section title="Place search">
        <p>
          What you type in the search box is sent to Nominatim to find matching places. Nominatim is
          run by the OpenStreetMap Foundation and, like any web service, sees your IP address.{' '}
          <ExternalLink href={OSMF_PRIVACY}>Their privacy policy</ExternalLink>.
        </p>
      </Section>

      <Section title="Kept on this device">
        <p>
          Your chosen place, your saved places, your clock and distance settings, and the name of
          the last place found with Use my location. They stay in this browser and are never sent
          anywhere. Luna also keeps a copy of its own files so that it works offline.
        </p>
        <div className="privacy-actions">
          <button
            ref={forgetButtonRef}
            type="button"
            className="glass-button"
            onClick={() => setConfirming(true)}
            aria-expanded={confirming}
            aria-controls="privacy-forget-confirm"
          >
            Forget places and settings
          </button>
        </div>
        {confirming && (
          <div id="privacy-forget-confirm" className="privacy-confirm">
            <p>
              This removes your chosen place, saved places and settings from this browser, then
              restarts Luna.
            </p>
            <div className="privacy-actions">
              <button type="button" className="glass-button privacy-danger" onClick={forget}>
                Forget
              </button>
              {/* The safe choice takes focus */}
              <button type="button" className="glass-button" onClick={cancel} autoFocus>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Share links">
        <p>
          A share link holds the date and the place you are looking at: its name, and coordinates
          rounded to about a kilometre. Anyone you give it to can read them.
        </p>
      </Section>

      <Section title="Hosting">
        <p>
          Like any website, the server that delivers Luna receives your IP address and browser
          details when the page loads. The official copy is served by GitHub Pages.{' '}
          <ExternalLink href={GITHUB_PRIVACY}>GitHub&rsquo;s privacy statement</ExternalLink>.
        </p>
      </Section>
    </ModalDialog>
  );
};

export default PrivacyDialog;
