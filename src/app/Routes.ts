/**
 * Where a screen can send the player.
 *
 * Screens do not import one another. The menu starting a chapter and a chapter
 * returning to the menu is a cycle, and in ES modules a cycle between two
 * modules that each construct the other at import time is a live binding that
 * is `undefined` exactly once — at boot, which is the only time it matters.
 * One object, built in `main.ts` where both are already in scope, and the
 * cycle is gone.
 */
export interface Routes {
  menu(): void;
  chapter(chapterId: string): void;
}
