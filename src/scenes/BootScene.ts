/**
 * Boot. Removes the HTML loading fallback and moves straight to the menu.
 *
 * When there are real assets to load, load them HERE and show progress — a
 * judge clicking a live link will not wait through a blank screen, and
 * "someone who has never seen it can start it" is 15 points.
 */

import Phaser from 'phaser';

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
    this.scene.start('menu');
  }
}
