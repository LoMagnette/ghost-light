/**
 * Getting between levels.
 *
 * The rule is one number per robot, not a flag: `maxStepRise` is the tallest
 * single step a machine can get over, measured against the 0.18 m risers the
 * building is built to. Voxxy clears them, Droid matches them exactly and can
 * climb these stairs and nothing steeper, Biggy is 0.00 and never climbs
 * anything. A ramp has no step to get over, so `maxSlope` decides that one
 * instead — and every robot clears the wheelchair ramp, including the one that
 * can climb no stairs at all.
 *
 * The consequence is the thing worth having: the same flight is a route for
 * one robot and a wall for another, out of the same geometry, with no
 * per-robot special cases anywhere in the venue.
 *
 * Climbing is not free and is not clamped. A robot on a slope gets the real
 * component of its own weight pulling it back down the hill, so a heavy or
 * weak machine slows on the way up and runs away from itself on the way down,
 * and neither behaviour had to be written.
 */

import { rectContains, type Link, type Venue } from './Venue';
import type { RobotSpec } from './RobotSpec';

/** Can this machine use this link at all? */
export function canTraverse(spec: RobotSpec, link: Link): boolean {
  if (link.riser > 0) return spec.maxStepRise >= link.riser;
  return gradient(link) <= spec.maxSlope;
}

/** Rise over run. Always positive. */
export function gradient(link: Link): number {
  const run = link.axis === 'y' ? link.bounds.h : link.bounds.w;
  return run > 0 ? link.rise / run : Infinity;
}

/**
 * How far up the link a point is, 0 at the bottom and 1 at the top.
 * Clamped, so a point past either end reads as that end.
 */
export function climbFraction(link: Link, x: number, y: number): number {
  const b = link.bounds;
  const along = link.axis === 'y' ? (y - b.y) / b.h : (x - b.x) / b.w;
  const f = link.ascending ? along : 1 - along;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** Height of the link's walking surface at a point, above the `from` datum. */
export function surfaceHeight(link: Link, x: number, y: number): number {
  return link.base + link.rise * climbFraction(link, x, y);
}

/**
 * Can this machine get ONTO the link where it is standing?
 *
 * Being able to climb a flight is not the same as being able to join it
 * anywhere along its length. Walk into the top of a staircase from the floor
 * below and the first tread is a storey above your feet — that is a wall, and
 * without this check it is a teleport to the upper landing instead.
 *
 * The same rule gives ramps their behaviour for free: you roll on at the
 * bottom because the surface is flush there, and meet a 1.2 m face if you
 * approach the top across the lower floor.
 */
export function canStepOnto(spec: RobotSpec, link: Link, x: number, y: number, z: number): boolean {
  if (!canTraverse(spec, link)) return false;
  // A little slack above maxStepRise so a robot already tracking the surface
  // is never thrown off it by a rounding error mid-climb.
  const reach = spec.maxStepRise + 0.06;
  return Math.abs(surfaceHeight(link, x, y) - z) <= reach;
}

/** The link under a point on a given floor, if any. */
export function linkAt(venue: Venue, floor: 0 | 1, x: number, y: number): Link | undefined {
  return venue.links.find(
    (l) => (l.from === floor || l.to === floor) && rectContains(l.bounds, x, y),
  );
}

/**
 * Downhill direction as a world vector whose LENGTH is sin(slope angle) — so
 * multiplying by mass and g gives the force gravity puts on a body resting on
 * it, with no trigonometry at the call site.
 */
export function downhill(link: Link): { x: number; y: number } {
  const g = gradient(link);
  // sin = rise / hypotenuse, and the hypotenuse of a 1:g triangle is sqrt(1+g²).
  const sin = g / Math.sqrt(1 + g * g);
  const sign = link.ascending ? -1 : 1;
  return link.axis === 'y' ? { x: 0, y: sin * sign } : { x: sin * sign, y: 0 };
}
