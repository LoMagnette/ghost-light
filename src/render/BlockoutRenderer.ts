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
import { depthKey, ISO_SQUASH, PPM, project, type ScreenPoint } from '@/core/Iso';
import type { Actor } from '@/core/Sim';
import { climbFraction } from '@/core/Traversal';
import { renderPos } from '@/core/Sim';
import { groundAt, rect, type Level, type Material, type Rect, type Room, type Venue } from '@/core/Venue';
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
 * Screen-space bounding box of a piece of static geometry, in the world
 * layer's own coordinates. Precomputed, because it never changes.
 */
interface ScreenBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Slack around the viewport when culling, in pixels.
 *
 * Two things to cover and both are small: the camera shake, which moves the
 * view without moving the world layer and peaks around ten pixels, and the
 * storey elevation `screenBox` does not bother to look up — the concourse is
 * the only raised plate and 1.2 m is 34 px.
 *
 * Not generous, on purpose. This was 160 and every extra pixel of margin is
 * area at the auditorium level, where area is seats: at 160 the frame was
 * queueing 1217 boxes and dropping one frame in five, and at 64 it holds
 * sixty. The correct margin is the smallest one that cannot pop.
 */
const CULL_MARGIN = 64;

/**
 * Screen-space extent of a box standing on a floor plate.
 *
 * Only x and y decide the horizontal extent, and the projection is monotonic
 * in both, so two corners give the range. Vertically the far corner at the top
 * of the box is highest on screen and the near corner at its bottom lowest.
 */
function screenBox(bounds: Rect, bottom: number, top: number): ScreenBox {
  const near = project(bounds.x, bounds.y, bottom);
  const far = project(bounds.x + bounds.w, bounds.y + bounds.h, top);
  return {
    minX: (bounds.x - (bounds.y + bounds.h)) * PPM - CULL_MARGIN,
    maxX: (bounds.x + bounds.w - bounds.y) * PPM + CULL_MARGIN,
    minY: far.sy - CULL_MARGIN,
    maxY: near.sy + CULL_MARGIN,
  };
}

/**
 * A hole in a floor shows exactly what is visible THROUGH the hole.
 *
 * Everything in a stairwell is BELOW the floor, and below the floor means
 * lower on screen — so a flight paints down across whatever lies in front of
 * the opening. There is no depth buffer to stop it and there should not be
 * one: the scene is a single Graphics object in painter's order, and the
 * floors are drawn first, in one pass, by design.
 *
 * So the contents of a well are clipped to the mouth of the well, which is
 * what a hole does. Nothing else about the stairs changes — the flight is the
 * same shape it always was, and the walls and the sort are untouched. It is
 * only no longer able to leave the opening.
 */
function mouthOf(hole: Rect, z: number): ScreenPoint[] {
  const { x, y, w, h } = hole;
  return [project(x, y, z), project(x + w, y, z), project(x + w, y + h, z), project(x, y + h, z)];
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
  private readonly camera: Phaser.Cameras.Scene2D.Camera;

  /**
   * Screen-space extent of every static solid and every piece of dressing,
   * indexed alongside the venue's own arrays.
   *
   * The building is 150 m long and the view is 45 m wide, so most frames most
   * of it is off screen — and since the seating landed, "most of it" is five
   * thousand seats. Testing four numbers beats projecting nine quads and then
   * discovering they were all outside the viewport, and it keeps the per-frame
   * draw queue at what is actually visible rather than at what exists.
   */
  private readonly obstacleBoxes: ScreenBox[];
  private readonly decorBoxes: ScreenBox[];

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
    this.camera = scene.cameras.main;

    // Storey elevation is not looked up here: the only raised plate is the
    // reception concourse at 1.2 m, and CULL_MARGIN is worth five metres.
    this.obstacleBoxes = venue.obstacles.map((o) =>
      screenBox(o.bounds, Math.min(o.base ?? 0, 0), Math.min(o.height, MAX_DRAWN_HEIGHT)),
    );
    this.decorBoxes = venue.decor.map((d) =>
      screenBox(d.bounds, Math.min(d.base ?? 0, 0), Math.min(d.height, MAX_DRAWN_HEIGHT)),
    );
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
  render(floor: Level, actors: Actor[], alpha: number, dt: number): void {
    const g = this.graphics;
    g.clear();

    this.ageMarks(dt);
    for (const actor of actors) {
      if (actor.floor === floor) this.recordSlip(actor, alpha);
    }

    const queue: Drawable[] = [];

    // The mouth of every stairwell arriving on this floor, in screen space.
    // See mouthOf: this is the only thing holding a flight inside its own hole.
    const mouths = new Map<string, ScreenPoint[]>();
    for (const link of this.venue.links) {
      if (link.to !== floor || link.from === floor) continue;
      const { x, y, w, h } = link.bounds;
      mouths.set(link.id, mouthOf(link.bounds, groundAt(this.venue, floor, x + w / 2, y + h / 2)));
    }

    for (const room of this.venue.rooms) {
      if (room.floor !== floor) continue;
      queue.push({
        // Floors draw first, but a raised plate has to draw after the one it
        // stands above or its edge is buried under the lower floor.
        depth: -1e6 + (room.elevation ?? 0),
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

    const view = this.viewBox();

    for (let i = 0; i < this.venue.obstacles.length; i += 1) {
      const obstacle = this.venue.obstacles[i];
      if (obstacle.floor !== floor || obstacle.hidden) continue;
      if (view && !overlapsView(this.obstacleBoxes[i], view)) continue;
      const { bounds } = obstacle;
      const base = groundAt(this.venue, floor, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
      const bottom = base + (obstacle.base ?? 0);
      // A tread of a flight ARRIVING here hangs in a well, and a well is only
      // ever seen through its own mouth. The same rectangle on the floor the
      // flight LEAVES from is a solid standing on the carpet and is not
      // clipped, which is why this asks the link and not the obstacle.
      const mouth = obstacle.linkId ? mouths.get(obstacle.linkId) : undefined;
      // No material means the building itself, which keeps the wall pair the
      // palette tuned by hand. Only furniture passes a tint.
      const tint = obstacle.material ? this.material(obstacle.material) : undefined;
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
            tint,
            bottom,
            mouth,
          ),
      });
    }

    // Dressing, after the solids and by the same rules: same cutaway, same
    // depth key, same box. The only difference is that nothing collides with
    // it and that its colour comes from the chapter rather than from the wall.
    for (let i = 0; i < this.venue.decor.length; i += 1) {
      const piece = this.venue.decor[i];
      if (piece.floor !== floor) continue;
      if (view && !overlapsView(this.decorBoxes[i], view)) continue;
      const { bounds } = piece;
      const base = groundAt(this.venue, floor, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
      queue.push({
        depth: depthKey(bounds.x + bounds.w, bounds.y + bounds.h, base + (piece.base ?? 0)),
        draw: (gfx) =>
          this.drawBox(
            gfx,
            bounds.x,
            bounds.y,
            bounds.w,
            bounds.h,
            base + Math.min(piece.height, MAX_DRAWN_HEIGHT),
            // Same rule as the solids: no material means the building itself,
            // which keeps the wall pair the palette tuned by hand. A wall cut
            // into pieces to follow a rake has to shade like the wall it is.
            piece.material ? this.material(piece.material) : undefined,
            base + (piece.base ?? 0),
          ),
      });
    }

    for (const actor of actors) {
      if (actor.floor !== floor) continue;
      const pos = renderPos(actor, alpha);
      // A robot down in a stairwell is NOT clipped to the mouth of it, on
      // purpose. Strictly the floor in front of the hole is between the camera
      // and the robot, and strictly the player would then be driving something
      // they cannot see. Same call as the 2.7 m cutaway: the building gives
      // way to the machine.
      const at = { ...pos, z: this.drawnZ(actor, pos, floor) };
      queue.push({
        depth: depthKey(at.x, at.y, at.z) + 1,
        draw: (gfx) => this.drawRobot(gfx, actor, at),
      });
      if (this.telemetry) {
        queue.push({
          depth: -1e6 + 2, // floor decal: under the robots, over the skid marks
          draw: (gfx) => this.drawStopMarker(gfx, actor, at),
        });
      }
    }

    queue.sort((a, b) => a.depth - b.depth);
    for (const item of queue) item.draw(g);
  }

  /**
   * The viewport, in the world layer's own pixels.
   *
   * The camera never scrolls: the scene moves the container the drawing is
   * parented to, so a point is on screen when its local position plus that
   * container's offset lands inside the camera. Without a container — nothing
   * does this today, but the constructor allows it — there is no offset to
   * read and everything is drawn.
   */
  private viewBox(): ScreenBox | undefined {
    const parent = this.graphics.parentContainer;
    if (!parent) return undefined;
    return {
      minX: -parent.x,
      maxX: this.camera.width - parent.x,
      minY: -parent.y,
      maxY: this.camera.height - parent.y,
    };
  }

  /**
   * What a material looks like in this era.
   *
   * The venue names materials and never colours — see `Material` — so this is
   * the one place the two meet. A chapter re-dresses the seating by changing
   * its palette, which is exactly the budget rule 3 allows it.
   */
  private material(of: Material | undefined): number {
    switch (of) {
      case 'seat':
        return this.palette.seat;
      case 'desk':
        return this.palette.desk;
      case 'sign':
        return this.palette.sign;
      case 'signAccent':
        return this.palette.accent;
      default:
        return this.palette.wall;
    }
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

  /**
   * Where to DRAW an actor vertically: on the flight as drawn, not as climbed.
   *
   * A full-storey flight is squashed to 2.4 m so it reads under the cutaway,
   * while the robot climbing it gains the true 6.2. Left alone the two
   * disagree by the difference, and a machine halfway up hangs in the air over
   * its own staircase. The simulation is untouched — this moves pixels.
   */
  private drawnZ(actor: Actor, pos: { x: number; y: number; z: number }, floor: Level): number {
    if (!actor.onLink) return pos.z;
    const link = this.venue.links.find((l) => l.id === actor.onLink);
    if (!link || link.drawnRise === undefined || link.drawnRise === link.rise) return pos.z;
    const f = climbFraction(link, pos.x, pos.y);
    return floor === link.from
      ? link.base + link.drawnRise * f
      : -link.drawnRise * (1 - f);
  }

  /** Paint a set of floor rectangles at a room's own level. */
  private drawTiles(g: Phaser.GameObjects.Graphics, room: Room, tiles: Rect[]): void {
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
      // The tiles are a plate with its stairwells cut out, so their own edges
      // ARE the lip of each opening — without the line a well reads as a
      // pattern in the carpet rather than a hole in it.
      g.strokePath();
    }
  }

  /** Fill one screen-space polygon, clipped to a window if there is one. */
  private fillPoly(
    g: Phaser.GameObjects.Graphics,
    points: ScreenPoint[],
    window?: ScreenPoint[],
  ): void {
    const poly = window ? clipToWindow(points, window) : points;
    if (poly.length < 3) return;
    g.beginPath();
    g.moveTo(poly[0].sx, poly[0].sy);
    for (const pt of poly.slice(1)) g.lineTo(pt.sx, pt.sy);
    g.closePath();
    g.fillPath();
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
    /** Screen-space window this box is seen through — a stairwell's mouth. */
    window?: ScreenPoint[],
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
    this.fillPoly(g, [topA, topB, botB, botA], window);

    // West face, a touch darker still
    g.fillStyle(this.lit(shade(side, 0.82)), 1);
    this.fillPoly(g, [topA, topD, botD, botA], window);

    // Top face
    g.fillStyle(this.lit(top), 1);
    this.fillPoly(g, [topA, topB, topC, topD], window);
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

/**
 * Clip a screen-space polygon to a convex window — Sutherland–Hodgman.
 *
 * Walks the window's edges, keeping the part of the polygon inside each. The
 * window is always a projected rectangle, so it is convex and this terminates
 * in four passes, a handful of vector operations per quad.
 */
function clipToWindow(subject: ScreenPoint[], window: ScreenPoint[]): ScreenPoint[] {
  // Screen y grows downward, so the winding the projection produces decides
  // which side is inside. Read it off the window rather than assuming it, or
  // the clip keeps the outside and throws away the inside.
  const orient = Math.sign(signedArea(window)) || 1;

  let output = subject;
  for (let edge = 0; edge < window.length && output.length > 2; edge += 1) {
    const a = window[edge];
    const b = window[(edge + 1) % window.length];
    const inside = (p: ScreenPoint) =>
      orient * ((b.sx - a.sx) * (p.sy - a.sy) - (b.sy - a.sy) * (p.sx - a.sx)) >= 0;

    const input = output;
    output = [];
    for (let i = 0; i < input.length; i += 1) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      if (inside(current)) {
        if (!inside(previous)) output.push(meet(previous, current, a, b));
        output.push(current);
      } else if (inside(previous)) {
        output.push(meet(previous, current, a, b));
      }
    }
  }
  return output;
}

function signedArea(poly: ScreenPoint[]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a.sx * b.sy - b.sx * a.sy;
  }
  return area;
}

/** Where segment p→q crosses the infinite line through a and b. */
function meet(p: ScreenPoint, q: ScreenPoint, a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  const rx = q.sx - p.sx;
  const ry = q.sy - p.sy;
  const sx = b.sx - a.sx;
  const sy = b.sy - a.sy;
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return q; // parallel: only ever called on a crossing
  const t = ((a.sx - p.sx) * sy - (a.sy - p.sy) * sx) / denominator;
  return { sx: p.sx + rx * t, sy: p.sy + ry * t };
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

/** Is any part of this box inside the view? */
function overlapsView(box: ScreenBox, view: ScreenBox): boolean {
  return (
    box.maxX >= view.minX && box.minX <= view.maxX && box.maxY >= view.minY && box.minY <= view.maxY
  );
}

/** Multiply a packed 0xRRGGBB colour by a factor. */
export function shade(colour: number, factor: number): number {
  const r = Math.min(255, Math.round(((colour >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((colour >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((colour & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
