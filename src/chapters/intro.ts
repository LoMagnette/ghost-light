/**
 * The words before the menu. Data, like the chapters.
 *
 * The frame is the author's (28 Sep): in 2126 a robot and its ship come down
 * on a lost planet called Earth, looking for what is left of the old
 * scriptures. They tell of a time when humans wrote code and loved to gather
 * and talk about it — and of a temple to that, in a country hardly larger
 * than a stamp, in a city known for its harbour and its diamonds. Antwerp.
 *
 * So Chapter I's "later" is 2126, the robot is Voxxy, and the empty building
 * is a ruin being explored rather than a place that has just been closed.
 * What it still does NOT say is why the humans are gone — SPEC's rule that
 * the game is not interested in blame holds — and it leaves the wormholes,
 * the eras and the splitting robots for the chapters to show. The last line
 * promises the fold back to JavaPolis without naming it.
 *
 * Nothing here is said by anybody real. The one claim about the real
 * conference — that thousands gathered to talk about code — is plainly true.
 */

import type { Caption } from '@/core/Objective';

/**
 * How a line is set. `date` and `place` are the two words the whole premise
 * hangs on, so they get a frame of their own; `light` is the ghost light's
 * colour, Chapter I's accent. The epilogue's closing words are set the same
 * way, which is why the shape lives in `core/Objective.ts`.
 */
export type IntroLine = Caption;

export const INTRO_LINES: readonly IntroLine[] = [
  { text: '2126', look: 'date' },
  { text: 'A small ship comes down through the clouds of a planet nobody has visited in a very long time. Its old name was Earth.' },
  { text: 'The robot on board has come for the scriptures: what little is left of the ones who lived here.' },
  { text: 'They tell of a strange time, when humans wrote code — and loved it so much that they gathered by the thousand, just to talk about it.' },
  { text: 'They built temples for it.' },
  { text: 'One stood in a country hardly larger than a stamp, in a city once famous for its harbour and its diamonds.' },
  { text: 'Antwerp.', look: 'place' },
  { text: 'The temple is dark now. But one light is still burning inside.', look: 'light' },
  { text: 'It remembers what this place was. Give it power, and it may show you.', look: 'light' },
];
