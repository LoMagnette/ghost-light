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
 *
 * Most of what is here beyond that is FEEDBACK: camera lead, impact shake,
 * footfall kick, telemetry. None of it changes the simulation, and all of it
 * exists because "the robots move like machines with mass" is worth 20 points
 * and a player only ever perceives mass through the response to it.
 */

import Phaser from 'phaser';
import { Body } from '@/core/Body';
import { project } from '@/core/Iso';
import { makeActor, Sim, type Actor } from '@/core/Sim';
import { ROBOTS } from '@/core/RobotSpec';
import { KINEPOLIS, SPAWNS } from '@/venue/kinepolis';
import { BlockoutRenderer } from '@/render/BlockoutRenderer';
import { KeyboardController } from '@/input/KeyboardController';
import { CHAPTER_ONE } from '@/chapters/registry';
import { chapterOrLab } from '@/chapters/lab';
import type { Chapter } from '@/chapters/Chapter';
import {
  CAMERA_LEAD_CAP,
  CAMERA_LERP,
  DEBUG_DEFAULT,
  FOOTFALL_REFERENCE_MOMENTUM,
  IMPACT_REFERENCE_MOMENTUM,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from '@/config';

export class ChapterScene extends Phaser.Scene {
  private chapter!: Chapter;
  private sim!: Sim;
  // NOT `renderer` — Phaser.Scene already owns that property name.
  private blockout!: BlockoutRenderer;
  private controller!: KeyboardController;

  private actors: Actor[] = [];
  private controlled!: Actor;
  private floor: 0 | 1 = 0;
  private spawns: { x: number; y: number }[] = [];

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
    this.chapter = chapterOrLab(data?.chapterId ?? '') ?? CHAPTER_ONE;
  }

  create(): void {
    const { chapter } = this;

    this.cameras.main.setBackgroundColor(chapter.palette.void);
    this.floor = chapter.startFloor;

    this.sim = new Sim(KINEPOLIS);
    this.actors = [];
    this.spawns = [];

    const spawn = chapter.startFloor === 0 ? SPAWNS.hallCentre : SPAWNS.corridorWest;
    chapter.cast.forEach((robotId, index) => {
      const spec = ROBOTS[robotId];
      // Spaced by more than the widest robot so nobody starts inside anyone.
      const at = { x: spawn.x + index * 2.6, y: spawn.y };
      const body = new Body(spec, at.x, at.y);
      const actor = makeActor(body, chapter.startFloor);
      this.spawns.push(at);
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
    this.blockout.telemetry = this.debug;

    this.controller = new KeyboardController(this);

    this.buildHud();
    this.snapCameraToControlled();

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    this.input.keyboard?.on('keydown-F1', () => {
      this.debug = !this.debug;
      this.debugText.setVisible(this.debug);
      this.blockout.telemetry = this.debug;
    });
    this.input.keyboard?.on('keydown-R', () => this.resetCast());

    // Swapping robot mid-run is how the mass difference becomes legible: drive
    // the same line as Voxxy and then as Biggy. In the shipped chapters the
    // cast is usually one robot, so this does nothing; the movement lab is
    // where it earns its keep. Chapter II's 'switch' mode will make this a
    // real mechanic rather than a tuning affordance.
    (['ONE', 'TWO', 'THREE'] as const).forEach((key, index) => {
      this.input.keyboard?.on(`keydown-${key}`, () => this.takeControl(index));
    });
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Drive the controlled actor. Everything else holds still until the
    // 'switch' and 'direct-order' modes land.
    this.controller.read(this.controlled.input);

    this.sim.advance(dt);

    this.applyFeedback();
    this.followControlled(dt);
    this.blockout.render(this.floor, this.actors, this.sim.alpha, dt);
    this.updateHud();
  }

  // -- control --------------------------------------------------------------

  private takeControl(index: number): void {
    const next = this.actors[index];
    if (!next || next === this.controlled) return;

    // Hand the old robot a neutral input or it keeps whatever the player was
    // holding at the moment they swapped and drives off on its own.
    Object.assign(this.controlled.input, { dirX: 0, dirY: 0, throttle: 0, braking: false });
    this.controlled = next;
  }

  private resetCast(): void {
    this.actors.forEach((actor, index) => {
      const spawn = this.spawns[index];
      actor.body.halt();
      actor.body.x = spawn.x;
      actor.body.y = spawn.y;
      actor.prevX = spawn.x;
      actor.prevY = spawn.y;
    });
    this.blockout.clearMarks();
    this.snapCameraToControlled();
  }

  // -- feedback -------------------------------------------------------------

  /**
   * Turn simulation events into things the player's eyes can feel.
   *
   * Mass is invisible. What is visible is how hard the building hits back when
   * you get it wrong, and how heavily a foot lands. Both are scaled by
   * momentum rather than by speed, which is the whole point: Biggy at walking
   * pace hits harder than Voxxy at a sprint, and it should look like it.
   */
  private applyFeedback(): void {
    const camera = this.cameras.main;

    for (const impact of this.sim.impacts) {
      if (impact.actor !== this.controlled) continue;
      const weight = Math.min(1, impact.momentum / IMPACT_REFERENCE_MOMENTUM);
      camera.shake(90 + weight * 190, 0.002 + weight * 0.012, true);
    }

    for (const footfall of this.sim.footfalls) {
      if (footfall.actor !== this.controlled) continue;
      const weight = Math.min(1, footfall.momentum / FOOTFALL_REFERENCE_MOMENTUM);
      // Do not force: a footfall must never interrupt an impact, which is the
      // more important event and is running on the same camera.
      camera.shake(70, 0.0004 + weight * 0.0022, false);
    }
  }

  // -- camera ---------------------------------------------------------------

  /**
   * Look ahead by the robot's own stopping distance.
   *
   * A fixed lead would be a lie: the ground Voxxy needs to see is a metre and
   * a half, and Biggy's is nearly four. Leading by exactly the distance the
   * robot needs to stop means the camera always shows you the floor your
   * momentum has already committed you to — the heavier the machine, the
   * further ahead you are made to think, which is the feeling the chapter
   * arc is built on.
   */
  private cameraTarget(): { x: number; y: number } {
    const body = this.controlled.body;
    const speed = body.speed;
    if (speed < 0.05) return { x: body.x, y: body.y };

    const lead = Math.min(body.stoppingDistance, CAMERA_LEAD_CAP);
    return {
      x: body.x + (body.vx / speed) * lead,
      y: body.y + (body.vy / speed) * lead,
    };
  }

  private snapCameraToControlled(): void {
    const target = this.cameraTarget();
    const p = project(target.x, target.y, 0);
    this.cameraX = p.sx;
    this.cameraY = p.sy;
    this.applyCamera();
  }

  private followControlled(dt: number): void {
    const target = this.cameraTarget();
    const p = project(target.x, target.y, 0);
    // Exponential smoothing, framerate independent. Lower CAMERA_LERP is lazier.
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

  /**
   * Drop a shadow behind HUD text.
   *
   * Not decoration. The hint line is #4c5357 and a lit wall is #454d54, so
   * without this the controls simply vanish whenever a column passes behind
   * them — and the one thing a judge must always be able to read is how to
   * play. Every chapter has a different palette, so no single text colour is
   * safe against all of them; a shadow is.
   */
  private legible<T extends Phaser.GameObjects.Text>(text: T): T {
    text.setShadow(0, 1, '#000000', 4, false, true);
    return text;
  }

  private buildHud(): void {
    const { chapter } = this;

    this.legible(
      this.add.text(28, 24, `${chapter.numeral}. ${chapter.title.toUpperCase()}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#6f777c',
      }),
    ).setScrollFactor(0);

    this.hud = this.legible(
      this.add.text(28, 46, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '17px',
        color: colourToCss(chapter.palette.text),
      }),
    ).setScrollFactor(0);

    const keys =
      chapter.cast.length > 1
        ? 'WASD move   SHIFT brake   1/2/3 robot   R reset   F1 debug   ESC menu'
        : 'WASD move     SHIFT brake     R reset     F1 debug     ESC menu';

    this.legible(
      this.add.text(28, VIEW_HEIGHT - 40, keys, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#4c5357',
      }),
    ).setScrollFactor(0);

    this.debugText = this.legible(
      this.add.text(VIEW_WIDTH - 28, 24, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#6f777c',
        align: 'right',
      }),
    )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setVisible(this.debug);
  }

  private updateHud(): void {
    this.hud.setText(this.chapter.objective);

    if (!this.debug) return;

    const body = this.controlled.body;
    const spec = body.spec;
    this.debugText.setText(
      [
        `${spec.name}`,
        `mass       ${spec.mass} kg`,
        `speed      ${body.speed.toFixed(2)} m/s   ${bar(body.speedFraction)}`,
        `top speed  ${spec.maxSpeed.toFixed(1)} m/s`,
        `momentum   ${body.momentum.toFixed(0)} kg·m/s`,
        `stop in    ${body.stoppingDistance.toFixed(2)} m`,
        `slip       ${body.slipSpeed.toFixed(2)} m/s`,
        `accel max  ${(spec.driveForce / spec.mass).toFixed(1)} m/s²`,
        `brake max  ${(spec.brakeForce / spec.mass).toFixed(1)} m/s²`,
        '',
        `pos        ${body.x.toFixed(1)}, ${body.y.toFixed(1)}`,
        `floor      ${this.floor}`,
        `sim        ${this.sim.elapsed.toFixed(1)} s`,
        `fps        ${this.game.loop.actualFps.toFixed(0)}`,
      ].join('\n'),
    );
  }
}

/** A ten-cell text meter. Readable in a screenshot, which is how it gets read. */
function bar(fraction: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * 10);
  return '█'.repeat(filled) + '·'.repeat(10 - filled);
}

function colourToCss(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
