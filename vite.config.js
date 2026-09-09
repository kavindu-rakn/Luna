import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages cannot set response headers, so the policy has to ride in the
// document. It is injected at build time only: in dev it would block Vite's HMR
// websocket and the module graph it serves from source.
//
// frame-ancestors is deliberately absent: browsers ignore it when it arrives via
// <meta>, and leaving it in only logs a console error. Clickjacking protection
// needs a real response header, so it belongs in a _headers file if this ever
// moves off GitHub Pages.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "script-src 'self'",
  // React writes element.style through the CSSOM, which CSP does not govern, but
  // Three.js and drei inject <style> elements at runtime.
  "style-src 'self' 'unsafe-inline'",
  // drei/troika embeds a fallback font as a data: URI inside the bundle
  "font-src 'self' data:",
  // data: covers the inline SVG noise texture; blob: covers canvas-derived textures
  "img-src 'self' data: blob:",
  // The only third party we talk to is the reverse geocoder
  "connect-src 'self' https://nominatim.openstreetmap.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join('; ')

const injectCsp = () => ({
  name: 'luna-inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`
    )
  }
})

export default defineConfig({
  base: '/Luna/',
  plugins: [react(), injectCsp()],
})
