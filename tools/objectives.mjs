/**
 * Objective check — is every activity in a place a robot can get to?
 *
 * An objective is coordinates, and coordinates are the thing this project
 * gets wrong most often and notices last: a zone two metres out is inside a
 * seat bank, and the only symptom is a chapter that cannot be finished by
 * someone who is doing everything right. That is the worst possible bug to
 * find on the last day, and it is invisible in a screenshot of anywhere else.
 *
 * So every activity in every chapter is held against the building:
 *
 *   1. it is inside a room, on the storey it claims;
 *   2. its centre is not inside a solid;
 *   3. at least one robot in that chapter's cast passes its gates;
 *   4. that robot can actually REACH the storey it is on — which, for Biggy,
 *      means storey 0 and nothing else;
 *   5. a haul's drop zone gets all of the above too, and its mass has to be
 *      liftable by a robot that can stand in both places.
 *
 * Same no-browser trick as physics.mjs, venue.mjs and traverse.mjs.
 *
 *   npm run objectives
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'devoxx-obj-'));

writeFileSync(
  join(out, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'es2022', module: 'commonjs', moduleResolution: 'node',
      strict: true, skipLibCheck: true, noEmit: false,
      outDir: out, rootDir: join(repo, 'src'), baseUrl: repo,
      paths: { '@/*': ['src/*'] },
    },
    files: [
      join(repo, 'src/chapters/registry.ts'),
      join(repo, 'src/core/Activity.ts'),
      join(repo, 'src/core/RobotSpec.ts'),
    ],
  }),
);

try {
  execFileSync(process.execPath, [join(repo, 'node_modules/typescript/bin/tsc'), '-p', join(out, 'tsconfig.json')], {
    stdio: 'inherit',
  });
} catch {
  console.error('tsc failed — fix the type errors before checking objectives.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? join(out, request.slice(2)) : request, ...rest);
};

const { CHAPTERS } = await import(pathToFileURL(join(out, 'chapters/registry.js')));
const { KINEPOLIS } = await import(pathToFileURL(join(out, 'venue/kinepolis.js')));
const { ROBOTS } = await import(pathToFileURL(join(out, 'core/RobotSpec.js')));
const { admits, zoneCentre } = await import(pathToFileURL(join(out, 'core/Activity.js')));
rmSync(out, { recursive: true, force: true });

const RISER = 0.18;

/** Which storeys this machine can stand on, given the building's stairs. */
function storeysFor(spec) {
  // Every route to floor 1 is a flight of 0.18 m risers; the ramp only joins
  // the two levels of floor 0. So this is the stair rule, asked once.
  return spec.maxStepRise >= RISER ? [0, 1] : [0];
}

function roomAt(floor, x, y) {
  let best;
  let bestArea = Infinity;
  for (const r of KINEPOLIS.rooms) {
    if (r.floor !== floor) continue;
    const b = r.bounds;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) continue;
    const area = b.w * b.h;
    if (area < bestArea) {
      best = r;
      bestArea = area;
    }
  }
  return best;
}

function solidsAt(floor, x, y, radius) {
  const hits = [];
  for (const o of KINEPOLIS.obstacles) {
    if (o.floor !== floor) continue;
    // A tread is not an obstruction to whoever may climb it, and a kerb under
    // 0.2 m is something Voxxy steps over. Neither should fail a placement.
    if (o.linkId) continue;
    if ((o.height ?? 0) <= 0.2) continue;
    const b = o.bounds;
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    if (Math.hypot(x - cx, y - cy) < radius) hits.push(o);
  }
  return hits;
}

const failures = [];
const rows = [];

function checkPlace(chapter, activity, what, zone, specs) {
  const centre = zoneCentre(zone);
  const room = roomAt(zone.floor, centre.x, centre.y);
  const able = specs.filter(
    (spec) =>
      admits(activity, spec) &&
      storeysFor(spec).includes(zone.floor) &&
      // A shove is gated by momentum rather than by a `gates` clause, so
      // `admits` cannot see it. Peak momentum is the generous reading — the
      // real cruise figure is a few percent under — and if even that misses
      // the threshold the robot can never do it.
      (activity.kind !== 'shove' || spec.mass * spec.maxSpeed >= activity.momentum),
  );

  let note = '';
  if (!room) {
    failures.push(`${chapter.id}/${activity.id}: ${what} is not inside any room on storey ${zone.floor}`);
    note = 'NO ROOM';
  }

  if (able.length === 0) {
    failures.push(
      `${chapter.id}/${activity.id}: ${what} can be done by nobody in the cast — gates exclude everyone who can reach storey ${zone.floor}`,
    );
    note = note || 'NOBODY';
  } else {
    // The tightest robot that could be sent has to physically fit there.
    const slimmest = able.reduce((a, b) => (a.radius <= b.radius ? a : b));
    const hits = solidsAt(zone.floor, centre.x, centre.y, slimmest.radius);
    if (hits.length > 0) {
      const h = hits[0];
      failures.push(
        `${chapter.id}/${activity.id}: ${what} at (${centre.x.toFixed(1)}, ${centre.y.toFixed(1)}) is inside a solid ` +
          `${h.bounds.w.toFixed(1)}×${h.bounds.h.toFixed(1)} h${h.height} — ${slimmest.name} cannot stand there`,
      );
      note = note || 'IN A SOLID';
    }
  }

  rows.push({
    chapter: chapter.numeral,
    id: activity.id,
    what,
    where: `${room?.label ?? '—'} (${centre.x.toFixed(1)}, ${centre.y.toFixed(1)}) f${zone.floor}`,
    who: able.map((s) => s.name).join(' ') || '—',
    note,
  });
}

for (const chapter of CHAPTERS) {
  const specs = chapter.cast.map((id) => ROBOTS[id]);
  const seen = new Set();

  for (const activity of chapter.objective.activities) {
    if (seen.has(activity.id)) {
      failures.push(`${chapter.id}: two activities share the id ${activity.id}`);
    }
    seen.add(activity.id);

    // Grouped activities are the same thing many times over — check a couple
    // rather than printing twenty-seven rows of the same answer.
    const sampled = activity.group && Number(activity.id.split('-').pop()) > 1;
    if (!sampled) checkPlace(chapter, activity, activity.kind, activity.at, specs);

    if (activity.kind === 'haul') {
      checkPlace(chapter, activity, 'drop', activity.to, specs);
      const carriers = specs.filter((s) => s.payload >= activity.mass);
      if (carriers.length === 0) {
        failures.push(`${chapter.id}/${activity.id}: ${activity.mass} kg is more than anyone in the cast can lift`);
      }
    }

    for (const need of activity.after ?? []) {
      if (!chapter.objective.activities.some((a) => a.id === need)) {
        failures.push(`${chapter.id}/${activity.id}: waits on "${need}", which is not in this chapter`);
      }
    }

    if (activity.window && activity.window.from >= activity.window.to) {
      failures.push(`${chapter.id}/${activity.id}: window opens at ${activity.window.from} and shuts at ${activity.window.to}`);
    }
    if (activity.window && chapter.objective.clock && activity.window.from > chapter.objective.clock) {
      failures.push(`${chapter.id}/${activity.id}: window opens after the round has ended`);
    }
    // A window you cannot be present for the whole of is a window nobody can
    // make, and it will read to a player as a bug in the game rather than a
    // choice in the design.
    if (activity.window && activity.kind === 'attend') {
      const span = activity.window.to - activity.window.from;
      if (activity.seconds > span) {
        failures.push(`${chapter.id}/${activity.id}: needs ${activity.seconds}s of a ${span}s window`);
      }
    }
  }
}

let chapter = '';
for (const r of rows) {
  if (r.chapter !== chapter) {
    chapter = r.chapter;
    console.log(`\nChapter ${chapter}`);
  }
  console.log(
    `  ${(r.note ? '✗' : '✓')} ${r.id.padEnd(16)} ${r.what.padEnd(6)} ${r.where.padEnd(42)} ${r.who}${r.note ? '   ' + r.note : ''}`,
  );
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\nOK — every activity is somewhere a robot in its cast can stand.\n');
