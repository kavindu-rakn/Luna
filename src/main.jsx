import React, { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted fonts. Loading these from Google's CDN sent every visitor's IP to a
// third party and put a four-hop request chain (HTML -> CSS -> Google CSS -> font
// files) in front of first paint.
import '@fontsource-variable/inter';
import '@fontsource-variable/outfit';
import '@fontsource-variable/jetbrains-mono';
// Latin subsets only: the UI is English, and the full set ships 20 extra
// subset files (cyrillic, greek, vietnamese) that no visitor here will request.
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';

import './index.css';
import App from './App.jsx';
import { tidyStoredData } from './utils/location';

// Before anything reads storage, tidy away what older versions kept that this one
// would not: a name for every place ever located, and exact positions
tidyStoredData();

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Luna Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#f8fafc', background: '#04060d', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#818cf8' }}>Something went wrong loading Luna</h2>
          <pre style={{ maxWidth: '600px', background: '#0d1022', padding: '1rem', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', overflowX: 'auto', textAlign: 'left' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1.5rem', padding: '0.5rem 1.25rem', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
