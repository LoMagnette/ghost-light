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
const { KINEPOLIS, CORE_VESTIBULE, CORE_DOOR, CORE_DOOR_SET, sessionLimits } = await import(pathToFileURL(join(out, 'venue/kinepolis.js')));
const { FLOOR_HEIGHT } = await import(pathToFileURL(join(out, 'core/Venue.js')));
const { climbFraction } = await import(pathToFileURL(join(out, 'core/Traversal.js')));
rmSync(out, { recursive: true, force: true });

/**
 * Height above the ground floor's datum, whichever storey the robot is on.
 *
 * `body.z` is measured from the storey it is on, and the storey swaps half
 * way up a flight (Sim, 28 Sep), so a robot at the top of a full climb reads
 * 3.1 m and not 6.2. The peak a check asks about is the building's.
 */
const above = (actor) => actor.body.z + actor.floor * FLOOR_HEIGHT;

/** Drive one robot from a point in a fixed world direction, and report where it stopped. */
function drive(robotId, from, dir, seconds, floor = 0, venue = KINEPOLIS) {
  const sim = new Sim(venue);
  const body = new Body(ROBOTS[robotId], from.x, from.y);
  const actor = makeActor(body, floor);
  sim.add(actor);

  const mag = Math.hypot(dir.x, dir.y);
  Object.assign(actor.input, { dirX: dir.x / mag, dirY: dir.y / mag, throttle: 1, braking: false });

  let peakZ = 0;
  let minZ = 0;
  for (let t = 0; t < seconds; t += FIXED_DT) {
    sim.advance(FIXED_DT);
    peakZ = Math.max(peakZ, above(actor));
    minZ = Math.min(minZ, body.z);
  }
  return { x: body.x, y: body.y, z: body.z, floor: actor.floor, peakZ, minZ, onLink: actor.onLink };
}

/**
 * A drive in legs: each one a direction held for so many seconds.
 *
 * For anything that is not straight ahead — the hall flights are entered
 * through a door in the side of their core, so reaching the bottom step is
 * a turn.
 */
function route(robotId, from, legs, floor = 0) {
  const sim = new Sim(KINEPOLIS);
  const body = new Body(ROBOTS[robotId], from.x, from.y);
  const actor = makeActor(body, floor);
  sim.add(actor);

  let peakZ = 0;
  for (const [dir, seconds] of legs) {
    const mag = Math.hypot(dir.x, dir.y);
    Object.assign(actor.input, { dirX: dir.x / mag, dirY: dir.y / mag, throttle: 1, braking: false });
    for (let t = 0; t < seconds; t += FIXED_DT) {
      sim.advance(FIXED_DT);
      peakZ = Math.max(peakZ, above(actor));
    }
  }
  return { x: body.x, y: body.y, z: body.z, floor: actor.floor, peakZ, onLink: actor.onLink };
}

/**
 * Climb a flight until the robot is `fraction` of the way up it, note which
 * storey it is on there, then hold `then` for `seconds`.
 *
 * For the storey swap, which happens half way up, and for what is beside a
 * flight in each half of it: the floor below's walls in the lower half, the
 * floor above's rails in the upper.
 */
function climbTo(robotId, from, dir, linkId, fraction, then, seconds = 0) {
  const sim = new Sim(KINEPOLIS);
  const body = new Body(ROBOTS[robotId], from.x, from.y);
  const actor = makeActor(body, 0);
  sim.add(actor);
  const link = KINEPOLIS.links.find((l) => l.id === linkId);
  const hold = (d) => {
    const mag = Math.hypot(d.x, d.y);
    Object.assign(actor.input, { dirX: d.x / mag, dirY: d.y / mag, throttle: 1, braking: false });
  };
  hold(dir);
  let floorAt;
  for (let t = 0; t < 30 && floorAt === undefined; t += FIXED_DT) {
    sim.advance(FIXED_DT);
    if (actor.onLink === linkId && climbFraction(link, body.x, body.y) >= fraction) floorAt = actor.floor;
  }
  hold(then);
  let lowest = above(actor);
  for (let t = 0; t < seconds; t += FIXED_DT) {
    sim.advance(FIXED_DT);
    lowest = Math.min(lowest, above(actor));
  }
  return { x: body.x, y: body.y, z: body.z, floor: actor.floor, floorAt, lowest, onLink: actor.onLink };
}

/**
 * The same drive, carrying something.
 *
 * A payload is not a flag the traversal system checks — it is mass in the
 * body, which changes the force available against the slope. So the only
 * honest way to ask what a load does on a slope or a stair is to put it on
 * the robot and drive, which is what this does.
 */
function driveLoaded(robotId, from, dir, seconds, payload, floor = 0) {
  const sim = new Sim(KINEPOLIS);
  const body = new Body(ROBOTS[robotId], from.x, from.y);
  body.payload = payload;
  const actor = makeActor(body, floor);
  sim.add(actor);

  const mag = Math.hypot(dir.x, dir.y);
  Object.assign(actor.input, { dirX: dir.x / mag, dirY: dir.y / mag, throttle: 1, braking: false });

  let peakZ = 0;
  for (let t = 0; t < seconds; t += FIXED_DT) {
    sim.advance(FIXED_DT);
    peakZ = Math.max(peakZ, above(actor));
  }
  return { x: body.x, y: body.y, z: body.z, floor: actor.floor, peakZ, onLink: actor.onLink };
}

const SOUTH = { x: 0, y: -1 };
const NORTH = { x: 0, y: 1 };
const EAST = { x: 1, y: 0 };
const WEST = { x: -1, y: 0 };

const failures = [];
const rows = [];
function scenario(label, expectation, run) {
  const r = run();
  const ok = expectation(r);
  rows.push({ label, r, ok });
  if (!ok) failures.push(label);
}

// The hall floor is the datum; the concourse stands 1.2 m above it.
const HALL_ROOM = KINEPOLIS.rooms.find((r) => r.id === 'hall').bounds;
const HALL_NORTH = HALL_ROOM.y + HALL_ROOM.h;
// Midway between two rows of columns, and clear of the stands either side.
const HALL = { x: 0, y: -17.7 };
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

/*
 * The core round the flight: its north wall, and the doors in its sides.
 * STAIR_FOOT above is inside the vestibule, which is where the climbing
 * scenarios want to start; these are about getting in.
 */
const CORE_NORTH = WEST_FLIGHT.bounds.y + WEST_FLIGHT.bounds.h + CORE_VESTIBULE;
const CORE_DOOR_Y = CORE_NORTH - CORE_DOOR_SET - CORE_DOOR / 2;
const FLIGHT_MID_X = WEST_FLIGHT.bounds.x + WEST_FLIGHT.bounds.w / 2;

/*
 * The threshold between the hall and the concourse, READ OFF THE FLIGHT.
 *
 * These were three hard-coded y values, and they survived the terrace being
 * built three metres north of where the old flight stood only by luck: they
 * had stopped describing the building and still happened to be true. The
 * flight says where it is.
 *
 * `ascending: false` on a y axis: height falls as y rises, so the TOP step —
 * the doorway into the concourse — is the southern edge, and the terrace
 * splays north into the hall.
 */
const THRESHOLD = KINEPOLIS.links.find((l) => l.id === 'hall-steps');
const THRESHOLD_TOP = THRESHOLD.bounds.y;
const THRESHOLD_FOOT = THRESHOLD.bounds.y + THRESHOLD.bounds.h;
const LANDING = KINEPOLIS.rooms.find((r) => r.id === 'threshold').bounds;
/**
 * Beside the west flank, just north of the box that stands at the landing's
 * west end. South of that, the flank is the box.
 */
const THRESHOLD_FLANK = {
  x: THRESHOLD.bounds.x - APPROACH,
  y: THRESHOLD_TOP + 3.0 + 0.9,
};

scenario(
  'Voxxy climbs the concourse steps',
  (r) => r.z > 1.1 && r.y < THRESHOLD_TOP,
  () => drive('voxxy', HALL, SOUTH, 9),
);

scenario(
  'Droid climbs the concourse steps',
  (r) => r.z > 1.1 && r.y < THRESHOLD_TOP,
  () => drive('droid', HALL, SOUTH, 14),
);

scenario(
  'Biggy is stopped by the concourse steps',
  (r) => r.z < 0.1 && r.y > THRESHOLD_FOOT - 1.0,
  () => drive('biggy', HALL, SOUTH, 16),
);

/*
 * Down as well as up.
 *
 * The grand flight taught this the expensive way: it had been narrowed,
 * moved and railed four times with nothing driving DOWN it, and the day a
 * robot tried, its foot turned out to be inside a wall. A flight is two
 * routes and both of them want a scenario.
 */
scenario(
  'Droid walks down the threshold into the hall',
  (r) => r.z < 0.1 && r.y > THRESHOLD_FOOT,
  () => drive('droid', { x: -0.8, y: THRESHOLD_TOP - APPROACH }, NORTH, 10),
);

/*
 * The whole point of the terrace: it is climbable off its flank as well as
 * off its front, because it stands in the open and has no sides to speak of.
 *
 * Driving due east across it this far out cannot reach the concourse — the
 * steps there only rise to half their height — so this asks whether the
 * robot got UP at all. Without `Link.wrap` the flight is a plain
 * ramp along y, the surface beside the robot is 0.6 m of sheer face it cannot
 * step onto, and the answer is a flat zero.
 */
scenario(
  'Voxxy climbs the threshold off its flank',
  (r) => r.peakZ > 0.5,
  () => drive('voxxy', THRESHOLD_FLANK, EAST, 8),
);

// Checked on peakZ rather than final z: nothing bounds the building, so a
// robot held at full throttle long enough drives out of it and back down to
// zero. See the note at the end of this file.
/*
 * The wall between the hall and the reception, east of the steps.
 *
 * A ramp once came through the concourse here and cut its own way through
 * this wall — eleven metres of it at first, then a 4 m doorway — and BOF 3
 * had a door in it onto a 1.2 m drop. Neither plan draws either. East of the
 * steps the wall is unbroken, and this drives at it.
 */
const HALL_WALL = KINEPOLIS.rooms.find((r) => r.id === 'reception').bounds;
const EAST_OF_STEPS = {
  x: THRESHOLD.bounds.x + THRESHOLD.bounds.w + 3,
  y: HALL_WALL.y + HALL_WALL.h + 6,
};

scenario(
  'Voxxy is stopped by the wall east of the steps',
  (r) => r.z < 0.1 && r.y > HALL_WALL.y + HALL_WALL.h,
  () => drive('voxxy', EAST_OF_STEPS, SOUTH, 8),
);

// Both ends are steps, down to the wall: up the east one, and the reverse of
// the box at the west end.
scenario(
  'Voxxy climbs the threshold off its east end, beside the wall',
  (r) => r.z > 1.1,
  () => drive('voxxy', { x: THRESHOLD.bounds.x + THRESHOLD.bounds.w + APPROACH, y: THRESHOLD_TOP + 1.2 }, WEST, 4),
);

scenario(
  'Biggy is stopped by the east end of the steps',
  (r) => r.z < 0.1 && r.x > THRESHOLD.bounds.x + THRESHOLD.bounds.w - 0.2,
  () => drive('biggy', { x: THRESHOLD.bounds.x + THRESHOLD.bounds.w + APPROACH, y: THRESHOLD_TOP + 1.2 }, WEST, 8),
);

scenario(
  'Voxxy cannot walk off the landing past the box at its west end',
  (r) => r.x > LANDING.x,
  () => drive('voxxy', { x: LANDING.x + 2, y: THRESHOLD_TOP + 1.5 }, WEST, 6),
);

// The BOF rooms sit three risers under the concourse. The steps are inside
// each door, and the door is narrower than the steps.
const BOF_STEPS = KINEPOLIS.links.find((l) => l.id === 'bof-2-steps');
const BOF_DOOR_Y = BOF_STEPS.bounds.y + 1.0;

scenario(
  'Voxxy walks down the steps into BOF 2',
  (r) => r.z < 0.7 && r.x > BOF_STEPS.bounds.x + BOF_STEPS.bounds.w,
  () => drive('voxxy', { x: BOF_STEPS.bounds.x - 2, y: BOF_DOOR_Y }, EAST, 4),
);

scenario(
  'Biggy is stopped by the BOF steps',
  (r) => r.z > 1.1 && r.x < BOF_STEPS.bounds.x + 0.3,
  () => drive('biggy', { x: BOF_STEPS.bounds.x - 3, y: BOF_DOOR_Y }, EAST, 6),
);

scenario(
  'Voxxy cannot get into BOF 2 past the door, through the jamb',
  (r) => r.x < BOF_STEPS.bounds.x,
  () => drive('voxxy', { x: BOF_STEPS.bounds.x - 2, y: BOF_STEPS.bounds.y + BOF_STEPS.bounds.h - 0.6 }, EAST, 4),
);

/*
 * The stanchions across the corridor where Devoxx's rooms stop, from Chapter
 * III's day (Rooms 3 to 10): open in the middle, solid either side.
 */
const DEVOXX_DAY = {
  ...KINEPOLIS,
  obstacles: [
    ...KINEPOLIS.obstacles,
    ...sessionLimits(['aud-3', 'aud-4', 'aud-5', 'aud-6', 'aud-7', 'aud-8', 'aud-9', 'aud-10']).solids,
  ],
};
const DRAPE_Y = 12.7;
const CORRIDOR_MIDDLE = 2.7;

scenario(
  'Droid drives north through the gap in the stanchions',
  (r) => r.y > DRAPE_Y + 3,
  () => drive('droid', { x: CORRIDOR_MIDDLE, y: DRAPE_Y - 4 }, NORTH, 3, 1, DEVOXX_DAY),
);

scenario(
  'Voxxy is stopped by the rope either side of the gap',
  (r) => r.y < DRAPE_Y,
  () => drive('voxxy', { x: -3.0, y: DRAPE_Y - 2 }, NORTH, 3, 1, DEVOXX_DAY),
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

// The hall flights are cores: shut at the north end and along both flanks,
// with a door in each side of the vestibule at the foot.
scenario(
  'Voxxy cannot walk onto a hall flight from the north',
  (r) => r.peakZ < 0.1 && r.y > CORE_NORTH,
  () => drive('voxxy', { x: FLIGHT_MID_X, y: CORE_NORTH + APPROACH }, SOUTH, 8),
);

scenario(
  'Voxxy cannot step onto a hall flight off its flank',
  (r) => r.peakZ < 0.1,
  () => drive('voxxy', { x: WEST_FLIGHT.bounds.x - APPROACH, y: WEST_FLIGHT.bounds.y + 4 }, EAST, 6),
);

for (const [side, from, dir] of [
  ['west', WEST_FLIGHT.bounds.x - APPROACH, EAST],
  ['east', WEST_FLIGHT.bounds.x + WEST_FLIGHT.bounds.w + APPROACH, WEST],
]) {
  // Across into the vestibule, then turn south up the flight.
  // A player eases off in the doorway; held flat out, Voxxy crosses the
  // 2.3 m vestibule and leaves by the far door. 0.8–1.0 s all turn in.
  const across = 0.9;
  scenario(
    `Voxxy goes in at the ${side} door and climbs to floor 1`,
    (r) => r.floor === 1 && r.peakZ > 6.0,
    () => route('voxxy', { x: from, y: CORE_DOOR_Y }, [[dir, across], [SOUTH, 12]]),
  );
}

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
// The same distance off the head, downstairs, but in the east half: the
// reception island stands in front of the flight's west half on floor 0.

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
/*
 * The space under the grand flight.
 *
 * Its upper half is a soffit with nothing under it, so a robot walks in
 * under it, stays on the concourse, and stops where the mass comes back down
 * to meet the floor. With the flight solid all the way, it is stopped at the
 * first tread instead and never gets in.
 *
 * In from the head, through the gap between the island and the free
 * counter. It came in at the flight's east end until 28 Sep, when the
 * counter went back to where `reception-desk.png` draws it, 1.6 m off the
 * head and right across that line. The flight's east side is railed, so the
 * way in is from the north.
 */
const GRAND_UNDER = { x: 1.0, y: GRAND.bounds.y + GRAND.bounds.h + APPROACH };
scenario(
  'Voxxy walks in under the grand stair',
  (r) => Math.abs(r.z - CONCOURSE_LEVEL) < 0.1 && r.y < GRAND.bounds.y + GRAND.bounds.h - 2,
  () => drive('voxxy', GRAND_UNDER, SOUTH, 6),
);

/*
 * The grand flight runs wall to wall now (`GRAND_EAST`), and its east part
 * comes up into the widened corridor, where Room 7's frontage used to be.
 * Up that part, from the concourse.
 */
scenario(
  'Voxxy climbs the east end of the grand flight into the corridor',
  (r) => r.floor === 1 && r.x > 7.3,
  // 6 s, not 14: held for longer it crosses the corridor and goes down the
  // hall's east flight, which is in line with it against the east wall.
  () => drive('voxxy', { x: GRAND.bounds.x + GRAND.bounds.w - 1.5, y: GRAND.bounds.y - 0.6 }, NORTH, 6),
);

/*
 * The glass front is doors, every bay of it (28 Sep): come in off the
 * forecourt through a bay well east of the entrance, between two mullions.
 */
scenario(
  'Biggy drives in off the forecourt through the glass doors',
  (r) => r.y > -59.5 && Math.abs(r.z - CONCOURSE_LEVEL) < 0.1,
  () => drive('biggy', { x: 18.6, y: -63.5 }, NORTH, 6),
);

/*
 * The storey swaps half way up a flight (28 Sep), so the floor you are going
 * to is the one drawn for the top half of the climb. The grand flight, from
 * the concourse, on its centre line.
 */
const GRAND_FOOT = { x: GRAND.bounds.x + GRAND.bounds.w / 2, y: GRAND.bounds.y - 0.6 };
scenario(
  'Voxxy is still downstairs 40% of the way up the grand flight',
  (r) => r.floorAt === 0,
  () => climbTo('voxxy', GRAND_FOOT, NORTH, 'grand-stair', 0.4, NORTH),
);
scenario(
  'Voxxy is upstairs 60% of the way up the grand flight',
  (r) => r.floorAt === 1,
  () => climbTo('voxxy', GRAND_FOOT, NORTH, 'grand-stair', 0.6, NORTH),
);
// In the top half the robot is on storey 1, where the floor below's walls
// are not: what keeps it on the flight there is the floor above's rails.
scenario(
  'Voxxy cannot step off the west side of the grand flight in its top half',
  (r) => r.lowest > 4 && r.x > GRAND.bounds.x - 0.5,
  () => climbTo('voxxy', { x: GRAND.bounds.x + 1.0, y: GRAND.bounds.y - 0.6 }, NORTH, 'grand-stair', 0.8, WEST, 2),
);
scenario(
  'Voxxy cannot step off the east side of the grand flight in its top half',
  (r) => r.lowest > 4 && r.x < GRAND.bounds.x + GRAND.bounds.w + 0.5,
  () => climbTo('voxxy', { x: GRAND.bounds.x + GRAND.bounds.w - 1.0, y: GRAND.bounds.y - 0.6 }, NORTH, 'grand-stair', 0.8, EAST, 2),
);

/*
 * The door behind the information island (`reception-desk.png`): out of the
 * staff floor behind the west desk, south towards the head of the flight.
 * The stair hall's west wall used to end 0.7 m in front of it.
 */
scenario(
  'Voxxy walks out through the door behind the reception desk',
  (r) => r.y < GRAND.bounds.y + GRAND.bounds.h + 0.9,
  () => drive('voxxy', { x: -2.58, y: GRAND.bounds.y + GRAND.bounds.h + 2.5 }, SOUTH, 4),
);

/*
 * The terrace at the head of the flight (access-main-stairs.png): open floor
 * the width of the corridor, and west of the flight the floor stops, open to
 * the reception below, behind a curved balustrade. Walk south down the west
 * side and the balustrade stops you. `voids` are render-only, so without it
 * this robot would walk out over the drop on floor that is not drawn.
 */
scenario(
  'Voxxy is stopped at the edge of the opening beside the stairhead',
  (r) => r.floor === 1 && r.z > -0.1 && r.y > GRAND.bounds.y + GRAND.bounds.h,
  () => drive('voxxy', { x: -5.0, y: GRAND_HEAD.y + 4 }, SOUTH, 6, 1),
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

// Every auditorium has a way in. Room 6's door opened onto the open well
// beside the grand flight until 28 Sep, and nothing here noticed: the rooms
// were only ever entered by name, never walked into. So each one is, through
// the end of its frontage the venue says the door is at.
for (const room of KINEPOLIS.rooms.filter((r) => r.kind === 'auditorium')) {
  const b = room.bounds;
  const y = room.doorSide === 'high' ? b.y + b.h - 2.5 : b.y + 2.5;
  const west = b.x < 0;
  const wall = west ? b.x + b.w : b.x;
  scenario(
    `Voxxy walks into ${room.label}`,
    // Inside the room's own walls, on its floor, and not fallen through
    // anything: a robot that dropped into the well and was flung off down the
    // building still reads as "west of the wall".
    (r) => r.floor === 1 && (west ? r.x < wall - 1 : r.x > wall + 1) && r.y > b.y && r.y < b.y + b.h && r.z > -2,
    () => drive('voxxy', { x: west ? wall + 2.5 : wall - 2.5, y }, west ? WEST : EAST, 3, 1),
  );
}

// The building has to hold them in. This was a printed warning for as long as
// rooms were floor plates rather than enclosures, and a robot at full throttle
// drove clean out of the Kinepolis. Now it is an assertion.
/*
 * The main aisle through the exhibition stands.
 *
 * Twenty-seven solids went onto the hall floor and the hall stopped being a
 * car park, which is the point of them — but the floor still has to be a
 * floor. Biggy is the widest robot and the worst at changing its mind, so it
 * is the one that has to get from the concourse end of the aisle to the far
 * end of it in a straight line.
 */
// The platforms, one per stand — the panels are obstacles and there are a
// variable number of them. Same rule as `npm run venue`.
const STANDS = KINEPOLIS.decor.filter((d) => d.material === 'booth');
const AISLE_SOUTH = Math.min(...STANDS.map((b) => b.bounds.y));
const AISLE_NORTH = Math.max(...STANDS.map((b) => b.bounds.y + b.bounds.h));

scenario(
  'Biggy drives the length of the main aisle',
  (r) => r.y > AISLE_NORTH,
  () => drive('biggy', { x: -1, y: AISLE_SOUTH - 3 }, NORTH, 14),
);

/*
 * And onto a stand, which is the point of them not being blocks.
 *
 * A stand is a platform with a panel across the back and a counter at the
 * front of it, taking part of the frontage: you drive in past the counter
 * and get stopped by the back. As solid boxes they stopped a robot at the
 * front edge and the inside of a stand was somewhere nobody could ever be.
 *
 * Every coordinate here is read off the stand, including which SIDE of it
 * to drive at. The counter is at the front by construction, so the side it
 * sits nearer is the side the aisle is on, and the frontage it does not
 * cover is the way in. Written out because the layout has already moved
 * three times this week and a test that guesses at it is worth nothing.
 */
const inside = (outer, inner) =>
  inner.x >= outer.x - 0.01 && inner.x + inner.w <= outer.x + outer.w + 0.01 &&
  inner.y >= outer.y - 0.01 && inner.y + inner.h <= outer.y + outer.h + 0.01;

const BIG_STAND = STANDS.reduce((a, b) =>
  b.bounds.w * b.bounds.h > a.bounds.w * a.bounds.h ? b : a,
).bounds;
const COUNTER = KINEPOLIS.obstacles.find(
  (o) => o.floor === 0 && o.material === 'desk' && inside(BIG_STAND, o.bounds),
).bounds;

/** The frontage the counter leaves clear, and the aisle side it opens onto. */
const WAY_IN =
  COUNTER.y - BIG_STAND.y > BIG_STAND.y + BIG_STAND.h - (COUNTER.y + COUNTER.h)
    ? (BIG_STAND.y + COUNTER.y) / 2
    : (COUNTER.y + COUNTER.h + BIG_STAND.y + BIG_STAND.h) / 2;
const FRONT_WEST =
  COUNTER.x - BIG_STAND.x < BIG_STAND.x + BIG_STAND.w - (COUNTER.x + COUNTER.w);

/**
 * A metre off the front edge, not the far side of the aisle.
 *
 * The main aisle has a line of columns down the middle of it, so a long
 * straight run at it lands on one — and driving the aisles is what the two
 * scenarios above are for. This one only has to cross the frontage.
 */
const STAND_APPROACH = 1.0;

scenario(
  'Voxxy drives off the aisle onto a stand',
  (r) => r.x > BIG_STAND.x && r.x < BIG_STAND.x + BIG_STAND.w,
  () =>
    drive(
      'voxxy',
      {
        x: FRONT_WEST
          ? BIG_STAND.x - STAND_APPROACH
          : BIG_STAND.x + BIG_STAND.w + STAND_APPROACH,
        y: WAY_IN,
      },
      FRONT_WEST ? EAST : WEST,
      6,
    ),
);

/*
 * And the west one, which is the tighter of the two.
 *
 * 5.6 m between the ranks with a line of columns down the middle of it, so
 * what Biggy actually has is the 2.6 m lane east of the columns. The stands
 * were 20 cm too deep and this lane was 1.6 m — passable by the two small
 * robots, not by the one that most needs to get past.
 */
scenario(
  'Biggy drives the west aisle',
  (r) => r.y > AISLE_NORTH,
  () => drive('biggy', { x: -15.2, y: AISLE_SOUTH - 3 }, NORTH, 16),
);

/*
 * Loaded, on stairs — and the constraint Chapter III is built around.
 *
 * There is no ramp (the author, 28 Sep: steps at both ends of the
 * threshold), so Biggy never changes level, laden or not: it cannot climb a
 * single riser. What a load CAN change is who else can: a step is a step
 * whatever you carry, so Droid still takes a crate up. See `canTraverse`.
 */
scenario(
  'Biggy cannot climb the concourse steps even empty',
  (r) => r.z < 0.1,
  () => driveLoaded('biggy', HALL, SOUTH, 20, 0),
);

scenario(
  'Droid carries a crate up the concourse steps',
  (r) => r.z > 1.1,
  () => driveLoaded('droid', HALL, SOUTH, 20, 60),
);

scenario(
  'Voxxy cannot drive out of the south wall',
  (r) => r.y > -62,
  () => drive('voxxy', HALL, SOUTH, 25),
);
scenario(
  'Voxxy cannot drive out of the north wall',
  (r) => r.y < HALL_NORTH + 1,
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
