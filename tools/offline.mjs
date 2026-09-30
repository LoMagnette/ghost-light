/**
 * Offline harness: does the installed game really play with no network?
 *
 * A service worker fails quietly. A file left out of the precache is not an
 * error until someone opens that chapter on a train, and then it is a
 * missing track or a broken portrait with nobody watching the console. So
 * this does what that player does: it serves a build from a sub-path, as
 * GitHub Pages does (`/ghost-light/`), visits it once, waits for the worker
 * to finish storing everything, SHUTS THE SERVER DOWN, and then opens every
 * chapter and fetches every file the build emitted. Then the network comes
 * back with a new build on it, and the "update ready" notice must appear
 * and UPDATE must put the new worker in charge.
 *
 * Usage:
 *   npm run offline
 *
 * The build goes to `dist-offline/`, not `dist/`, because `peek` serves
 * `dist/` from the root and would break on a build made for a sub-path.
 * Fails on a console error, on a chapter that does not boot, or on any
 * emitted file the worker cannot answer offline.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist-offline', import.meta.url));
const outDir = fileURLToPath(new URL('./shots', import.meta.url));
const BASE = '/ghost-light/';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.map': 'application/json',
};

// Set for the last check: `sw.js` then reads as a new build's worker.
let newBuild = false;

const handler = async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(BASE)) throw new Error('outside the base');
    const rest = url.pathname.slice(BASE.length) || 'index.html';
    const file = join(root, normalize(rest).replace(/^(\.\.[/\\])+/, ''));
    let body = await readFile(file);
    if (newBuild && rest === 'sw.js') body = Buffer.concat([body, Buffer.from('\n// a new build\n')]);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
};
let server = createServer(handler);
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const origin = `http://localhost:${port}`;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  try {
    localStorage.setItem('ghost-light:intro-seen', '1');
  } catch {
    // No storage: the menu waits on the intro, which the checks below do not need.
  }
});
const page = await context.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const failures = [];

// The first visit, online. `ready` resolves once the worker is ACTIVE,
// which for a generated worker means its whole precache has been stored.
await page.goto(`${origin}${BASE}`, { waitUntil: 'load' });
const installed = await page.evaluate(async () => {
  const registration = await navigator.serviceWorker.ready;
  // Active is not yet in charge of THIS page: that takes the worker's
  // clients.claim(), a moment later.
  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  }
  const manifest = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
  return { scope: registration.scope, manifest };
});
console.log(`worker active, scope ${installed.scope}`);
if (!installed.scope.endsWith(BASE)) failures.push(`scope is ${installed.scope}, expected ${BASE}`);
for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) {
  if (!installed.manifest[key]) failures.push(`manifest has no ${key}`);
}
if (!installed.manifest.icons?.some((i) => i.sizes === '512x512' && i.purpose === 'maskable')) {
  failures.push('manifest has no 512 px maskable icon');
}

// The network goes.
await new Promise((resolve) => server.close(resolve));
server.closeAllConnections?.();

// Every file the build emitted that a player can need must come back
// offline: everything but source maps and the READMEs that sit beside the
// photographs for whoever adds the next one.
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (!/\.(map|md)$/.test(entry.name)) out.push(relative(root, path).split('\\').join('/'));
  }
  return out;
}
// The worker and its workbox runtime are kept by the browser as the
// worker's own script, not in the precache, so a page's fetch never finds
// them there; dotfiles (a Finder .DS_Store) are not in a CI build at all.
const files = (await walk(root)).filter((f) => !/(^|\/)(sw\.js|workbox-[^/]+\.js|\.[^/]+)$/.test(f));
const missing = await page.evaluate(
  async ({ base, files }) => {
    const out = [];
    for (const file of files) {
      try {
        const response = await fetch(base + file);
        if (!response.ok) out.push(`${file}: ${response.status}`);
      } catch {
        out.push(`${file}: no answer`);
      }
    }
    return out;
  },
  { base: BASE, files },
);
console.log(`${files.length - missing.length} of ${files.length} files served offline`);
failures.push(...missing.map((m) => `offline: ${m}`));

// And the game itself: every chapter boots from a cold, offline load.
for (const chapter of ['silence', 'javapolis', 'capacity', 'homecoming']) {
  errors.length = 0;
  try {
    await page.goto(`${origin}${BASE}?chapter=${chapter}&nointro`, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(outDir, `offline-${chapter}.png`) });
  } catch (error) {
    failures.push(`${chapter}: ${error.message.split('\n')[0]}`);
  }
  failures.push(...errors.map((e) => `${chapter}: ${e}`));
  console.log(`${chapter}: ${errors.length ? 'errors' : 'boots offline'}`);
}

// A new build is deployed and the network is back. A byte-different
// `sw.js` is all a browser needs to install a new worker; it then waits,
// and the notice says so.
newBuild = true;
server = createServer(handler);
await new Promise((resolve) => server.listen(port, resolve));
errors.length = 0;
try {
  await page.goto(`${origin}${BASE}?nointro`, { waitUntil: 'load' });
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  const notice = page.getByText('A new version of Ghost Light is ready.');
  await notice.waitFor({ timeout: 20000 });
  await page.screenshot({ path: join(outDir, 'offline-update-notice.png') });
  const before = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  await Promise.all([page.waitForEvent('framenavigated', { timeout: 20000 }), page.getByRole('button', { name: 'Update' }).click()]);
  await page.waitForLoadState('load');
  const after = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return { waiting: Boolean(registration.waiting), controlled: Boolean(navigator.serviceWorker.controller) };
  });
  if (!before) failures.push('update: the page was not controlled before updating');
  if (after.waiting || !after.controlled) failures.push(`update: after UPDATE, waiting=${after.waiting} controlled=${after.controlled}`);
  if (await page.getByText('A new version of Ghost Light is ready.').count()) failures.push('update: the notice is still up after the reload');
  console.log('update: notice shown, UPDATE took the new build');
} catch (error) {
  failures.push(`update: ${error.message.split('\n')[0]}`);
}
failures.push(...errors.map((e) => `update: ${e}`));
server.close();
server.closeAllConnections?.();

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\noffline: ok');
