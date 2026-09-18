/**
 * The fixed-timestep simulation.
 *
 * Phaser drives rendering at whatever rate the display allows; the physics
 * runs here at a constant 120 Hz with an accumulator. Rendering interpolates
 * between the last two simulation states, so the picture stays smooth without
 * the physics ever seeing a variable delta.
 *
 * Why this matters for scoring: heavy bodies with force-limited braking are
 * extremely sensitive to timestep. Run Biggy at a variable delta and its
 * stopping distance changes when the framerate dips, which is precisely when
 * a judge is most likely to be watching it slide into something.
 */

import { Body, NO_INPUT, type DriveInput } from './Body';
import { groundAt, type Obstacle, type Venue } from './Venue';
import { canStepOnto, climbFraction, downhill, linkAt, surfaceHeight } from './Traversal';

export const FIXED_DT = 1 / 120;

/** Never simulate more than this many steps in one frame (spiral-of-death guard). */
const MAX_STEPS_PER_FRAME = 8;

/** Coefficient of restitution for robot/wall and robot/robot contacts. */
const RESTITUTION = 0.18;

/** Fraction of top speed a robot manages on stairs. See limitStairSpeed. */
const STAIR_PACE = 0.28;

export interface Actor {
  body: Body;
  /** Which floor this actor is on. Collision only considers the same floor. */
  floor: 0 | 1;
  /** Filled each step by the controller driving this actor. */
  input: DriveInput;
  /** Interpolation snapshot, written by the sim. Renderers read these. */
  prevX: number;
  prevY: number;
  prevZ: number;
  /** Id of the link this actor is currently on, if any. Written by the sim. */
  onLink?: string;
}

export function makeActor(body: Body, floor: 0 | 1): Actor {
  return {
    body,
    floor,
    input: { ...NO_INPUT },
    prevX: body.x,
    prevY: body.y,
    prevZ: body.z,
  };
}

export class Sim {
  readonly venue: Venue;
  readonly actors: Actor[] = [];

  private accumulator = 0;

  /** 0..1 blend factor between the previous and current state, for rendering. */
  alpha = 0;

  /** Wall-clock seconds simulated. Chapters use this for timing and scoring. */
  elapsed = 0;

  /** Collision events from the most recent step, for audio and camera shake. */
  readonly impacts: { actor: Actor; speed: number; momentum: number }[] = [];

  /**
   * Footfalls from the most recent frame, for camera kick and (later) audio.
   *
   * Collected here rather than read off the body because several fixed steps
   * run per rendered frame: a foot that lands on the first of them is gone by
   * the time the scene looks. Footfall weight is the cheapest way to sell mass
   * before there is a sprite, so losing two out of three of them is not an
   * option.
   */
  readonly footfalls: { actor: Actor; momentum: number }[] = [];

  constructor(venue: Venue) {
    this.venue = venue;
  }

  add(actor: Actor): Actor {
    this.actors.push(actor);
    return actor;
  }

  /**
   * Advance the simulation by a real frame delta, in seconds.
   * Call once per Phaser update; do not call step() directly from a scene.
   */
  advance(frameDelta: number): void {
    // Cap the incoming delta so an alt-tab or a breakpoint does not teleport
    // every robot across the building on the next frame.
    this.accumulator += Math.min(frameDelta, 0.25);
    this.impacts.length = 0;
    this.footfalls.length = 0;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps += 1;
    }

    if (steps === MAX_STEPS_PER_FRAME) {
      // We are falling behind. Drop the backlog rather than compounding it.
      this.accumulator = 0;
    }

    this.alpha = this.accumulator / FIXED_DT;
  }

  private step(dt: number): void {
    for (const actor of this.actors) {
      actor.prevX = actor.body.x;
      actor.prevY = actor.body.y;
      actor.prevZ = actor.body.z;
      actor.body.lastImpactSpeed = 0;
      const slope = this.slopeFor(actor);
      actor.body.step(dt, actor.input, slope.x, slope.y);
      if (actor.body.footfall) {
        this.footfalls.push({ actor, momentum: actor.body.momentum });
      }
    }

    this.resolveObstacles();
    this.resolveActorPairs();
    this.resolveSurfaces();

    this.elapsed += dt;
  }

  /** Push actors out of solid geometry and take the momentum out of the hit. */
  private resolveObstacles(): void {
    for (const actor of this.actors) {
      for (const obstacle of this.venue.obstacles) {
        if (obstacle.floor !== actor.floor) continue;
        // A stair tread is solid only to a machine that cannot climb it. This
        // one line is the whole stair rule in the collision system: Biggy
        // meets a wall exactly where Voxxy meets a route.
        if (obstacle.linkId && this.passable(actor, obstacle.linkId)) continue;
        this.resolveCircleRect(actor, obstacle);
      }
    }
  }

  private passable(actor: Actor, linkId: string): boolean {
    const link = this.venue.links.find((l) => l.id === linkId);
    if (!link) return false;
    const { body } = actor;
    return canStepOnto(body.spec, link, body.x, body.y, body.z);
  }

  /**
   * Put every actor at the height of whatever it is standing on, and move it
   * between floors when it walks off the top or bottom of a flight.
   *
   * Runs after collision, because collision is the thing that decides where
   * the actor actually ended up this step.
   */
  private resolveSurfaces(): void {
    for (const actor of this.actors) {
      const { body } = actor;
      const link = linkAt(this.venue, actor.floor, body.x, body.y);

      if (link && canStepOnto(body.spec, link, body.x, body.y, body.z)) {
        const f = climbFraction(link, body.x, body.y);
        body.z = surfaceHeight(link, body.x, body.y);
        actor.onLink = link.id;

        // Stepping off the top of a flight that changes storey puts the actor
        // on the other floor. Done on exit rather than on arrival so a robot
        // can stand on a staircase without teleporting.
        if (link.from !== link.to) {
          const arriving = f >= 0.999 ? link.to : f <= 0.001 ? link.from : undefined;
          if (arriving !== undefined && arriving !== actor.floor) {
            actor.floor = arriving;
            body.z = groundAt(this.venue, arriving, body.x, body.y);
          }
        }
        continue;
      }

      actor.onLink = undefined;
      body.z = groundAt(this.venue, actor.floor, body.x, body.y);
    }

    for (const actor of this.actors) this.limitStairSpeed(actor);
  }

  /**
   * Downhill pull on an actor, as the fraction of weight acting along the floor.
   *
   * Ramps only. A robot ROLLS up a ramp, so its weight fights its drive force
   * and the heavy machines struggle exactly as they should. A robot WALKS up
   * stairs, which is a different gait with a different limit — see
   * `limitStairSpeed`.
   */
  private slopeFor(actor: Actor): { x: number; y: number } {
    const { body } = actor;
    const link = linkAt(this.venue, actor.floor, body.x, body.y);
    if (!link || link.riser > 0) return { x: 0, y: 0 };
    if (!canStepOnto(body.spec, link, body.x, body.y, body.z)) return { x: 0, y: 0 };
    return downhill(link);
  }

  /**
   * Stairs are cadence-limited, not traction-limited.
   *
   * Applying gravity down a staircase the way we do down a ramp says Droid
   * cannot climb one: a 12 m flight to a 6.2 m floor is a 51% gradient, which
   * takes 4.44 m/s² out of Droid's 4.5 m/s² of drive and leaves it balancing
   * rather than climbing. That is the right answer for a machine trying to
   * ROLL up, and the wrong question — these robots walk up, and a walking
   * machine on stairs is limited by how fast it can place a foot.
   *
   * So a stair caps speed instead. It is a clamp, deliberately, and it is the
   * only one in the simulation.
   */
  private limitStairSpeed(actor: Actor): void {
    const { body } = actor;
    const link = linkAt(this.venue, actor.floor, body.x, body.y);
    if (!link || link.riser <= 0) return;
    if (!canStepOnto(body.spec, link, body.x, body.y, body.z)) return;

    const cap = body.spec.maxSpeed * STAIR_PACE;
    const speed = body.speed;
    if (speed <= cap) return;
    const scale = cap / speed;
    body.vx *= scale;
    body.vy *= scale;
  }

  private resolveCircleRect(actor: Actor, obstacle: Obstacle): void {
    const { body } = actor;
    const r = body.spec.radius;
    const b = obstacle.bounds;

    // Closest point on the rectangle to the circle centre.
    const cx = clamp(body.x, b.x, b.x + b.w);
    const cy = clamp(body.y, b.y, b.y + b.h);

    let dx = body.x - cx;
    let dy = body.y - cy;
    let dist = Math.hypot(dx, dy);

    if (dist >= r) return;

    // Degenerate case: centre exactly on the surface or inside the rect.
    if (dist < 1e-6) {
      const toLeft = body.x - b.x;
      const toRight = b.x + b.w - body.x;
      const toBottom = body.y - b.y;
      const toTop = b.y + b.h - body.y;
      const minPen = Math.min(toLeft, toRight, toBottom, toTop);
      if (minPen === toLeft) {
        dx = -1;
        dy = 0;
      } else if (minPen === toRight) {
        dx = 1;
        dy = 0;
      } else if (minPen === toBottom) {
        dx = 0;
        dy = -1;
      } else {
        dx = 0;
        dy = 1;
      }
      dist = 1e-6;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = r - dist;

    // Positional correction.
    body.x += nx * penetration;
    body.y += ny * penetration;

    // Velocity response: kill the inbound normal component, keep the tangent
    // so robots slide along walls instead of sticking to them.
    const normalSpeed = body.vx * nx + body.vy * ny;
    if (normalSpeed < 0) {
      const impactSpeed = -normalSpeed;
      body.vx -= (1 + RESTITUTION) * normalSpeed * nx;
      body.vy -= (1 + RESTITUTION) * normalSpeed * ny;

      if (impactSpeed > body.lastImpactSpeed) {
        body.lastImpactSpeed = impactSpeed;
      }
      if (impactSpeed > 0.4) {
        this.impacts.push({
          actor,
          speed: impactSpeed,
          momentum: impactSpeed * body.spec.mass,
        });
      }
    }
  }

  /** Robot-on-robot contact, with mass-weighted separation. */
  private resolveActorPairs(): void {
    for (let i = 0; i < this.actors.length; i += 1) {
      for (let j = i + 1; j < this.actors.length; j += 1) {
        const a = this.actors[i];
        const b = this.actors[j];
        if (a.floor !== b.floor) continue;

        const dx = b.body.x - a.body.x;
        const dy = b.body.y - a.body.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.body.spec.radius + b.body.spec.radius;
        if (dist >= minDist || dist < 1e-6) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const penetration = minDist - dist;

        // Separate in inverse proportion to mass: Voxxy bounces off Biggy,
        // Biggy barely registers Voxxy.
        const ma = a.body.spec.mass;
        const mb = b.body.spec.mass;
        const total = ma + mb;
        a.body.x -= nx * penetration * (mb / total);
        a.body.y -= ny * penetration * (mb / total);
        b.body.x += nx * penetration * (ma / total);
        b.body.y += ny * penetration * (ma / total);

        // 1D elastic-ish impulse along the contact normal.
        const relative = (b.body.vx - a.body.vx) * nx + (b.body.vy - a.body.vy) * ny;
        if (relative >= 0) continue;

        const impulse = (-(1 + RESTITUTION) * relative) / (1 / ma + 1 / mb);
        a.body.applyImpulse(-nx * impulse, -ny * impulse);
        b.body.applyImpulse(nx * impulse, ny * impulse);

        const impactSpeed = -relative;
        if (impactSpeed > 0.4) {
          this.impacts.push({ actor: a, speed: impactSpeed, momentum: impulse });
          this.impacts.push({ actor: b, speed: impactSpeed, momentum: impulse });
        }
      }
    }
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Interpolated render position for an actor. Renderers should use this. */
export function renderPos(actor: Actor, alpha: number): { x: number; y: number; z: number } {
  return {
    x: actor.prevX + (actor.body.x - actor.prevX) * alpha,
    y: actor.prevY + (actor.body.y - actor.prevY) * alpha,
    z: actor.prevZ + (actor.body.z - actor.prevZ) * alpha,
  };
}
