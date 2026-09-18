/**
 * Traversal check — who actually gets where.
 *
 * The stair rule reads well in one file and is decided across four: the riser
 * on a Link, `maxStepRise` on a RobotSpec, whether a tread collides in Sim,
 * and whether the surface is reachable from where the robot is standing. Any
 * one of them can be right while the behaviour is wrong, and the failure is
 * not an exception — it is Biggy quietly gliding up a staircase, or the
 * reception concourse silently sealed off from the hall.
 *
 * So this drives real robots at real links in the real Sim and asserts where
 * they end up. Same no-browser trick as physics.mjs and venue.mjs.
 *
 *   npm run traverse
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'devoxx-trav-'));

const tsconfig = join(out, 'tsconfig.json');
writeFileSync(
  tsconfig,
  JSON.stringify({
    compilerOptions: {
      target: 'es2022', module: 'commonjs', moduleResolution: 'node',
      strict: true, skipLibCheck: true, noEmit: false,
      outDir: out, rootDir: join(repo, 'src'), baseUrl: repo,
      paths: { '@/*': ['src/*'] },
    },
    files: [
      join(repo, 'src/venue/kinepolis.ts'),
      join(repo, 'src/core/Sim.ts'),
      join(repo, 'src/core/RobotSpec.ts'),
      join(repo, 'src/core/Traversal.ts'),
    ],
  }),
);

try {
  execFileSync(process.execPath, [join(repo, 'node_modules/typescript/bin/tsc'), '-p', tsconfig], {
    stdio: 'inherit',
  });
} catch {
  console.error('tsc failed — fix the type errors before checking traversal.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? join(out, request.slice(2)) : request, ...rest);
};

const { Body } = await import(pathToFileURL(join(out, 'core/Body.js')));
const { Sim, makeActor, FIXED_DT } = await import(pathToFileURL(join(out, 'core/Sim.js')));
const { ROBOTS } = await import(pathToFileURL(join(out, 'core/RobotSpec.js')));
const { KINEPOLIS } = await import(pathToFileURL(join(out, 'venue/kinepolis.js')));
rmSync(out, { recursive: true, force: true });

/** Drive one robot from a point in a fixed world direction, and report where it stopped. */
function drive(robotId, from, dir, seconds, floor = 0) {
  const sim = new Sim(KINEPOLIS);
  const body = new Body(ROBOTS[robotId], from.x, from.y);
  const actor = makeActor(body, floor);
  sim.add(actor);

  const mag = Math.hypot(dir.x, dir.y);
  Object.assign(actor.input, { dirX: dir.x / mag, dirY: dir.y / mag, throttle: 1, braking: false });

  let peakZ = 0;
  for (let t = 0; t < seconds; t += FIXED_DT) {
    sim.advance(FIXED_DT);
    peakZ = Math.max(peakZ, body.z);
  }
  return { x: body.x, y: body.y, z: body.z, floor: actor.floor, peakZ, onLink: actor.onLink };
}

const SOUTH = { x: 0, y: -1 };
const NORTH = { x: 0, y: 1 };

const failures = [];
const rows = [];
function scenario(label, expectation, run) {
  const r = run();
  const ok = expectation(r);
  rows.push({ label, r, ok });
  if (!ok) failures.push(label);
}

// The hall floor is the datum; the concourse stands 1.2 m above it.
const HALL = { x: 4.9, y: -15.35 };
const RAMP = { x: 16.5, y: -30 };
const STAIR_FOOT = { x: -8.5, y: 8.5 };

scenario(
  'Voxxy climbs the concourse steps',
  (r) => r.z > 1.1 && r.y < -39,
  () => drive('voxxy', HALL, SOUTH, 9),
);

scenario(
  'Droid climbs the concourse steps',
  (r) => r.z > 1.1 && r.y < -39,
  () => drive('droid', HALL, SOUTH, 14),
);

scenario(
  'Biggy is stopped by the concourse steps',
  (r) => r.z < 0.1 && r.y > -38.5,
  () => drive('biggy', HALL, SOUTH, 16),
);

// Checked on peakZ rather than final z: nothing bounds the building, so a
// robot held at full throttle long enough drives out of it and back down to
// zero. See the note at the end of this file.
scenario(
  'Biggy reaches the concourse by the ramp',
  (r) => r.peakZ > 1.1,
  () => drive('biggy', RAMP, SOUTH, 16),
);

scenario(
  'Voxxy climbs a full flight and arrives on floor 1',
  (r) => r.floor === 1 && r.peakZ > 6.0,
  () => drive('voxxy', STAIR_FOOT, SOUTH, 12),
);

scenario(
  'Biggy cannot use a full flight',
  (r) => r.floor === 0 && r.peakZ < 0.1,
  () => drive('biggy', STAIR_FOOT, SOUTH, 16),
);

// The one that is easy to get wrong: walking into the TOP of a flight from the
// floor below must be a wall, not a lift to the upper landing.
scenario(
  'Voxxy cannot board a flight at its top from below',
  (r) => r.floor === 0 && r.peakZ < 0.5,
  () => drive('voxxy', { x: -8.5, y: -14 }, NORTH, 8),
);

console.log('');
for (const { label, r, ok } of rows) {
  const where = `x ${r.x.toFixed(1)} y ${r.y.toFixed(1)} z ${r.z.toFixed(2)} floor ${r.floor}`;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(50)} ${where}`);
}

if (failures.length) {
  console.error(`\n${failures.length} traversal failure(s).`);
  process.exit(1);
}
// Not a failure, but the harness keeps walking robots through it: rooms are
// floor plates, not enclosures, so nothing stops a machine driving out of the
// building entirely. Perimeter walls are their own job.
const escapes = [
  drive('voxxy', HALL, SOUTH, 20),
  drive('voxxy', HALL, NORTH, 20),
];
if (escapes.some((r) => r.z === 0 && (r.y < -62 || r.y > 14))) {
  console.log('note: robots can still drive out of the building — no perimeter walls yet.');
}

console.log('\nOK — every robot goes where the stair rule says it should.\n');
