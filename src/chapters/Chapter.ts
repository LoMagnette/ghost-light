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

/**
 * How the player acts on the robots. This is the spine of the whole game: the
 * control scheme itself evolves across the three chapters, from driving one
 * machine by hand to directing three that act without you. It is the Devoxx
 * 2026 "From Developer to Builder" theme expressed as a verb rather than a
 * subtitle.
 */
export type ControlMode =
  | 'direct' // Ch.1 — WASD one robot. You are the hands.
  | 'switch' // Ch.2 — WASD, Tab to take over another. You are the hands, plural.
  | 'direct-order'; // Ch.3 — you issue intent, robots execute with their own mass.

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
   * The projection screen filling the end wall of every auditorium.
   *
   * A screen with nothing running on it is a matte surface, not a light: it is
   * the same fabric in all three eras and it is the room's light level that
   * decides whether you can see it. Give it a colour that reads as cloth.
   */
  screen: number;
  /**
   * The glass front of the building.
   *
   * Drawn translucent, so this is a TINT over whatever is behind it rather
   * than a surface colour: it is the colour the concourse takes on when you
   * are looking at it through the entrance, which is a different question in
   * daylight, under tungsten and at capacity.
   */
  glazing: number;
  /** Accent — signage, screens, step lighting. */
  accent: number;
  /** HUD text. */
  text: number;
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

  /** Short objective line shown in the HUD. Must be readable in one glance. */
  objective: string;
}
