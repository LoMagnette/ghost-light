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

  /** Silhouette colour used by the placeholder renderer and UI accents. */
  tint: number;
}

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
  tint: 0xff7a1a,
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
  tint: 0x6b7378,
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
  tint: 0x7d94a8,
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
