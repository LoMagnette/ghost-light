/**
 * A physical body on the floor plane.
 *
 * Deliberately NOT an off-the-shelf physics engine. The arcade-style solvers
 * a 2D framework ships are AABB/velocity systems with no concept of mass, and
 * "robots that move like machines with weight" is the thing being scored. This
 * integrator is small enough to read in one sitting and gives us force-based
 * acceleration, honest braking, grip-limited turning and momentum transfer on
 * impact.
 *
 * Integration is semi-implicit Euler at a FIXED timestep (see Sim.ts). Never
 * step this with a variable frame delta — the feel of the heavy robots changes
 * with framerate if you do, and that is exactly the kind of thing a judge
 * notices without being able to name it.
 */

import type { RobotSpec } from './RobotSpec';

/**
 * Rolling resistance as a fraction of weight — a polished cinema floor, not
 * asphalt.
 *
 * This number is far more load-bearing than it looks, because resistance is
 * proportional to mass and therefore produces the SAME deceleration for every
 * robot no matter how heavy. At the 0.06 this started on, that was 0.59 m/s^2
 * for all three, which is half of Biggy's entire braking budget: the harness
 * measured Biggy stopping in 1.45 m against Voxxy's 1.23 m, and the whole cast
 * collapsed into one machine. Anything that affects all three equally erases
 * the differences the game is built on. Keep it small.
 */
const ROLLING_RESISTANCE = 0.012;

/**
 * Drivetrain drag when the throttle is released, as a fraction of the robot's
 * own braking force.
 *
 * Cutting power to a geared machine slows it noticeably — it does not glide
 * like a puck. Scaling that with brakeForce rather than with mass is what
 * makes coasting a per-robot characteristic: Voxxy coasts to a stop in about
 * five metres, Biggy drifts more than twice as far. Without this term the low
 * rolling resistance above lets Voxxy glide for 150 m, which reads as ice.
 */
const COAST_DRAG = 0.3;

/** Gravity, m/s^2. Only used to scale friction against weight. */
const G = 9.81;

export interface DriveInput {
  /** Desired travel direction, world space. Zero vector means "no throttle". */
  dirX: number;
  dirY: number;
  /** 0..1 throttle. Analogue sticks and pathfinders use partial values. */
  throttle: number;
  /** True when the player is actively braking rather than coasting. */
  braking: boolean;
}

export const NO_INPUT: DriveInput = { dirX: 0, dirY: 0, throttle: 0, braking: false };

export class Body {
  readonly spec: RobotSpec;

  x: number;
  y: number;
  z = 0;

  vx = 0;
  vy = 0;

  /** Facing in radians. Lags velocity, so the robot turns rather than snaps. */
  heading = 0;

  /** Accumulated stride phase, 0..1. Drives footfall events and bob. */
  stridePhase = 0;

  /** Set by the sim when a collision happened this step. Read by feedback. */
  lastImpactSpeed = 0;

  /** True on the step a stride completed. Drives footfall audio and camera. */
  footfall = false;

  /**
   * Sideways speed, m/s — the part of the velocity that is across the
   * direction the player ASKED for, which is what lateral grip is fighting.
   *
   * Measuring it against the heading instead would always read near zero:
   * heading chases velocity and easily keeps up, because a grip-limited turn
   * changes the velocity slowly by construction. The gap that matters — and
   * the one the player feels — is between the requested direction and the
   * direction the robot is actually still travelling. Zero when coasting: ask
   * for nothing and you are not fighting anything.
   */
  slipSpeed = 0;

  constructor(spec: RobotSpec, x: number, y: number) {
    this.spec = spec;
    this.x = x;
    this.y = y;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vy);
  }

  get momentum(): number {
    return this.spec.mass * this.speed;
  }

  /** Fraction of this robot's top speed, 0..1. Useful for audio and camera. */
  get speedFraction(): number {
    return Math.min(1, this.speed / this.spec.maxSpeed);
  }

  /**
   * Advance one fixed step.
   *
   * Force budget, applied in order:
   *   1. drive along the input direction (capped by driveForce)
   *   2. braking against velocity (capped by brakeForce)
   *   3. lateral grip resisting sideways slip (capped by lateralGrip)
   *   4. rolling resistance, always
   *   5. gravity down any slope the body is standing on
   *
   * `slopeX`/`slopeY` point downhill with a LENGTH of sin(slope angle), so
   * `mass * G * slope` is exactly the component of the body's own weight
   * pulling it down the hill. Nothing about climbing is clamped or special-
   * cased: a heavy machine slows going up and runs away from itself coming
   * down because that is what its weight does to it.
   */
  step(dt: number, input: DriveInput, slopeX = 0, slopeY = 0): void {
    const { mass, driveForce, brakeForce, maxSpeed, lateralGrip } = this.spec;

    let fx = 0;
    let fy = 0;
    let slip = 0;

    const inputMag = Math.hypot(input.dirX, input.dirY);
    const hasInput = inputMag > 1e-4 && input.throttle > 1e-4;

    if (hasInput) {
      const ux = input.dirX / inputMag;
      const uy = input.dirY / inputMag;
      const throttle = Math.min(1, input.throttle);

      // Drive. Taper off as we approach top speed so maxSpeed is an asymptote
      // rather than a hard clamp — clamping reads as a rev limiter, tapering
      // reads as a machine running out of torque.
      const forwardSpeed = this.vx * ux + this.vy * uy;
      const headroom = Math.max(0, 1 - Math.max(0, forwardSpeed) / maxSpeed);

      // Driving into your own momentum IS braking — the wheels are pushing
      // backwards against the floor either way — so it cannot beat the brakes.
      // Without this cap, Biggy sheds speed faster by holding the opposite
      // direction (1.92 m/s^2) than by braking (1.32 m/s^2), and a player
      // finds that in thirty seconds. "Hard to stop" then means nothing, and
      // it is the sentence the whole heavy-robot design rests on. Note this
      // only binds Biggy, the one robot whose brakes are weaker than its
      // motors — which is exactly where the design intended the consequence.
      const available = forwardSpeed < 0 ? Math.min(driveForce, brakeForce) : driveForce;
      const drive = available * throttle * headroom;
      fx += ux * drive;
      fy += uy * drive;

      // Lateral grip: resist the component of velocity perpendicular to the
      // intended direction. This is what makes Biggy carve a wide arc while
      // Voxxy pivots — the heavy robot simply cannot generate the sideways
      // force to redirect its own momentum quickly.
      const lateralVx = this.vx - ux * forwardSpeed;
      const lateralVy = this.vy - uy * forwardSpeed;
      const lateralSpeed = Math.hypot(lateralVx, lateralVy);
      slip = lateralSpeed;
      if (lateralSpeed > 1e-4) {
        const needed = (mass * lateralSpeed) / dt;
        const applied = Math.min(needed, lateralGrip);
        fx -= (lateralVx / lateralSpeed) * applied;
        fy -= (lateralVy / lateralSpeed) * applied;
      }
    }

    const speed = this.speed;

    // Braking. Only the player's explicit brake gets the full brakeForce; a
    // robot that is simply coasting gets rolling resistance and nothing else.
    if (input.braking && speed > 1e-4) {
      const needed = (mass * speed) / dt;
      const applied = Math.min(needed, brakeForce);
      fx -= (this.vx / speed) * applied;
      fy -= (this.vy / speed) * applied;
    }

    // Passive resistance: always rolling, plus drivetrain drag whenever the
    // player is neither driving nor braking. Coasting is a third state with a
    // feel of its own, and it is where the heavy robots are most expressive —
    // Biggy released at speed keeps going somewhere you have to plan for.
    const coasting = !hasInput && !input.braking;
    if (speed > 1e-4) {
      const resistance = ROLLING_RESISTANCE * mass * G + (coasting ? COAST_DRAG * brakeForce : 0);
      const needed = (mass * speed) / dt;
      const applied = Math.min(needed, resistance);
      fx -= (this.vx / speed) * applied;
      fy -= (this.vy / speed) * applied;
    }

    // Gravity along the surface. Applied last so nothing above it has to know
    // whether the body is on a stair.
    if (slopeX !== 0 || slopeY !== 0) {
      fx += slopeX * mass * G;
      fy += slopeY * mass * G;
    }

    // Integrate.
    this.vx += (fx / mass) * dt;
    this.vy += (fy / mass) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Heading follows velocity, with a turn rate that falls off as mass rises.
    // A stationary robot keeps its last heading rather than snapping to zero.
    const newSpeed = this.speed;
    if (newSpeed > 0.05) {
      const target = Math.atan2(this.vy, this.vx);
      const turnRate = (lateralGrip / mass) * 0.9; // rad/s
      this.heading = approachAngle(this.heading, target, turnRate * dt);
    }

    this.slipSpeed = slip;

    // Stride phase advances with distance travelled, not with time, so a robot
    // that is barely moving takes slow steps instead of jogging on the spot.
    // Wrapping past 1 is a foot hitting the floor: the sim turns that into an
    // event, and the camera and (later) the audio answer it. Footfall weight
    // is the cheapest way to sell mass before a single sprite exists.
    this.footfall = false;
    if (newSpeed > 0.05) {
      const stridesPerSecond = newSpeed / (this.spec.maxSpeed * this.spec.strideTime);
      const advanced = this.stridePhase + stridesPerSecond * dt;
      this.footfall = advanced >= 1;
      this.stridePhase = advanced % 1;
    }
  }

  /**
   * How far this robot would travel if the player hit the brake right now.
   *
   * Used by the renderer to draw the stopping marker, which is the single most
   * useful thing on screen while tuning: it makes "hard to stop" something you
   * can see rather than something you have to trust.
   */
  get stoppingDistance(): number {
    const speed = this.speed;
    if (speed < 1e-4) return 0;
    const decel = (this.spec.brakeForce + ROLLING_RESISTANCE * this.spec.mass * G) / this.spec.mass;
    return (speed * speed) / (2 * decel);
  }

  /** Apply an instantaneous impulse, in newton-seconds. Used by collisions. */
  applyImpulse(ix: number, iy: number): void {
    this.vx += ix / this.spec.mass;
    this.vy += iy / this.spec.mass;
  }

  /** Bring the body to a dead stop. Used on respawn and chapter transitions. */
  halt(): void {
    this.vx = 0;
    this.vy = 0;
    this.lastImpactSpeed = 0;
    this.slipSpeed = 0;
    this.footfall = false;
  }
}

/** Rotate `from` towards `to` by at most `maxDelta`, across the -pi/pi seam. */
export function approachAngle(from: number, to: number, maxDelta: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxDelta) return to;
  return from + Math.sign(diff) * maxDelta;
}
