/**
 * Physical specifications for the three robots.
 *
 * These numbers are the single most important tuning surface in the project.
 * "Do the robots move like machines with mass" is 20 of the 100 judging
 * points, and it is decided here rather than in the art.
 *
 * Read the derived figures in the comments before changing a value — the feel
 * of each robot is the RATIO between drive, brake and mass, not any one
 * number. Momentum p = mass * speed is what makes Biggy frightening and Voxxy
 * nimble, and it is why the masses are an order of magnitude apart.
 */

export type RobotId = 'voxxy' | 'droid' | 'biggy';

export interface RobotSpec {
  id: RobotId;
  name: string;

  /** Body mass in kilograms. Drives every acceleration in the sim. */
  mass: number;

  /** Maximum forward drive force in newtons. accel = drive / mass. */
  driveForce: number;

  /** Maximum braking force in newtons. Deliberately LOW for Biggy. */
  brakeForce: number;

  /** Top speed in metres per second on a flat floor. */
  maxSpeed: number;

  /**
   * Lateral grip in newtons — how hard the robot can push sideways to change
   * direction without sliding. Low grip means wide, heavy turns.
   */
  lateralGrip: number;

  /** Collision radius in metres (robots are capsules from above). */
  radius: number;

  /** Standing height in metres. Used for sprite scale and headroom checks. */
  height: number;

  /** Seconds per footfall at top speed. Drives step audio and camera shake. */
  strideTime: number;

  /**
   * Tallest single step this robot can get over, in metres.
   *
   * This is the stair rule, and it is deliberately a dimension rather than a
   * `canClimbStairs` flag: the same number decides kerbs, the lip of a seat
   * block and the 0.18 m risers throughout the Kinepolis. A robot either
   * clears the step in front of it or it does not, and the answer falls out of
   * the building rather than out of a list of exceptions.
   *
   * It is also the sharpest thing the three robots do differently, which is
   * worth 10 points on its own — see SPEC.md section 5.
   */
  maxStepRise: number;

  /**
   * Steepest gradient this robot can drive, as rise over run.
   *
   * DERIVED, not chosen. A body on a slope gets `mass * g * sin(theta)` of its
   * own weight pulling it back down, so the steepest gradient a robot can hold
   * at all is `driveForce / (mass * g)` — 0.92 for Voxxy, 0.46 for Droid, 0.18
   * for Biggy. These are 60% of that, leaving enough force over to actually
   * make progress rather than balance.
   *
   * Set them by taste and they become a lie the simulation quietly refuses to
   * honour: the first version had Biggy cleared for a 33% ramp it could not
   * climb, because 774 N of motor loses to 1333 N of gravity every time.
   * `npm run traverse` is what caught it.
   */
  maxSlope: number;

  /**
   * Heaviest load this machine will pick up, in kilograms.
   *
   * CHOSEN, not derived — the one capability gate that is not already a
   * dimension the robot had. The other three fall out of numbers above:
   * `maxStepRise` decides who climbs, `height` decides who can reach a
   * counter at 2 m, and `radius` decides who fits a 0.8 m gap between two
   * exhibition stands.
   *
   * What a load DOES is not decided here. It is added to `Body.payload` and
   * divides every force in the integrator, so a laden robot accelerates,
   * brakes, turns and climbs worse by exactly the arithmetic its own weight
   * implies. See `maxSlopeLoaded` for the one consequence that is not
   * automatic, and `docs/MECHANICS.md` §2 for why the whole design rests on
   * it.
   */
  payload: number;

  /** Body colour. Also used for this robot's UI accents. */
  tint: number;
  /**
   * The second colour in this machine's livery, off the model sheet.
   *
   * A fact about the robot rather than about the era, which is why it lives
   * here and not in a chapter palette: Biggy has an orange belly under a
   * blue-grey shell in every century. One colour made all three read as
   * monoliths; two is what makes a silhouette look manufactured.
   */
  trim: number;
  /**
   * The colour the building uses to say "this one is yours": the markers on
   * a job only this robot can do, and its name on the card.
   *
   * Not `tint`, because two of the three tints are greys — Droid's slab and
   * Biggy's shell — and a grey marker is a locked one. Each signal is the
   * brightest honest reading of the livery: Voxxy's orange, Droid's ochre
   * trim lifted to amber, Biggy's blue-grey lifted to a clear blue. Three
   * hues a long way apart, so they survive being eight pixels across, and
   * each marker carries a SHAPE as well so none of this rests on colour.
   */
  signal: number;
}

/** Gravity, m/s². Physical constant; nothing may redefine it. */
export const G = 9.81;

/**
 * Fraction of the theoretical gradient limit a robot is allowed to be spec'd
 * at, leaving enough force over to make progress rather than to balance.
 *
 * The `maxSlope` figures below are this times `driveForce / (mass · g)`. It is
 * a constant rather than three magic literals because a LOADED robot has to
 * re-derive the same number — see `maxSlopeLoaded`.
 */
export const SLOPE_SAFETY = 0.6;

export const VOXXY: RobotSpec = {
  id: 'voxxy',
  name: 'Voxxy',
  mass: 45,
  driveForce: 405, //  9.0 m/s^2 — off the mark immediately
  brakeForce: 540, // 12.0 m/s^2 — stops almost on the spot
  maxSpeed: 6.0, // momentum at top speed: 270 kg·m/s
  lateralGrip: 470,
  radius: 0.34,
  height: 1.15,
  strideTime: 0.28,
  maxStepRise: 0.20, // clears the building's 0.18 m risers with room to spare
  maxSlope: 0.55, //  60% of 405 N / (45 kg · g)
  payload: 10,  // a lanyard, a coffee, a bag of stickers. It is 45 kg itself
  tint: 0xff7a1a,
  trim: 0xf2f0ea, // the white bands round its legs and the ring round its eye
  signal: 0xff7a1a,
};

export const DROID: RobotSpec = {
  id: 'droid',
  name: 'Droid',
  mass: 190,
  driveForce: 855, //  4.5 m/s^2 — deliberate
  brakeForce: 950, //  5.0 m/s^2
  maxSpeed: 4.2, // momentum at top speed: 798 kg·m/s
  lateralGrip: 700,
  radius: 0.46,
  height: 2.05,
  strideTime: 0.46,
  maxStepRise: 0.18, // exactly the building's riser: these stairs and nothing steeper
  maxSlope: 0.27, //  60% of 855 N / (190 kg · g)
  payload: 90,  // a crate, and it still walks — reach and patience, laden
  tint: 0x454b52, // dark charcoal, off the sheet — it was a mid grey
  trim: 0xb07434, // the ochre trim on its shoulders and hips
  signal: 0xf2c23a,
};

export const BIGGY: RobotSpec = {
  id: 'biggy',
  name: 'Biggy',
  mass: 430,
  driveForce: 774, //  1.8 m/s^2 — slow to start
  brakeForce: 516, //  1.2 m/s^2 — hard to stop, by design
  maxSpeed: 3.4, // momentum at top speed: 1462 kg·m/s
  lateralGrip: 560,
  radius: 0.72,
  height: 1.35,
  strideTime: 0.62,
  maxStepRise: 0.0, // never. 430 kg on a staircase is an accident, not a route
  maxSlope: 0.11, //  60% of 774 N / (430 kg · g) — Biggy needs a gentle ramp
  payload: 400, // freight. Nearly its own mass again, and it shows in every metre
  tint: 0x5c6d80, // the sheet's weathered blue-grey
  trim: 0xd4622a, // the orange belly under the blue-grey shell
  signal: 0x5aa8ff,
};

export const ROBOTS: Record<RobotId, RobotSpec> = {
  voxxy: VOXXY,
  droid: DROID,
  biggy: BIGGY,
};

/**
 * Derived: the acceleration TIME CONSTANT, in seconds.
 *
 * Not the time to reach top speed — there isn't one. Body.ts tapers the drive
 * force to zero as the robot approaches `maxSpeed`, so speed approaches it
 * exponentially and never arrives. This returns tau; the robot passes 63% of
 * top speed at tau, 95% at roughly 3 tau. `npm run physics` measures the real
 * figures, and those are the ones to tune against.
 */
export function accelTimeConstant(spec: RobotSpec): number {
  return spec.maxSpeed / (spec.driveForce / spec.mass);
}

/**
 * Derived: braking distance from top speed in metres, ignoring resistance.
 *
 * This is the design-intent figure — the one in SPEC.md's table. The number a
 * player actually experiences is shorter, because rolling resistance helps and
 * because the robot cruises a little under `maxSpeed`. Body.stoppingDistance
 * is the honest in-game figure; use this one only for comparing the specs.
 */
export function stoppingDistance(spec: RobotSpec): number {
  const decel = spec.brakeForce / spec.mass;
  return (spec.maxSpeed * spec.maxSpeed) / (2 * decel);
}

/** Derived: momentum at top speed in kg·m/s. The "weight" the player feels. */
export function peakMomentum(spec: RobotSpec): number {
  return spec.mass * spec.maxSpeed;
}

/**
 * What the simulation actually accelerates: the machine plus its load, kg.
 *
 * Every force in `Body.step` divides by this rather than by `spec.mass`, so
 * carrying something is not a status effect — it is the same physics with a
 * bigger number in the denominator.
 */
export function loadedMass(spec: RobotSpec, payload = 0): number {
  return spec.mass + payload;
}

/**
 * Steepest gradient this robot can hold while carrying `payload`.
 *
 * `maxSlope` is the unloaded figure and is what the spec table states. Weight
 * does not care which part of it is cargo, so a laden robot re-derives the
 * limit from the same formula the literals came from.
 *
 * This is not an abstract nicety. The building's only ramp is 1.2 m over 12 m
 * — a 10% gradient against Biggy's 0.11, cleared EMPTY by one percentage
 * point. With the 200 kg keg aboard the limit falls to 0.075 and Biggy cannot
 * get up it at all, which is why anything heavy stays on the exhibition floor.
 * See `docs/MECHANICS.md` §5.3 and the assertion in `npm run traverse`.
 */
export function maxSlopeLoaded(spec: RobotSpec, payload = 0): number {
  if (payload <= 0) return spec.maxSlope;
  return (SLOPE_SAFETY * spec.driveForce) / (loadedMass(spec, payload) * G);
}
