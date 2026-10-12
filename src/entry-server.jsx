import React, { StrictMode } from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import App from './App.jsx';
import NotFound from './shell/NotFound.jsx';

// Run once by the build (see luna-shell in vite.config.js) to turn the first frame
// of the app into static HTML. The page then paints before any JavaScript has
// downloaded; main.jsx replaces this markup with the live app moments later.
export const renderShell = () => renderToString(
  <StrictMode>
    <App prerender />
  </StrictMode>
);

// The branded 404, as a whole static page's body (see luna-not-found in
// vite.config.js). `home` is the address Luna is served from.
export const renderNotFound = (home) => renderToStaticMarkup(<NotFound home={home} />);
