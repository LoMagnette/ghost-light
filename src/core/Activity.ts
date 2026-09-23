/**
 * What a robot can do to the building, and who is allowed to do it.
 *
 * Until this existed a chapter's objective was a sentence in the HUD and
 * nothing behind it. This is the vocabulary all three chapters are written
 * in — six kinds, no more — and the rule is that a chapter composes these
 * rather than shipping logic of its own. If a chapter needs a seventh kind,
 * it belongs here where all three can reach it, not in a screen.
 *
 * Nothing in this file knows about rendering, input or chapters. It is data
 * and predicates; `Objective.ts` runs it.
 *
 * See `docs/MECHANICS.md` §3.
 */

import type { Level, Rect } from './Venue';
import type { Look } from './Crowd';
import type { RobotSpec } from './RobotSpec';

/** A patch of one storey. An activity happens where it happens. */
export interface Zone {
  floor: Level;
  bounds: Rect;
}

/**
 * Capability gates, in metres and kilograms.
 *
 * Three of the four are dimensions the robots already had — this is the
 * design deciding to USE `height` and `radius` rather than inventing flags.
 * A gate is always stated as the requirement, never as a robot id: the day
 * an activity says `robot: 'droid'` is the day the cast stops being three
 * machines and starts being three keys.
 */
export interface Gates {
  /** The robot's `height` must be at least this. A counter at 2 m is Droid. */
  reach?: number;
  /** The robot's `radius` must be at most this. A 0.40 m gate is Voxxy. */
  maxRadius?: number;
  /** The robot's `payload` capacity must be at least this. */
  carry?: number;
}

/**
 * Raising the light over part of the building, as the consequence of doing
 * something.
 *
 * Chapter I's whole progression: three boards, three zones, and a building
 * that assembles itself around the player. It lives on the activity rather
 * than on the chapter because "what winning does" is part of the objective,
 * and the objective is one of the four things a chapter may change.
 */
export interface Reveal {
  floor: Level;
  bounds: Rect;
  /** Light level to bring this zone to, 0..1. */
  to: number;
}

interface Common {
  id: string;
  /** One line, shown on the card. Written for a player, not for a log. */
  label: string;
  /** Where it is done. */
  at: Zone;
  gates?: Gates;
  /**
   * Seconds of chapter clock this is available for. Absent means always.
   *
   * A window that closes on an unfinished activity marks it MISSED, which is
   * permanent. That is Chapter III's whole tension and it is the truest thing
   * about a conference.
   */
  window?: { from: number; to: number };
  /**
   * Beside the point. Doing it is worth something; not doing it is not a
   * failure to finish.
   *
   * `ObjectiveRun` ends a round when everything finishable is settled, which
   * is how Chapter I knows it is over. A side quest must not count towards
   * that or it ends the round the moment the player takes the detour — and
   * for Chapter II, whose round ends on its clock or on three dark rooms, an
   * optional activity that could end it early would be worse than not having
   * one at all.
   */
  optional?: boolean;
  /** Ids that must be done first. Freeing the shutter opens the loading bay. */
  after?: string[];
  /**
   * Seconds to do this in, counted from when the last of `after` was done.
   *
   * `window` is the other deadline in here and it is absolute — chapter
   * seconds, which is what Chapter III's day is measured in. This one is
   * RELATIVE, because the thing it exists for is a threat: a cat tells you
   * you have forty-five seconds, and forty-five seconds from WHAT is the
   * whole point. An absolute window cannot express it, because when the
   * clock starts depends on when the player found the cat.
   *
   * Runs out and the activity is MISSED, permanently, the same as a window
   * closing. Meaningless without `after`, and `npm run objectives` says so.
   */
  within?: number;
  reveal?: Reveal;
  /**
   * Activities that are one thing to the player, many to the simulation.
   *
   * Twenty-seven stands are twenty-seven taps and one line on the card. The
   * card aggregates by this; nothing else reads it.
   */
  group?: string;
}

/** Contact. The cheap one, and Voxxy's: twenty-seven of them is a sweep. */
export interface TapActivity extends Common {
  kind: 'tap';
}

/**
 * Standing still, which is the one thing a 190 kg machine is best at.
 * Progress decays when nobody is there, so wandering off costs you.
 */
export interface DwellActivity extends Common {
  kind: 'dwell';
  seconds: number;
}

/**
 * Carry something from A to B, and feel it the whole way.
 *
 * `mass` goes into `Body.payload`, so the delivery is harder than the
 * journey: it completes only when the carrier is inside the drop zone AND
 * nearly stopped, and a laden Biggy needs about six metres to arrange that.
 */
export interface HaulActivity extends Common {
  kind: 'haul';
  mass: number;
  to: Zone;
  /**
   * Dropped by a hard enough collision. A tray of coffee is.
   *
   * Deliberately keyed to an IMPACT rather than to acceleration: braking hard
   * with a full tray is a thing you are allowed to do, and hitting a stand at
   * speed is not. It also costs nothing — `Body.lastImpactSpeed` is already
   * written every step for the camera shake.
   */
  fragile?: boolean;
}

/** Be in the room. Presence accumulates only while the window is open. */
export interface AttendActivity extends Common {
  kind: 'attend';
  /** Seconds of presence needed. Less than the window, or nobody makes it. */
  seconds: number;
}

/**
 * Hit it hard enough to move it.
 *
 * Measured in momentum rather than speed, which is the whole point: cruise
 * momentum is Voxxy 266, Droid 777, Biggy 1366 kg·m/s, so a 900 threshold is
 * Biggy-only AND demands two thirds of its top speed. It has to have taken a
 * run-up. This is what finally reads `Obstacle.movable`.
 */
export interface ShoveActivity extends Common {
  kind: 'shove';
  momentum: number;
}

/**
 * A room that is running, and will stop if left alone. Chapter II.
 *
 * The meter is in SECONDS of session left, which makes every number here
 * legible: it drains at one second per second plus the ramp, a tap buys eight
 * of them back, and a repair fills it. It never completes — it can only be
 * kept alive or lost.
 */
export interface TendActivity extends Common {
  kind: 'tend';
  /**
   * The room this session is in.
   *
   * Stated rather than derived from the id or found by testing the zone
   * against every room in the venue, because when the session ends the
   * PEOPLE in that room have to be found — the audience in the seats and the
   * speaker on the stage — and "the room whose bounds contain the centre of
   * `at`" is a lookup that happens to work rather than a link that is meant.
   */
  room: string;
  /** Seconds on the clock when full. */
  capacity: number;
  /** Seconds of meter lost per second, at the start of the round. */
  drain: number;
  /** Extra drain per second, per second. The day gets worse. */
  drainRamp: number;
  /** Seconds bought by arriving at the rack. Voxxy's contribution. */
  tapBonus: number;
  /** A full reset costs this much standing still at `repairReach` metres. */
  repairSeconds: number;
  repairReach: number;
}

/**
 * Somebody with something to say, and the only activity the player ADVANCES
 * rather than performs.
 *
 * Everything else in here is a consequence of where a robot is and how fast:
 * you drive into a zone and the building notices. This one waits. It costs a
 * keypress per line, which is a different verb from anything else in the game
 * and is exactly why it is worth having — a conference is people talking, and
 * a conference game whose twelve objectives are all errands run past silent
 * figures is missing the thing it is about.
 *
 * Deliberately a SEVENTH KIND here rather than a dialogue system off to one
 * side. Put it here and it inherits gates, windows, prerequisites, the card,
 * the world marker and `npm run objectives` — which is the whole argument
 * this file makes at the top for keeping the vocabulary in one place. A
 * conversation gated behind `reach: 2.0` is Droid being the only one tall
 * enough to be spoken to across a counter, and that falls out for free.
 *
 * `lines` is paged, one box at a time. Keep each one short enough to read
 * without stopping — the robot is standing in a corridor while you do.
 */
export interface TalkActivity extends Common {
  kind: 'talk';
  /** Who is speaking. Shown above the box, so it is a name and not a title. */
  who: string;
  /**
   * What is standing there, if it is not a person.
   *
   * Chapter I is an empty building and the only two things left living in it
   * are an animal apiece. They use every bit of this that a registration desk
   * does — a post, a marker, a box of dialogue — and differ in the one way
   * that matters, which is what you see when you get there.
   */
  shape?: 'cat' | 'dog';
  /** What they look like, for the ones who are a person. See `Look`. */
  look?: Look;
  /**
   * A SECOND conversation with somebody the objective has already put in the
   * building, in the same place as the first.
   *
   * Every `talk` activity stands a person at its zone, which is the rule
   * that stops a conversation being written with nobody to have it — see
   * `ChapterScreen`. Going back to somebody you have already met is the one
   * case that rule gets wrong: without this it puts a second, identical host
   * inside the first one.
   */
  alreadyHere?: boolean;
  /** What they say, one boxful at a time. */
  lines: string[];
}

export type Activity =
  | TapActivity
  | DwellActivity
  | HaulActivity
  | AttendActivity
  | ShoveActivity
  | TendActivity
  | TalkActivity;

/** Is this point inside this zone? Storey first — rooms stack. */
export function inZone(zone: Zone, floor: Level, x: number, y: number): boolean {
  const b = zone.bounds;
  return floor === zone.floor && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
}

/** Centre of a zone, for markers and for where a dropped item goes back to. */
export function zoneCentre(zone: Zone): { x: number; y: number } {
  return { x: zone.bounds.x + zone.bounds.w / 2, y: zone.bounds.y + zone.bounds.h / 2 };
}

/**
 * May this machine do this thing?
 *
 * Note what is NOT here: reaching the place at all. Whether a robot can get
 * to storey 1 is decided by `maxStepRise` against the building's stairs, in
 * `Traversal`, and it stays there. Biggy is locked out of the keynote by the
 * geometry rather than by a rule written about the keynote.
 */
export function admits(activity: Activity, spec: RobotSpec): boolean {
  const gates = activity.gates;
  if (gates) {
    if (gates.reach !== undefined && spec.height < gates.reach) return false;
    if (gates.maxRadius !== undefined && spec.radius > gates.maxRadius) return false;
    if (gates.carry !== undefined && spec.payload < gates.carry) return false;
  }
  if (activity.kind === 'haul' && spec.payload < activity.mass) return false;
  return true;
}

/** Which of the cast can do this. Used by the card to say "Droid only". */
export function admittedBy(activity: Activity, specs: RobotSpec[]): RobotSpec[] {
  return specs.filter((spec) => admits(activity, spec));
}
