// Lighthouse, run the way every redesign phase is measured: the mobile and desktop
// presets, several runs each, reported as medians. One run is too noisy to compare
// against another.
//
//   npm run lighthouse -- https://luna-kvn.vercel.app/          (3 runs each)
//   npm run lighthouse -- http://localhost:4173/Luna/ --runs 5
//
// Measure a Vercel preview deployment where you can. `vite preview` serves without
// compression or caching headers, so local numbers run pessimistic.
//
// Lighthouse itself is fetched by npx rather than kept in devDependencies: it is
// large, and only needed when measuring. Reports land in .lighthouse/, which git
// ignores.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LIGHTHOUSE = 'lighthouse@13';
const OUT = '.lighthouse';

const args = process.argv.slice(2);
const url = args.find((arg) => /^https?:\/\//.test(arg));
const runsFlag = args.indexOf('--runs');
const runs = runsFlag >= 0 ? Math.max(1, Number(args[runsFlag + 1]) || 3) : 3;

if (!url) {
  console.error('Usage: npm run lighthouse -- <url> [--runs n]');
  process.exit(1);
}

// Each target gets its own folder, so measuring master and a branch side by side
// never mixes their reports
const target = new URL(url);
const dir = path.join(OUT, `${target.hostname}-${target.port || 'default'}${target.pathname.replace(/[^\w]+/g, '-')}`.replace(/-+$/, ''));
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const METRICS = [
  ['first-contentful-paint', 'First Contentful Paint', 'ms'],
  ['largest-contentful-paint', 'Largest Contentful Paint', 'ms'],
  ['total-blocking-time', 'Total Blocking Time', 'ms'],
  ['speed-index', 'Speed Index', 'ms'],
  ['cumulative-layout-shift', 'Cumulative Layout Shift', '']
];

const runOnce = (preset, index) => {
  const file = path.join(dir, `${preset}-${index + 1}.json`);
  const flags = [
    '-y', LIGHTHOUSE, url,
    '--quiet',
    '--output=json',
    `--output-path=${file}`,
    '--chrome-flags="--headless=new"'
  ];
  if (preset === 'desktop') flags.push('--preset=desktop');
  // The exit code alone can't be trusted: on Windows, Chrome's launcher often fails
  // to delete its temporary profile after a complete run and exits non-zero. A
  // written report without a runtime error is a good run.
  // One command string: npx needs a shell on Windows, and Node warns about
  // passing an argument list alongside shell: true
  spawnSync(`npx ${flags.join(' ')}`, { stdio: 'inherit', shell: true });
  const report = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!report || report.runtimeError) {
    throw new Error(`Lighthouse ${preset} run ${index + 1} failed${report?.runtimeError ? `: ${report.runtimeError.message}` : ''}`);
  }
  return report;
};

const summarise = (preset, reports) => {
  const categories = Object.keys(reports[0].categories);
  console.log(`\n${preset} (median of ${reports.length})`);
  for (const id of categories) {
    const scores = reports.map((r) => Math.round((r.categories[id]?.score ?? 0) * 100));
    console.log(`  ${reports[0].categories[id].title.padEnd(26)} ${String(median(scores)).padStart(4)}   runs: ${scores.join(', ')}`);
  }
  for (const [id, label, unit] of METRICS) {
    const values = reports.map((r) => r.audits[id]?.numericValue ?? NaN);
    const value = median(values);
    const shown = unit === 'ms' ? `${Math.round(value).toLocaleString('en-US')} ms` : value.toFixed(3);
    console.log(`  ${label.padEnd(26)} ${shown}`);
  }

  // What the largest paint was, and where the main thread went, from the middle run
  const middle = [...reports].sort((a, b) => a.categories.performance.score - b.categories.performance.score)[Math.floor(reports.length / 2)];
  // Lighthouse 13 reports the element in its LCP breakdown insight; older versions
  // had a dedicated audit
  const lcpNode = middle.audits['lcp-breakdown-insight']?.details?.items?.find((item) => item.type === 'node')
    ?? middle.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node;
  if (lcpNode) console.log(`  LCP element: ${lcpNode.snippet}`);
  const tasks = middle.audits['long-tasks']?.details?.items ?? [];
  if (tasks.length) {
    console.log('  Longest tasks:');
    for (const task of tasks.slice(0, 5)) {
      console.log(`    ${Math.round(task.duration)} ms  ${task.url}`);
    }
  }
};

for (const preset of ['mobile', 'desktop']) {
  const reports = [];
  for (let i = 0; i < runs; i++) {
    process.stdout.write(`Lighthouse ${preset} ${i + 1}/${runs}…\n`);
    reports.push(runOnce(preset, i));
  }
  summarise(preset, reports);
}
