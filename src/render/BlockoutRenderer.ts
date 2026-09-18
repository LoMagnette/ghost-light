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
import { groundAt, rect, rectContains, type Rect, type Room, type Venue } from '@/core/Venue';
import type { Palette } from '@/chapters/Chapter';

interface Drawable {
  depth: number;
  draw: (g: Phaser.GameObjects.Graphics) => void;
}

/**
 * Tallest an obstacle is DRAWN, in metres, whatever its real height.
 *
 * The exhibition hall's columns are 5.4 m — the real clear height under the
 * auditorium level — and drawn at full height they turn a 52 × 49 m room into
 * a thicket of poles that hides the floor, the robot and any sense of how far
 * away the far wall is. The room measures correct and reads far too small.
 *
 * This is not a fudge of the simulation: collision is two-dimensional and has
 * never consulted `height`. It is the same decision as not drawing the
 * ceiling, applied one level down — and a column holding up a floor we do not
 * draw is the part that was inconsistent. Cutaway height is how isometric
 * games have always drawn interiors.
 */
const MAX_DRAWN_HEIGHT = 2.7;

/**
 * How far a stairwell's contents may paint over the floor in front of it,
 * metres. Deeper than this and the rim redraw stops covering the spill.
 */
const WELL_REACH = 3.2;

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

    // Where each stairwell's rim lands in the sort, so a robot down in the
    // well can be put in front of it. See the rim pass below.
    const rims: { hole: Rect; depth: number }[] = [];

    for (const room of this.venue.rooms) {
      if (room.floor !== floor) continue;
      queue.push({
        // Floors draw first, but a raised plate has to draw after the one it
        // stands above or its edge is buried under the lower floor.
        depth: -1e6 + (room.elevation ?? 0),
        draw: (gfx) => this.drawFloorPlate(gfx, room),
      });

      /*
       * The near rim of a stairwell, painted back over what climbed out of it.
       *
       * Everything in a well is BELOW the floor, and below the floor means
       * lower on screen — so the flight paints across the carpet in front of
       * the hole, which is why a stairwell read as a wall standing in the
       * corridor. There is no depth buffer to stop it: floors are drawn first
       * and in one pass, by design.
       *
       * So the strip of floor the well can reach is drawn a second time, once
       * the well is done with. It sorts after everything inside the hole and
       * before anything nearer than the hole, because nearer means a larger
       * key — which is the same ordering the rest of the scene already relies
       * on, not a special case bolted on for this.
       */
      for (const hole of room.voids ?? []) {
        const tiles = this.rimTiles(room, hole);
        const depth = depthKey(hole.x, hole.y, room.elevation ?? 0) + 0.5;
        rims.push({ hole, depth });
        queue.push({
          depth,
          draw: (gfx) => {
            this.drawTiles(gfx, room, tiles, false);
            // The repair covers the outline the floor pass drew round the
            // hole, and without a line at the lip a stairwell reads as a
            // pattern in the carpet rather than an opening in it.
            this.strokeRect(gfx, hole, room.elevation ?? 0);
          },
        });
      }
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
      const base = groundAt(this.venue, floor, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
      const bottom = base + (obstacle.base ?? 0);
      queue.push({
        depth: depthKey(bounds.x + bounds.w, bounds.y + bounds.h, base),
        draw: (gfx) =>
          this.drawBox(
            gfx,
            bounds.x,
            bounds.y,
            bounds.w,
            bounds.h,
            base + Math.min(obstacle.height, MAX_DRAWN_HEIGHT),
            undefined,
            bottom,
          ),
      });
    }

    for (const actor of actors) {
      if (actor.floor !== floor) continue;
      const pos = renderPos(actor, alpha);
      // A robot down in a stairwell is drawn OVER the rim that hides the
      // well, on purpose. Strictly the floor in front of the hole is between
      // the camera and the robot, and strictly the player would then be
      // driving something they cannot see. Same call as the 2.7 m cutaway:
      // the building gives way to the machine.
      const rim = rims.find((r) => rectContains(r.hole, pos.x, pos.y));
      const own = depthKey(pos.x, pos.y, pos.z) + 1;
      queue.push({
        depth: rim ? Math.max(own, rim.depth + 0.25) : own,
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
    // A storey is not one flat plane: the concourse stands 1.2 m over the hall.
    // Draw the plate at its own level or the drop is invisible, and a level
    // change the player cannot see is one they will not believe.
    const z = room.elevation ?? 0;
    const a = project(x, y, z);
    const b = project(x + w, y, z);
    const d = project(x, y + h, z);

    // A stairwell is an absence of floor. Drawn as one quad, the corridor
    // paints straight over the flight coming up through it — which is how a
    // staircase manages to be missing on the very floor it serves.
    this.drawTiles(g, room, floorTiles(room));

    // An elevated plate needs its edge drawn or it reads as floating. Only the
    // two faces toward the viewer, same as every other box.
    if (z > 0) {
      const a0 = project(x, y, 0);
      const b0 = project(x + w, y, 0);
      const d0 = project(x, y + h, 0);
      g.fillStyle(this.lit(shade(this.palette.wall, 0.7)), 1);
      for (const face of [
        [a, b, b0, a0],
        [a, d, d0, a0],
      ]) {
        g.beginPath();
        g.moveTo(face[0].sx, face[0].sy);
        for (const pt of face.slice(1)) g.lineTo(pt.sx, pt.sy);
        g.closePath();
        g.fillPath();
      }
    }
  }

  /** Outline one rectangle on a floor plane. */
  private strokeRect(g: Phaser.GameObjects.Graphics, r: Rect, z: number): void {
    const corners = [
      project(r.x, r.y, z),
      project(r.x + r.w, r.y, z),
      project(r.x + r.w, r.y + r.h, z),
      project(r.x, r.y + r.h, z),
    ];
    g.lineStyle(1, this.lit(this.palette.floorLine), 0.9);
    g.beginPath();
    g.moveTo(corners[0].sx, corners[0].sy);
    for (const pt of corners.slice(1)) g.lineTo(pt.sx, pt.sy);
    g.closePath();
    g.strokePath();
  }

  /** Paint a set of floor rectangles at a room's own level. */
  private drawTiles(
    g: Phaser.GameObjects.Graphics,
    room: Room,
    tiles: Rect[],
    outline = true,
  ): void {
    const z = room.elevation ?? 0;
    // Auditoriums sit a shade darker than circulation space, which reads as
    // carpet against the lighter corridor floor in the reference photographs.
    const isRoom = room.kind === 'auditorium';
    const fill = isRoom ? shade(this.palette.floor, 0.82) : this.palette.floor;

    g.fillStyle(this.lit(fill), 1);
    g.lineStyle(1, this.lit(this.palette.floorLine), 0.9);
    for (const tile of tiles) {
      const corners = [
        project(tile.x, tile.y, z),
        project(tile.x + tile.w, tile.y, z),
        project(tile.x + tile.w, tile.y + tile.h, z),
        project(tile.x, tile.y + tile.h, z),
      ];
      g.beginPath();
      g.moveTo(corners[0].sx, corners[0].sy);
      for (const pt of corners.slice(1)) g.lineTo(pt.sx, pt.sy);
      g.closePath();
      g.fillPath();
      // The rim pass repaints floor that is already outlined; stroking it
      // again draws the seams of the repair onto the carpet.
      if (outline) g.strokePath();
    }
  }

  /**
   * The floor a hole's contents can paint over: the strip south and west of
   * it, less the holes themselves.
   *
   * WELL_REACH metres in each of x and y is worth WELL_REACH metres of screen
   * drop, because the two axes each contribute half of it — so this covers a
   * well that deep and no more. It is measured in the world rather than in
   * pixels so it stays right if the projection is ever re-tuned.
   */
  private rimTiles(room: Room, hole: Rect): Rect[] {
    const band = rect(
      hole.x - WELL_REACH,
      hole.y - WELL_REACH,
      hole.w + WELL_REACH,
      hole.h + WELL_REACH,
    );
    const b = room.bounds;
    const x0 = Math.max(band.x, b.x);
    const y0 = Math.max(band.y, b.y);
    const x1 = Math.min(band.x + band.w, b.x + b.w);
    const y1 = Math.min(band.y + band.h, b.y + b.h);
    if (x1 <= x0 || y1 <= y0) return [];

    let tiles: Rect[] = [rect(x0, y0, x1 - x0, y1 - y0)];
    for (const other of room.voids ?? []) {
      const next: Rect[] = [];
      for (const tile of tiles) next.push(...subtract(tile, other));
      tiles = next;
    }
    return tiles;
  }

  private drawBox(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    height: number,
    tint?: number,
    bottom = 0,
  ): void {
    const top = tint ?? this.palette.wall;
    const side = tint ? shade(tint, 0.66) : this.palette.wallShade;

    // The viewer is to the south-west (see Iso.project), so the two faces in
    // sight are the SOUTH one and the WEST one. Draw the north or east faces
    // and every box turns inside out.
    const topA = project(x, y, height);
    const topB = project(x + w, y, height);
    const topC = project(x + w, y + h, height);
    const topD = project(x, y + h, height);
    // Not always the floor: a flight of stairs seen from the floor it arrives
    // on hangs below the datum rather than standing on it.
    const botA = project(x, y, bottom);
    const botB = project(x + w, y, bottom);
    const botD = project(x, y + h, bottom);

    // South face
    g.fillStyle(this.lit(side), 1);
    g.beginPath();
    g.moveTo(topA.sx, topA.sy);
    g.lineTo(topB.sx, topB.sy);
    g.lineTo(botB.sx, botB.sy);
    g.lineTo(botA.sx, botA.sy);
    g.closePath();
    g.fillPath();

    // West face, a touch darker still
    g.fillStyle(this.lit(shade(side, 0.82)), 1);
    g.beginPath();
    g.moveTo(topA.sx, topA.sy);
    g.lineTo(topD.sx, topD.sy);
    g.lineTo(botD.sx, botD.sy);
    g.lineTo(botA.sx, botA.sy);
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

    // Standing ON whatever it is standing on, not on the storey datum. A box
    // drawn from zero makes a robot on the 1.2 m concourse two metres tall and
    // one halfway up a flight a six-metre pillar — and one descending a
    // stairwell an inside-out smear, which is what made this visible.
    this.drawBox(
      g,
      pos.x - r,
      pos.y - r,
      r * 2,
      r * 2,
      pos.z + spec.height + bob,
      spec.tint,
      pos.z,
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

/**
 * A room's floor plate as solid rectangles, with its stairwells taken out.
 *
 * Rectangle minus rectangle is up to four rectangles — the bands beyond each
 * end of the hole, then the strips either side of it. Applied hole by hole, so
 * a corridor with two flights coming up through it still comes out as a
 * handful of quads.
 */
function floorTiles(room: Room): Rect[] {
  if (!room.voids?.length) return [room.bounds];
  let tiles: Rect[] = [room.bounds];
  for (const hole of room.voids) {
    const next: Rect[] = [];
    for (const tile of tiles) next.push(...subtract(tile, hole));
    tiles = next;
  }
  return tiles;
}

function subtract(a: Rect, b: Rect): Rect[] {
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  if (x1 <= x0 || y1 <= y0) return [a]; // misses this tile entirely
  const out: Rect[] = [];
  if (y0 > a.y) out.push(rect(a.x, a.y, a.w, y0 - a.y));
  if (y1 < a.y + a.h) out.push(rect(a.x, y1, a.w, a.y + a.h - y1));
  if (x0 > a.x) out.push(rect(a.x, y0, x0 - a.x, y1 - y0));
  if (x1 < a.x + a.w) out.push(rect(x1, y0, a.x + a.w - x1, y1 - y0));
  return out;
}

/** Multiply a packed 0xRRGGBB colour by a factor. */
export function shade(colour: number, factor: number): number {
  const r = Math.min(255, Math.round(((colour >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((colour >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((colour & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
