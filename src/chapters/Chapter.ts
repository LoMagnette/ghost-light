/**
 * A chapter is an era: the same building, a different reading of it.
 *
 * ONE engine, THREE rulesets. A chapter never ships its own renderer, its own
 * physics or its own copy of the venue. It supplies four things and nothing
 * else:
 *
 *   1. a palette and light level      (what the era looks like)
 *   2. a crowd density                (how full the building is)
 *   3. a control mode                 (how the player acts on the robots)
 *   4. an objective                   (what winning means)
 *
 * If you find yourself adding a fifth field, stop and ask whether the thing
 * you want belongs in core/ instead. The twelve-day schedule survives only
 * because the chapters are thin.
 */

import type { Level } from '@/core/Venue';
import type { RobotId } from '@/core/RobotSpec';
import type { Objective } from '@/core/Objective';

/**
 * How the player acts on the robots.
 *
 * Driving is the only verb in all three chapters; what evolves is what you
 * are deciding with it. Chapter I is one machine and one thing to find.
 * Chapter II is two machines and a building falling behind you, so you react.
 * Chapter III is three machines, each locked out of things the others can do,
 * and a day too short to do everything, so you elect. That is the Devoxx 2026
 * "From Developer to Builder" theme expressed as a verb rather than a
 * subtitle.
 */
export type ControlMode =
  | 'direct' // Ch.1 — WASD one robot. You are the hands.
  | 'switch'; // Ch.2 and Ch.3 — WASD, Tab to take over another.

/*
 * `direct-order` was here and is gone, cut 21 Sep along with the idea that the
 * player ever stops driving. Four versions of "issue intent and the robots
 * execute" were designed and all four were the same RTS order queue; what
 * replaced it is the conference itself, where the robots differ by what they
 * can physically do rather than by what you are allowed to tell them. The arc
 * is no longer the keystroke — it is what you are deciding with it: drive,
 * react, elect. See `docs/MECHANICS.md` and `docs/PROMPTS.md`.
 */

export interface Palette {
  /** Background void beyond the building envelope. */
  void: number;
  /** Floor fill. */
  floor: number;
  /** Floor grid / tile seams. */
  floorLine: number;
  /** Walls and solid obstacles, lit face. */
  wall: number;
  /** Walls and solid obstacles, shadowed face. */
  wallShade: number;
  /** Auditorium seating. Five thousand of them, so it is its own colour. */
  seat: number;
  /** The presenter's desk: draped table and lectern. */
  desk: number;
  /** The body of the letters on the keynote stages. */
  sign: number;
  /**
   * The plate a sign's characters are mounted on. DARK, in every era.
   *
   * Not a taste: the key light comes from almost overhead, so a face
   * pointing south at the camera reflects about a third of what a face
   * pointing at the sky does. A room number hung in the corridor is one of
   * those south-facing faces, and light characters on a light plate are
   * invisible however large they are. The plate carries the contrast the
   * lighting will not.
   */
  signPlate: number;
  /**
   * The projection screen filling the end wall of every auditorium.
   *
   * A screen with nothing running on it is a matte surface, not a light: it is
   * the same fabric in all three eras and it is the room's light level that
   * decides whether you can see it. Give it a colour that reads as cloth.
   */
  screen: number;
  /**
   * An exhibitor's stand on the hall floor.
   *
   * Twenty-seven of them, and the one thing in the building that is neither
   * the building nor its furniture: they are brought in for the week. That
   * makes them the clearest thing a chapter has to say about WHEN it is —
   * derelict, hand-made, or a full trade floor.
   */
  booth: number;
  /**
   * The glass front of the building.
   *
   * Drawn translucent, so this is a TINT over whatever is behind it rather
   * than a surface colour: it is the colour the concourse takes on when you
   * are looking at it through the entrance, which is a different question in
   * daylight, under tungsten and at capacity.
   */
  glazing: number;
  /**
   * The people. Five thousand in the seats at capacity, and a few hundred
   * on their feet.
   *
   * One colour for the whole crowd, and that is a decision rather than a
   * shortcut: a stadium of individually tinted figures reads as confetti at
   * this zoom, and the crowd is a MASS in this game — it is the thing the
   * building is full of, not a cast. Per-era, because a crowd photographs
   * as whatever is lighting it.
   */
  crowd: number;
  /**
   * Silt: what a floor nobody sweeps is covered in.
   *
   * Drawn only where `crowdDensity` is 0 — see `core/Decay.ts` — so in the
   * two chapters with people in them this is a colour nothing has. Carried on
   * the type anyway, for the same reason Chapter I carries a `crowd` colour
   * it never uses: `?at=` and the movement lab can drive any chapter with any
   * of it switched on, and a palette with holes in it cannot.
   */
  dust: number;
  /**
   * Growth coming up through the floor.
   *
   * The one hue none of the three eras uses. Chapter I is blue-grey, II is
   * tungsten and III is peach, so green is unclaimed — which is why a floor
   * going back to ground reads instantly as a chapter the others are not.
   */
  growth: number;
  /** Water, off a roof nobody has been up to. A mark, not a surface. */
  damp: number;
  /** Accent — signage, screens, step lighting. */
  accent: number;
  /** HUD text. */
  text: number;
}

/**
 * Is this the era nobody has come back to?
 *
 * Empty AND dark. Both halves are load-bearing and the second one is only
 * there because of the movement lab, which is `crowdDensity: 0` — it is one
 * hall with three robots in it — and `lightLevel: 1`, because mood hides the
 * geometry you are trying to read while tuning. Keying decay off emptiness
 * alone silted up the one screen in the game that exists to be legible.
 *
 * Stated once, here, so that the inference is a thing with a name rather than
 * two magic numbers repeated wherever somebody needed it. Same principle as
 * the lamp `ChapterScreen` switches on below 0.4: NOT a fifth field, a
 * reading of two of the four.
 */
export function abandoned(chapter: Chapter): boolean {
  return chapter.crowdDensity <= 0 && chapter.lightLevel < 0.4;
}

export interface Chapter {
  id: string;
  /** Roman numeral shown on the chapter card. */
  numeral: string;
  /** Chapter title. */
  title: string;
  /** The year, or the absence of one. Shown under the title. */
  era: string;
  /** One line on the chapter-select card. Sets the tone, not the rules. */
  tagline: string;
  /** Two or three sentences shown on the loading card before play. */
  brief: string;

  controlMode: ControlMode;

  /** Which robots exist in this chapter, in selection order. */
  cast: RobotId[];

  /**
   * How full the building is, 0..1. This single number carries the emotional
   * arc of the whole game: 0.0 empty, 0.35 sparse, 1.0 at capacity. It drives
   * NPC count, ambient audio bed and how much the space fights the player.
   */
  crowdDensity: number;

  /** Ambient light level, 0..1. Chapter 1 is nearly dark. */
  lightLevel: number;

  palette: Palette;

  /** Which floor the chapter opens on. */
  startFloor: Level;

  /**
   * What the player is trying to do, as data.
   *
   * It was a string until 21 Sep, which was the honest representation of a
   * game in which nothing could be finished. It is still ONE of the four
   * things a chapter may change — the structure is the sentence grown up, not
   * a fifth field. See `core/Objective.ts`.
   */
  objective: Objective;
}
