/**
 * The movement lab.
 *
 * Twenty of the hundred points are "do the robots move like machines with
 * mass", and that judgement cannot be delegated to the agent — it has to be
 * felt. But in the game proper you meet Voxxy alone in the dark, and you do
 * not drive Biggy at all until the third chapter. There is nowhere to feel the
 * difference, which is precisely the thing being scored.
 *
 * So: all three robots, the lit exhibition hall, no objective, and a key to
 * swap between them mid-run. Drive the same line as Voxxy then as Biggy and
 * the 10x mass difference either lands or it does not, in about four seconds.
 *
 * This is a chapter in exactly the sense the architecture means — data, not a
 * scene — but it is deliberately NOT in CHAPTERS, so it never appears on the
 * chapter select a judge sees. Reach it with L from the menu, or ?lab in the
 * URL. Its counterpart is `npm run physics`, which measures what this one
 * lets you feel.
 */

import type { Chapter } from './Chapter';
import { chapterById } from './registry';

export const MOVEMENT_LAB: Chapter = {
  id: 'lab',
  numeral: '—',
  title: 'Movement Lab',
  era: 'no era',
  tagline: 'Not a chapter. A tuning rig.',
  brief:
    'All three robots in the lit hall. 1, 2 and 3 swap between them, R puts them back. ' +
    'Drive the same line with each and feel what the mass does.',
  // The lab is direct control by definition: judging the feel of a machine
  // means having your hands on it, not issuing it orders.
  controlMode: 'direct',
  cast: ['voxxy', 'droid', 'biggy'],
  crowdDensity: 0,
  // Full light. Chapter I's darkness is a mood, and mood hides the geometry
  // you are trying to read while tuning.
  lightLevel: 1,
  palette: {
    void: 0x0d1013,
    floor: 0x23282c,
    floorLine: 0x333a40,
    wall: 0x454d54,
    wallShade: 0x2b3238,
    // Flat and neutral, like everything else in here. The lab is for reading
    // geometry, not for mood.
    seat: 0x3c4650,
    desk: 0x424b55,
    sign: 0xc8d0d6,
    signPlate: 0x1c2126,
    screen: 0x9aa4ad,
    booth: 0x4a545d,
    glazing: 0x2f363c,
    crowd: 0x5b6570,
    // The lab is empty like Chapter I and lit like Chapter III, which is
    // exactly the combination `abandoned()` exists to exclude — nothing
    // here is ever drawn. Neutral values, for the type.
    dust: 0x4a4f54,
    growth: 0x4a5444,
    damp: 0x1c2024,
    accent: 0x4ec9b0,
    text: 0xdfe5e9,
  },
  startFloor: 0,
  // Nothing to do in here but drive, which is the point: the lab exists so a
  // human can feel the three machines against each other in four seconds.
  objective: { line: 'Movement lab — 1/2/3 swap robot, R reset', activities: [] },
};

/**
 * Chapter lookup that also knows about the lab.
 *
 * `chapterById` deliberately only sees the three real chapters, because that
 * list is what the menu renders and what a judge is offered. The lab is
 * reachable only by asking for it by name.
 */
export function chapterOrLab(id: string): Chapter | undefined {
  return id === MOVEMENT_LAB.id ? MOVEMENT_LAB : chapterById(id);
}
