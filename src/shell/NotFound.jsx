import React from 'react';
import BrandMark from '../components/BrandMark';
import { EarthshineFilter } from '../components/MoonDisc';

// The branded 404 (Phase 5b): what an address that isn't Luna shows, in Luna's own
// look, with no JavaScript. The build renders it to a static 404.html (luna-not-found
// in vite.config.js), which Vercel serves for any path it has no file for. A New
// Moon: the flat Moon's photograph in earthshine, as the app draws it.
const NotFound = ({ home }) => (
  <main className="nf">
    <a className="nf-brand" href={home}>
      <BrandMark className="nf-mark" />
      <span>Luna</span>
    </a>
    <div className="nf-body">
      <svg className="nf-moon" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <defs>
          <EarthshineFilter id="nf-earthshine" />
          <clipPath id="nf-disc">
            <circle cx="100" cy="100" r="100" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="99.5" fill="#000104" />
        <image href={`${home}moon-disc.webp`} width="200" height="200" filter="url(#nf-earthshine)" clipPath="url(#nf-disc)" />
      </svg>
      <h1>Lost in the dark</h1>
      <p>There&rsquo;s nothing at this address.</p>
      <a className="nf-home" href={home}>Back to tonight&rsquo;s Moon</a>
    </div>
  </main>
);

export default NotFound;
