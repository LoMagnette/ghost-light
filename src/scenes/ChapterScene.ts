/**
 * The one scene every chapter runs in.
 *
 * There is no ChapterOneScene. There will never be a ChapterOneScene. A
 * chapter is data (see chapters/registry.ts); this scene reads that data and
 * changes its palette, its cast, its crowd density and its control mode
 * accordingly. Adding a per-chapter scene is the single fastest way to blow
 * the schedule, because it triples every subsequent change.
 *
 * Currently implements the 'direct' control mode only. 'switch' and
 * 'direct-order' are the next two milestones — see SPEC.md.
 */

import Phaser from 'phaser';
import { Body } from '@/core/Body';
import { project } from '@/core/Iso';
import { makeActor, Sim, type Actor } from '@/core/Sim';
import { ROBOTS } from '@/core/RobotSpec';
import { KINEPOLIS, SPAWNS } from '@/venue/kinepolis';
import { BlockoutRenderer } from '@/render/BlockoutRenderer';
import { KeyboardController } from '@/input/KeyboardController';
import { chapterById, CHAPTER_ONE } from '@/chapters/registry';
import type { Chapter } from '@/chapters/Chapter';
import { CAMERA_LERP, DEBUG_DEFAULT, VIEW_HEIGHT, VIEW_WIDTH } from '@/config';

export class ChapterScene extends Phaser.Scene {
  private chapter!: Chapter;
  private sim!: Sim;
  // NOT `renderer` — Phaser.Scene already owns that property name.
  private blockout!: BlockoutRenderer;
  private controller!: KeyboardController;

  private actors: Actor[] = [];
  private controlled!: Actor;
  private floor: 0 | 1 = 0;

  private hud!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private debug = DEBUG_DEFAULT;

  private worldLayer!: Phaser.GameObjects.Container;
  private cameraX = 0;
  private cameraY = 0;

  constructor() {
    super('chapter');
  }

  init(data: { chapterId?: string }): void {
    this.chapter = chapterById(data?.chapterId ?? '') ?? CHAPTER_ONE;
  }

  create(): void {
    const { chapter } = this;

    this.cameras.main.setBackgroundColor(chapter.palette.void);
    this.floor = chapter.startFloor;

    this.sim = new Sim(KINEPOLIS);
    this.actors = [];

    const spawn = chapter.startFloor === 0 ? SPAWNS.hallCentre : SPAWNS.corridorWest;
    chapter.cast.forEach((robotId, index) => {
      const spec = ROBOTS[robotId];
      const body = new Body(spec, spawn.x + index * 2.2, spawn.y);
      const actor = makeActor(body, chapter.startFloor);
      this.actors.push(this.sim.add(actor));
    });
    this.controlled = this.actors[0];

    // The renderer draws in world pixels; this container is what the camera
    // moves, so the projection never has to know about the camera.
    this.worldLayer = this.add.container(0, 0);
    this.blockout = new BlockoutRenderer(
      this,
      KINEPOLIS,
      chapter.palette,
      chapter.lightLevel,
      this.worldLayer,
    );

    this.controller = new KeyboardController(this);

    this.buildHud();
    this.snapCameraToControlled();

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    this.input.keyboard?.on('keydown-F1', () => {
      this.debug = !this.debug;
      this.debugText.setVisible(this.debug);
    });
  }

  override update(_time: number, delta: number): void {
    // Drive the controlled actor. Everything else holds still until the
    // 'switch' and 'direct-order' modes land.
    this.controller.read(this.controlled.input);

    this.sim.advance(delta / 1000);

    this.followControlled(delta / 1000);
    this.blockout.render(this.floor, this.actors, this.sim.alpha);
    this.updateHud();
  }

  // -- camera ---------------------------------------------------------------

  private snapCameraToControlled(): void {
    const p = project(this.controlled.body.x, this.controlled.body.y, 0);
    this.cameraX = p.sx;
    this.cameraY = p.sy;
    this.applyCamera();
  }

  private followControlled(dt: number): void {
    const p = project(this.controlled.body.x, this.controlled.body.y, 0);
    const t = 1 - Math.exp(-CAMERA_LERP * dt);
    this.cameraX += (p.sx - this.cameraX) * t;
    this.cameraY += (p.sy - this.cameraY) * t;
    this.applyCamera();
  }

  private applyCamera(): void {
    this.worldLayer.setPosition(
      Math.round(VIEW_WIDTH / 2 - this.cameraX),
      Math.round(VIEW_HEIGHT / 2 - this.cameraY),
    );
  }

  // -- hud ------------------------------------------------------------------

  private buildHud(): void {
    const { chapter } = this;

    this.add
      .text(28, 24, `${chapter.numeral}. ${chapter.title.toUpperCase()}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#6f777c',
      })
      .setScrollFactor(0);

    this.hud = this.add
      .text(28, 46, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '17px',
        color: colourToCss(chapter.palette.text),
      })
      .setScrollFactor(0);

    this.add
      .text(28, VIEW_HEIGHT - 40, 'WASD move     SHIFT brake     F1 debug     ESC menu', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#4c5357',
      })
      .setScrollFactor(0);

    this.debugText = this.add
      .text(VIEW_WIDTH - 28, 24, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#6f777c',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(this.debug);
  }

  private updateHud(): void {
    this.hud.setText(this.chapter.objective);

    if (!this.debug) return;

    const body = this.controlled.body;
    this.debugText.setText(
      [
        `${body.spec.name}`,
        `mass      ${body.spec.mass} kg`,
        `speed     ${body.speed.toFixed(2)} m/s`,
        `momentum  ${body.momentum.toFixed(0)} kg·m/s`,
        `pos       ${body.x.toFixed(1)}, ${body.y.toFixed(1)}`,
        `floor     ${this.floor}`,
        `sim       ${this.sim.elapsed.toFixed(1)} s`,
      ].join('\n'),
    );
  }
}

function colourToCss(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
