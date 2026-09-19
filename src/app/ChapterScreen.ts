/**
 * The one screen every chapter runs in.
 *
 * There is no ChapterOneScreen. There will never be a ChapterOneScreen. A
 * chapter is data (see chapters/registry.ts); this reads that data and changes
 * its palette, its cast, its crowd density and its control mode accordingly.
 * Adding a per-chapter screen is the single fastest way to blow the schedule,
 * because it triples every subsequent change.
 *
 * Currently implements the 'direct' control mode only. 'switch' and
 * 'direct-order' are the next two milestones — see SPEC.md.
 *
 * Most of what is here beyond that is FEEDBACK: camera lead, impact shake,
 * footfall kick, telemetry. None of it changes the simulation, and all of it
 * exists because "the robots move like machines with mass" is worth 20 points
 * and a player only ever perceives mass through the response to it.
 */

import type { OrthographicCamera, Scene } from 'three';
import { Body } from '@/core/Body';
import { makeActor, Sim, type Actor } from '@/core/Sim';
import { ROBOTS } from '@/core/RobotSpec';
import { KINEPOLIS, SPAWNS } from '@/venue/kinepolis';
import type { Level } from '@/core/Venue';
import { BlockoutRenderer } from '@/render/BlockoutRenderer';
import { createIsoCamera, lookAtWorld, VIEW_WIDTH_METRES } from '@/render/IsoCamera';
import { KeyboardController } from '@/input/KeyboardController';
import { CHAPTER_ONE } from '@/chapters/registry';
import { chapterOrLab } from '@/chapters/lab';
import type { Chapter } from '@/chapters/Chapter';
import type { Game, Screen } from './Game';
import type { Routes } from './Routes';
import { css, label, MONO, SANS } from './dom';
import {
  CAMERA_LEAD_CAP,
  CAMERA_LERP,
  DEBUG_DEFAULT,
  FOOTFALL_REFERENCE_MOMENTUM,
  IMPACT_REFERENCE_MOMENTUM,
  VIEW_HEIGHT,
} from '@/config';

export class ChapterScreen implements Screen {
  private readonly chapter: Chapter;
  private readonly routes: Routes;

  private sim!: Sim;
  private blockout!: BlockoutRenderer;
  private controller!: KeyboardController;

  private actors: Actor[] = [];
  private controlled!: Actor;
  private floor: Level = 0;
  private spawns: { x: number; y: number }[] = [];

  private hud!: HTMLElement;
  private debugText!: HTMLElement;
  private debug = DEBUG_DEFAULT;

  private readonly isoCamera: OrthographicCamera = createIsoCamera();
  private cameraX = 0;
  private cameraY = 0;
  private cameraZ = 0;

  /** Camera shake: amplitude in metres, and how far through it we are. */
  private shakeAmplitude = 0;
  private shakeElapsed = 0;
  private shakeDuration = 0;

  /** Frames per second, smoothed, for the debug readout only. */
  private fps = 60;

  constructor(chapterId: string, routes: Routes) {
    this.chapter = chapterOrLab(chapterId) ?? CHAPTER_ONE;
    this.routes = routes;
  }

  get scene(): Scene {
    return this.blockout.scene;
  }

  get camera(): OrthographicCamera {
    return this.isoCamera;
  }

  mount(game: Game): void {
    const { chapter } = this;

    game.setBackground(chapter.palette.void);
    this.floor = chapter.startFloor;

    this.sim = new Sim(KINEPOLIS);

    const spawn = chapter.startFloor === 0 ? SPAWNS.hallCentre : SPAWNS.corridorSouth;
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

    this.blockout = new BlockoutRenderer(KINEPOLIS, chapter.palette, chapter.lightLevel);
    this.blockout.telemetry = this.debug;

    this.controller = new KeyboardController(game.keyboard);

    this.buildHud(game);
    this.snapCamera();

    game.keyboard.on('Escape', () => this.routes.menu());
    game.keyboard.on('F1', () => {
      this.debug = !this.debug;
      this.debugText.style.display = this.debug ? 'block' : 'none';
      this.blockout.telemetry = this.debug;
    });
    game.keyboard.on('KeyR', () => this.resetCast());

    // Swapping robot mid-run is how the mass difference becomes legible: drive
    // the same line as Voxxy and then as Biggy. In the shipped chapters the
    // cast is usually one robot, so this does nothing; the movement lab is
    // where it earns its keep. Chapter II's 'switch' mode will make this a
    // real mechanic rather than a tuning affordance.
    (['Digit1', 'Digit2', 'Digit3'] as const).forEach((code, index) => {
      game.keyboard.on(code, () => this.takeControl(index));
    });
  }

  update(dt: number): void {
    // Drive the controlled actor. Everything else holds still until the
    // 'switch' and 'direct-order' modes land.
    this.controller.read(this.controlled.input);

    this.sim.advance(dt);

    // A robot that walks up a flight changes storey underneath us. Each storey
    // is modelled from its own datum, so the world it is standing in moves 6.2
    // metres at that instant and the camera has to be put down with it rather
    // than eased across a gap that does not exist.
    if (this.controlled.floor !== this.floor) {
      this.floor = this.controlled.floor;
      this.cameraZ = this.controlled.body.z;
      this.blockout.clearMarks();
    }

    this.applyFeedback();
    this.followControlled(dt);
    this.blockout.render(this.floor, this.actors, this.sim.alpha, dt);

    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.1;
    this.updateHud();
  }

  dispose(): void {
    this.blockout.dispose();
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
    this.snapCamera();
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
    for (const impact of this.sim.impacts) {
      if (impact.actor !== this.controlled) continue;
      const weight = Math.min(1, impact.momentum / IMPACT_REFERENCE_MOMENTUM);
      this.shake(0.09 + weight * 0.19, 0.002 + weight * 0.012, true);
    }

    for (const footfall of this.sim.footfalls) {
      if (footfall.actor !== this.controlled) continue;
      const weight = Math.min(1, footfall.momentum / FOOTFALL_REFERENCE_MOMENTUM);
      // Do not force: a footfall must never interrupt an impact, which is the
      // more important event and is shaking the same camera.
      this.shake(0.07, 0.0004 + weight * 0.0022, false);
    }
  }

  /**
   * Shake the camera. `intensity` is a fraction of the viewport, as it was
   * under Phaser, so the tuning constants in config.ts did not have to move.
   */
  private shake(duration: number, intensity: number, force: boolean): void {
    if (!force && this.shakeElapsed < this.shakeDuration) return;
    this.shakeElapsed = 0;
    this.shakeDuration = duration;
    this.shakeAmplitude = intensity * VIEW_WIDTH_METRES;
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
  private cameraTarget(): { x: number; y: number; z: number } {
    const body = this.controlled.body;
    const speed = body.speed;
    if (speed < 0.05) return { x: body.x, y: body.y, z: body.z };

    const lead = Math.min(body.stoppingDistance, CAMERA_LEAD_CAP);
    return {
      x: body.x + (body.vx / speed) * lead,
      y: body.y + (body.vy / speed) * lead,
      z: body.z,
    };
  }

  private snapCamera(): void {
    const target = this.cameraTarget();
    this.cameraX = target.x;
    this.cameraY = target.y;
    this.cameraZ = target.z;
    this.applyCamera(0);
  }

  private followControlled(dt: number): void {
    const target = this.cameraTarget();
    // Exponential smoothing, framerate independent. Lower CAMERA_LERP is lazier.
    const t = 1 - Math.exp(-CAMERA_LERP * dt);
    this.cameraX += (target.x - this.cameraX) * t;
    this.cameraY += (target.y - this.cameraY) * t;
    this.cameraZ += (target.z - this.cameraZ) * t;
    this.applyCamera(dt);
  }

  private applyCamera(dt: number): void {
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += dt;
      // Decays to nothing over the shake's life, so an impact rings out rather
      // than stopping dead.
      const decay = Math.max(0, 1 - this.shakeElapsed / this.shakeDuration);
      const amplitude = this.shakeAmplitude * decay;
      offsetX = (Math.random() * 2 - 1) * amplitude;
      offsetY = (Math.random() * 2 - 1) * amplitude;
    }

    lookAtWorld(
      this.isoCamera,
      this.cameraX + offsetX,
      this.cameraY + offsetY,
      this.cameraZ,
    );
  }

  // -- hud ------------------------------------------------------------------

  private buildHud(game: Game): void {
    const { chapter } = this;

    game.ui.append(
      label(
        28,
        24,
        { font: `12px ${MONO}`, color: '#6f777c', letterSpacing: '0.04em' },
        `${chapter.numeral}. ${chapter.title.toUpperCase()}`,
      ),
    );

    this.hud = label(28, 44, {
      font: `17px ${SANS}`,
      color: css(chapter.palette.text),
    });
    game.ui.append(this.hud);

    const keys =
      chapter.cast.length > 1
        ? 'WASD move   SHIFT brake   1/2/3 robot   R reset   F1 debug   ESC menu'
        : 'WASD move     SHIFT brake     R reset     F1 debug     ESC menu';

    game.ui.append(
      label(28, VIEW_HEIGHT - 40, { font: `12px ${MONO}`, color: '#4c5357' }, keys),
    );

    this.debugText = label(0, 24, {
      font: `12px ${MONO}`,
      color: '#6f777c',
      left: 'auto',
      right: '28px',
      textAlign: 'right',
      lineHeight: '1.45',
      display: this.debug ? 'block' : 'none',
    });
    game.ui.append(this.debugText);
  }

  private updateHud(): void {
    this.hud.textContent = this.chapter.objective;

    if (!this.debug) return;

    const body = this.controlled.body;
    const spec = body.spec;
    this.debugText.textContent = [
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
      `fps        ${this.fps.toFixed(0)}`,
    ].join('\n');
  }
}

/** A ten-cell text meter. Readable in a screenshot, which is how it gets read. */
function bar(fraction: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * 10);
  return '█'.repeat(filled) + '·'.repeat(10 - filled);
}
