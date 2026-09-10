// First-paint budget. Run after `vite build`; exits non-zero on a regression.
//
// Three.js, fiber and drei are about 60% of Luna's JavaScript and are only needed
// by the two 3D scenes, so they load lazily behind the loading screen. That split
// is easy to lose without noticing, and in ways a size check alone would miss:
//
//   - one eager `import ... from 'three'` anywhere in the shell folds the whole
//     engine back into the entry chunk
//   - a chunking tweak can move a shared dependency such as React into the 3D
//     chunk, making the entry *smaller* while it now has to download all of
//     Three.js before it can run. This happened once, while renaming a chunk.
//
// So this checks the entry's size and also that nothing loads the 3D chunk eagerly.

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DIST = 'dist';
const ENTRY_GZIP_BUDGET_KB = 130;
const THREE_CHUNK = /three-vendor-[\w-]+\.js/;

const failures = [];
const notes = [];

const htmlPath = path.join(DIST, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('check-bundle: dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');

// Resolve /Luna/assets/index-abc.js to dist/assets/index-abc.js
const toDistPath = (href) => path.join(DIST, href.replace(/^.*?\/assets\//, 'assets/'));

const entryHref = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)?.[1];
if (!entryHref) {
  console.error('check-bundle: no module entry script in dist/index.html');
  process.exit(1);
}
const entryFile = toDistPath(entryHref);
const entry = fs.readFileSync(entryFile);
const entryText = entry.toString('utf8');

// 1. The entry chunk stays within budget
const entryGzipKb = zlib.gzipSync(entry, { level: 9 }).length / 1024;
notes.push(`entry ${path.basename(entryFile)}: ${(entry.length / 1024).toFixed(1)} KB raw, ${entryGzipKb.toFixed(1)} KB gzip (budget ${ENTRY_GZIP_BUDGET_KB} KB)`);
if (entryGzipKb > ENTRY_GZIP_BUDGET_KB) {
  failures.push(`entry chunk is ${entryGzipKb.toFixed(1)} KB gzip, over the ${ENTRY_GZIP_BUDGET_KB} KB budget`);
}

// 2. The 3D chunk exists at all. If it vanished, Three.js was folded into
//    something else, most likely the entry.
const assets = fs.readdirSync(path.join(DIST, 'assets'));
const threeChunk = assets.find((file) => THREE_CHUNK.test(file));
if (!threeChunk) {
  failures.push('no three-vendor chunk was emitted; Three.js may have been bundled into the entry');
} else {
  const size = fs.statSync(path.join(DIST, 'assets', threeChunk)).size / 1024;
  notes.push(`3D chunk ${threeChunk}: ${size.toFixed(1)} KB raw, loaded on demand`);
}

// 3. The document does not preload it
const preloads = [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
if (preloads.some((href) => THREE_CHUNK.test(href))) {
  failures.push('index.html modulepreloads the three-vendor chunk, so the browser fetches it on first load');
}

// 4. The entry does not import it statically. Only a dynamic import() keeps it lazy.
const staticImport = entryText.match(/(?:^|[;\s}])import\s*[^('"]*?from\s*["']\.\/(three-vendor-[\w-]+\.js)["']/)
  || entryText.match(/from\s*["']\.\/(three-vendor-[\w-]+\.js)["']/);
if (staticImport) {
  failures.push(`the entry chunk statically imports ${staticImport[1]}; Three.js is back on the critical path`);
}

for (const line of notes) console.log(`  ${line}`);
if (failures.length) {
  console.error('\nFirst-paint budget failed:');
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
console.log('\nFirst-paint budget met: the 3D engine loads lazily and the entry is within budget.');
