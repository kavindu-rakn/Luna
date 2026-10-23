import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, minifySync, runnerImport } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolveSiteUrl } from './scripts/site-url.js'
import { paintNow } from './src/shell/paintNow.js'
import { guessPlace } from './src/shell/guessPlace.js'
import { startIntro } from './src/shell/intro.js'
import { ZONES } from './src/shell/zones.js'
import pkg from './package.json' with { type: 'json' }

// Where this build will be published, and so the path its files are served from.
// With nothing set it is the GitHub Pages site at /Luna/; see scripts/site-url.js
// for SITE_URL and the hosts recognised automatically.
const SITE_URL = resolveSiteUrl(process.env, pkg.homepage)

// Luna's own address, bare or with a shared view's query string: what the service
// worker answers with the app (navigateFallbackAllowlist below)
const escapeRegExp = (text) => text.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&')
const APP_ADDRESS = new RegExp('^' + escapeRegExp(SITE_URL.pathname) + '(?:index\\.html)?(?:\\?.*)?$')

// The policy rides in the document as a <meta> tag, so it holds on any host. It is
// injected at build time only: in dev it would block Vite's HMR websocket and the
// module graph it serves from source. The two inline scripts, the intro's in the
// head and the shell's guessPlace and paintNow, are allowed by their hashes, which
// change whenever the scripts do.
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

// Before the first paint, a first visit's place is guessed from the device's time
// zone (decision I3) and left for the app to start from (utils/location.js)
const guessScript = `window.__lunaGuess=(${guessPlace.toString()})(${JSON.stringify(ZONES)})`

// The intro (decision I1) is decided in the head, before anything paints
const introScript = `(${startIntro.toString()})(window,document)`

// The build's own render of the app (src/entry-server.jsx), in Node
const importServerEntry = async (config) => (await runnerImport(fileURLToPath(new URL('./src/entry-server.jsx', import.meta.url)), {
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
})).module

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
        const module = await importServerEntry(config)
        // The flat Moon's photograph goes inline, so the first frame paints it
        // without waiting on another request. It is that frame's largest paint.
        const disc = fs.readFileSync(fileURLToPath(new URL('./public/moon-disc.webp', import.meta.url)))
        const shell = module.renderShell()
          .replaceAll(`href="${config.base}moon-disc.webp"`, `href="data:image/webp;base64,${disc.toString('base64')}"`)

        // The app's own module script stays as Vite writes it. Loading it from here
        // after the first paint was tried: it only moved the app's start-up work
        // into the window Lighthouse counts as blocking time, and the largest paint
        // didn't move.
        const script = minifySync('paint-now.js', `${guessScript};(${paintNow.toString()})(window,document,window.__lunaGuess)`).code.trim()
        const intro = minifySync('intro.js', introScript).code.trim()
        const hashes = [script, intro].map((code) => createHash('sha256').update(code).digest('base64'))

        html = html.replace('<div id="root"></div>', `<div id="root">${shell}</div>\n    <script>${script}</script>`)
        html = html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(hashes)}" />\n    <script>${intro}</script>`
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
        html = html.replace('</head>', `  ${fonts.join('\n    ')}\n  </head>`)

        // index.html's comments are for whoever reads the source, not for every
        // visitor to download (React's empty separators stay). The page has to stay
        // under about 43 KB for Lighthouse's mobile run to fetch it in two round trips.
        return html.replace(/<!--(?!\s*-->)[\s\S]*?-->/g, '')
      }
    }
  }
}

// The app's stylesheet is inlined into the page and dropped from the output
// (luna-shell), but Vite still lists it among the files a lazy chunk that imports
// from the entry loads first, and one missing file fails the whole import. On
// Vercel that kept the meteor showers' code from ever reaching the sky (6b), and
// the main-thread scene (Safari before 17) from loading at all. Once Vite has
// written those lists, each import stops asking for a stylesheet the output no
// longer has: it is on the page already. Vite's own preload filter can't do this,
// as it only sees JavaScript.
const lunaInlinedCss = () => ({
  name: 'luna-inlined-css',
  apply: 'build',
  generateBundle: {
    order: 'post',
    handler(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        const list = chunk.code.match(/__vite__mapDeps=\(i,m=__vite__mapDeps,d=\(m\.f\|\|\(m\.f=(\[[^\]]*\])/)?.[1]
        if (!list) continue
        const gone = new Set()
        JSON.parse(list).forEach((file, i) => {
          if (file.endsWith('.css') && !bundle[file]) gone.add(i)
        })
        if (!gone.size) continue
        chunk.code = chunk.code.replace(/__vite__mapDeps\(\[([\d,]*)\]\)/g, (call, ids) => {
          const kept = ids.split(',').filter((id) => !gone.has(Number(id)))
          return kept.length ? `__vite__mapDeps([${kept.join(',')}])` : '[]'
        })
      }
    }
  }
})

// The branded 404 (Phase 5b): any address that isn't Luna gets a static page in
// Luna's own look, with no JavaScript, rendered from src/shell/NotFound.jsx with its
// stylesheet inlined. Vercel serves 404.html for any path it has no file for. It
// sets its type in the faces the app uses, from the app's own font files.
const lunaNotFound = () => {
  let config
  return {
    name: 'luna-not-found',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    async generateBundle(_, bundle) {
      const module = await importServerEntry(config)
      const faces = [
        ['Cormorant Garamond', '400', /cormorant-garamond-latin-400-normal-[\w-]+\.woff2$/],
        ['Cormorant Garamond', '600', /cormorant-garamond-latin-600-normal-[\w-]+\.woff2$/],
        ['Inter Variable', '100 900', /inter-latin-wght-normal-[\w-]+\.woff2$/]
      ].map(([family, weight, pattern]) => {
        const file = Object.keys(bundle).find((name) => pattern.test(name))
        return file
          ? `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(${config.base}${file}) format('woff2')}`
          : ''
      }).join('')
      const css = fs.readFileSync(fileURLToPath(new URL('./src/shell/notFound.css', import.meta.url)), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim()
      const policy = "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'"
      const source = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta http-equiv="Content-Security-Policy" content="${policy}" />
<meta name="robots" content="noindex" />
<meta name="theme-color" content="#060910" />
<link rel="icon" type="image/png" sizes="32x32" href="${config.base}luna-favicon-32.png" />
<title>Lost in the dark · Luna</title>
<style>${faces}${css}</style>
</head>
<body>${module.renderNotFound(config.base)}</body>
</html>
`
      this.emitFile({ type: 'asset', fileName: '404.html', source })
    }
  }
}

// The dev server serves no shell to paint, but the app still starts from the guess,
// and the intro still plays
const lunaGuessInDev = () => ({
  name: 'luna-guess-dev',
  apply: 'serve',
  transformIndexHtml: (html) => html
    .replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <script>${introScript}</script>`)
    .replace('<div id="root"></div>', `<div id="root"></div>\n    <script>${guessScript}</script>`)
})

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
    lunaInlinedCss(),
    lunaNotFound(),
    lunaGuessInDev(),
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
        // the 3D engine, its texture decoder, the 2K Moon textures and the star
        // catalogue (30 KB) are precached: the Moon and its sky should still render
        // on a hillside with no signal. Most of that is nearly free, since the page
        // downloaded it moments earlier and the install is served from the HTTP
        // cache. woff2 only; every browser with service workers reads it.
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,webmanifest,wasm,ktx2,bin}'],
        // The first cut precached 3.1 MB, much of it never used by the page at all.
        // These are left out rather than forced onto a first visit over mobile data:
        globIgnores: [
          // only social-media crawlers request the share card
          'og-card.png',
          // the 404 is the server's answer to an address that isn't Luna; no
          // route in the worker ever serves it
          '404.html',
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
          // the 4K colour map is for large screens only, and the JPEG textures for
          // browsers that can't decode KTX2; each is cached the first time it's used
          'assets/textures/moon-color-4k.ktx2',
          'assets/textures/*.jpg'
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/textures\/[^/]+\.(ktx2|jpg)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'luna-textures',
              expiration: { maxEntries: 8 }
            }
          }
        ],
        // Hashed filenames make old precache entries unreachable after an update
        cleanupOutdatedCaches: true,
        // Any navigation to Luna, including shared links carrying ?d=&at=, gets the
        // shell. Only to Luna's own address: any other path goes to the server,
        // which answers with the branded 404 rather than the app at a wrong address.
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [APP_ADDRESS]
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
  // The scene's worker (src/scene/worker.js) is a module worker. Its bundle holds
  // three.js, which it loads and runs off the main thread.
  worker: {
    format: 'es'
  },
  build: {
    // The 3D chunks are three.js itself, around 600 KB, once in the scene's worker
    // and once for the main thread where workers can't draw. They are meant to be
    // large and load after first paint. Keeping the warning at the default would
    // fire on every build for known, intended chunks and teach people to ignore it.
    // The chunk that actually gates first paint has its own budget, enforced by
    // scripts/check-bundle.js in CI.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Name the 3D chunk for what it is. This touches only the file name, never
        // which modules go where: an earlier attempt used a codeSplitting group,
        // which by default also swallows each module's dependencies, pulled React
        // in with it, and left the entry statically importing all of three.js
        // again. Composition stays with rolldown's automatic split.
        chunkFileNames: (chunk) =>
          chunk.moduleIds?.some((id) => /node_modules[\\/]three[\\/]/.test(id))
            ? 'assets/three-vendor-[hash].js'
            : 'assets/[name]-[hash].js'
      }
    }
  }
})
