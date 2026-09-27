import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { defineConfig, minifySync, runnerImport } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolveSiteUrl } from './scripts/site-url.js'
import { paintNow } from './src/shell/paintNow.js'
import pkg from './package.json' with { type: 'json' }

// Where this build will be published, and so the path its files are served from.
// With nothing set it is the GitHub Pages site at /Luna/; see scripts/site-url.js
// for SITE_URL and the hosts recognised automatically.
const SITE_URL = resolveSiteUrl(process.env, pkg.homepage)

// The policy rides in the document as a <meta> tag, so it holds on any host. It is
// injected at build time only: in dev it would block Vite's HMR websocket and the
// module graph it serves from source. The one inline script, the shell's
// paintNow, is allowed by its hash, which changes whenever the script does.
//
// frame-ancestors is deliberately absent: browsers ignore it when it arrives via
// <meta>, and leaving it in only logs a console error. Clickjacking protection
// needs a real response header, which vercel.json sends.
const contentSecurityPolicy = (scriptHashes) => [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  ["script-src 'self'", ...scriptHashes.map((hash) => `'sha256-${hash}'`)].join(' '),
  // React writes element.style through the CSSOM, which CSP does not govern, but
  // the inlined stylesheet, Three.js and drei all need inline <style>.
  "style-src 'self' 'unsafe-inline'",
  // drei/troika embeds a fallback font as a data: URI inside the bundle
  "font-src 'self' data:",
  // data: covers the SVG chevron in the calendar's month and year pickers; blob:
  // covers canvas-derived textures
  "img-src 'self' data: blob:",
  // The only third party we talk to is the reverse geocoder
  "connect-src 'self' https://nominatim.openstreetmap.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join('; ')

// Paint before JavaScript. The build renders the app's first frame to HTML (see
// src/entry-server.jsx) and puts it in the page, with a small inline script that
// brings the date, phase and Moon up to today before the first paint, and the
// stylesheet inlined so nothing blocks rendering. The fonts that first frame sets
// in are preloaded. main.jsx then replaces the markup with the live app.
const lunaShell = () => {
  let config
  return {
    name: 'luna-shell',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html, ctx) {
        const { module } = await runnerImport(fileURLToPath(new URL('./src/entry-server.jsx', import.meta.url)), {
          configFile: false,
          root: config.root,
          base: config.base,
          mode: config.mode,
          logLevel: 'error',
          plugins: [react()],
          resolve: {
            alias: {
              // The PWA plugin's virtual module only exists in the real build
              'virtual:pwa-register/react': fileURLToPath(new URL('./src/shell/pwaRegisterStub.js', import.meta.url))
            }
          }
        })
        const shell = module.renderShell()

        const script = minifySync('paint-now.js', `(${paintNow.toString()})(window,document)`).code.trim()
        const hash = createHash('sha256').update(script).digest('base64')

        html = html.replace('<div id="root"></div>', `<div id="root">${shell}</div>\n    <script>${script}</script>`)
        html = html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy([hash])}" />`
        )

        // One stylesheet, inlined: a separate file would hold up the first paint
        // for another round trip. It is dropped from the output, so the service
        // worker doesn't precache a file nothing asks for.
        html = html.replace(/<link rel="stylesheet"[^>]*?href="([^"]+\.css)"[^>]*>/g, (tag, href) => {
          const fileName = href.startsWith(config.base) ? href.slice(config.base.length) : href.replace(/^\//, '')
          const asset = ctx.bundle?.[fileName]
          if (!asset || asset.type !== 'asset') return tag
          const css = typeof asset.source === 'string' ? asset.source : Buffer.from(asset.source).toString('utf8')
          delete ctx.bundle[fileName]
          return `<style>${css}</style>`
        })

        // The serif the phase name, date and wordmark are set in. Inter is left to
        // load on its own: at the sizes it appears in the first frame, a moment in
        // a fallback face costs nothing.
        const fonts = Object.keys(ctx.bundle ?? {})
          .filter((file) => /cormorant-garamond-latin-(400|600)-normal-[\w-]+\.woff2$/.test(file))
          .map((file) => `<link rel="preload" as="font" type="font/woff2" href="${config.base}${file}" crossorigin>`)
        return html.replace('</head>', `  ${fonts.join('\n    ')}\n  </head>`)
      }
    }
  }
}

// Social cards need absolute URLs, so index.html carries __SITE_URL__ placeholders,
// filled in here for dev and builds alike
const injectSiteUrl = () => ({
  name: 'luna-site-url',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL.href)
})

export default defineConfig({
  base: SITE_URL.pathname,
  plugins: [
    react(),
    lunaShell(),
    injectSiteUrl(),
    VitePWA({
      // A new version waits for the viewer to accept it (see UpdatePrompt). The
      // alternative reloads the page the moment an update activates, which can land
      // mid-scrub, and deletes the old version's files while an open tab may still
      // be about to request one of its lazy chunks.
      registerType: 'prompt',
      // Registered from React, so the update notice can be part of the UI. An
      // injected inline script would also be refused by the CSP.
      injectRegister: false,
      manifest: {
        // The installed app's name, shown under its icon and in the Start menu
        name: 'Luna',
        short_name: 'Luna',
        description: 'Moon phases, rise and set times, and the lunar cycle for any place on Earth. Works offline.',
        theme_color: '#060910',
        background_color: '#060910',
        display: 'standalone',
        orientation: 'any',
        icons: [
          // Named luna-* so no install surface can match them to the retired
          // violet icons, which Safari still holds under the old names
          { src: 'luna-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'luna-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'luna-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      // Manifest icons are fetched by the OS at install time, not by the page
      includeManifestIcons: false,
      workbox: {
        // Everything Luna needs is static and computed on the device, so the app,
        // the 3D engine and the Moon texture are precached: the Moon should still
        // render on a hillside with no signal. Most of that is nearly free, since the
        // page downloaded it moments earlier and the install is served from the HTTP
        // cache. woff2 only; every browser with service workers reads it.
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,webmanifest}'],
        // The first cut precached 3.1 MB, much of it never used by the page at all.
        // These are left out rather than forced onto a first visit over mobile data:
        globIgnores: [
          // only social-media crawlers request the share card
          'og-card.png',
          // install icons are fetched by the OS, not the page
          'luna-icon-512.png',
          'luna-icon-maskable-512.png',
          'luna-touch-icon.png',
          // the UI is written in Latin script. A place name in another script
          // downloads its subset on demand via unicode-range, and offline those few
          // glyphs fall back to a system font rather than failing
          '**/*-cyrillic-*.woff2',
          '**/*-cyrillic-ext-*.woff2',
          '**/*-greek-*.woff2',
          '**/*-greek-ext-*.woff2',
          '**/*-vietnamese-*.woff2',
          // only the orbit diagram uses this; cached on first use instead, below
          'assets/textures/earth_atmos_2048.jpg'
        ],
        runtimeCaching: [
          {
            // The Earth texture is cached the first time the drawer opens, so the
            // orbit diagram works offline for anyone who has seen it once
            urlPattern: ({ url }) => url.pathname.endsWith('/earth_atmos_2048.jpg'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'luna-textures',
              expiration: { maxEntries: 4 }
            }
          }
        ],
        // Hashed filenames make old precache entries unreachable after an update
        cleanupOutdatedCaches: true,
        // Any navigation, including shared links carrying ?d=&at=, gets the shell
        navigateFallback: 'index.html'
        // Place search is deliberately not cached: results go stale, Nominatim's
        // policy discourages it, and offline the picker already says it cannot reach
        // the search. Saved places still work, since their timezone resolves locally.
      },
      devOptions: {
        // A service worker in development serves stale modules and hides edits
        enabled: false
      }
    })
  ],
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
