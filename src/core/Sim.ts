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
import type { Obstacle, Venue } from './Venue';

export const FIXED_DT = 1 / 120;

/** Never simulate more than this many steps in one frame (spiral-of-death guard). */
const MAX_STEPS_PER_FRAME = 8;

/** Coefficient of restitution for robot/wall and robot/robot contacts. */
const RESTITUTION = 0.18;

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
      actor.body.step(dt, actor.input);
    }

    this.resolveObstacles();
    this.resolveActorPairs();

    this.elapsed += dt;
  }

  /** Push actors out of solid geometry and take the momentum out of the hit. */
  private resolveObstacles(): void {
    for (const actor of this.actors) {
      for (const obstacle of this.venue.obstacles) {
        if (obstacle.floor !== actor.floor) continue;
        this.resolveCircleRect(actor, obstacle);
      }
    }
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
