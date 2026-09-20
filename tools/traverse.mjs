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
  let minZ = 0;
  for (let t = 0; t < seconds; t += FIXED_DT) {
    sim.advance(FIXED_DT);
    peakZ = Math.max(peakZ, body.z);
    minZ = Math.min(minZ, body.z);
  }
  return { x: body.x, y: body.y, z: body.z, floor: actor.floor, peakZ, minZ, onLink: actor.onLink };
}

const SOUTH = { x: 0, y: -1 };
const NORTH = { x: 0, y: 1 };
const EAST = { x: 1, y: 0 };

const failures = [];
const rows = [];
function scenario(label, expectation, run) {
  const r = run();
  const ok = expectation(r);
  rows.push({ label, r, ok });
  if (!ok) failures.push(label);
}

// The hall floor is the datum; the concourse stands 1.2 m above it.
const HALL = { x: 0, y: -24 };
const RAMP = { x: 16.5, y: -30 };
/*
 * Where to stand to meet the west flight, READ OFF THE FLIGHT.
 *
 * These were two hard-coded y values, and they were wrong the moment the
 * staircases moved to where the plan actually puts them — two column bays
 * further back. The harness then reported a robot at y -340073, which is the
 * collision solver ejecting something that started inside a solid: the test
 * was standing where the stairs now are.
 *
 * A test of the stair rule should not restate the building's coordinates. It
 * asks the venue where the flight is and stands at each end of it, so moving
 * a staircase is a change to one file rather than to two.
 */
const WEST_FLIGHT = KINEPOLIS.links.find((l) => l.id === 'stair-west');
/** Clear of either end, and more than a robot's own length away from it. */
const APPROACH = 2.2;
// `ascending: false` on a y axis: height falls as y rises, so the FOOT — the
// end at hall level — is the northern one, and the landing is south.
const STAIR_FOOT = { x: -6.0, y: WEST_FLIGHT.bounds.y + WEST_FLIGHT.bounds.h + APPROACH };
const STAIR_LANDING = { x: -6.0, y: WEST_FLIGHT.bounds.y - APPROACH };

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
  () => drive('voxxy', { x: -6.0, y: -26 }, NORTH, 8),
);

// Stairs are not a one-way valve, and this is the direction that was broken
// for as long as a link's heights were read from the floor it LEAVES: a robot
// standing on the landing measured its own height as 0 and the flight's as
// 6.2, so it drove over the stairwell as though the floor were solid.
scenario(
  'Voxxy walks back down and arrives on floor 0',
  (r) => r.floor === 0 && r.minZ < -1.0,
  () => drive('voxxy', STAIR_LANDING, NORTH, 12, 1),
);

scenario(
  'Biggy is stopped by the stairwell upstairs',
  // Never got into the well: still south of the flight's own southern edge.
  (r) => r.floor === 1 && r.y < WEST_FLIGHT.bounds.y,
  () => drive('biggy', STAIR_LANDING, NORTH, 14, 1),
);

// --- the rake ---------------------------------------------------------------
// An auditorium floor is a staircase twenty-five steps long, so the stair rule
// decides who reaches the stage. This is what the level change was built for
// and it cannot be read off the geometry: the rake is one link, the seat banks
// are three obstacles, and whether a robot threads the aisle between them and
// keeps its feet on the treads is a question only the sim answers.
//
/*
 * Room 8: a back strip flush with the corridor, then the rake, then the stage.
 *
 * How deep the rake drops and where the stage starts are READ OFF THE VENUE.
 * They were written in — "drops 4.5 m across the next 25", and an assertion
 * that the robot ends below -4.3 — and both went stale the moment the rooms
 * got a stage a person can stand on, which took Room 8 from 25 rows to 23 and
 * its stage from 4.50 m down to 4.14. The test then failed for a change that
 * was correct, which is the most expensive kind of test there is.
 */
const KEYNOTE_STAGE = KINEPOLIS.rooms.find((r) => r.id === 'aud-8-stage');
/** On the stage plate, within a riser of its floor. */
const onTheStage = (r) =>
  r.floor === 1 && r.z < KEYNOTE_STAGE.elevation + 0.19 && r.x > KEYNOTE_STAGE.bounds.x + 0.5;

/*
 * Start in Room 8's WIDE aisle — the one the doors are at — found by measuring
 * it rather than by knowing which end it is on.
 *
 * This was y -40.5, which was the wide aisle while Room 8's doors were at the
 * south end of its frontage. The plan puts them at the north, so -40.5 became
 * a point 5 cm inside the seat bank and every robot sent down the rake stopped
 * against it. That is the third time a hard-coded coordinate in this file has
 * failed for a change to the building that was correct.
 */
const KEYNOTE = KINEPOLIS.rooms.find((r) => r.label === 'Room 8');
const inRoom = (o) =>
  o.bounds.x >= KEYNOTE.bounds.x && o.bounds.x + o.bounds.w <= KEYNOTE.bounds.x + KEYNOTE.bounds.w &&
  o.bounds.y >= KEYNOTE.bounds.y && o.bounds.y + o.bounds.h <= KEYNOTE.bounds.y + KEYNOTE.bounds.h;
// The seat banks. Hidden and under 1.2 m tall is not enough on its own: a
// rake's treads are hidden too and their height is NEGATIVE, so they pass a
// `< 1.2` test and they span the whole frontage — which reported no aisle at
// all and put the start point inside the room's north wall.
const banks = KINEPOLIS.obstacles.filter(
  (o) => o.floor === 1 && o.hidden && !o.linkId && o.height > 0 && o.height < 1.2 && inRoom(o),
);
const seatLow = Math.min(...banks.map((o) => o.bounds.y)) - KEYNOTE.bounds.y;
const seatHigh = KEYNOTE.bounds.y + KEYNOTE.bounds.h - Math.max(...banks.map((o) => o.bounds.y + o.bounds.h));
const KEYNOTE_BACK = {
  x: KEYNOTE.bounds.x + 1.5,
  y: seatLow > seatHigh
    ? KEYNOTE.bounds.y + seatLow / 2
    : KEYNOTE.bounds.y + KEYNOTE.bounds.h - seatHigh / 2,
};

scenario(
  'Voxxy walks down the keynote rake to the stage',
  onTheStage,
  () => drive('voxxy', KEYNOTE_BACK, EAST, 40, 1),
);
scenario(
  'Droid walks down the keynote rake to the stage',
  onTheStage,
  () => drive('droid', KEYNOTE_BACK, EAST, 44, 1),
);
/*
 * The grand flight, which nothing in here tested until it stopped working.
 *
 * It is one of the three routes to the auditorium level and the only one a
 * visitor meets first, and it had been rebuilt four times — narrowed, moved
 * flush with the south wall, railed, its well widened past the flight — with
 * no scenario watching. Descent broke and a human found it.
 *
 * Read off the link, like the west flight above: `ascending` is true, so the
 * head is the HIGH-y end and you step on to it from the corridor going south.
 */
const GRAND = KINEPOLIS.links.find((l) => l.id === 'grand-stair');
const CONCOURSE_LEVEL = KINEPOLIS.rooms.find((r) => r.id === 'reception').elevation;
const GRAND_HEAD = { x: 0, y: GRAND.bounds.y + GRAND.bounds.h + APPROACH };

scenario(
  'Voxxy walks down the grand flight to the concourse',
  (r) => r.floor === 0 && r.z < CONCOURSE_LEVEL + 0.19 && r.minZ < 1.4,
  () => drive('voxxy', GRAND_HEAD, SOUTH, 14, 1),
);
scenario(
  'Droid walks down the grand flight to the concourse',
  (r) => r.floor === 0 && r.z < CONCOURSE_LEVEL + 0.19,
  () => drive('droid', GRAND_HEAD, SOUTH, 18, 1),
);
scenario(
  'Biggy is stopped at the head of the grand flight',
  (r) => r.floor === 1 && r.y > GRAND.bounds.y + GRAND.bounds.h - 1.0,
  () => drive('biggy', GRAND_HEAD, SOUTH, 14, 1),
);

// The point of the exercise. Biggy gets into every auditorium in the building
// and reaches the back row of all fourteen, and never reaches a stage.
scenario(
  'Biggy reaches the back row and no further',
  // Still on the flat cross aisle: it never got over the first riser, and it
  // never got past the back of the seating.
  (r) => r.z > -0.19 && r.x > 8 && r.x < KEYNOTE_STAGE.bounds.x,
  () => drive('biggy', KEYNOTE_BACK, EAST, 20, 1),
);

// The building has to hold them in. This was a printed warning for as long as
// rooms were floor plates rather than enclosures, and a robot at full throttle
// drove clean out of the Kinepolis. Now it is an assertion.
scenario(
  'Voxxy cannot drive out of the south wall',
  (r) => r.y > -62,
  () => drive('voxxy', HALL, SOUTH, 25),
);
scenario(
  'Voxxy cannot drive out of the north wall',
  (r) => r.y < 13,
  () => drive('voxxy', HALL, NORTH, 25),
);
scenario(
  'Biggy cannot drive out of the east wall',
  (r) => r.x < 30,
  () => drive('biggy', HALL, { x: 1, y: 0 }, 25),
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

console.log('\nOK — every robot goes where the stair rule says it should.\n');
