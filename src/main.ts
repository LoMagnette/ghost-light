/**
 * Boot.
 *
 * Builds the shell, wires the two screens to each other through a routing
 * object (see Routes — screens never import one another), and starts the loop.
 *
 * When there are real assets to load, load them HERE and show progress: a
 * judge clicking a live link will not wait through a blank screen, and
 * "someone who has never seen it can start it" is 15 points.
 */

import { Game } from '@/app/Game';
import { MenuScreen } from '@/app/MenuScreen';
import { ChapterScreen } from '@/app/ChapterScreen';
import type { Routes } from '@/app/Routes';
import { MOVEMENT_LAB } from '@/chapters/lab';
import { assertMatchesProjection, createIsoCamera } from '@/render/IsoCamera';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ui = document.getElementById('ui');

if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement) || !(ui instanceof HTMLElement)) {
  throw new Error('index.html is missing #stage, #game or #ui');
}

// Rule 4 of CLAUDE.md: the camera, the keyboard mapping and the plans the
// venue was surveyed from all have to agree about which way the building
// faces. This is the half of that which can be checked by a machine.
if (import.meta.env.DEV) assertMatchesProjection(createIsoCamera());

const game = new Game(stage, canvas, ui);

const routes: Routes = {
  menu: () => game.show(new MenuScreen(routes)),
  chapter: (chapterId) => game.show(new ChapterScreen(chapterId, routes)),
};

document.getElementById('boot-fallback')?.remove();

// ?lab goes straight to the movement rig, ?chapter=<id> straight to a chapter.
// Tuning and photographing both mean reloading dozens of times, and two
// keystrokes of menu each time is two keystrokes too many. See also ?at= in
// ChapterScreen, which says WHERE in the building to start.
const query = new URLSearchParams(window.location.search);
if (query.has('lab')) {
  routes.chapter(MOVEMENT_LAB.id);
} else if (query.has('chapter')) {
  routes.chapter(query.get('chapter') ?? '');
} else {
  routes.menu();
}

game.start();
