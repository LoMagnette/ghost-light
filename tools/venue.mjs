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
    files: [join(repo, 'src/venue/kinepolis.ts'), join(repo, 'src/core/Venue.ts')],
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

const { KINEPOLIS, SPAWNS, HALL_AREA_M2, HALL_FLOOR_M2, KEYNOTE_ROOM } = await import(
  pathToFileURL(join(out, 'venue/kinepolis.js'))
);
rmSync(out, { recursive: true, force: true });

// --json and --svg exist because a building cannot be checked by driving
// around inside it. The first pass of this venue passed every numeric test and
// was still visibly wrong against the drawings — rooms too wide and too
// shallow — and that was only caught by putting a plan of the built geometry
// next to the real plan. Do that whenever you touch kinepolis.ts.
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rooms: KINEPOLIS.rooms, obstacles: KINEPOLIS.obstacles, links: KINEPOLIS.links, spawns: SPAWNS }));
  process.exit(0);
}

if (process.argv.includes('--svg')) {
  const { writeFileSync } = await import('node:fs');
  const FILL = {
    auditorium: '#cfe2f3', corridor: '#ededed', hall: '#d9ead3',
    foyer: '#fff2cc', service: '#f4cccc', stairs: '#dddddd',
  };
  for (const floor of [0, 1]) {
    const rooms = KINEPOLIS.rooms.filter((r) => r.floor === floor);
    const obs = KINEPOLIS.obstacles.filter((o) => o.floor === floor);
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
const DOOR_MIN = 2.0;
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

// --- every link must actually join the two places it claims to join --------
// Two staircases out of the hall, the grand flight out of the concourse, plus
// the steps and the ramp down from the concourse into the hall.
check(KINEPOLIS.links.length === 5, `expected 5 links, found ${KINEPOLIS.links.length}`);
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

// Who can use what. maxStepRise is measured against the building's riser, so
// this is the stair rule from SPEC section 5 read straight off the geometry.
const RISER = 0.18;
const ROBOTS = {
  Voxxy: { maxStepRise: 0.2, maxSlope: 0.45 },
  Droid: { maxStepRise: 0.18, maxSlope: 0.38 },
  Biggy: { maxStepRise: 0.0, maxSlope: 0.35 },
};
console.log('\nwho can use what:');
for (const link of KINEPOLIS.links) {
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

// ---------------------------------------------------------------------------

console.log(`\nrooms       ${KINEPOLIS.rooms.length}`);
console.log(`obstacles   ${KINEPOLIS.obstacles.length}`);
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
