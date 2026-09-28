/**
 * Crowd check — does the crowd spread over the floor, or pile up somewhere?
 *
 * 28 Sep: the author saw people knotting in the top-right corners of the
 * exhibition hall and the reception. Nothing in a screenshot of elsewhere
 * shows that, and a single screenshot of the corner is one moment, not a
 * tendency. So this walks a full crowd for ten simulated minutes, four times over,
 * counts where everybody on their feet stands once a second, and holds each
 * public room's busiest cells against its average. A room where one cell
 * sees many times its share has a knot in it.
 *
 * Same no-browser trick as objectives.mjs.
 *
 *   npm run crowd            the table
 *   npm run crowd -- --map   and an occupancy map of each room
 *   SEED=2 AROUND=-5,-43 npm run crowd   one crowd, and who stands where near
 *                                        a spot (digits: people on a cell;
 *                                        letters: people off the plan)
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'devoxx-crowd-'));

writeFileSync(
  join(out, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'es2022', module: 'commonjs', moduleResolution: 'node',
      strict: true, skipLibCheck: true, noEmit: false,
      outDir: out, rootDir: join(repo, 'src'), baseUrl: repo,
      paths: { '@/*': ['src/*'] },
    },
    files: [join(repo, 'src/chapters/registry.ts'), join(repo, 'src/core/Crowd.ts')],
  }),
);

try {
  execFileSync(process.execPath, [join(repo, 'node_modules/typescript/bin/tsc'), '-p', join(out, 'tsconfig.json')], {
    stdio: 'inherit',
  });
} catch {
  console.error('tsc failed — fix the type errors before checking the crowd.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? join(out, request.slice(2)) : request, ...rest);
};

const { KINEPOLIS } = await import(pathToFileURL(join(out, 'venue/kinepolis.js')));
const { Crowd } = await import(pathToFileURL(join(out, 'core/Crowd.js')));
rmSync(out, { recursive: true, force: true });

const MAP = process.argv.includes('--map');
/** Counting cell, metres. Coarser than a person, finer than a knot. */
const BIN = 2;
const MINUTES = 10;
/** Worst cell against the room's average cell. Uniform would be about 2–3. */
const KNOT = 5;

// Full capacity and every room in use: the busiest the game ever is. Four
// crowds from four seeds, pooled, because one crowd is one set of dice and a
// knot that turns up on one seed only is still a knot somebody will see.
const SEEDS = process.env.SEED ? [Number(process.env.SEED)] : [0x5eed, 1, 2, 3];
const rooms = KINEPOLIS.rooms.filter((r) => ['hall', 'reception', 'forecourt', 'corridor', 'foyer'].includes(r.id));
const counts = new Map(rooms.map((r) => [r.id, new Map()]));
let crowd;

for (const seed of SEEDS) {
  crowd = new Crowd(KINEPOLIS, 1, [], [], seed);
  // Let the starting scatter wash out before counting.
  for (let t = 0; t < 60; t += 1) crowd.advance(1, []);

  for (let t = 0; t < MINUTES * 60; t += 1) {
    crowd.advance(1, []);
    for (const p of crowd.movers) {
      const room = rooms.find((r) => r.floor === p.floor && inside(r.bounds, p.x, p.y));
      if (!room) continue;
      const key = `${Math.floor((p.x - room.bounds.x) / BIN)},${Math.floor((p.y - room.bounds.y) / BIN)}`;
      const m = counts.get(room.id);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
  }
}

function inside(b, x, y) {
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

let knots = 0;
for (const room of rooms) {
  const m = counts.get(room.id);
  const cells = [...m.entries()].sort((a, b) => b[1] - a[1]);
  if (cells.length === 0) continue;
  const total = cells.reduce((n, [, c]) => n + c, 0);
  const mean = total / cells.length;
  const [key, worst] = cells[0];
  const [ix, iy] = key.split(',').map(Number);
  const ratio = worst / mean;
  const flag = ratio >= KNOT ? '✗' : '✓';
  if (ratio >= KNOT) knots += 1;
  const x = room.bounds.x + (ix + 0.5) * BIN;
  const y = room.bounds.y + (iy + 0.5) * BIN;
  const top10 = cells.slice(0, Math.ceil(cells.length / 10)).reduce((n, [, c]) => n + c, 0) / total;
  console.log(
    `${flag} ${room.label.padEnd(16)} ${String(Math.round(total / (MINUTES * 60 * SEEDS.length))).padStart(4)} on their feet · ` +
      `worst cell ${ratio.toFixed(1)}× average at (${x.toFixed(0)}, ${y.toFixed(0)}) · busiest tenth holds ${(top10 * 100).toFixed(0)}%`,
  );
  if (MAP) printMap(room, m, mean);
}

/** Crowd.ts's own cell key. Copied, not imported: it is private there. */
function pack(gx, gy) {
  return (gx + 512) * 4096 + (gy + 512);
}

function walkable(floor, x, y) {
  // The crowd's own 1.5 m plan, read out of the instance: the only honest
  // answer to where a person may walk is the one the walkers use.
  const plan = crowd.plans.get(floor);
  return plan?.cells.has(pack(Math.floor(x / 1.5), Math.floor(y / 1.5))) ?? false;
}

/** North up, east right, one character per BIN. ' .:-=+*#%@' by multiple of average. */
function printMap(room, m, mean) {
  const ramp = ' .:-=+*#%@';
  const w = Math.ceil(room.bounds.w / BIN);
  const h = Math.ceil(room.bounds.h / BIN);
  for (let iy = h - 1; iy >= 0; iy -= 1) {
    let line = '    ';
    for (let ix = 0; ix < w; ix += 1) {
      const c = m.get(`${ix},${iy}`) ?? 0;
      const x = room.bounds.x + (ix + 0.5) * BIN;
      const y = room.bounds.y + (iy + 0.5) * BIN;
      // Where nobody can stand at all: a solid, a seat bank, a wall.
      if (!c && !walkable(room.floor, x, y)) {
        line += '▒';
        continue;
      }
      line += ramp[Math.min(ramp.length - 1, Math.round((c / mean) * 2))];
    }
    console.log(line);
  }
}

if (process.env.AROUND) {
  const [ax, ay] = process.env.AROUND.split(',').map(Number);
  const plan = crowd.plans.get(0);
  for (let gy = Math.floor(ay / 1.5) + 5; gy >= Math.floor(ay / 1.5) - 5; gy -= 1) {
    let line = '';
    for (let gx = Math.floor(ax / 1.5) - 8; gx <= Math.floor(ax / 1.5) + 8; gx += 1) {
      const here = crowd.movers.filter((p) => p.floor === 0 && Math.floor(p.x / 1.5) === gx && Math.floor(p.y / 1.5) === gy).length;
      line += plan.cells.has(pack(gx, gy)) ? (here ? String(Math.min(9, here)) : '.') : here ? String.fromCharCode(96 + Math.min(26, here)) : '#';
    }
    console.log(line);
  }
}

if (knots) {
  console.error(`\n${knots} room(s) with a knot in: a cell at ${KNOT}× its room's average or more.`);
  process.exit(1);
}
console.log('\nOK — nobody is piling up anywhere.\n');
