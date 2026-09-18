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

const { KINEPOLIS, SPAWNS, HALL_AREA_M2, KEYNOTE_ROOM } = await import(
  pathToFileURL(join(out, 'venue/kinepolis.js'))
);
rmSync(out, { recursive: true, force: true });

const area = (r) => r.w * r.h;
const overlaps = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// --- the hall against the figure printed on the plan -----------------------
const hall = KINEPOLIS.rooms.find((r) => r.id === 'hall');
const hallArea = area(hall.bounds);
const drift = Math.abs(hallArea - HALL_AREA_M2) / HALL_AREA_M2;
check(drift < 0.05, `hall is ${hallArea.toFixed(0)} m² against the plan's ${HALL_AREA_M2} m² (${(drift * 100).toFixed(1)}% out)`);

// --- auditoriums against their seat counts ---------------------------------
const auditoria = KINEPOLIS.rooms.filter((r) => r.kind === 'auditorium');
check(auditoria.length === 14, `expected 14 auditoriums, found ${auditoria.length}`);

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
for (const [name, spawn] of Object.entries(SPAWNS)) {
  const inside = KINEPOLIS.rooms.some(
    (r) =>
      r.floor === spawn.floor &&
      spawn.x >= r.bounds.x && spawn.x <= r.bounds.x + r.bounds.w &&
      spawn.y >= r.bounds.y && spawn.y <= r.bounds.y + r.bounds.h,
  );
  check(inside, `SPAWNS.${name} is not inside any room on floor ${spawn.floor}`);

  for (const o of KINEPOLIS.obstacles) {
    if (o.floor !== spawn.floor) continue;
    const cx = Math.min(Math.max(spawn.x, o.bounds.x), o.bounds.x + o.bounds.w);
    const cy = Math.min(Math.max(spawn.y, o.bounds.y), o.bounds.y + o.bounds.h);
    check(
      Math.hypot(spawn.x - cx, spawn.y - cy) >= CLEARANCE,
      `SPAWNS.${name} is inside or touching an obstacle — a robot would spawn in a wall`,
    );
  }
}

// --- both staircases must stand on floor and land in the corridor ----------
check(KINEPOLIS.links.length === 2, `expected 2 staircases, found ${KINEPOLIS.links.length}`);
for (const link of KINEPOLIS.links) {
  check(overlaps(link.bounds, hall.bounds), `${link.id} does not meet the exhibition hall`);
  check(overlaps(link.bounds, corridor.bounds), `${link.id} does not reach the corridor`);
}

// ---------------------------------------------------------------------------

console.log(`\nrooms       ${KINEPOLIS.rooms.length}`);
console.log(`obstacles   ${KINEPOLIS.obstacles.length}`);
console.log(`hall        ${hall.bounds.w} × ${hall.bounds.h} m = ${hallArea.toFixed(0)} m² (plan: ${HALL_AREA_M2})`);
console.log(`corridor    ${corridor.bounds.w} × ${corridor.bounds.h.toFixed(1)} m`);
console.log(`keynote     ${keynote.label}, ${area(keynote.bounds).toFixed(0)} m²`);
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
