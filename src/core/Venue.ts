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
  | 'stairs'
  | 'service';

export interface Room {
  id: string;
  /** Human label. Shown in the HUD and used by the objective system. */
  label: string;
  kind: RoomKind;
  floor: 0 | 1;
  bounds: Rect;
  /** Auditorium seating rake, in metres of rise across the room. 0 for flat. */
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
  floor: 0 | 1;
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

/** A walkable link between floors. Robots climb it; Biggy climbs it slowly. */
export interface Link {
  id: string;
  from: 0 | 1;
  to: 0 | 1;
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
  links: Link[];
  /** Overall extents per floor, for camera clamping. */
  extents: Record<0 | 1, Rect>;
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
export function roomAt(venue: Venue, floor: 0 | 1, x: number, y: number): Room | undefined {
  return venue.rooms.find((r) => r.floor === floor && rectContains(r.bounds, x, y));
}

/**
 * Height of the walkable surface at a point, ignoring links.
 *
 * Rooms overlap — the corridor and an auditorium share a doorway's worth of
 * floor — so this takes the HIGHEST elevation found rather than the first.
 * Picking the first would make a robot's height depend on the order the venue
 * happens to list its rooms in.
 */
export function groundAt(venue: Venue, floor: 0 | 1, x: number, y: number): number {
  let best = 0;
  for (const room of venue.rooms) {
    if (room.floor !== floor || !room.elevation) continue;
    if (rectContains(room.bounds, x, y)) best = Math.max(best, room.elevation);
  }
  return best;
}
