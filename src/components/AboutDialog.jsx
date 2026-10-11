import React from 'react';
import ModalDialog from './ModalDialog';
import './about.css';

const REPOSITORY = 'https://github.com/kavindu-rakn/Luna';

const ExternalLink = ({ href, children }) => (
  <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

const Section = ({ title, children }) => (
  <div className="privacy-section">
    <h3 className="utility-label">{title}</h3>
    {children}
  </div>
);

// Whose work Luna stands on, each with its label above it (the cards' anatomy)
const CREDITS = [
  {
    what: 'The Moon',
    who: (
      <>
        NASA&rsquo;s Scientific Visualization Studio,{' '}
        <ExternalLink href="https://svs.gsfc.nasa.gov/4720">CGI Moon Kit</ExternalLink>: colour from the
        Lunar Reconnaissance Orbiter&rsquo;s camera, relief from its laser altimeter
      </>
    )
  },
  {
    what: 'Where the Moon and Sun are',
    who: (
      <>
        Jean Meeus, <em>Astronomical Algorithms</em>, and{' '}
        <ExternalLink href="https://github.com/mourner/suncalc">SunCalc</ExternalLink> by Vladimir Agafonkin
      </>
    )
  },
  {
    what: 'Stars',
    who: (
      <>
        The Bright Star Catalogue (Hoffleit &amp; Warren), via CDS Strasbourg, and the constellation
        boundaries of Delporte (1930), as arranged by Roman (1987)
      </>
    )
  },
  {
    what: 'Planets',
    who: (
      <>
        JPL&rsquo;s{' '}
        <ExternalLink href="https://ssd.jpl.nasa.gov/planets/approx_pos.html">approximate positions of the planets</ExternalLink>{' '}
        (Standish &amp; Williams)
      </>
    )
  },
  {
    what: 'Places and time zones',
    who: (
      <>
        <ExternalLink href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</ExternalLink>,
        searched with Nominatim; the IANA Time Zone Database, and tz&#8209;lookup
      </>
    )
  },
  {
    what: 'Type',
    who: 'Cormorant Garamond by Christian Thalmann and Inter by Rasmus Andersson, both under the SIL Open Font License'
  },
  {
    what: 'Built with',
    who: 'React and three.js'
  }
];

/**
 * What Luna is, briefly how it works, whose work it stands on, and who made it
 * (decision A3, settled in chat on 12 Oct 2026). Opened from the menu and from
 * Deep Dive's footer; loaded only when first opened.
 */
const AboutDialog = ({ isOpen, onClose, returnFocusRef }) => (
  <ModalDialog
    isOpen={isOpen}
    onClose={onClose}
    title="About Luna"
    titleId="about-title"
    className="about-dialog"
    sheet="tall"
    returnFocusRef={returnFocusRef}
  >
    <p className="privacy-lead">
      Luna shows the Moon as it is from where you are: its phase, how it stands in your sky, and
      where it is in its month.
    </p>

    <Section title="How it works">
      <p>
        Everything is worked out on your device, for your place and on its clock: the Moon&rsquo;s
        phase and position, when it rises and sets, and which way it is turned in your sky. Scrub the
        timeline or step through the days, and all of it follows.
      </p>
      <p>
        The Moon is NASA&rsquo;s map of its surface, lit for the moment you are looking at. Once Luna
        has opened, it works offline, and nothing is tracked.
      </p>
    </Section>

    <Section title="Built on">
      <dl className="about-credits">
        {CREDITS.map(({ what, who }) => (
          <div key={what} className="about-credit">
            <dt>{what}</dt>
            <dd>{who}</dd>
          </div>
        ))}
      </dl>
    </Section>

    <p className="about-maker">
      Made by kvn. Luna is open source, under the MIT License:{' '}
      <ExternalLink href={REPOSITORY}>source on GitHub</ExternalLink>.
    </p>
  </ModalDialog>
);

export default AboutDialog;
