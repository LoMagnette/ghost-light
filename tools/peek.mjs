/**
 * Look at one frame of the game, anywhere, with anything held down.
 *
 * `shoot.mjs` drives a fixed tour — the menu and each chapter — and is the
 * regression check. This is the opposite: an arbitrary URL, an arbitrary set
 * of held keys, an arbitrary wait, and a PNG. It exists because the agent
 * cannot see the game, and almost every visual question is about a specific
 * square metre of a 126 m building rather than about the tour.
 *
 * It earned its keep on the room numbers, where three separate facts about
 * this renderer — the fixed south-west view, `MAX_DRAWN_HEIGHT`, and a key
 * light that is nearly overhead — each silently ruined a different design,
 * and each was obvious in one frame and invisible in the code.
 *
 * Usage, after `npm run build`:
 *
 *   node tools/peek.mjs '[["name", "?chapter=silence&at=-21.8,-8", ["KeyW"], 1.6]]'
 *                          ^ file    ^ query                        ^ held   ^ seconds
 *
 * PEEK_DIR sets where the PNGs land; it defaults to the system temp dir,
 * because these are working frames and do not belong in the repository.
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const dir = process.env.PEEK_DIR ?? tmpdir();
const shots = JSON.parse(process.argv[2] ?? '[]');

if (shots.length === 0) {
  console.error('nothing to shoot. See the usage note at the top of this file.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
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

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

for (const [name, query, keys = [], hold = 0.6] of shots) {
  await page.goto(`http://localhost:${port}/${query}`);
  // Long enough for the first frame and the chapter's geometry to be built.
  await page.waitForTimeout(900);
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(hold * 1000);
  for (const key of keys) await page.keyboard.up(key);
  // Let the camera settle after the keys come up, or every action shot is
  // taken mid-lerp and nothing is where the simulation says it is.
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(dir, `${name}.png`) });
  console.log(`  ${join(dir, `${name}.png`)}`);
}

console.log(errors.length ? `\nconsole errors:\n${errors.join('\n')}` : '\nno console errors');
await browser.close();
server.close();
