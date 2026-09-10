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
  build: {
    // The 3D vendor chunk is Three.js itself, around 885 KB, and it is meant to be
    // large: it loads lazily behind the loading screen. Keeping the warning at the
    // default would fire on every build for a known, intended chunk and teach
    // people to ignore it. The chunk that actually gates first paint has its own
    // budget, enforced by scripts/check-bundle.mjs in CI.
    chunkSizeWarningLimit: 950,
    rolldownOptions: {
      output: {
        // Name the 3D chunk for what it is. This touches only the file name, never
        // which modules go where: an earlier attempt used a codeSplitting group,
        // which by default also swallows each module's dependencies, pulled React
        // in alongside fiber, and left the entry statically importing all of
        // Three.js again. Composition stays with rolldown's automatic split.
        chunkFileNames: (chunk) =>
          chunk.moduleIds?.some((id) => /node_modules[\\/]three[\\/]/.test(id))
            ? 'assets/three-vendor-[hash].js'
            : 'assets/[name]-[hash].js'
      }
    }
  }
})
