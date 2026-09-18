/**
 * Headless screenshot harness.
 *
 * Claude cannot see the game. This closes that gap: it boots the built game in
 * headless Chromium, drives it with scripted key presses, captures frames and
 * reports any console errors. A screenshot of the running game is worth more
 * than any amount of reasoning about whether the draw order is right.
 *
 * Usage:
 *   npm run build
 *   node tools/shoot.mjs            # menu + each chapter
 *   node tools/shoot.mjs --hold 4   # drive for 4s before the action shot
 *
 * Output lands in tools/shots/.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const outDir = fileURLToPath(new URL('./shots', import.meta.url));
const holdSeconds = Number(process.argv.includes('--hold')
  ? process.argv[process.argv.indexOf('--hold') + 1]
  : 2.5);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
await mkdir(outDir, { recursive: true });

// PLAYWRIGHT_CHROMIUM lets a sandbox point at a pre-installed browser whose
// build number does not match the installed playwright package.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM }
    : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: join(outDir, '00-menu.png') });

// Walk each chapter: select it, drive for a moment, capture.
for (let index = 0; index < 3; index += 1) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  for (let step = 0; step < index; step += 1) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(120);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, `0${index + 1}a-chapter-${index + 1}-start.png`) });

  // Hold a direction so the shot shows the robot mid-building, not on spawn.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(holdSeconds * 1000);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, `0${index + 1}b-chapter-${index + 1}-moved.png`) });
}

await browser.close();
server.close();

if (errors.length) {
  console.error(`\n${errors.length} console error(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`\nOK — shots in tools/shots/, no console errors.`);
