/**
 * Isometric projection.
 *
 * World space is metres: +x east, +y north along the floor, +z up.
 * Screen space is a classic 2:1 isometric projection, so one metre east and
 * one metre north are the same screen distance and the floor reads as a
 * diamond grid.
 *
 * Everything in the simulation thinks in metres. Only the renderer calls in
 * here. Keep it that way — the moment gameplay code starts reasoning in
 * pixels, the physics stops being honest and the venue stops being to scale.
 */

/** Screen pixels per world metre along the isometric x axis. */
export const PPM = 28;

/** Vertical squash of the floor plane. 0.5 gives the standard 2:1 look. */
export const ISO_SQUASH = 0.5;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  sx: number;
  sy: number;
}

/** Project a world-space point (metres) to screen-space pixels. */
export function project(x: number, y: number, z = 0): ScreenPoint {
  return {
    sx: (x - y) * PPM,
    sy: (x + y) * PPM * ISO_SQUASH - z * PPM,
  };
}

/**
 * Inverse projection onto the floor plane (z = 0). Used for pointer picking —
 * "where in the building did the player click".
 */
export function unprojectFloor(sx: number, sy: number): { x: number; y: number } {
  const a = sx / PPM;
  const b = sy / (PPM * ISO_SQUASH);
  return { x: (b + a) / 2, y: (b - a) / 2 };
}

/**
 * Painter's-algorithm depth key. Larger draws later (in front).
 *
 * Depth is (x + y) so things further "down" the diamond occlude things behind
 * them, with z breaking ties so a robot on the staircase draws over the floor
 * it is above. Multiply rather than add so a tall room cannot invert the
 * floor ordering.
 */
export function depthKey(x: number, y: number, z = 0): number {
  return (x + y) * 16 + z * 0.5;
}

/** Convert a compass heading in radians to one of 8 sprite facings (0 = east). */
export function headingToFacing8(heading: number): number {
  const TAU = Math.PI * 2;
  const normalised = ((heading % TAU) + TAU) % TAU;
  return Math.round(normalised / (TAU / 8)) % 8;
}
