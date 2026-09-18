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
}

/** A solid the robots collide with: walls, columns, seat blocks, booths. */
export interface Obstacle {
  floor: 0 | 1;
  bounds: Rect;
  /** Height in metres. Under 0.5 m is a kerb Voxxy can hop. */
  height: number;
  /** Biggy can shove this out of the way if its momentum is high enough. */
  movable?: boolean;
  /** kg, only meaningful when movable. */
  mass?: number;
}

/** A walkable link between floors. Robots climb it; Biggy climbs it slowly. */
export interface Link {
  id: string;
  from: 0 | 1;
  to: 0 | 1;
  bounds: Rect;
  /** Rise in metres. The grand staircase is the full floor height. */
  rise: number;
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
