/**
 * Venue geometry — the Kinepolis Antwerp, in metres.
 *
 * The building is described ONCE, here, and dressed three times. Chapter 1
 * (the empty future), Chapter 2 (JavaPolis) and Chapter 3 (Devoxx at capacity)
 * all walk the same floor. That is deliberate and it is worth 10 points:
 * a judge who recognises the same corridor in three different lights believes
 * the place exists in a way that three separate levels never achieve.
 *
 * Coordinates are metres with the origin at the foot of the grand staircase
 * on the exhibition floor. +x runs east, +y runs north, +z up. Floor 0 is the
 * exhibition hall, floor 1 is the auditorium level, 6.2 m above it.
 */

export const FLOOR_HEIGHT = 6.2;

/**
 * Which storey a thing is on: an index from the ground up.
 *
 * A number rather than `0 | 1`. The pair was honest while the building had two
 * storeys and it was load-bearing in sixty-four places, which is exactly the
 * kind of type you want to widen BEFORE a third one exists rather than after —
 * every one of those sites is a `!==` filter that carries on working, and none
 * of them would have carried on compiling.
 *
 * It is not the same thing as a level. A storey is the datum heights are
 * measured from; a level is a plate at some height above it, and one storey
 * holds as many of those as the building has — the reception concourse stands
 * 1.2 m over the exhibition hall and both are storey 0.
 */
export type Level = number;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type RoomKind =
  | 'hall' // open exhibition floor
  | 'corridor'
  | 'foyer'
  | 'auditorium'
  | 'stage' // the flat plate at the bottom of an auditorium's rake
  | 'stairs'
  | 'service';

export interface Room {
  id: string;
  /** Human label. Shown in the HUD and used by the objective system. */
  label: string;
  kind: RoomKind;
  floor: Level;
  bounds: Rect;
  /**
   * Auditorium seating rake, in metres of rise across the room. 0 for flat.
   *
   * Not decoration: this is a real level change, and the room's stage plate
   * sits exactly this far BELOW the corridor you walk in from. It is one
   * building riser per row of seats, so the steps a robot climbs, the tiers
   * the seats stand on and this number cannot drift apart.
   */
  rake?: number;

  /**
   * Which end of its corridor frontage this room's doors sit at.
   *
   * Auditoriums here are entered from one side, not the middle, and
   * consecutive rooms alternate. Centring a door — which is what a generic
   * wall builder does — puts it behind the screen wall of a fan-shaped room,
   * which is the one place a door cannot be.
   */
  doorSide?: 'low' | 'high';

  /**
   * Height of this room's floor above its storey datum, in metres.
   *
   * A storey is not one flat plane. The reception concourse sits 1.2 m above
   * the exhibition hall and you go DOWN into the hall — same floor number,
   * different level. Without this the drop is invisible, and a level change
   * you cannot see is a level change the player will not believe.
   */
  elevation?: number;

  /**
   * Holes in this room's floor plate — stairwells, in practice.
   *
   * A corridor with a staircase coming up through it does not have floor
   * there, and painting one over the flight arriving from below is how a
   * staircase goes missing on the floor it serves. Render-only: the flight
   * itself provides the collision, so nothing in the simulation reads these.
   */
  voids?: Rect[];
}

/** A solid the robots collide with: walls, columns, seat blocks, booths. */
export interface Obstacle {
  floor: Level;
  bounds: Rect;
  /**
   * Top of this solid above its storey datum, metres. Under 0.5 m is a kerb
   * Voxxy can hop. Negative for anything hanging below the floor.
   */
  height: number;

  /**
   * Bottom of this solid above its storey datum, metres. Defaults to 0 —
   * almost everything stands on the floor.
   *
   * Set for geometry that hangs: a flight of stairs seen from the floor it
   * ARRIVES on is a stepped mass descending into a well, not a block standing
   * on the carpet.
   */
  base?: number;
  /**
   * What this is made of, when it is not the building itself.
   *
   * Left off, a solid is a wall and takes the wall colour, which is right for
   * every wall, column and floor plate in here. Furniture is not a wall, and
   * the presenter's desk reading as a lump of concrete was the whole reason
   * this exists. Same rule as `Decor.material`: the venue names the material
   * and the chapter says what it looks like.
   */
  material?: Material;

  /**
   * Collide with this, but do not draw it.
   *
   * For solids whose visible form is finer than their collision shape: the
   * seat banks are one block a robot cannot enter, and the thing you see is
   * three hundred seats in `decor`. Drawing both would put a grey slab
   * through the seating.
   */
  hidden?: boolean;

  /** Biggy can shove this out of the way if its momentum is high enough. */
  movable?: boolean;
  /** kg, only meaningful when movable. */
  mass?: number;

  /**
   * Set when this solid is a tread of a staircase or ramp.
   *
   * A flight is solid to a robot that cannot climb it and walkable to one that
   * can, which is the whole of the stair rule: Biggy meets a wall exactly
   * where Voxxy meets a route. Same geometry, different answer per robot.
   */
  linkId?: string;
}

/**
 * What a piece of dressing is made of, so the venue never names a colour.
 *
 * The building is defined once and the chapters dress it — so `Decor` says
 * what a thing IS and the renderer asks the chapter's palette what that looks
 * like in this era. A raw tint here would be a colour the chapters cannot
 * change, which is the one thing rule 2 forbids.
 */
export type Material =
  | 'structure' // concrete, terracing, anything the building is built of
  | 'seat'
  | 'desk' // the presenter's table and lectern
  | 'sign' // the letters of a sign, its body colour
  | 'signAccent' // the one letter that is not
  | 'screen'; // the projection screen on an auditorium's end wall

/**
 * Dressing: DRAWN, never simulated.
 *
 * Five thousand seats are not five thousand things to collide with — a robot
 * meets the seat block, not the seat — and putting them in `obstacles` would
 * cost the 120 Hz solver five thousand tests per robot per step to answer a
 * question the bank already answered. So the bank stays in `obstacles` and is
 * marked `hidden`, and what you actually see is this.
 *
 * Nothing in `src/core` reads this list except to carry it. It is the one
 * place in the venue where the reason a thing exists is purely visual.
 */
export interface Decor {
  floor: Level;
  bounds: Rect;
  /** Top above its storey datum, metres. */
  height: number;
  /** Bottom above its storey datum, metres. Defaults to 0. */
  base?: number;
  material?: Material;

  /**
   * Set when this piece is banded to a flight — a wall running alongside a
   * staircase or a rake, stepping down with it.
   *
   * Unlike `Obstacle.linkId` this says nothing about who may climb what:
   * dressing never collides. It says where the heights above are measured
   * FROM. A flight states its surface from the storey datum, so anything cut
   * to a flight's bands does too, and the renderer must not also add the plate
   * the piece happens to stand over. The ends of such a wall stick out past
   * the flight, have no surface of their own, and leave this unset.
   */
  linkId?: string;
}

/** A walkable link between floors. Robots climb it; Biggy climbs it slowly. */
export interface Link {
  id: string;
  from: Level;
  to: Level;
  bounds: Rect;
  /** Rise in metres. A full floor is 6.2. */
  rise: number;

  /**
   * The axis the flight CLIMBS along — not necessarily its longer side. The
   * grand staircase out of the reception concourse is 15.7 m wide and 5.6 m
   * deep, so its long axis is the one you walk across, not the one you walk
   * up. Guessing from the bounds gets that backwards.
   */
  axis: 'x' | 'y';

  /** True when height increases with that coordinate. */
  ascending: boolean;

  /**
   * Height of the link's LOW end above its `from` floor's datum, in metres.
   *
   * Not every flight starts at zero. The grand staircase begins in the
   * reception concourse, which is itself 1.2 m up, so it climbs 5.0 m to reach
   * the auditorium level rather than the full 6.2. Stating it beats inferring
   * it: at a link's ends two rooms always overlap, and asking the geometry
   * which one you are standing on there has no reliable answer.
   */
  base: number;

  /**
   * Metres of the flight's WIDTH given over to climbing it sideways, or
   * undefined for a flight you may only walk up end-on.
   *
   * A staircase in a stairwell is a one-dimensional thing: it climbs along one
   * axis and its two sides are walls. A flight of shallow steps standing in
   * the open is not — the threshold between the reception and the hall is
   * 23 m wide and 3 m deep, and you walk up it from the front or from either
   * flank, because there is nothing there to stop you. Modelled as a plain
   * ramp along y it would be a 1.2 m cliff down both its sides.
   *
   * So the surface climbs from each long side as well, reaching full height
   * `wrap` metres in, and the height at a point is the LOWER of the two — the
   * terrace you get by nesting one rectangle inside the next. See
   * `Traversal.climbFraction`, which is the only place it is read.
   */
  wrap?: number;

  /**
   * Riser height in metres, or 0 for a ramp.
   *
   * This is what `RobotSpec.maxStepRise` is measured against, so it is the
   * number that decides who may use this link at all. 0 means there is no step
   * to get over and the gradient alone decides — see `maxSlope`.
   */
  riser: number;
}

export interface Venue {
  rooms: Room[];
  obstacles: Obstacle[];
  /** Drawn, never collided. See Decor. */
  decor: Decor[];
  links: Link[];
  /** Overall extents, indexed by storey. Intended for camera clamping. */
  extents: Rect[];
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function rectCentre(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Find the room containing a point, or undefined if the point is outside. */
export function roomAt(venue: Venue, floor: Level, x: number, y: number): Room | undefined {
  return venue.rooms.find((r) => r.floor === floor && rectContains(r.bounds, x, y));
}

/**
 * Height of the floor plate at a point, ignoring links.
 *
 * Rooms overlap — the corridor and an auditorium share a doorway's worth of
 * floor, and a stage is a plate lying inside the room it belongs to — so the
 * SMALLEST plate containing the point wins. Smallest rather than highest, and
 * the difference is not cosmetic:
 *
 *   - it is deterministic, which "the first one listed" is not;
 *   - a plate nested inside another overrides it, which is what makes a stage
 *     inside an auditorium expressible at all;
 *   - it can go DOWN. Taking the highest meant seeding the answer with 0 and
 *     maxing against it, so no floor could ever sit below its storey datum —
 *     and every auditorium floor in this building does.
 *
 * Where two plates genuinely overlap at the same level, which is every doorway
 * in the venue, all three rules agree and always did.
 */
export function groundAt(venue: Venue, floor: Level, x: number, y: number): number {
  let best: Room | undefined;
  let bestArea = Infinity;
  for (const room of venue.rooms) {
    if (room.floor !== floor || !rectContains(room.bounds, x, y)) continue;
    const area = room.bounds.w * room.bounds.h;
    if (area < bestArea) {
      best = room;
      bestArea = area;
    }
  }
  return best?.elevation ?? 0;
}
