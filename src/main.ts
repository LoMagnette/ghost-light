import Phaser from 'phaser';
import { BootScene } from '@/scenes/BootScene';
import { MenuScene } from '@/scenes/MenuScene';
import { ChapterScene } from '@/scenes/ChapterScene';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@/config';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#06080a',
  antialias: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // No physics system: the simulation in src/core is our own, fixed-timestep
  // and mass-based. See src/core/Sim.ts for why.
  scene: [BootScene, MenuScene, ChapterScene],
});
