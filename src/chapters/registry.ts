/**
 * The three chapters, in play order.
 *
 * Order is load-bearing. Chapter 1 is first because an empty building is the
 * best tutorial we will ever get — no crowd, no NPCs, nothing competing for
 * attention — and because it is the cheapest thing to build, so the first
 * playable milestone doubles as the engine test. The reveal then runs the
 * right way round: the player starts in the silence not knowing what this
 * place was, and the historical chapters answer it. Ending on the building at
 * capacity is the point.
 *
 * Tone rule for every chapter: melancholy, never accusatory. The building is
 * empty, not wrecked. We never explain why, and the game is not interested in
 * blame. This is both better art and the only version that plays well on a
 * keynote stage.
 */

import type { Chapter } from './Chapter';

export const CHAPTER_ONE: Chapter = {
  id: 'silence',
  numeral: 'I',
  title: 'The Silence',
  era: 'later',
  tagline: 'Something is still walking the building.',
  brief:
    'The hall is dark and the chairs are empty. You do not know where you are yet. ' +
    'Find a way up, and find the thing that still has power.',
  controlMode: 'direct',
  cast: ['voxxy'],
  crowdDensity: 0,
  lightLevel: 0.18,
  palette: {
    void: 0x06080a,
    floor: 0x14191d,
    floorLine: 0x1d2429,
    wall: 0x232b31,
    wallShade: 0x161c21,
    accent: 0xb3402f, // the red LED step lighting, still running
    text: 0x8b9398,
  },
  startFloor: 0,
  objective: 'Find the power',
};

export const CHAPTER_TWO: Chapter = {
  id: 'javapolis',
  numeral: 'II',
  title: 'JavaPolis',
  era: 'the early years',
  tagline: 'Half a building, and more people than anyone expected.',
  brief:
    'A community event that outgrew its room. Two robots, half the floor in use, ' +
    'and a conference being held together by hand.',
  controlMode: 'switch',
  cast: ['voxxy', 'droid'],
  crowdDensity: 0.35,
  lightLevel: 0.62,
  palette: {
    void: 0x0a0b0d,
    floor: 0x2b2722,
    floorLine: 0x363029,
    wall: 0x4a423a,
    wallShade: 0x2e2822,
    accent: 0xd9a441, // warm, slightly dated, tungsten
    text: 0xe8dcc8,
  },
  startFloor: 1,
  objective: 'Keep every room running',
};

export const CHAPTER_THREE: Chapter = {
  id: 'capacity',
  numeral: 'III',
  title: 'At Capacity',
  era: 'the full house',
  tagline: 'Too much building to walk yourself.',
  brief:
    'Every room is full. You cannot hand-drive three robots through this many people, ' +
    'so you stop trying. Give them intent. They have their own mass.',
  controlMode: 'direct-order',
  cast: ['voxxy', 'droid', 'biggy'],
  crowdDensity: 1,
  lightLevel: 0.85,
  palette: {
    void: 0x0b0d10,
    floor: 0x1f262c,
    floorLine: 0x2b343c,
    wall: 0x3c4750,
    wallShade: 0x232b32,
    accent: 0xff7a1a, // Devoxx orange
    text: 0xf2f5f7,
  },
  startFloor: 0,
  objective: 'Get everyone to the keynote',
};

export const CHAPTERS: Chapter[] = [CHAPTER_ONE, CHAPTER_TWO, CHAPTER_THREE];

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}
