/**
 * The one screen every chapter runs in.
 *
 * There is no ChapterOneScreen. There will never be a ChapterOneScreen. A
 * chapter is data (see chapters/registry.ts); this reads that data and changes
 * its palette, its cast, its crowd density and its control mode accordingly.
 * Adding a per-chapter screen is the single fastest way to blow the schedule,
 * because it triples every subsequent change.
 *
 * Both control modes live here: 'direct' is one robot and WASD, 'switch' adds
 * TAB. It also RUNS the chapter's objective — see `core/Objective.ts` — which
 * is the only thing on this screen that can decide the round is over.
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
import { groundAt, type Level } from '@/core/Venue';
import { linkAt, surfaceHeight } from '@/core/Traversal';
import { BlockoutRenderer, type ObjectiveMarker } from '@/render/BlockoutRenderer';
import { ObjectiveRun, type ActivityState } from '@/core/Objective';
import { Crowd } from '@/core/Crowd';
import { zoneCentre } from '@/core/Activity';
import { createIsoCamera, lookAtWorld, VIEW_WIDTH_METRES } from '@/render/IsoCamera';
import { KeyboardController } from '@/input/KeyboardController';
import { CHAPTER_ONE } from '@/chapters/registry';
import { chapterOrLab } from '@/chapters/lab';
import type { Chapter } from '@/chapters/Chapter';
import type { Game, Screen } from './Game';
import type { Routes } from './Routes';
import { css, el, label, MONO, SANS } from './dom';
import {
  CAMERA_LEAD_CAP,
  CAMERA_LERP,
  DEBUG_DEFAULT,
  FOOTFALL_REFERENCE_MOMENTUM,
  IMPACT_REFERENCE_MOMENTUM,
  VIEW_HEIGHT,
} from '@/config';

/** Where the card sits, design pixels from the top of the design frame. */
const CARD_TOP = 70;

export class ChapterScreen implements Screen {
  private readonly chapter: Chapter;
  private readonly routes: Routes;

  private sim!: Sim;
  private blockout!: BlockoutRenderer;
  private controller!: KeyboardController;

  private actors: Actor[] = [];
  private controlled!: Actor;
  private floor: Level = 0;
  /** Storey the cast started on. Not the chapter's, once ?at= has had a say. */
  private startFloor: Level = 0;
  private spawns: { x: number; y: number; z: number }[] = [];

  private hud!: HTMLElement;
  private clockText!: HTMLElement;
  private cardText!: HTMLElement;
  private toast!: HTMLElement;
  private endCard: HTMLElement | undefined;
  private debugText!: HTMLElement;
  private debug = DEBUG_DEFAULT;

  /** The objective, running. The chapter supplies it; this advances it. */
  private run!: ObjectiveRun;
  /** The people. Empty in Chapter I, and that is the whole of Chapter I. */
  private crowd!: Crowd;
  /**
   * Set by SPACE and cleared by the objective the same frame.
   *
   * An edge rather than a held state: putting something down is a decision,
   * and a held key would drop and re-take it sixty times a second.
   */
  private dropRequested = false;
  /** Seconds left on the current notification. */
  private toastFor = 0;

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

    this.sim = new Sim(KINEPOLIS);

    const spawn = startPoint(chapter);
    this.floor = spawn.floor;
    this.startFloor = spawn.floor;
    chapter.cast.forEach((robotId, index) => {
      const spec = ROBOTS[robotId];
      // Spaced by more than the widest robot so nobody starts inside anyone.
      const at = { x: spawn.x + index * 2.6, y: spawn.y };
      const body = new Body(spec, at.x, at.y);
      // Put its feet on whatever is actually there. A spawn is a coordinate,
      // not a height, and collision is resolved BEFORE the surface pass — so a
      // robot dropped at z 0 onto a rake two metres down starts inside a solid
      // tread, and the solver throws it several hundred kilometres out of the
      // building. Harmless for the two hand-picked chapter spawns, which are
      // both on flat floor; not harmless for ?at=, whose whole job is to put a
      // robot somewhere nobody has stood before.
      const surface = linkAt(KINEPOLIS, spawn.floor, at.x, at.y);
      body.z = surface
        ? surfaceHeight(surface, at.x, at.y, spawn.floor)
        : groundAt(KINEPOLIS, spawn.floor, at.x, at.y);
      const actor = makeActor(body, spawn.floor);
      this.spawns.push({ ...at, z: body.z });
      this.actors.push(this.sim.add(actor));
    });
    this.controlled = this.actors[0];

    // Before the renderer, which bakes the seated crowd into each storey as
    // it builds it.
    this.crowd = new Crowd(KINEPOLIS, chapter.crowdDensity, roomsInUse(chapter));

    this.blockout = new BlockoutRenderer(
      this.isoCamera,
      KINEPOLIS,
      chapter.palette,
      chapter.lightLevel,
      this.crowd,
    );
    this.blockout.telemetry = this.debug;

    this.controller = new KeyboardController(game.keyboard);

    this.run = new ObjectiveRun(chapter.objective);

    // A building this dark is unplayable without something to see by, and a
    // lamp on the robot is both the cheapest answer and the right one: it
    // makes the dark a thing you carry a hole in rather than a thing you
    // squint at. Chapters II and III are lit, and skip it.
    if (chapter.lightLevel < 0.4) {
      this.blockout.enableLamp(11, 0.9);
      this.blockout.moveLamp(this.controlled.body.x, this.controlled.body.y, this.controlled.body.z);
    }

    this.buildHud(game);
    this.snapCamera();

    game.keyboard.on('Escape', () => this.routes.menu());
    game.keyboard.on('F1', () => {
      this.debug = !this.debug;
      this.debugText.style.display = this.debug ? 'block' : 'none';
      this.blockout.telemetry = this.debug;
      // Both are top-right, and the readout is eighteen lines long. Stacking
      // them rather than overlapping them is the difference between a debug
      // view and two illegible lists drawn over each other.
      this.cardText.style.top = this.debug ? `${CARD_TOP + 330}px` : `${CARD_TOP}px`;
    });
    game.keyboard.on('KeyR', () => this.resetCast());
    game.keyboard.on('Space', () => {
      this.dropRequested = true;
    });

    // TAB is the whole of `switch` mode, and Chapters II and III are both in
    // it. Cycling rather than selecting, because with two robots it is a
    // toggle and with three it is still one key.
    if (chapter.controlMode === 'switch') {
      game.keyboard.on('Tab', () => {
        const at = this.actors.indexOf(this.controlled);
        this.takeControl((at + 1) % this.actors.length);
      });
    }

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
    const over = this.run.phase === 'ended';

    // Hands off once the round is over: the end card is up, and a robot still
    // answering the keyboard behind it reads as the game not having noticed.
    if (over) {
      Object.assign(this.controlled.input, { dirX: 0, dirY: 0, throttle: 0, braking: false });
    } else {
      this.controller.read(this.controlled.input);
    }

    this.sim.advance(dt);
    this.crowd.advance(dt, this.actors);

    if (!over) {
      this.run.update(dt, this.actors, this.dropRequested);
      this.consumeObjective();
      if (this.run.phase === 'ended') this.showEndCard();
    }
    this.dropRequested = false;

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
    this.blockout.setMarkers(this.markers(), this.floor);
    this.blockout.moveLamp(this.controlled.body.x, this.controlled.body.y, this.controlled.body.z);
    this.blockout.render(this.floor, this.actors, this.sim.alpha, dt);

    if (this.toastFor > 0) {
      this.toastFor -= dt;
      if (this.toastFor <= 0) this.toast.textContent = '';
    }

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
      actor.body.z = spawn.z;
      actor.prevX = spawn.x;
      actor.prevY = spawn.y;
      actor.prevZ = spawn.z;
      actor.floor = this.startFloor;
      actor.onLink = undefined;
    });
    this.floor = this.startFloor;
    this.blockout.clearMarks();
    // Put the building back in the dark and the card back to empty. A restart
    // that kept the lights on would hand the player the answer to Chapter I.
    this.blockout.clearReveals();
    this.run = new ObjectiveRun(this.chapter.objective);
    this.endCard?.remove();
    this.endCard = undefined;
    this.toast.textContent = '';
    this.snapCamera();
  }

  // -- objective ------------------------------------------------------------

  /** Drain the frame's reveals and notifications into the world and the HUD. */
  private consumeObjective(): void {
    for (const reveal of this.run.reveals) {
      this.blockout.revealZone(reveal.bounds, reveal.floor, reveal.to);
    }
    this.run.reveals.length = 0;

    const events = this.run.events;
    if (events.length > 0) {
      this.toast.textContent = events[events.length - 1].text;
      this.toastFor = 2.6;
      events.length = 0;
    }
  }

  /**
   * Where the posts go, and what colour they are.
   *
   * Done activities keep no marker — the building is the reward, and a field
   * of green ticks would bury it. A carried item shows its DESTINATION
   * instead of itself, which is the only thing the player still needs to know.
   */
  private markers(): ObjectiveMarker[] {
    const accent = this.chapter.palette.accent;
    const out: ObjectiveMarker[] = [];

    for (const state of this.run.states) {
      const { activity, status } = state;
      if (status === 'done' || status === 'missed' || status === 'failed') continue;

      if (status === 'carried' && activity.kind === 'haul') {
        const centre = zoneCentre(activity.to);
        out.push({
          id: `${activity.id}:to`,
          x: centre.x,
          y: centre.y,
          z: groundAt(KINEPOLIS, activity.to.floor, centre.x, centre.y),
          floor: activity.to.floor,
          colour: 0x8fd694,
        });
        continue;
      }

      out.push({
        id: activity.id,
        x: state.x,
        y: state.y,
        z: groundAt(KINEPOLIS, state.floor, state.x, state.y),
        floor: state.floor,
        colour: status === 'locked' ? 0x4a5058 : accent,
        // Twenty-seven stickers are twenty-seven markers, and at full height
        // they turned the exhibition hall into a pole farm — more marker than
        // building. One thing you are doing gets one post; a sweep of many
        // gets studs, which say "here too" without competing with the room.
        low: activity.group !== undefined,
      });
    }

    return out;
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

    this.clockText = label(28, 70, {
      font: `13px ${MONO}`,
      color: css(chapter.palette.accent),
      letterSpacing: '0.06em',
    });
    game.ui.append(this.clockText);

    // The card. Top right, monospaced, and deliberately plain: it is a list
    // of things to do, and a list of things to do is most readable as a list
    // of things to do.
    this.cardText = label(0, CARD_TOP, {
      font: `12px ${MONO}`,
      color: '#9aa3a9',
      left: 'auto',
      right: '28px',
      textAlign: 'right',
      lineHeight: '1.6',
    });
    game.ui.append(this.cardText);

    this.toast = label(28, VIEW_HEIGHT - 72, {
      font: `15px ${SANS}`,
      color: css(chapter.palette.accent),
    });
    game.ui.append(this.toast);

    const keys =
      chapter.cast.length > 1
        ? 'WASD move   SHIFT brake   TAB robot   SPACE drop   R reset   F1 debug   ESC menu'
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

  /**
   * The card, as text.
   *
   * Grouped activities collapse to one line with a count — twenty-seven
   * stickers are one thing the player is doing, not twenty-seven — and a tend
   * room shows the seconds it has left, because that is the only number in
   * Chapter II that matters.
   */
  private card(): string {
    const lines: string[] = [];
    const groups = new Map<string, { done: number; total: number }>();

    for (const state of this.run.states) {
      const group = state.activity.group;
      if (group) {
        const tally = groups.get(group) ?? { done: 0, total: 0 };
        tally.total += 1;
        if (state.status === 'done') tally.done += 1;
        groups.set(group, tally);
        continue;
      }
      lines.push(cardLine(state));
    }

    for (const [name, tally] of groups) {
      lines.push(`${tally.done === tally.total ? '·' : '›'} ${name} ${tally.done}/${tally.total}`);
    }

    return lines.join('\n');
  }

  /**
   * The end of the round.
   *
   * One card for all three chapters, because all three end the same three
   * ways: you ran out of rooms, you ran out of day, or you did everything
   * there was. What differs is the count underneath, and the count is the
   * whole point in Chapter III — nobody does all twelve.
   */
  private showEndCard(): void {
    if (this.endCard) return;
    const { chapter } = this;

    const panel = el('div', {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '14px',
      background: 'rgba(4, 6, 8, 0.82)',
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)',
    });

    const missed = this.run.states.filter((s) => s.status === 'missed').length;
    const lost = this.run.lost;

    panel.append(
      el(
        'div',
        { font: `12px ${MONO}`, color: '#6f777c', letterSpacing: '0.24em' },
        `${chapter.numeral}. ${chapter.title.toUpperCase()}`,
      ),
      el(
        'div',
        { font: `34px ${SANS}`, color: css(chapter.palette.text), letterSpacing: '0.01em' },
        this.run.failed ? 'The day ended early' : 'The day ended',
      ),
      el(
        'div',
        { font: `15px ${SANS}`, color: css(chapter.palette.accent) },
        this.run.total > 0 ? `${this.run.done} of ${this.run.total}` : 'Nothing left running',
      ),
    );

    if (missed > 0 || lost > 0) {
      const detail = [
        lost > 0 ? `${lost} room${lost === 1 ? '' : 's'} went dark` : '',
        missed > 0 ? `${missed} missed` : '',
      ]
        .filter(Boolean)
        .join('   ·   ');
      panel.append(el('div', { font: `13px ${MONO}`, color: '#8d959b' }, detail));
    }

    panel.append(
      el('div', { font: `12px ${MONO}`, color: '#5c6368', marginTop: '10px' }, 'R again     ESC menu'),
    );

    this.endCard = panel;
    // Appended to the same UI layer everything else is on, so it scales with
    // the stage and disappears with the screen.
    this.hud.parentElement?.append(panel);
  }

  private updateHud(): void {
    this.hud.textContent = this.run.objective.line;

    const remaining = this.run.remaining;
    // Chapter II has nothing to finish, only things to keep — so it counts
    // what is still running rather than what is done.
    const tally =
      this.run.total > 0
        ? `${this.run.done}/${this.run.total}`
        : `${this.run.states.length - this.run.lost}/${this.run.states.length} running`;
    this.clockText.textContent = remaining === undefined ? '' : `${clock(remaining)}   ${tally}`;

    this.cardText.textContent = this.card();

    if (!this.debug) return;

    const body = this.controlled.body;
    const spec = body.spec;
    this.debugText.textContent = [
      `${spec.name}`,
      body.payload > 0
        ? `mass       ${spec.mass} + ${body.payload} kg  = ${body.loadedMass}`
        : `mass       ${spec.mass} kg`,
      `speed      ${body.speed.toFixed(2)} m/s   ${bar(body.speedFraction)}`,
      `top speed  ${spec.maxSpeed.toFixed(1)} m/s`,
      `momentum   ${body.momentum.toFixed(0)} kg·m/s`,
      `stop in    ${body.stoppingDistance.toFixed(2)} m`,
      `slip       ${body.slipSpeed.toFixed(2)} m/s`,
      `accel max  ${(spec.driveForce / spec.mass).toFixed(1)} m/s²`,
      `brake max  ${(spec.brakeForce / spec.mass).toFixed(1)} m/s²`,
      '',
      `pos        ${body.x.toFixed(1)}, ${body.y.toFixed(1)}`,
      // Height, and what it is standing on. A level fault never shows up as an
      // exception — it is a robot floating over its own staircase, or a room
      // that reads as a storey it is not on — and this is the number that
      // tells you which, in one glance, without a harness.
      `z          ${body.z.toFixed(2)} m${this.controlled.onLink ? `  on ${this.controlled.onLink}` : ''}`,
      `floor      ${this.floor}`,
      `sim        ${this.sim.elapsed.toFixed(1)} s`,
      `fps        ${this.fps.toFixed(0)}`,
    ].join('\n');
  }
}

/**
 * Which auditoriums have something happening in them.
 *
 * Derived rather than declared, because a chapter may only change four
 * things and this is not one of them. Two sources, in order:
 *
 *   1. every room the objective actually names — Chapter II tends five rooms
 *      and Chapter III sends you to three, and a room the player is told to
 *      go to had better have a talk in it;
 *   2. then filled out to `crowdDensity` of the building's fourteen rooms,
 *      because how full the place is IS the density parameter.
 *
 * The arithmetic lands where the design already says it should: Chapter II's
 * 0.35 is five rooms of fourteen, which is exactly the five it tends and
 * exactly the "half the floor in use" the spec describes. Chapter III's 1.0
 * is all fourteen. Chapter I's 0.0 is none, and the building stays empty.
 */
function roomsInUse(chapter: Chapter): string[] {
  if (chapter.crowdDensity <= 0) return [];

  const auditoria = KINEPOLIS.rooms.filter((r) => r.kind === 'auditorium').map((r) => r.id);
  const named = new Set<string>();

  for (const activity of chapter.objective.activities) {
    for (const zone of [activity.at, activity.kind === 'haul' ? activity.to : undefined]) {
      if (!zone) continue;
      const centre = {
        x: zone.bounds.x + zone.bounds.w / 2,
        y: zone.bounds.y + zone.bounds.h / 2,
      };
      const room = KINEPOLIS.rooms.find(
        (r) =>
          r.floor === zone.floor &&
          auditoria.includes(r.id) &&
          centre.x >= r.bounds.x &&
          centre.x <= r.bounds.x + r.bounds.w &&
          centre.y >= r.bounds.y &&
          centre.y <= r.bounds.y + r.bounds.h,
      );
      if (room) named.add(room.id);
    }
  }

  const wanted = Math.round(chapter.crowdDensity * auditoria.length);
  for (const id of auditoria) {
    if (named.size >= wanted) break;
    named.add(id);
  }

  return [...named];
}

/**
 * Where the cast starts — and a way to override it while developing.
 *
 * `?at=x,y` drops them anywhere in the building, `?at=x,y,floor` on any storey.
 * This is a tool, not a feature: nothing in the game reaches it and a judge
 * cannot get to it by accident, the same arrangement `?lab` has.
 *
 * It exists because the agent working on this cannot see the game and has to
 * photograph it instead, and DRIVING to a particular doorway thirty metres up
 * a corridor is four builds and a lot of guessed key timings. Every one of
 * those guesses is a chance to photograph the wrong thing and draw a
 * confident conclusion from it, which is the expensive failure here — far
 * more expensive than a query parameter.
 */
function startPoint(chapter: Chapter): { x: number; y: number; floor: Level } {
  const spawn = chapter.startFloor === 0 ? SPAWNS.hallCentre : SPAWNS.corridorSouth;
  const at = new URLSearchParams(window.location.search).get('at');
  if (!at) return { x: spawn.x, y: spawn.y, floor: chapter.startFloor };

  const [x, y, floor] = at.split(',').map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { x: spawn.x, y: spawn.y, floor: chapter.startFloor };
  }
  return { x, y, floor: Number.isFinite(floor) ? floor : chapter.startFloor };
}

/** One card row: a glyph for the state, the label, and any live number. */
function cardLine(state: ActivityState): string {
  const { activity, status } = state;

  if (activity.kind === 'tend') {
    const left = Math.ceil(state.progress);
    return status === 'failed'
      ? `× ${activity.label} — dark`
      : `${left < 12 ? '!' : '·'} ${activity.label} ${left}s`;
  }

  const glyph =
    status === 'done' ? '·' : status === 'missed' ? '×' : status === 'carried' ? '»' : status === 'locked' ? ' ' : '›';
  if ((activity.kind === 'dwell' || activity.kind === 'attend') && status === 'open' && state.progress > 0.02) {
    return `${glyph} ${activity.label} ${Math.round(state.progress * 100)}%`;
  }
  return `${glyph} ${activity.label}`;
}

/** m:ss, because a conference day is read in minutes and a meter in seconds. */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(whole / 60);
  const ss = `${whole % 60}`.padStart(2, '0');
  return `${m}:${ss}`;
}

/** A ten-cell text meter. Readable in a screenshot, which is how it gets read. */
function bar(fraction: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * 10);
  return '█'.repeat(filled) + '·'.repeat(10 - filled);
}
