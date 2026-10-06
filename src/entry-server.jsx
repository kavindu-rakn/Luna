import React, { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';

// Run once by the build (see luna-shell in vite.config.js) to turn the first frame
// of the app into static HTML. The page then paints before any JavaScript has
// downloaded; main.jsx replaces this markup with the live app moments later.
export const renderShell = () => renderToString(
  <StrictMode>
    <App prerender />
  </StrictMode>
);
