/**
 * Venue self-check.
 *
 * The building is now surveyed from the plans rather than invented, and the
 * numbers in `kinepolis.ts` are derived — room depth falls out of seat counts,
 * the hall falls out of a printed floor area. Derived numbers drift silently
 * when someone adjusts a constant, and the failure mode is not a crash: it is
 * a spawn point inside a wall, or a hall that quietly stops matching the plan.
 *
 * This holds the geometry against the published figures and against itself.
 * Same trick as tools/physics.mjs — tsc to a temp directory, run it in node,
 * no browser — with a require hook for the `@/` alias, which tsc emits
 * verbatim because it expects a bundler to resolve it.
 *
 *   npm run venue
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'devoxx-venue-'));

// The venue imports through the `@/` alias, which tsc can only resolve from a
// tsconfig — there is no CLI flag for `paths`. So generate one.
const tsconfig = join(out, 'tsconfig.json');
writeFileSync(
  tsconfig,
  JSON.stringify({
    compilerOptions: {
      target: 'es2022',
      module: 'commonjs',
      moduleResolution: 'node',
      strict: true,
      skipLibCheck: true,
      noEmit: false,
      outDir: out,
      rootDir: join(repo, 'src'),
      baseUrl: repo,
      paths: { '@/*': ['src/*'] },
    },
    files: [
      join(repo, 'src/venue/kinepolis.ts'),
      join(repo, 'src/core/Venue.ts'),
      join(repo, 'src/core/Traversal.ts'),
    ],
  }),
);

try {
  execFileSync(
    process.execPath,
    [join(repo, 'node_modules/typescript/bin/tsc'), '-p', tsconfig],
    { stdio: 'inherit' },
  );
} catch {
  console.error('tsc failed — fix the type errors before checking the venue.');
  process.exit(1);
}

// tsc leaves "@/core/Venue" alone; teach CommonJS where that points.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? join(out, request.slice(2)) : request, ...rest);
};

const { KINEPOLIS, SPAWNS, HALL_AREA_M2, HALL_FLOOR_M2, KEYNOTE_ROOM, ROW_PITCH } = await import(
  pathToFileURL(join(out, 'venue/kinepolis.js'))
);
const { groundAt } = await import(pathToFileURL(join(out, 'core/Venue.js')));
const { surfaceHeight } = await import(pathToFileURL(join(out, 'core/Traversal.js')));
rmSync(out, { recursive: true, force: true });

// --json and --svg exist because a building cannot be checked by driving
// around inside it. The first pass of this venue passed every numeric test and
// was still visibly wrong against the drawings — rooms too wide and too
// shallow — and that was only caught by putting a plan of the built geometry
// next to the real plan. Do that whenever you touch kinepolis.ts.
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rooms: KINEPOLIS.rooms, obstacles: KINEPOLIS.obstacles, decor: KINEPOLIS.decor, links: KINEPOLIS.links, spawns: SPAWNS }));
  process.exit(0);
}

if (process.argv.includes('--svg')) {
  const { writeFileSync } = await import('node:fs');
  const FILL = {
    auditorium: '#cfe2f3', corridor: '#ededed', hall: '#d9ead3',
    foyer: '#fff2cc', service: '#f4cccc', stairs: '#dddddd', stage: '#b6d7a8',
  };
  for (const floor of [0, 1]) {
    const rooms = KINEPOLIS.rooms.filter((r) => r.floor === floor);
    const obs = KINEPOLIS.obstacles.filter((o) => o.floor === floor && !o.hidden);
    // Dressing is what the plan's own seat rows are, so draw it: a floor plan
    // of this building with no seats in it cannot be held against the original.
    const dressing = KINEPOLIS.decor.filter((d) => d.floor === floor);
    const xs = rooms.flatMap((r) => [r.bounds.x, r.bounds.x + r.bounds.w]);
    const ys = rooms.flatMap((r) => [r.bounds.y, r.bounds.y + r.bounds.h]);
    const x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4;
    const y0 = Math.min(...ys) - 4, y1 = Math.max(...ys) + 4;
    // +y is north, so flip for screen coordinates.
    const box = (b) => `x="${(b.x - x0).toFixed(1)}" y="${(y1 - b.y - b.h).toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}"`;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${((x1 - x0) * 7).toFixed(0)}" height="${((y1 - y0) * 7).toFixed(0)}" viewBox="0 0 ${(x1 - x0).toFixed(1)} ${(y1 - y0).toFixed(1)}">`,
      `<rect width="100%" height="100%" fill="#fff"/>`,
      `<g stroke="#333" stroke-width="0.25">`,
      ...rooms.map((r) => `<rect ${box(r.bounds)} fill="${FILL[r.kind] ?? '#eee'}"/>`),
      `</g><g fill="#b0bcd0">`,
      ...dressing.map((d) => `<rect ${box(d.bounds)}/>`),
      `</g><g fill="#888">`,
      ...obs.map((o) => `<rect ${box(o.bounds)}/>`),
      `</g><g fill="#ff8800" stroke="#000" stroke-width="0.2">`,
      ...KINEPOLIS.links.filter((l) => l.from === floor).map((l) => `<rect ${box(l.bounds)}/>`),
      `</g><g font-size="2" text-anchor="middle" fill="#000">`,
      ...rooms.map((r) => `<text x="${(r.bounds.x + r.bounds.w / 2 - x0).toFixed(1)}" y="${(y1 - r.bounds.y - r.bounds.h / 2).toFixed(1)}">${r.label}</text>`),
      `</g><g fill="#d00">`,
      ...Object.entries(SPAWNS).filter(([, s]) => s.floor === floor).flatMap(([n, s]) => [
        `<circle cx="${(s.x - x0).toFixed(1)}" cy="${(y1 - s.y).toFixed(1)}" r="0.9"/>`,
        `<text x="${(s.x - x0 + 1.5).toFixed(1)}" y="${(y1 - s.y).toFixed(1)}" font-size="2">${n}</text>`,
      ]),
      `</g></svg>`,
    ];
    const path = `tools/plan-floor${floor}.svg`;
    writeFileSync(path, parts.join('\n'));
    console.log(`wrote ${path}  (${(x1 - x0).toFixed(0)} × ${(y1 - y0).toFixed(0)} m)`);
  }
  process.exit(0);
}

const area = (r) => r.w * r.h;

// A millimetre of slack. Rooms are placed by accumulating float widths, so a
// room that shares a wall with the corridor lands 1e-15 inside it and a strict
// test reports a building full of overlaps that do not exist.
const EPS = 1e-3;
const overlaps = (a, b) =>
  a.x + EPS < b.x + b.w && b.x + EPS < a.x + a.w &&
  a.y + EPS < b.y + b.h && b.y + EPS < a.y + a.h;

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// --- the hall against the figure printed on the plan -----------------------
const hall = KINEPOLIS.rooms.find((r) => r.id === 'hall');
// The hall's bounding box is not its floor — the real room has a notch at the
// north-west, a set-back north-east corner and a quarter-round at the
// south-west. HALL_FLOOR_M2 is the box less those.
const drift = Math.abs(HALL_FLOOR_M2 - HALL_AREA_M2) / HALL_AREA_M2;
check(
  drift < 0.05,
  `hall floor is ${HALL_FLOOR_M2.toFixed(0)} m² against the plan's ${HALL_AREA_M2} m² (${(drift * 100).toFixed(1)}% out)`,
);

// --- auditoriums against their seat counts ---------------------------------
const auditoria = KINEPOLIS.rooms.filter((r) => r.kind === 'auditorium');
check(auditoria.length === 14, `expected 14 auditoriums, found ${auditoria.length}`);

// Geometry is measured off the plan now, so the printed seat counts are an
// independent check on it: a raked multiplex auditorium is 0.8-1.4 m² a seat.
const SEATS = { 1:224, 2:198, 3:345, 4:364, 5:684, 6:408, 7:407, 8:746, 9:426, 10:364, 11:224, 12:224, 13:345, 14:224 };
for (const room of auditoria) {
  const n = Number(room.label.replace('Room ', ''));
  const perSeat = area(room.bounds) / SEATS[n];
  check(
    perSeat > 0.8 && perSeat < 1.4,
    `${room.label} is ${perSeat.toFixed(2)} m² per seat against its printed ${SEATS[n]} seats — outside 0.8-1.4`,
  );
}

const keynote = auditoria.find((r) => r.label === `Room ${KEYNOTE_ROOM}`);
const biggest = auditoria.reduce((a, b) => (area(a.bounds) > area(b.bounds) ? a : b));
check(
  keynote === biggest,
  `Room ${KEYNOTE_ROOM} should be the largest room in the building, but ${biggest.label} is`,
);

// --- nothing may overlap anything on its own floor -------------------------
const corridor = KINEPOLIS.rooms.find((r) => r.id === 'corridor');
for (const room of auditoria) {
  check(
    !overlaps(room.bounds, corridor.bounds),
    `${room.label} overlaps the corridor — its door would open inside a wall`,
  );
}
for (let i = 0; i < auditoria.length; i += 1) {
  for (let j = i + 1; j < auditoria.length; j += 1) {
    check(
      !overlaps(auditoria[i].bounds, auditoria[j].bounds),
      `${auditoria[i].label} overlaps ${auditoria[j].label}`,
    );
  }
}

// --- every spawn must be on its floor and out of the furniture -------------
// Biggy's radius, the widest thing that ever stands on one of these.
const CLEARANCE = 0.72;

// ChapterScene lines its cast up east of the spawn at this pitch, so the two
// places beside it have to be clear as well. Checking only the point itself
// passes a spawn that puts Biggy inside a column.
const CAST_PITCH = 2.6;
const CAST_MAX = 3;

for (const [name, spawn] of Object.entries(SPAWNS)) {
  const inside = KINEPOLIS.rooms.some(
    (r) =>
      r.floor === spawn.floor &&
      spawn.x >= r.bounds.x && spawn.x <= r.bounds.x + r.bounds.w &&
      spawn.y >= r.bounds.y && spawn.y <= r.bounds.y + r.bounds.h,
  );
  check(inside, `SPAWNS.${name} is not inside any room on floor ${spawn.floor}`);

  for (let slot = 0; slot < CAST_MAX; slot += 1) {
    const px = spawn.x + slot * CAST_PITCH;
    for (const o of KINEPOLIS.obstacles) {
      if (o.floor !== spawn.floor) continue;
      const cx = Math.min(Math.max(px, o.bounds.x), o.bounds.x + o.bounds.w);
      const cy = Math.min(Math.max(spawn.y, o.bounds.y), o.bounds.y + o.bounds.h);
      check(
        Math.hypot(px - cx, spawn.y - cy) >= CLEARANCE,
        `SPAWNS.${name}${slot ? ` (cast slot ${slot + 1})` : ''} is inside or touching an obstacle — a robot would spawn in a wall`,
      );
    }
  }
}

// --- every auditorium must have a way in ----------------------------------
// This is the check that would have caught the walls swallowing thirteen of
// the fourteen doors: the geometry was consistent, the rooms were sealed, and
// nothing else noticed.
// Who can use what. maxStepRise is measured against the building's riser, so
// this is the stair rule from SPEC section 5 read straight off the geometry.
const ROBOTS = {
  Voxxy: { maxStepRise: 0.2, maxSlope: 0.45 },
  Droid: { maxStepRise: 0.18, maxSlope: 0.38 },
  Biggy: { maxStepRise: 0.0, maxSlope: 0.35 },
};

const DOOR_MIN = 2.0;

/** Biggy across the shoulders — twice the radius the clearance check uses. */
const BIGGY_WIDTH = CLEARANCE * 2;
for (const room of auditoria) {
  const b = room.bounds;
  // Corridor-facing edge: the one nearer x = 0.
  const edgeX = Math.abs(b.x) < Math.abs(b.x + b.w) ? b.x : b.x + b.w;
  let open = 0;
  const step = 0.2;
  for (let y = b.y + step / 2; y < b.y + b.h; y += step) {
    const blocked = KINEPOLIS.obstacles.some(
      (o) =>
        o.floor === 1 &&
        o.bounds.x - 0.05 <= edgeX && edgeX <= o.bounds.x + o.bounds.w + 0.05 &&
        o.bounds.y <= y && y <= o.bounds.y + o.bounds.h,
    );
    if (!blocked) open += step;
  }
  check(
    open >= DOOR_MIN,
    `${room.label} has ${open.toFixed(1)} m of doorway onto the corridor — it is sealed in`,
  );
}

// --- the way in and the way through must be the same side ------------------
// An aisle on the far side of the seating from the doors means you walk in and
// immediately meet the back of a seat block. Checked rather than eyeballed,
// because the door is decided in the wall builder and the aisle in the seating
// builder, and nothing else would notice them disagreeing.
for (const room of auditoria) {
  const b = room.bounds;
  const edgeX = Math.abs(b.x) < Math.abs(b.x + b.w) ? b.x : b.x + b.w;
  const mid = b.y + b.h / 2;

  let gapSum = 0, gapN = 0;
  const step = 0.2;
  for (let y = b.y + step / 2; y < b.y + b.h; y += step) {
    const blocked = KINEPOLIS.obstacles.some(
      (o) => o.floor === 1 &&
        o.bounds.x - 0.05 <= edgeX && edgeX <= o.bounds.x + o.bounds.w + 0.05 &&
        o.bounds.y <= y && y <= o.bounds.y + o.bounds.h,
    );
    if (!blocked) { gapSum += y; gapN += 1; }
  }
  const doorAt = gapN ? gapSum / gapN : mid;

  // Seating centroid across the frontage.
  // The seat banks and nothing else. Hidden and under 1.2 m nearly picks them
  // out — the letters are hidden and 1.5, the presenter's desk is 0.75 but
  // visible, and both stand at the far end of the room where they would drag
  // the centroid clean across it. Nearly, but not quite: a rake's treads are
  // hidden as well and their height is NEGATIVE, so they passed the `< 1.2`
  // test, and they run the full frontage — which is a centroid dead on the
  // room's midline dragging every real one toward it. Height above zero, and
  // no linkId, is what actually means "a bank of seats".
  const seats = KINEPOLIS.obstacles.filter(
    (o) => o.floor === 1 && o.hidden && !o.linkId && o.height > 0 && o.height < 1.2 &&
      o.bounds.x >= b.x - 0.1 && o.bounds.x + o.bounds.w <= b.x + b.w + 0.1 &&
      o.bounds.y >= b.y - 0.1 && o.bounds.y + o.bounds.h <= b.y + b.h + 0.1,
  );
  if (!seats.length) continue;
  const area = seats.reduce((t, o) => t + o.bounds.w * o.bounds.h, 0);
  const seatAt = seats.reduce((t, o) => t + (o.bounds.y + o.bounds.h / 2) * o.bounds.w * o.bounds.h, 0) / area;

  check(
    Math.sign(doorAt - mid) === -Math.sign(seatAt - mid),
    `${room.label}: doors at ${(doorAt - mid).toFixed(1)} m from centre but the seating sits ${(seatAt - mid).toFixed(1)} m the same way — you walk in behind the seats`,
  );
}

// --- both side aisles have to survive ---------------------------------------
//
// The check above asks which SIDE of a room the seating leans, which is not the
// same as asking whether it left room to walk. Centring each row in the
// seatable width offset it by the low-side aisle — and the low-side aisle is
// the door's in half the rooms and the far one in the other half. Adding both
// pushed the seating a whole far aisle up the room, and the far side of every
// low-door auditorium lost its aisle: 0.12 m of gap in Room 12 against the
// 1.2 m it is supposed to have. Every affected room still passed the lean test,
// because it leaned the right way — just far too much.
//
// Measured off the seats themselves rather than off the constants, because the
// constants were never wrong. What was wrong was where they got applied.

/** Narrowest gap between the seating and a side wall. Voxxy is 0.68 m across. */
const MIN_AISLE = 0.9;

for (const room of auditoria) {
  const b = room.bounds;
  const seats = KINEPOLIS.decor.filter(
    (d) => d.material === 'seat' &&
      d.bounds.x >= b.x && d.bounds.x <= b.x + b.w &&
      d.bounds.y >= b.y && d.bounds.y <= b.y + b.h,
  );
  if (!seats.length) continue;
  const low = Math.min(...seats.map((d) => d.bounds.y)) - b.y;
  const high = b.y + b.h - Math.max(...seats.map((d) => d.bounds.y + d.bounds.h));
  check(
    Math.min(low, high) >= MIN_AISLE,
    `${room.label} leaves ${Math.min(low, high).toFixed(2)} m between its seating and a side wall — ` +
      `that is not an aisle (${low.toFixed(2)} m one side, ${high.toFixed(2)} m the other)`,
  );
}

// --- the modelled seats against the seats printed on the plan --------------
// The seat counts have been a sanity check on room AREA since the rooms were
// measured. Now that the seating is laid out row by row they are a check on
// the layout itself: aisles, taper, row pitch and seat pitch all have to be
// right together for a room to come out with the right number of seats in it.
//
// The building total is what the fan in `widthAt` is tuned against, and it
// lands within ten seats of the plan. Individual rooms drift either way by up
// to a fifth, and that is the plan's own inconsistency as much as ours: Rooms
// 4 and 9 are within a metre of each other in both dimensions and are printed
// with 364 and 426 seats. The fixed aisles — 4.4 m of frontage and 4.5 m of
// depth whatever the room — are the rest of it, and they cost a 200-seat room
// proportionally far more than a 700-seat one. Not worth shrinking an aisle a
// robot has to drive through.
const seatCount = new Map();
for (const piece of KINEPOLIS.decor) {
  if (piece.material !== 'seat') continue;
  const cx = piece.bounds.x + piece.bounds.w / 2;
  const cy = piece.bounds.y + piece.bounds.h / 2;
  const room = auditoria.find(
    (r) =>
      piece.floor === r.floor &&
      cx >= r.bounds.x && cx <= r.bounds.x + r.bounds.w &&
      cy >= r.bounds.y && cy <= r.bounds.y + r.bounds.h,
  );
  check(room !== undefined, `a seat at ${cx.toFixed(1)}, ${cy.toFixed(1)} is not in any auditorium`);
  if (room) seatCount.set(room.id, (seatCount.get(room.id) ?? 0) + 1);
}

let modelled = 0;
let printed = 0;
console.log('\nseats, modelled against the plan:');
for (const room of auditoria) {
  const n = Number(room.label.replace('Room ', ''));
  const built = seatCount.get(room.id) ?? 0;
  modelled += built;
  printed += SEATS[n];
  const off = (built - SEATS[n]) / SEATS[n];
  console.log(
    `  ${room.label.padEnd(8)} ${String(built).padStart(4)} modelled  ${String(SEATS[n]).padStart(4)} printed  ${(off * 100).toFixed(0).padStart(4)}%`,
  );
  check(built > 0, `${room.label} has no seats in it`);
  check(
    Math.abs(off) < 0.25,
    `${room.label} models ${built} seats against ${SEATS[n]} printed — ${(off * 100).toFixed(0)}% out`,
  );
}
check(
  Math.abs(modelled - printed) / printed < 0.03,
  `the building models ${modelled} seats against ${printed} printed — more than 3% out`,
);

// Rows must be laid out at the pitch the plan was SCALED by, or floor 1 is
// measured with one ruler and furnished with another.
check(ROW_PITCH === 1.0, `row pitch is ${ROW_PITCH} m; the auditorium plan was scaled at 1.0`);

// --- nothing drawn may stand outside the room it belongs to ----------------
// Dressing is not collided with, so nothing else would ever notice a sign
// hanging in the corridor or a row of seats pushed through a party wall.
for (const piece of KINEPOLIS.decor) {
  const b = piece.bounds;
  // Furniture has to be wholly inside a room. A WALL face — the pieces with no
  // material, cut from a wall so it can follow a rake down — is centred on a
  // room's edge by construction, so half of it is legitimately outside and
  // only its centre line can be tested.
  const whole = piece.material !== undefined;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const inside = KINEPOLIS.rooms.some((r) =>
    whole
      ? b.x >= r.bounds.x - EPS && b.x + b.w <= r.bounds.x + r.bounds.w + EPS &&
        b.y >= r.bounds.y - EPS && b.y + b.h <= r.bounds.y + r.bounds.h + EPS &&
        r.floor === piece.floor
      : r.floor === piece.floor &&
        cx >= r.bounds.x - EPS && cx <= r.bounds.x + r.bounds.w + EPS &&
        cy >= r.bounds.y - EPS && cy <= r.bounds.y + r.bounds.h + EPS,
  );
  check(inside, `a piece of ${piece.material ?? 'wall'} at ${b.x.toFixed(1)}, ${b.y.toFixed(1)} is inside no room`);
}

// --- the letters on the stage ----------------------------------------------
// They are the one object in the building a judge will recognise instantly, so
// they have to be in the right rooms, on the stage rather than in the seating,
// and solid to a robot.
const twoBiggest = [...auditoria].sort((a, b) => area(b.bounds) - area(a.bounds)).slice(0, 2);
const signRooms = new Set();
for (const piece of KINEPOLIS.decor) {
  if (piece.material !== 'sign' && piece.material !== 'signAccent') continue;
  const cx = piece.bounds.x + piece.bounds.w / 2;
  const cy = piece.bounds.y + piece.bounds.h / 2;
  const room = auditoria.find(
    (r) =>
      cx >= r.bounds.x && cx <= r.bounds.x + r.bounds.w &&
      cy >= r.bounds.y && cy <= r.bounds.y + r.bounds.h,
  );
  if (room) signRooms.add(room.id);

  // On the stage: within 2 m of the screen wall, which is the end of the room
  // AWAY from the corridor.
  if (room) {
    const screenX = Math.abs(room.bounds.x) > Math.abs(room.bounds.x + room.bounds.w)
      ? room.bounds.x
      : room.bounds.x + room.bounds.w;
    check(
      Math.abs(cx - screenX) < 2,
      `${room.label}: a letter stands ${Math.abs(cx - screenX).toFixed(1)} m off the screen wall — that is in the seating`,
    );
  }
}
check(signRooms.size === 2, `expected letters in 2 rooms, found ${signRooms.size}`);
for (const room of twoBiggest) {
  check(signRooms.has(room.id), `${room.label} is one of the two biggest rooms and has no letters on its stage`);
}

// --- the presenter's desk --------------------------------------------------
// One in every room, on the stage, clear of everything else, and with room to
// get past it. That last one is the check that earns its keep: in half the
// rooms the desk stands at the same end as the doors, so the gap between it
// and the side wall is the only way onto the stage, and Biggy is 1.44 m wide.
//
// Scoped to the auditorium level, because 'desk' is a MATERIAL and not a role:
// the reception counter downstairs is made of the same stuff and is not a
// lectern. Counting every piece of desk in the building made adding one to the
// concourse look like a fifteenth auditorium.
const desks = KINEPOLIS.obstacles.filter((o) => o.material === 'desk' && o.floor === 1);
check(
  desks.length === auditoria.length * 2,
  `expected a lectern and a table in each of ${auditoria.length} rooms, found ${desks.length} pieces`,
);

for (const room of auditoria) {
  const b = room.bounds;
  const mine = desks.filter(
    (o) =>
      o.bounds.x >= b.x - EPS && o.bounds.x + o.bounds.w <= b.x + b.w + EPS &&
      o.bounds.y >= b.y - EPS && o.bounds.y + o.bounds.h <= b.y + b.h + EPS,
  );
  check(mine.length === 2, `${room.label} has ${mine.length} pieces of presenter's desk, expected 2`);
  if (mine.length !== 2) continue;

  // The screen wall is the end of the room away from the corridor.
  const screenX = Math.abs(b.x) > Math.abs(b.x + b.w) ? b.x : b.x + b.w;

  // The gap between the north wall and the nearest piece of desk.
  const gap = Math.min(...mine.map((o) => b.y + b.h - (o.bounds.y + o.bounds.h)));
  check(
    gap >= BIGGY_WIDTH + 0.2,
    `${room.label}: only ${gap.toFixed(2)} m between the wall and the presenter's desk — Biggy is ${BIGGY_WIDTH} m wide and could not reach the stage`,
  );

  for (const piece of mine) {
    const cx = piece.bounds.x + piece.bounds.w / 2;
    check(
      Math.abs(cx - screenX) < 2,
      `${room.label}: the presenter's desk stands ${Math.abs(cx - screenX).toFixed(1)} m off the screen wall — that is in the seating`,
    );
    for (const other of KINEPOLIS.obstacles) {
      if (other === piece || other.floor !== 1 || other.material === 'desk') continue;
      check(
        !overlaps(piece.bounds, other.bounds),
        `${room.label}: the presenter's desk overlaps something else on the stage`,
      );
    }
  }
}

// --- the rake, which is a level change and not a texture -------------------
// An auditorium floor DROPS from the corridor to the stage, one building riser
// per row of seats. Three things have to agree about that number or the room
// comes apart: the rake on the room, the plate the stage stands on, and the
// steps a robot actually walks down. They are derived from one place, so this
// checks the derivation rather than trusting it.
const RISER = 0.18;
const rakes = KINEPOLIS.links.filter((l) => l.id.startsWith('rake-'));
check(rakes.length === auditoria.length, `expected one rake per auditorium, found ${rakes.length}`);

console.log('\nthe rake, room by room:');
for (const room of auditoria) {
  const n = Number(room.label.replace('Room ', ''));
  const rake = KINEPOLIS.links.find((l) => l.id === `rake-${n}`);
  const stage = KINEPOLIS.rooms.find((r) => r.id === `aud-${n}-stage`);
  check(rake !== undefined, `${room.label} has no rake`);
  check(stage !== undefined, `${room.label} has no stage plate`);
  if (!rake || !stage) continue;

  const steps = Math.round(rake.rise / RISER);
  console.log(
    `  ${room.label.padEnd(8)} ${steps.toString().padStart(3)} steps  ${rake.rise.toFixed(2)} m drop  ${((rake.rise / rake.bounds.w) * 100).toFixed(0)}% rake`,
  );

  check(
    Math.abs(rake.rise - steps * RISER) < 1e-9,
    `${room.label}: the rake is ${rake.rise} m, which is not a whole number of ${RISER} m risers`,
  );
  check(
    Math.abs(rake.bounds.w - steps * 1.0) < 1e-9,
    `${room.label}: ${steps} steps over ${rake.bounds.w.toFixed(2)} m — a step has to be one row deep or the seats stand between treads`,
  );
  // The top of the rake is the corridor you walk in from; the bottom is the
  // stage. Both stated absolutely, so neither can drift.
  check(
    Math.abs(rake.base + rake.rise) < 1e-9,
    `${room.label}: the top of the rake is ${(rake.base + rake.rise).toFixed(2)} m off the corridor it opens onto`,
  );
  check(
    Math.abs((stage.elevation ?? 0) - rake.base) < 1e-9,
    `${room.label}: the stage is at ${stage.elevation} m and the foot of the rake at ${rake.base} m`,
  );
  check(rake.riser === RISER, `${room.label}: the rake's riser is ${rake.riser}, not the building's ${RISER}`);
  // The room states its own rake for the seating to read. If it and the link
  // ever disagree, the seats stand somewhere the steps are not.
  check(
    Math.abs((room.rake ?? 0) - rake.rise) < 1e-9,
    `${room.label} says it rakes ${room.rake} m and its steps drop ${rake.rise} m`,
  );

  const grade = rake.rise / rake.bounds.w;
  check(grade > 0.08 && grade < 0.3, `${room.label} rakes at ${(grade * 100).toFixed(0)}% — a cinema is 10-25%`);

  // Who gets to the front row. This is the whole point of modelling it.
  check(
    rake.riser > ROBOTS.Biggy.maxStepRise,
    `${room.label}: Biggy can walk down the rake, so the front row is not a puzzle`,
  );
  check(
    rake.riser <= ROBOTS.Droid.maxStepRise,
    `${room.label}: not even Droid can reach the stage`,
  );
}

// --- every link must actually join the two places it claims to join --------
// Two staircases out of the hall, the grand flight out of the concourse, plus
// the steps and the ramp down from the concourse into the hall.
// Five flights and ramps, plus one rake per auditorium.
check(
  KINEPOLIS.links.length === 5 + auditoria.length,
  `expected ${5 + auditoria.length} links, found ${KINEPOLIS.links.length}`,
);
for (const link of KINEPOLIS.links) {
  for (const floor of new Set([link.from, link.to])) {
    const lands = KINEPOLIS.rooms.some((r) => r.floor === floor && overlaps(link.bounds, r.bounds));
    check(lands, `${link.id} touches no room on floor ${floor} — it leads nowhere`);
  }
  check(link.rise > 0, `${link.id} has no rise`);
}

// A robot has to be able to get upstairs from where a chapter drops it.
const upstairs = KINEPOLIS.links.filter((l) => l.from !== l.to);
check(upstairs.length === 3, `expected 3 routes to the auditorium level, found ${upstairs.length}`);

console.log('\nwho can use what:');
for (const link of KINEPOLIS.links) {
  // The fourteen rakes are one answer, not fourteen. They are all the same
  // stair at different lengths.
  if (link.id.startsWith('rake-') && link.id !== 'rake-8') continue;
  const run = link.axis === 'y' ? link.bounds.h : link.bounds.w;
  const ramp = link.id.includes('ramp');
  const slope = link.rise / run;
  const who = Object.entries(ROBOTS)
    .filter(([, r]) => (ramp ? slope <= r.maxSlope : r.maxStepRise >= RISER))
    .map(([n]) => n);
  console.log(`  ${link.id.padEnd(17)} ${ramp ? `ramp ${(slope * 100).toFixed(0)}%` : `stairs`.padEnd(9)}  ${who.join(', ') || 'NOBODY'}`);
}

// Biggy climbs nothing, so it must have at least one route somewhere, or it is
// sealed into whichever room it spawns in.
const biggyRoutes = KINEPOLIS.links.filter((l) => l.id.includes('ramp'));
check(biggyRoutes.length > 0, 'Biggy cannot climb, and there is no ramp anywhere — it would be sealed in');

// --- a staircase you can actually put a foot on -----------------------------
//
// A flight's depth is not a free choice: it is the rise divided by the riser,
// times the tread. Typed in off a drawing instead, the grand flight out of the
// reception concourse came out 5.6 m deep for a 5.0 m rise — 28 steps of 20 cm
// at an 89% gradient, which is not a staircase, and which drew as a cliff
// standing in the middle of the room you enter the building through.
//
// Nothing else in the venue was wrong, and nothing in the simulation noticed:
// `canTraverse` asks the link what its riser is and the link said 0.18, so
// every robot that should climb it did. It is only wrong in metres.

/**
 * Shallowest tread worth calling a step, metres. Regulations put the
 * comfortable figure near 0.28 and the legal minimum around 0.22; this is
 * under both, because the point is to catch geometry that is impossible
 * rather than to grade it.
 */
const MIN_GOING = 0.25;

for (const link of KINEPOLIS.links) {
  if (link.riser <= 0) continue; // a ramp has no tread; maxSlope judges those
  const run = link.axis === 'y' ? link.bounds.h : link.bounds.w;
  const steps = link.rise / link.riser;
  const going = run / steps;
  check(
    going >= MIN_GOING,
    `${link.id} climbs ${link.rise.toFixed(2)} m in ${run.toFixed(2)} m: ` +
      `${steps.toFixed(0)} steps of ${(going * 100).toFixed(0)} cm tread, a ` +
      `${((link.rise / run) * 100).toFixed(0)}% gradient. Not a staircase`,
  );
}

// --- the flight a robot climbs and the flight it can see --------------------
//
// A robot's feet on a staircase are put at `Traversal.surfaceHeight`, measured
// from the STOREY datum. The renderer has to draw the tread it is standing on
// at the same height, and the two are computed in different files from
// different fields — which is exactly the arrangement that drifts.
//
// It drifted. The renderer added the elevation of the plate under each tread,
// which is right for a wall and wrong for a flight: `Link.base` already says
// how far up the storey the flight starts. The grand staircase begins in the
// reception concourse, 1.2 m up, so every one of its treads was drawn 1.2 m
// into the ceiling, and the wall bands beside a rake hung three metres under
// the floor they belong to. Neither is an exception; both are one metre
// counted twice.
//
// So: for every flight, compare what the renderer draws against what the
// simulation makes a robot stand on.

/** What `BlockoutRenderer.datumFor` does. Keep the two in step. */
const datumFor = (piece) =>
  piece.linkId
    ? 0
    : groundAt(KINEPOLIS, piece.floor, piece.bounds.x + piece.bounds.w / 2, piece.bounds.y + piece.bounds.h / 2);

/**
 * A tread is a flat slab spanning one step and the simulation's surface is a
 * continuous ramp, so at a tread's centre the two differ by half a riser
 * whatever anyone does. This has to clear that without clearing a real fault,
 * and the smallest real fault available is the 1.2 m concourse.
 */
const TREAD_SLACK = 0.25;

for (const link of KINEPOLIS.links) {
  const flightArea = link.bounds.w * link.bounds.h;
  const floors = link.from === link.to ? [link.from] : [link.from, link.to];
  for (const floor of floors) {
    for (const piece of KINEPOLIS.obstacles) {
      if (piece.linkId !== link.id || piece.floor !== floor) continue;
      // The shaft skins and the landing at the bottom of a well carry the same
      // linkId — they belong to the flight — but nothing walks on them.
      const share = (piece.bounds.w * piece.bounds.h) / flightArea;
      if (share > 0.6 || piece.bounds.w < 0.1 || piece.bounds.h < 0.1) continue;

      const cx = piece.bounds.x + piece.bounds.w / 2;
      const cy = piece.bounds.y + piece.bounds.h / 2;
      const drawn = datumFor(piece) + piece.height;
      const walked = surfaceHeight(link, cx, cy, floor);
      check(
        Math.abs(drawn - walked) <= TREAD_SLACK,
        `${link.id} on floor ${floor}: a robot at ${cx.toFixed(1)}, ${cy.toFixed(1)} stands at ` +
          `${walked.toFixed(2)} m but the tread there is drawn at ${drawn.toFixed(2)} m`,
      );
    }
  }
}

/**
 * Same sum, for the walls cut to a flight's bands — and a looser tolerance,
 * because those bands are coarsened two treads to a step and keep the LOWER of
 * the pair, so a wall may honestly sit two risers under the surface beside it.
 * Still nowhere near the metres a double-counted plate is worth.
 */
const WALL_SLACK = 0.45;

for (const piece of KINEPOLIS.decor) {
  if (!piece.linkId) continue;
  const link = KINEPOLIS.links.find((l) => l.id === piece.linkId);
  if (!link) continue;
  const cx = piece.bounds.x + piece.bounds.w / 2;
  const cy = piece.bounds.y + piece.bounds.h / 2;
  const bottom = datumFor(piece) + (piece.base ?? 0);
  const beside = surfaceHeight(link, cx, cy, piece.floor);
  check(
    Math.abs(bottom - beside) <= WALL_SLACK,
    `${piece.linkId}: the flight at ${cx.toFixed(1)}, ${cy.toFixed(1)} is at ${beside.toFixed(2)} m but ` +
      `the wall beside it is drawn from ${bottom.toFixed(2)} m — it will not meet the floor`,
  );
}

// --- nothing the building is built of may hang in the air -------------------
//
// A wall stands on the plate under it, and `groundAt` is asked for that plate
// AT THE WALL'S CENTRE. A wall long enough to span two plates therefore takes
// the height of whichever one its midpoint happens to land on — and a party
// wall between two auditoriums sits exactly on the line between them, where
// the midpoint may land on neither room's stage and read the flat floor of the
// room instead. Three walls hung four metres over the stage they belong to.
//
// Only walls are checked: they are the pieces that must meet the floor. Seats
// stand on tiers that are deliberately not drawn under them, and the letters
// on a keynote stage are raised on purpose, so both would be noise here.

const MAX_DRAWN_HEIGHT = 2.7; // BlockoutRenderer's cutaway. Keep in step.
const drawnPieces = [
  ...KINEPOLIS.obstacles.filter((o) => !o.hidden),
  ...KINEPOLIS.decor,
];
const inBounds = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
const drawnTop = (p) =>
  datumFor(p) + Math.min(p.height, p.linkId ? Infinity : MAX_DRAWN_HEIGHT);

/**
 * The highest thing DRAWN at a point, at or below `ceiling`.
 *
 * Drawn, not modelled: a room's plate does not count where the room has cut a
 * stairwell or a rake out of it, because a void is not a floor. That
 * distinction is the whole check — every one of the three faults was a wall
 * standing at the height of a plate with a hole in it.
 */
function drawnUnder(floor, x, y, ceiling) {
  let best = -Infinity;
  for (const r of KINEPOLIS.rooms) {
    if (r.floor !== floor || !inBounds(r.bounds, x, y)) continue;
    if (r.voids?.some((v) => inBounds(v, x, y))) continue;
    const z = r.elevation ?? 0;
    if (z <= ceiling + 1e-6) best = Math.max(best, z);
  }
  for (const p of drawnPieces) {
    if (p.floor !== floor || !inBounds(p.bounds, x, y)) continue;
    const t = drawnTop(p);
    if (t <= ceiling + 1e-6) best = Math.max(best, t);
  }
  return best;
}

/** How far a wall may sit off the floor before it reads as floating. */
const FLOAT_SLACK = 0.4;

for (const piece of drawnPieces) {
  if (piece.material !== undefined) continue; // no material means the building itself
  if (piece.linkId) continue; // a tread hangs in its own well, on purpose
  const bottom = datumFor(piece) + (piece.base ?? 0);
  let highest = -Infinity;
  for (const fx of [0.02, 0.5, 0.98]) {
    for (const fy of [0.02, 0.5, 0.98]) {
      const x = piece.bounds.x + piece.bounds.w * fx;
      const y = piece.bounds.y + piece.bounds.h * fy;
      highest = Math.max(highest, drawnUnder(piece.floor, x, y, bottom));
    }
  }
  check(
    bottom - highest <= FLOAT_SLACK,
    `a wall at ${piece.bounds.x.toFixed(1)}, ${piece.bounds.y.toFixed(1)} ` +
      `(${piece.bounds.w.toFixed(1)} x ${piece.bounds.h.toFixed(1)} m) is drawn from ${bottom.toFixed(2)} m ` +
      `with nothing under it above ${highest === -Infinity ? 'anything at all' : highest.toFixed(2) + ' m'}`,
  );
}

// ---------------------------------------------------------------------------

console.log(`\nrooms       ${KINEPOLIS.rooms.length}`);
console.log(`obstacles   ${KINEPOLIS.obstacles.length}`);
console.log(`decor       ${KINEPOLIS.decor.length} drawn, never collided`);
console.log(`desks       ${desks.length / 2} presenter's desks, one a room`);
console.log(`seats       ${modelled} modelled against ${printed} printed`);
console.log(`hall        ${hall.bounds.w} × ${hall.bounds.h} m box, ${HALL_FLOOR_M2.toFixed(0)} m² floor (plan: ${HALL_AREA_M2})`);
console.log(`corridor    ${corridor.bounds.w} × ${corridor.bounds.h.toFixed(1)} m`);
console.log(`keynote     ${keynote.label}, ${area(keynote.bounds).toFixed(0)} m²`);
console.log(`links       ${KINEPOLIS.links.map((l) => l.id).join(', ')}`);
console.log('\nauditoriums, south to north:');
for (const r of auditoria) {
  console.log(`  ${r.label.padEnd(8)} ${area(r.bounds).toFixed(0).padStart(4)} m²  ${r.bounds.w.toFixed(1).padStart(5)} deep × ${r.bounds.h.toFixed(1)} frontage`);
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\nOK — the venue agrees with the plans and with itself.\n');
