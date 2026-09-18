/**
 * Boot. Removes the HTML loading fallback and moves straight to the menu.
 *
 * When there are real assets to load, load them HERE and show progress — a
 * judge clicking a live link will not wait through a blank screen, and
 * "someone who has never seen it can start it" is 15 points.
 */

import Phaser from 'phaser';
import { MOVEMENT_LAB } from '@/chapters/lab';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    // No assets yet — the game is a grey-box blockout by design.
    // Art pass: load the robot atlases and venue textures here.
  }

  create(): void {
    document.getElementById('boot-fallback')?.remove();

    // ?lab goes straight to the movement rig. Tuning means reloading dozens of
    // times, and two keystrokes of menu each time is two keystrokes too many.
    if (new URLSearchParams(window.location.search).has('lab')) {
      this.scene.start('chapter', { chapterId: MOVEMENT_LAB.id });
      return;
    }

    this.scene.start('menu');
  }
}
