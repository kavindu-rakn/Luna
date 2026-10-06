// Builds the site GitHub Pages serves once Luna has moved to Vercel: nothing but a
// forwarding address.
//
//   node scripts/pages-redirect.mjs https://luna-kvn.vercel.app/ [outDir]
//
// The deploy workflow runs this instead of the app build when the repository
// variable PAGES_REDIRECT_TO is set, so the cutover is one switch, flipped only
// once the new host is confirmed working.
//
// Two things have to keep working after the move:
//
//   - Links. Every shared view is a /Luna/?d=&at=&n=&tz= address. index.html and
//     404.html send any path, query and hash to the same view on the new origin.
//   - Installed and offline copies. Anyone who has opened Luna has a service
//     worker that answers /Luna/ from its cache without asking the network, so
//     a redirect page alone would never reach them. When that worker next checks
//     for an update it finds this sw.js instead, which takes over, empties the
//     caches, unregisters itself and sends every open Luna tab to the new home.

import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
const outDir = process.argv[3] || 'pages-redirect';

let base;
try {
  base = new URL(target);
  if (base.protocol !== 'https:') throw new Error('not https');
} catch {
  console.error('Usage: node scripts/pages-redirect.mjs https://new.host/ [outDir]');
  process.exit(1);
}
if (!base.pathname.endsWith('/')) base.pathname += '/';
const TARGET = base.href;

// The repository's Pages path, which the old addresses all start with
const OLD_PREFIX = '/Luna/';

// Shared by the page and the worker: the same view, on the new origin
const forward = `function (u) {
  var rest = u.pathname.indexOf(${JSON.stringify(OLD_PREFIX)}) === 0 ? u.pathname.slice(${OLD_PREFIX.length}) : u.pathname.replace(/^\\//, '');
  return ${JSON.stringify(TARGET)} + rest + u.search + u.hash;
}`;

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Luna has moved</title>
    <link rel="canonical" href="${TARGET}" />
    <meta http-equiv="refresh" content="2; url=${TARGET}" />
    <script>location.replace((${forward})(location));</script>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #060910; color: #eef1f7; font: 16px/1.5 system-ui, sans-serif; }
      a { color: #c2cff7; }
    </style>
  </head>
  <body>
    <p>Luna has moved to <a href="${TARGET}">${base.host}</a>.</p>
  </body>
</html>
`;

const worker = `// Retires the old offline copy of Luna. See scripts/pages-redirect.mjs.
var forward = ${forward};
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (key) { return caches.delete(key); }));
    await self.registration.unregister();
    var windows = await self.clients.matchAll({ type: 'window' });
    windows.forEach(function (client) { client.navigate(forward(new URL(client.url))); });
  })());
});
`;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), page);
fs.writeFileSync(path.join(outDir, '404.html'), page);
fs.writeFileSync(path.join(outDir, 'sw.js'), worker);
// Pages would otherwise run Jekyll over the folder, for no reason
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
console.log(`Redirect site for ${TARGET} written to ${outDir}/`);
