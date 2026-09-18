/**
 * Movement measurement harness.
 *
 * The 20 realism points are decided by numbers in RobotSpec.ts, and those
 * numbers lie. `stoppingDistance()` there is the TEXTBOOK answer — v^2/2a with
 * nothing else acting. The robot the player actually drives is also fighting
 * rolling resistance, and it never reaches `maxSpeed` at all because the drive
 * force tapers to zero as it approaches. So the published spec table and the
 * felt behaviour drift apart silently.
 *
 * This runs the REAL Sim at the REAL fixed timestep and measures what a player
 * would experience, then holds it against the design targets. It is the reason
 * tuning can be done honestly by someone who cannot see or feel the game.
 *
 * It needs no browser and no native binaries: tsc emits src/core to a temp
 * directory as CommonJS and we import that. core/ imports nothing outside
 * itself, which is rule 4 of the architecture paying for itself.
 *
 * Usage:
 *   npm run physics           # measure and check against targets
 *   npm run physics -- --csv  # same, as CSV for a spreadsheet
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'devoxx-phys-'));

try {
  execFileSync(
    process.execPath,
    [
      join(repo, 'node_modules/typescript/bin/tsc'),
      join(repo, 'src/core/Sim.ts'),
      join(repo, 'src/core/RobotSpec.ts'),
      '--outDir', out,
      '--module', 'commonjs',
      '--moduleResolution', 'node',
      '--target', 'es2022',
      '--strict',
      '--skipLibCheck',
    ],
    { stdio: 'inherit' },
  );
} catch {
  console.error('tsc failed — fix the type errors before measuring.');
  process.exit(1);
}

const { Body } = await import(pathToFileURL(join(out, 'Body.js')));
const { Sim, makeActor, FIXED_DT } = await import(pathToFileURL(join(out, 'Sim.js')));
const { ROBOTS, stoppingDistance, accelTimeConstant } = await import(
  pathToFileURL(join(out, 'RobotSpec.js'))
);

rmSync(out, { recursive: true, force: true });

/** An empty world. We are measuring the robot, not the building. */
const VOID = { rooms: [], obstacles: [], links: [], extents: { 0: null, 1: null } };

const EAST = { dirX: 1, dirY: 0, throttle: 1, braking: false };
const COAST = { dirX: 0, dirY: 0, throttle: 0, braking: false };
const BRAKE = { dirX: 0, dirY: 0, throttle: 0, braking: true };
const NORTH = { dirX: 0, dirY: 1, throttle: 1, braking: false };
const WEST = { dirX: -1, dirY: 0, throttle: 1, braking: false };

/** Run one body through the real Sim, stepping until `done` or `limit` seconds. */
function run(spec, input, limit, done, seed) {
  const sim = new Sim(VOID);
  const actor = makeActor(new Body(spec, 0, 0), 0);
  sim.add(actor);
  if (seed) seed(actor.body);

  let t = 0;
  const feed = typeof input === 'function' ? input : () => input;
  while (t < limit) {
    Object.assign(actor.input, feed(t, actor.body));
    // Drive the accumulator exactly one fixed step at a time: we want the
    // simulation's own clock, not a frame rate.
    sim.advance(FIXED_DT);
    t += FIXED_DT;
    if (done && done(actor.body, t)) break;
  }
  return { body: actor.body, t };
}

/** Sustained speed with the throttle pinned — the real top speed, not the spec. */
function cruiseSpeed(spec) {
  return run(spec, EAST, 60).body.speed;
}

/** Seconds to reach a fraction of the cruise speed from rest. */
function timeToFraction(spec, cruise, fraction) {
  const target = cruise * fraction;
  const { t } = run(spec, EAST, 60, (b) => b.speed >= target);
  return t;
}

/** Metres travelled from cruise to a dead stop, braking. */
function brakingDistance(spec) {
  const cruise = cruiseSpeed(spec);
  const { body } = run(
    spec,
    (t) => (t < 30 ? EAST : BRAKE),
    60,
    (b, t) => t > 30 && b.speed < 0.05,
    null,
  );
  // The body started braking at the moment it crossed 30 s; re-run cleanly to
  // get the distance rather than subtracting a remembered position.
  const start = run(spec, EAST, 30).body;
  return { cruise, distance: body.x - start.x };
}

/** Metres travelled coasting from cruise, throttle released, no brake. */
function coastingDistance(spec) {
  const start = run(spec, EAST, 30).body;
  const { body } = run(
    spec,
    (t) => (t < 30 ? EAST : COAST),
    240,
    (b, t) => t > 30 && b.speed < 0.05,
  );
  return body.x - start.x;
}

/**
 * Deceleration actually achieved, m/s^2, when braking and when reversing.
 *
 * These two must not invert. If holding the opposite direction stops a robot
 * faster than the brake does, "hard to stop" is a lie the player disproves by
 * accident, and with it goes the argument for the whole heavy cast.
 */
function decelRates(spec) {
  const sample = (input) => {
    const before = run(spec, EAST, 30).body.speed;
    let after = 0;
    const { t } = run(
      spec,
      (t) => (t < 30 ? EAST : input),
      120,
      (b, t) => {
        if (t <= 30) return false;
        after = b.speed;
        return b.speed < before * 0.5;
      },
    );
    return (before - after) / (t - 30);
  };
  return { braking: sample(BRAKE), reversing: sample(WEST) };
}

/** Seconds to reverse travel direction at cruise: the felt cost of a mistake. */
function reversalTime(spec) {
  const { t } = run(
    spec,
    (t) => (t < 30 ? EAST : WEST),
    120,
    (b, t) => t > 30 && b.vx < 0,
  );
  return t - 30;
}

/**
 * Turn radius at cruise: hold east until settled, then steer north and measure
 * how far the robot carries on east before its velocity is mostly northward.
 * This is what "Biggy carves, Voxxy pivots" means as a number.
 */
function turnRadius(spec) {
  const { body } = run(
    spec,
    (t) => (t < 30 ? EAST : NORTH),
    120,
    (b, t) => t > 30 && b.vy > b.speed * 0.95,
  );
  const start = run(spec, EAST, 30).body;
  return Math.hypot(body.x - start.x, body.y - start.y);
}

// ---------------------------------------------------------------------------
// Design targets. These mirror SPEC.md section 5 — if you change one, change
// both, and say why in the commit.
// ---------------------------------------------------------------------------

const TARGETS = {
  voxxy: { cruise: [5.4, 6.0], stop: [1.2, 2.0], t50: [0.3, 0.7], reverse: [0.4, 1.0] },
  droid: { cruise: [3.8, 4.2], stop: [1.4, 2.4], t50: [0.45, 1.0], reverse: [0.6, 1.6] },
  biggy: { cruise: [3.0, 3.4], stop: [3.4, 5.2], t50: [0.9, 2.0], reverse: [1.8, 4.0] },
};

const rows = [];
for (const id of ['voxxy', 'droid', 'biggy']) {
  const spec = ROBOTS[id];
  const { cruise, distance } = brakingDistance(spec);
  const decel = decelRates(spec);
  rows.push({
    id,
    name: spec.name,
    mass: spec.mass,
    nominalTop: spec.maxSpeed,
    cruise,
    reach: cruise / spec.maxSpeed,
    momentum: spec.mass * cruise,
    nominalMomentum: spec.mass * spec.maxSpeed,
    t50: timeToFraction(spec, cruise, 0.5),
    t95: timeToFraction(spec, cruise, 0.95),
    tau: accelTimeConstant(spec),
    initialAccel: spec.driveForce / spec.mass,
    brakeDecel: decel.braking,
    reverseDecel: decel.reversing,
    stop: distance,
    textbookStop: stoppingDistance(spec),
    coast: coastingDistance(spec),
    reverse: reversalTime(spec),
    radius: turnRadius(spec),
  });
}

if (process.argv.includes('--csv')) {
  console.log('robot,mass,nominal_top,cruise,reach,momentum,t50,t95,stop,coast,reverse,turn_radius');
  for (const r of rows) {
    console.log(
      [r.name, r.mass, r.nominalTop, r.cruise, r.reach, r.momentum, r.t50, r.t95, r.stop, r.coast, r.reverse, r.radius]
        .map((v) => (typeof v === 'number' ? v.toFixed(3) : v))
        .join(','),
    );
  }
  process.exit(0);
}

const n = (v, d = 2) => v.toFixed(d).padStart(8);

console.log('\nMeasured in the real Sim at 120 Hz. "textbook" is the RobotSpec formula.\n');
console.log('                       Voxxy     Droid     Biggy');
const line = (label, pick, d = 2) =>
  console.log(label.padEnd(20) + rows.map((r) => n(pick(r), d)).join('  '));

line('mass (kg)', (r) => r.mass, 0);
line('nominal top (m/s)', (r) => r.nominalTop);
line('actual cruise (m/s)', (r) => r.cruise);
line('  as % of nominal', (r) => r.reach * 100, 1);
line('momentum (kg·m/s)', (r) => r.momentum, 0);
line('  nominal', (r) => r.nominalMomentum, 0);
console.log('');
line('accel at rest m/s²', (r) => r.initialAccel);
line('0→50% cruise (s)', (r) => r.t50);
line('0→95% cruise (s)', (r) => r.t95);
line('  time constant τ', (r) => r.tau);
console.log('');
line('braking dist (m)', (r) => r.stop);
line('  design intent', (r) => r.textbookStop);
line('coasting dist (m)', (r) => r.coast);
line('reversal (s)', (r) => r.reverse);
line('turn radius (m)', (r) => r.radius);
console.log('');
line('brake decel m/s²', (r) => r.brakeDecel);
line('reverse decel m/s²', (r) => r.reverseDecel);

// ---------------------------------------------------------------------------

const failures = [];
for (const r of rows) {
  const t = TARGETS[r.id];
  const check = (label, value, [lo, hi]) => {
    if (value < lo || value > hi) {
      failures.push(`${r.name}: ${label} ${value.toFixed(2)} outside [${lo}, ${hi}]`);
    }
  };
  check('cruise speed', r.cruise, t.cruise);
  check('braking distance', r.stop, t.stop);
  check('0→50% cruise', r.t50, t.t50);
  check('reversal', r.reverse, t.reverse);

  // The brake must always be the best way to stop. See Body.ts for why this
  // is not automatic.
  if (r.reverseDecel > r.brakeDecel * 1.02) {
    failures.push(
      `${r.name}: reversing sheds speed at ${r.reverseDecel.toFixed(2)} m/s² but braking only ${r.brakeDecel.toFixed(2)} — the brake must not be the slow option`,
    );
  }
}

// The cast only works if the robots are genuinely different machines. These
// are the relationships the design rests on, not arbitrary thresholds.
const [voxxy, droid, biggy] = rows;
if (!(biggy.stop > voxxy.stop * 2.2)) {
  failures.push(`Biggy stops in ${biggy.stop.toFixed(2)} m vs Voxxy ${voxxy.stop.toFixed(2)} m — not heavy enough to read as heavy`);
}
if (!(biggy.momentum > droid.momentum * 1.5)) {
  failures.push('Biggy does not carry decisively more momentum than Droid');
}
if (!(voxxy.cruise > droid.cruise && droid.cruise > biggy.cruise)) {
  failures.push('Speed order is not Voxxy > Droid > Biggy');
}
if (!(biggy.radius > voxxy.radius * 2)) {
  failures.push(`Biggy turns in ${biggy.radius.toFixed(2)} m vs Voxxy ${voxxy.radius.toFixed(2)} m — it should carve, not pivot`);
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('\nOK — all three robots are within their design envelope.\n');
