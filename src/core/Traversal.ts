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

import { groundAt, rectContains, type Level, type Link, type Venue } from './Venue';
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

/**
 * Datum of `floor` above the link's `from` floor, in metres.
 *
 * A link states its `base` and `rise` from the floor it LEAVES; an actor
 * measures its own z from the floor it is STANDING ON. Going up those are the
 * same number, and going down they are a storey apart. Without this correction
 * a robot at the top of a flight reads its own height as 0 and the flight's as
 * 6.2, decides it cannot step on, and walks over the stairwell as if the floor
 * were solid — which is what "the stairs are not there upstairs" looks like
 * from inside the code. A same-floor link (the concourse steps, the ramp) has
 * no correction to make.
 */
function datumOf(link: Link, floor: Level): number {
  return floor === link.from ? 0 : link.base + link.rise;
}

/** Height of the link's walking surface at a point, above `floor`'s datum. */
export function surfaceHeight(
  link: Link,
  x: number,
  y: number,
  floor: Level = link.from,
): number {
  return link.base + link.rise * climbFraction(link, x, y) - datumOf(link, floor);
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
export function canStepOnto(
  spec: RobotSpec,
  link: Link,
  x: number,
  y: number,
  z: number,
  floor: Level = link.from,
): boolean {
  if (!canTraverse(spec, link)) return false;
  // A little slack above maxStepRise so a robot already tracking the surface
  // is never thrown off it by a rounding error mid-climb.
  const reach = spec.maxStepRise + 0.06;
  return Math.abs(surfaceHeight(link, x, y, floor) - z) <= reach;
}

/** The link under a point on a given floor, if any. */
export function linkAt(venue: Venue, floor: Level, x: number, y: number): Link | undefined {
  return venue.links.find(
    (l) => (l.from === floor || l.to === floor) && rectContains(l.bounds, x, y),
  );
}

/**
 * What a machine is standing on, and what it is doing to it.
 *
 * There are two kinds of walkable surface in this building — floor plates and
 * links — and until now each was queried separately and the answers stitched
 * together by hand in `Sim.resolveSurfaces`. Three places asked "is there a
 * link under this robot and may it use it": the slope force, the surface
 * height and the stair speed cap, all with the same arguments and all free to
 * disagree. The scar on `datumOf` below is what that costs when they do.
 *
 * So the question is asked ONCE and answered as one value. Adding a third kind
 * of surface — a sloped plate, say — is then a change to this function rather
 * than to every caller of it.
 */
export interface Footing {
  /** Height of the surface, above the datum of the floor the actor is on. */
  z: number;
  /**
   * Downhill direction, with a LENGTH of sin(slope angle) — multiply by mass
   * and g for the force gravity puts on a body resting here. Zero on the flat
   * AND on stairs: a machine WALKS up stairs, and a walking machine is limited
   * by how fast it can place a foot, not by the weight on the slope. See
   * `Sim.limitStairSpeed`.
   */
  slopeX: number;
  slopeY: number;
  /** The link being stood on, if this footing is one. */
  link?: Link;
}

export function footingAt(
  venue: Venue,
  spec: RobotSpec,
  floor: Level,
  x: number,
  y: number,
  z: number,
): Footing {
  const link = linkAt(venue, floor, x, y);
  if (link && canStepOnto(spec, link, x, y, z, floor)) {
    const pull = link.riser > 0 ? { x: 0, y: 0 } : downhill(link);
    return { z: surfaceHeight(link, x, y, floor), slopeX: pull.x, slopeY: pull.y, link };
  }
  return { z: groundAt(venue, floor, x, y), slopeX: 0, slopeY: 0 };
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
