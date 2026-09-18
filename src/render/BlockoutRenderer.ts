/**
 * Grey-box isometric renderer.
 *
 * This draws the whole building and every robot as extruded boxes, from the
 * venue data and the chapter palette. It exists so that movement, collision
 * and level layout can be tuned and judged before a single sprite is
 * generated — which is the correct order to work in, and the only order that
 * fits the schedule.
 *
 * It is not throwaway. The art pass replaces the ROBOT drawing with sprites
 * and dresses the ROOMS with textures, but the depth sort, the camera and the
 * projection all stay exactly as they are here.
 *
 * Everything is drawn into a single Graphics object in depth order each frame.
 * That is fine at blockout scale (a few hundred quads). When the art pass adds
 * real sprites, move the robots onto Phaser game objects with `setDepth` and
 * leave the static geometry batched here.
 */

import Phaser from 'phaser';
import { depthKey, ISO_SQUASH, PPM, project } from '@/core/Iso';
import type { Actor } from '@/core/Sim';
import { renderPos } from '@/core/Sim';
import type { Room, Venue } from '@/core/Venue';
import type { Palette } from '@/chapters/Chapter';

interface Drawable {
  depth: number;
  draw: (g: Phaser.GameObjects.Graphics) => void;
}

/** Sideways speed, m/s, above which a robot is sliding rather than tracking. */
const SLIP_THRESHOLD = 0.4;

/** Seconds a skid mark stays on the floor. */
const MARK_LIFE = 2.6;

/** Hard cap on marks so a long tuning session cannot grow unbounded. */
const MAX_MARKS = 320;

interface SkidMark {
  x: number;
  y: number;
  /** Half-width of the mark in metres — heavier robots leave a wider scar. */
  width: number;
  life: number;
}

export class BlockoutRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly venue: Venue;
  private readonly palette: Palette;
  private readonly lightLevel: number;

  /**
   * Draw the stopping marker and velocity vector. Set from the scene's F1
   * debug flag. The marker is the single most useful thing on screen while
   * tuning movement, and it may well survive into the shipping game for
   * Chapter III, where you are directing Biggy rather than driving it and need
   * to see where its momentum has already committed it.
   */
  telemetry = false;

  private readonly marks: SkidMark[] = [];

  constructor(
    scene: Phaser.Scene,
    venue: Venue,
    palette: Palette,
    lightLevel: number,
    /** Container the graphics are parented to — this is what the camera moves. */
    parent?: Phaser.GameObjects.Container,
  ) {
    this.graphics = scene.add.graphics();
    if (parent) parent.add(this.graphics);
    this.venue = venue;
    this.palette = palette;
    this.lightLevel = lightLevel;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  /**
   * Redraw everything on the given floor. Call once per frame.
   *
   * `dt` is the real frame delta in seconds — used only for ageing skid marks,
   * never for anything the simulation can see.
   */
  render(floor: 0 | 1, actors: Actor[], alpha: number, dt: number): void {
    const g = this.graphics;
    g.clear();

    this.ageMarks(dt);
    for (const actor of actors) {
      if (actor.floor === floor) this.recordSlip(actor, alpha);
    }

    const queue: Drawable[] = [];

    for (const room of this.venue.rooms) {
      if (room.floor !== floor) continue;
      queue.push({
        depth: -1e6, // floors always draw first
        draw: (gfx) => this.drawFloorPlate(gfx, room),
      });
    }

    // Each mark sorts on its own position rather than as one batch on the
    // floor plane. Batching hides a skid that passes in FRONT of a column
    // behind it, which is exactly the case you are looking at while tuning
    // grip against the hall's column grid.
    for (const mark of this.marks) {
      queue.push({
        depth: depthKey(mark.x, mark.y) - 0.5, // just under anything standing there
        draw: (gfx) => this.drawMark(gfx, mark),
      });
    }

    for (const obstacle of this.venue.obstacles) {
      if (obstacle.floor !== floor) continue;
      const { bounds } = obstacle;
      queue.push({
        depth: depthKey(bounds.x + bounds.w, bounds.y + bounds.h),
        draw: (gfx) => this.drawBox(gfx, bounds.x, bounds.y, bounds.w, bounds.h, obstacle.height),
      });
    }

    for (const actor of actors) {
      if (actor.floor !== floor) continue;
      const pos = renderPos(actor, alpha);
      queue.push({
        depth: depthKey(pos.x, pos.y, pos.z) + 1,
        draw: (gfx) => this.drawRobot(gfx, actor, pos),
      });
      if (this.telemetry) {
        queue.push({
          depth: -1e6 + 2, // floor decal: under the robots, over the skid marks
          draw: (gfx) => this.drawStopMarker(gfx, actor, pos),
        });
      }
    }

    queue.sort((a, b) => a.depth - b.depth);
    for (const item of queue) item.draw(g);
  }

  // -- pieces ---------------------------------------------------------------

  private drawFloorPlate(g: Phaser.GameObjects.Graphics, room: Room): void {
    const { x, y, w, h } = room.bounds;
    const a = project(x, y);
    const b = project(x + w, y);
    const c = project(x + w, y + h);
    const d = project(x, y + h);

    // Auditoriums sit a shade darker than circulation space, which reads as
    // carpet against the lighter corridor floor in the reference photographs.
    const isRoom = room.kind === 'auditorium';
    const fill = isRoom ? shade(this.palette.floor, 0.82) : this.palette.floor;

    g.fillStyle(this.lit(fill), 1);
    g.beginPath();
    g.moveTo(a.sx, a.sy);
    g.lineTo(b.sx, b.sy);
    g.lineTo(c.sx, c.sy);
    g.lineTo(d.sx, d.sy);
    g.closePath();
    g.fillPath();

    g.lineStyle(1, this.lit(this.palette.floorLine), 0.9);
    g.strokePath();
  }

  private drawBox(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    height: number,
    tint?: number,
  ): void {
    const top = tint ?? this.palette.wall;
    const side = tint ? shade(tint, 0.66) : this.palette.wallShade;

    const topA = project(x, y, height);
    const topB = project(x + w, y, height);
    const topC = project(x + w, y + h, height);
    const topD = project(x, y + h, height);
    const botC = project(x + w, y + h, 0);
    const botD = project(x, y + h, 0);
    const botB = project(x + w, y, 0);

    // South-east face
    g.fillStyle(this.lit(side), 1);
    g.beginPath();
    g.moveTo(topB.sx, topB.sy);
    g.lineTo(topC.sx, topC.sy);
    g.lineTo(botC.sx, botC.sy);
    g.lineTo(botB.sx, botB.sy);
    g.closePath();
    g.fillPath();

    // South-west face, a touch darker still
    g.fillStyle(this.lit(shade(side, 0.82)), 1);
    g.beginPath();
    g.moveTo(topD.sx, topD.sy);
    g.lineTo(topC.sx, topC.sy);
    g.lineTo(botC.sx, botC.sy);
    g.lineTo(botD.sx, botD.sy);
    g.closePath();
    g.fillPath();

    // Top face
    g.fillStyle(this.lit(top), 1);
    g.beginPath();
    g.moveTo(topA.sx, topA.sy);
    g.lineTo(topB.sx, topB.sy);
    g.lineTo(topC.sx, topC.sy);
    g.lineTo(topD.sx, topD.sy);
    g.closePath();
    g.fillPath();
  }

  private drawRobot(
    g: Phaser.GameObjects.Graphics,
    actor: Actor,
    pos: { x: number; y: number; z: number },
  ): void {
    const { spec } = actor.body;
    const r = spec.radius;

    // Contact shadow. Tightens as the robot settles, which sells weight even
    // before there is a sprite to look at.
    const ground = project(pos.x, pos.y, pos.z);
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(ground.sx, ground.sy, r * 4.2 * PPM, r * 4.2 * PPM * ISO_SQUASH);

    // Body. A small vertical bob driven by stride phase, scaled by speed, so a
    // walking robot has gait and a stationary one is dead still.
    const bob = Math.abs(Math.sin(actor.body.stridePhase * Math.PI)) * 0.035 * actor.body.speedFraction;

    this.drawBox(
      g,
      pos.x - r,
      pos.y - r,
      r * 2,
      r * 2,
      pos.z + spec.height + bob,
      spec.tint,
    );

    // Facing pip: a short bar in the heading direction. Placeholder for what
    // becomes the 8-direction sprite facing.
    const nose = project(
      pos.x + Math.cos(actor.body.heading) * (r + 0.28),
      pos.y + Math.sin(actor.body.heading) * (r + 0.28),
      pos.z + spec.height * 0.72,
    );
    g.fillStyle(this.palette.accent, 1);
    g.fillCircle(nose.sx, nose.sy, 3);
  }

  // -- telemetry ------------------------------------------------------------

  /**
   * Where the robot would come to rest if the brake went on this instant.
   *
   * Drawing this is the difference between believing the tuning numbers and
   * seeing them. Biggy's marker sits three times further out than Voxxy's, and
   * it is immediately obvious that you have to commit to stopping long before
   * you arrive.
   */
  private drawStopMarker(
    g: Phaser.GameObjects.Graphics,
    actor: Actor,
    pos: { x: number; y: number; z: number },
  ): void {
    const { body } = actor;
    const speed = body.speed;
    if (speed < 0.3) return;

    const distance = body.stoppingDistance;
    const tx = pos.x + (body.vx / speed) * distance;
    const ty = pos.y + (body.vy / speed) * distance;

    const from = project(pos.x, pos.y, 0);
    const to = project(tx, ty, 0);

    g.lineStyle(1, this.palette.accent, 0.35);
    g.beginPath();
    g.moveTo(from.sx, from.sy);
    g.lineTo(to.sx, to.sy);
    g.strokePath();

    // A circle on the floor plane is an ellipse on screen — the same 2:1
    // squash the projection applies to everything else.
    const r = body.spec.radius * PPM;
    g.lineStyle(1.5, this.palette.accent, 0.8);
    g.strokeEllipse(to.sx, to.sy, r * 2, r * 2 * ISO_SQUASH);
  }

  // -- skid marks -----------------------------------------------------------

  /**
   * Leave a mark when a robot is sliding sideways.
   *
   * This is the visible consequence of lateral grip: ask Biggy for more turn
   * than 560 N can give and it scrubs across the floor, and now you can see
   * the arc it actually took rather than the one you asked for. Cheap, and it
   * reads as weight long before there is a sprite.
   */
  private recordSlip(actor: Actor, alpha: number): void {
    const { body } = actor;
    if (body.slipSpeed < SLIP_THRESHOLD) return;
    if (this.marks.length >= MAX_MARKS) this.marks.shift();

    const pos = renderPos(actor, alpha);
    this.marks.push({
      x: pos.x,
      y: pos.y,
      width: body.spec.radius * 0.8,
      // Harder slides leave darker marks, so the trace reads as pressure and
      // not merely as a path.
      life: MARK_LIFE * Math.min(1, body.slipSpeed / (SLIP_THRESHOLD * 3)),
    });
  }

  private ageMarks(dt: number): void {
    for (let i = this.marks.length - 1; i >= 0; i -= 1) {
      this.marks[i].life -= dt;
      if (this.marks[i].life <= 0) this.marks.splice(i, 1);
    }
  }

  private drawMark(g: Phaser.GameObjects.Graphics, mark: SkidMark): void {
    // Relative to the floor, not black: a fixed dark mark is invisible on
    // Chapter I's near-black carpet and far too strong on Chapter II's warm
    // wood. Scuffing the floor's own colour works in every era.
    const p = project(mark.x, mark.y, 0);
    const fade = Math.min(1, mark.life / MARK_LIFE);
    g.fillStyle(shade(this.lit(this.palette.floor), 0.5), 0.85 * fade);
    g.fillEllipse(p.sx, p.sy, mark.width * 2 * PPM, mark.width * 2 * PPM * ISO_SQUASH);
  }

  /** Forget every mark. Call on reset so a tuning run starts on clean floor. */
  clearMarks(): void {
    this.marks.length = 0;
  }

  /** Apply the chapter's ambient light level to a colour. */
  private lit(colour: number): number {
    return shade(colour, 0.35 + this.lightLevel * 0.65);
  }
}

/** Multiply a packed 0xRRGGBB colour by a factor. */
export function shade(colour: number, factor: number): number {
  const r = Math.min(255, Math.round(((colour >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((colour >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((colour & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
