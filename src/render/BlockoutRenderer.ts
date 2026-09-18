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
import { depthKey, project } from '@/core/Iso';
import type { Actor } from '@/core/Sim';
import { renderPos } from '@/core/Sim';
import type { Room, Venue } from '@/core/Venue';
import type { Palette } from '@/chapters/Chapter';

interface Drawable {
  depth: number;
  draw: (g: Phaser.GameObjects.Graphics) => void;
}

export class BlockoutRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly venue: Venue;
  private readonly palette: Palette;
  private readonly lightLevel: number;

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

  /** Redraw everything on the given floor. Call once per frame. */
  render(floor: 0 | 1, actors: Actor[], alpha: number): void {
    const g = this.graphics;
    g.clear();

    const queue: Drawable[] = [];

    for (const room of this.venue.rooms) {
      if (room.floor !== floor) continue;
      queue.push({
        depth: -1e6, // floors always draw first
        draw: (gfx) => this.drawFloorPlate(gfx, room),
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
    g.fillEllipse(ground.sx, ground.sy, r * 4.2 * 28, r * 2.1 * 28);

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
