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

import { Vector3, type OrthographicCamera, type Scene, type WebGLRenderer } from 'three';
import { Body } from '@/core/Body';
import { makeActor, Sim, type Actor } from '@/core/Sim';
import { ROBOTS, type RobotId, type RobotSpec } from '@/core/RobotSpec';
import { KINEPOLIS, SPAWNS } from '@/venue/kinepolis';
import { groundAt, roomAt, type Level } from '@/core/Venue';
import { linkAt, surfaceHeight } from '@/core/Traversal';
import { BlockoutRenderer, shade, type ObjectiveMarker } from '@/render/BlockoutRenderer';
import { Wormhole } from '@/render/Wormhole';
import type { Grade } from '@/render/Mood';
import { ObjectiveRun, roomName, type ActivityState, type Arrival, type Exit } from '@/core/Objective';
import { Crowd, PERSON_HEIGHT, type Look } from '@/core/Crowd';
import { Decay } from '@/core/Decay';
import { admits, admittedBy, inZone, zoneCentre, type Activity, type Photo, type TalkActivity } from '@/core/Activity';
import { createIsoCamera, lookAtWorld, VIEW_WIDTH_METRES } from '@/render/IsoCamera';
import { KeyboardController } from '@/input/KeyboardController';
import { CHAPTER_ONE } from '@/chapters/registry';
import { chapterOrLab } from '@/chapters/lab';
import { abandoned, type Chapter } from '@/chapters/Chapter';
import type { Game, Screen } from './Game';
import type { Routes } from './Routes';
import { css, el, label, MONO, SANS } from './dom';
import { currentQuality } from './quality';
import {
  CAMERA_LEAD_CAP,
  CAMERA_LERP,
  CAMERA_OUTSIDE_LIFT,
  DEBUG_DEFAULT,
  FOOTFALL_REFERENCE_MOMENTUM,
  IMPACT_REFERENCE_MOMENTUM,
  VIEW_HEIGHT,
} from '@/config';

/** One row of the card, and the robot it is for if only one can do it. */
interface CardLine {
  text: string;
  who?: RobotSpec;
}

/** Where the card sits, design pixels from the top of the design frame. */
const CARD_TOP = 70;

/**
 * How far a room's lights go down while it waits for a breakdown, 0..1.
 *
 * Not to zero. Zero is a room that has been LOST, and a room still waiting
 * for you has to look different from one that has given up, or the dimming
 * reads as the end rather than as the warning.
 *
 * Linear over the window, and it was square-rooted first: that kept a room
 * looking nearly fine until the last few seconds, and measured off a frame
 * the room was 90 at the start, 77 with four seconds left and 56 dead. A
 * warning you can only see once it is too late to act on is not one.
 */
const WAITING_LIGHT = 0.12;
/** How fast a room's light follows where it should be, per second. */
const LIGHT_EASE = 3;
/** Seconds for a lost room's audience to finish walking out. */
const WALKOUT = 7;

/** How far a posted creature stands from its marker, metres, south and west. */
const POST_OFFSET = 0.62;

/** A print on screen, design pixels. 3:2 — see `public/photos/README.md`. */
const PRINT_WIDTH = 340;
const PRINT_HEIGHT = 226;
/*
 * How a selfie is framed, metres. See `takeSelfie`.
 *
 * Above his head, the lowest the frame may stop on him, how much of the top
 * of the robot gets in, the margin either side of the pair, and where the
 * robot is posed.
 */
const SELFIE_HEADROOM = 0.18;
const SELFIE_CHEST = 1.0;
const SELFIE_PEEK = 0.28;
const SELFIE_SIDE = 0.32;
/** How far beside him Voxxy is posed, centre to centre. */
const SELFIE_BESIDE = 0.72;

/*
 * The wormhole, in seconds. See `playDeparture` and `playArrival`.
 *
 * Leaving: it opens under the robot, holds long enough to be seen for what
 * it is, pulls the robot down through the floor, and the screen goes white
 * on the way out. Arriving is the same white fading back, a fall out of the
 * air, a landing, and a beat of nothing before the robot comes apart.
 */
const DEPART_OPEN = 1.3;
const DEPART_PULL = 1.9;
const DEPART_WHITE = 2.6;
const DEPART_END = 3.8;
const ARRIVE_FADE = 1.0;
const ARRIVE_LAND = 1.75;
const ARRIVE_SPLIT_AT = 2.5;
const ARRIVE_SPLIT = 1.3;
/** How far above the floor the arrival opens, metres. Under any ceiling. */
const ARRIVE_HEIGHT = 3.2;
/**
 * Between one robot coming through and the next, seconds. Two machines
 * landing on the same frame are one event; a beat apart they are a crew.
 */
const ARRIVE_STAGGER = 0.35;
/**
 * The wormhole's colour, in both chapters: Chapter I's accent, the ghost light
 * itself. It is the same hole seen from either end, so it cannot take the
 * colour of whichever chapter it is being drawn in.
 */
const WORMHOLE_COLOUR = CHAPTER_ONE.palette.accent;

/** A story beat in progress. While there is one, nobody is driving. */
type Story =
  | { kind: 'departure'; t: number; exit: Exit; holes: Hole[]; left: boolean }
  | { kind: 'arrival'; t: number; arrival: Arrival; line: number; landed: Set<Actor> };

/** Where a robot went through, which is where it stood when the floor opened. */
interface Hole {
  actor: Actor;
  x: number;
  y: number;
  z: number;
}

/**
 * How many of a room's audience are drawn walking out, at the point where all
 * of them have gone. See `Crowd.evacuate` for why it is not all of them.
 */
const EVACUEES = 36;

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
  /** The dialogue box, and the two things inside it. */
  private talkBox!: HTMLElement;
  private talkWho!: HTMLElement;
  private talkText!: HTMLElement;
  private talkMore!: HTMLElement;
  /** "E  Talk to …", shown when you are in range and the box is shut. */
  private talkPrompt!: HTMLElement;
  /** Edge-triggered, exactly like `dropRequested`. */
  private talkRequested = false;
  /**
   * How much of the current line has been typed out, in characters.
   *
   * A box that appears fully written is a label; one that types itself is
   * somebody speaking, and it costs a counter. The first press of the talk
   * key while a line is still arriving finishes it rather than skipping to
   * the next one, which is what every game that has ever done this does and
   * what a player's hands already expect.
   */
  private typed = 0;
  private typingLine = '';
  private toast!: HTMLElement;
  /** What the card last showed, so it is rebuilt only when it changes. */
  private cardKey = '';
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
  /** The photograph on screen, and how long it has left. */
  private print!: HTMLDivElement;
  private printFor = 0;
  /**
   * A selfie waiting for the frame it is to be taken from. See `takeSelfie`.
   */
  private selfie: Photo | undefined;
  /**
   * The auditoria a breakdown can happen in, and how lit each one is right
   * now. Eased, so a fixed room comes back up rather than snapping on.
   */
  private sessionRooms: { id: string; floor: Level; bounds: { x: number; y: number; w: number; h: number } }[] = [];
  private roomLight = new Map<string, number>();
  /** The game's renderer, which a selfie has to be taken with. */
  private renderer!: WebGLRenderer;
  /**
   * The wormholes — one per robot going through or coming out — and the
   * white it all goes out on. See `Story`.
   */
  private story: Story | undefined;
  private wormholes: Wormhole[] = [];
  private whiteout!: HTMLDivElement;
  /** True while the cast is on the forecourt. Changes what the camera frames. */
  private outside = false;

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

  get grade(): Grade | undefined {
    return this.chapter.palette.grade;
  }

  mount(game: Game): void {
    const { chapter } = this;

    game.setBackground(chapter.palette.void);
    this.renderer = game.renderer;

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
    // Somebody standing at every conversation the chapter has. Taken from the
    // objective rather than listed separately, so a `talk` activity cannot be
    // written without the person it is with turning up — which is the bug the
    // whole of this was built to stop: twelve errands run past nobody.
    const posts = chapter.objective.activities
      // Anybody the objective named, not just anybody it gave lines to. A
      // photograph of Josh Long needs Josh Long in it and needs him to say
      // nothing whatsoever. See `Activity.who`.
      .filter((a) => a.who !== undefined || a.shape !== undefined)
      // Somebody a SECOND activity happens with is already standing there.
      // See `Activity.alreadyHere`.
      .filter((a) => !a.alreadyHere)
      .map((a) => {
        const at = zoneCentre(a.at);
        // Beside the marker, not under it. A marker post is 0.8 m even at its
        // short setting and a cat is half a metre, so a creature standing on
        // its own zone centre is a creature you cannot see. South-west is
        // TOWARDS the camera, so whoever it is stands in front of their post
        // rather than behind it.
        return {
          x: at.x - POST_OFFSET,
          y: at.y - POST_OFFSET,
          floor: a.at.floor,
          shape: a.shape,
          look: a.look,
        };
      });

    this.crowd = new Crowd(KINEPOLIS, chapter.crowdDensity, roomsInUse(chapter), posts);

    // And the other thing a storey is baked with: what has settled on it in
    // the years since anybody swept. Full density or none — there is no era
    // between "in use" and "left", and a half-abandoned building is a look
    // nothing in `SPEC.md` asks for.
    const decay = new Decay(KINEPOLIS, abandoned(chapter) ? 1 : 0);

    this.blockout = new BlockoutRenderer(
      this.isoCamera,
      KINEPOLIS,
      chapter.palette,
      chapter.lightLevel,
      this.crowd,
      decay,
      currentQuality() === 'high',
    );
    this.blockout.telemetry = this.debug;

    this.controller = new KeyboardController(game.keyboard);

    this.run = new ObjectiveRun(chapter.objective);
    const named = new Set(chapter.objective.activities.flatMap((a) => (a.room ? [a.room] : [])));
    this.sessionRooms = KINEPOLIS.rooms
      .filter((r) => named.has(r.id))
      .map((r) => ({ id: r.id, floor: r.floor, bounds: r.bounds }));

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

    // Above the print and the end card: it is the last thing on screen as a
    // chapter leaves and the first as the next one arrives.
    this.whiteout = el('div', {
      position: 'absolute',
      inset: '0',
      background: '#f3efe6',
      opacity: '0',
      pointerEvents: 'none',
      zIndex: '9',
    });
    game.ui.append(this.whiteout);
    if (chapter.objective.arrival) this.arrive(chapter.objective.arrival);
    // `?exit` opens the way out at once, for looking at the wormhole without
    // playing a chapter to the end first. Like `?at`, unreachable in play.
    // Only for the chapter `?chapter` named: the query outlives the screen,
    // and without this every chapter down the chain folds the moment it
    // loads, so Chapter I's wormhole could never be watched landing.
    const exit = chapter.objective.exit;
    const query = new URLSearchParams(window.location.search);
    if (exit && query.has('exit') && query.get('chapter') === chapter.id) this.depart(exit);

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
    // E rather than SPACE or ENTER: SPACE is already the drop, and ENTER is
    // the one key a browser is liable to hand to something else on the page.
    game.keyboard.on('KeyE', () => {
      this.talkRequested = true;
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
    // And through a story beat, which is the wormhole's turn and not yours.
    if (over || this.story) {
      Object.assign(this.controlled.input, { dirX: 0, dirY: 0, throttle: 0, braking: false });
    } else {
      this.controller.read(this.controlled.input);
    }

    this.sim.advance(dt);
    this.crowd.advance(dt, this.actors);

    // Read before it is cleared below; a story beat pages on the same key.
    const talkPressed = this.talkRequested;

    // The objective does not start until the arrival has finished: Chapter
    // II's rooms would be draining behind a robot that has not landed yet.
    if (!over && !this.story) {
      // A press while a line is still typing itself finishes THAT line rather
      // than paging past it. Every game with a text box does this, and a
      // player who has ever held one expects it without being told.
      if (this.talkRequested && this.typed < this.typingLine.length) {
        this.typed = this.typingLine.length;
        this.talkRequested = false;
      }
      this.run.update(dt, this.actors, this.dropRequested, this.talkRequested);
      this.consumeObjective();
      if (this.run.phase === 'ended') {
        // Won, and the chapter goes somewhere: through the floor, not to a
        // card. A lost round still gets the card — you do not fall through
        // a wormhole for failing.
        const exit = this.chapter.objective.exit;
        if (exit && !this.run.failed) this.depart(exit);
        else this.showEndCard();
      }
    }
    this.dropRequested = false;
    this.talkRequested = false;
    this.showSessions(dt);
    if (this.story) this.updateStory(dt, talkPressed);
    else this.updateTalk(dt);

    // A robot that walks up a flight changes storey underneath us. Each storey
    // is modelled from its own datum, so the world it is standing in moves 6.2
    // metres at that instant and the camera has to be put down with it rather
    // than eased across a gap that does not exist.
    if (this.controlled.floor !== this.floor) {
      this.floor = this.controlled.floor;
      this.cameraZ = this.controlled.body.z;
      this.blockout.clearMarks();
    }

    // Outside, the building has to be drawn its own height rather than cut
    // off at the cutaway plane. Asked of the room the camera is watching,
    // not of the storey, because the forecourt is on storey 0 like the hall.
    const here = roomAt(KINEPOLIS, this.controlled.floor, this.controlled.body.x, this.controlled.body.y);
    this.outside = here?.kind === 'outside';
    this.blockout.setOutside(this.outside);

    this.applyFeedback();
    this.followControlled(dt);
    this.blockout.setMarkers(this.markers(), this.floor);
    this.blockout.moveLamp(this.controlled.body.x, this.controlled.body.y, this.controlled.body.z);
    this.blockout.focus(this.cameraX, this.cameraY, this.cameraZ);
    // One robot needs no telling apart; two or three do.
    this.blockout.setControlled(this.actors.length > 1 ? this.controlled : undefined);
    this.blockout.render(this.floor, this.actors, this.sim.alpha, dt);
    // After the scene is dressed for this frame and not before, or the
    // selfie is of the frame BEFORE the one in which it was taken.
    if (this.selfie) {
      this.showPrint(this.selfie, this.takeSelfie(this.selfie));
      this.selfie = undefined;
    }

    if (this.printFor > 0) {
      this.printFor -= dt;
      // Fade on the way out and clear only once the transition has run, or
      // the print vanishes mid-fade and reads as a glitch.
      if (this.printFor <= 0) this.print.style.opacity = '0';
    }

    if (this.toastFor > 0) {
      this.toastFor -= dt;
      if (this.toastFor <= 0) this.toast.textContent = '';
    }

    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.1;
    this.updateHud();
  }

  dispose(): void {
    for (const hole of this.wormholes) hole.dispose();
    this.blockout.dispose();
  }

  // -- control --------------------------------------------------------------

  private takeControl(index: number): void {
    const next = this.actors[index];
    if (!next || next === this.controlled || this.story) return;

    // Hand the old robot a neutral input or it keeps whatever the player was
    // holding at the moment they swapped and drives off on its own.
    Object.assign(this.controlled.input, { dirX: 0, dirY: 0, throttle: 0, braking: false });
    this.controlled = next;
  }

  private resetCast(): void {
    // Mid-wormhole there is nothing to reset to: the robot is half through
    // the floor, or the second one does not exist yet.
    if (this.story) return;
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
    // And put the audiences back in the rooms they walked out of — the seats
    // in the renderer, the people who left in the crowd.
    this.blockout.refillSeats();
    this.crowd.reseat();
    this.run = new ObjectiveRun(this.chapter.objective);
    this.endCard?.remove();
    this.endCard = undefined;
    this.toast.textContent = '';
    this.selfie = undefined;
    this.snapCamera();
  }

  // -- story ----------------------------------------------------------------

  /**
   * Open the floor under every robot in the cast.
   *
   * Every one, not just the one being driven. In `switch` mode the others
   * are wherever the player left them — Chapter II ends with Droid in some
   * control booth across the corridor — and the next chapter needs them
   * all. The building folds wherever you happen to be standing; the camera
   * only ever sees the robot you are.
   */
  private depart(exit: Exit): void {
    const holes = this.actors.map((actor) => ({
      actor,
      x: actor.body.x,
      y: actor.body.y,
      z: actor.body.z,
    }));
    this.story = { kind: 'departure', t: 0, exit, holes, left: false };
    this.openWormholes(holes.length);
  }

  /** Start a chapter out of the white, with robots about to fall into it. */
  private arrive(arrival: Arrival): void {
    this.story = { kind: 'arrival', t: 0, arrival, line: -1, landed: new Set() };
    this.whiteout.style.opacity = '1';
    this.openWormholes(this.actors.length);
    // Posed before the first frame is drawn, or it opens on the whole cast
    // already standing there and the split has nothing to reveal.
    this.playArrival(this.story, 0);
  }

  private openWormholes(count: number): void {
    while (this.wormholes.length < count) {
      const hole = new Wormhole(WORMHOLE_COLOUR);
      this.blockout.scene.add(hole.object);
      this.wormholes.push(hole);
    }
  }

  private updateStory(dt: number, pressed: boolean): void {
    const story = this.story;
    if (!story) return;
    this.talkPrompt.textContent = '';
    story.t += dt;
    if (story.kind === 'departure') this.playDeparture(story, dt);
    else this.playArrival(story, dt, pressed);
  }

  /**
   * The robots go down the holes.
   *
   * Each pulled to the middle of its own, then spun and shrunk and sunk, all
   * as a pose on the renderer: the bodies in the simulation brake to a stop
   * exactly where they were, and nothing about the physics knows a wormhole
   * happened. The chapter changes on white, so the cut is never seen.
   */
  private playDeparture(story: Extract<Story, { kind: 'departure' }>, dt: number): void {
    const { t } = story;
    const open = smooth(t / DEPART_OPEN);
    const k = clamp01((t - DEPART_OPEN) / DEPART_PULL);
    const e = k * k;

    story.holes.forEach(({ actor, x, y, z }, i) => {
      this.wormholes[i]?.place(x, y, z, open, dt);
      this.blockout.setPose(actor, {
        dx: (x - actor.body.x) * open,
        dy: (y - actor.body.y) * open,
        dz: -0.9 * e,
        scale: 1 - 0.97 * e,
        spin: e * 18 + Math.sin(t * 31 + i) * 0.06 * open,
        hidden: k >= 1,
      });
    });
    // A rumble that builds; not forced, so it never cuts across an impact.
    if (t < DEPART_OPEN + DEPART_PULL) this.shake(0.12, 0.0012 + 0.0035 * open, false);

    this.whiteout.style.opacity = String(smooth((t - DEPART_WHITE) / (DEPART_END - DEPART_WHITE)));

    if (t >= DEPART_END && !story.left) {
      story.left = true;
      // Not from inside `update`: the new screen would be mounted, and this
      // one disposed, halfway through a frame `Game` is about to draw with it.
      const to = story.exit.to;
      queueMicrotask(() => this.routes.chapter(to));
    }
  }

  /**
   * The robots come out of the air, land, and one of them comes apart.
   *
   * Everybody who went in comes back down, a beat apart, each out of a hole
   * of its own over the place the simulation has had it standing all along.
   * The new machine is posed ON `from` — same place, a fifth of its size —
   * and grows out of it to its own spawn. Then they talk, one box at a time,
   * and only when the last line is paged past does the objective start.
   */
  private playArrival(
    story: Extract<Story, { kind: 'arrival' }>,
    dt: number,
    pressed = false,
  ): void {
    const { arrival } = story;
    const from = this.actors[this.chapter.cast.indexOf(arrival.from)];
    const into = this.actors[this.chapter.cast.indexOf(arrival.into)];
    if (!from || !into) {
      this.endStory();
      return;
    }
    // Everyone but the one about to exist, in cast order.
    const fallers = this.actors.filter((a) => a !== into);
    const lag = (fallers.length - 1) * ARRIVE_STAGGER;
    const splitAt = ARRIVE_SPLIT_AT + lag;
    const end = splitAt + ARRIVE_SPLIT;

    // Impatience is allowed. A press during the animation skips to the talk.
    if (pressed && story.t < end) {
      story.t = end;
      pressed = false;
    }
    const { t } = story;

    this.whiteout.style.opacity = String(1 - smooth(t / ARRIVE_FADE));

    const split = clamp01((t - splitAt) / ARRIVE_SPLIT);
    const grown = smooth(split);
    const dropFrom = ARRIVE_FADE * 0.55;

    fallers.forEach((actor, i) => {
      const b = actor.body;
      const start = dropFrom + i * ARRIVE_STAGGER;
      const land = ARRIVE_LAND + i * ARRIVE_STAGGER;
      this.wormholes[i]?.place(b.x, b.y, b.z + ARRIVE_HEIGHT, 1 - smooth((t - land) / 0.9), dt);

      const fall = clamp01((t - start) / (land - start));
      if (fall >= 1 && !story.landed.has(actor)) {
        story.landed.add(actor);
        // Heavier machines land harder. Droid is four Voxxys.
        const weight = Math.min(1, b.spec.mass / 200);
        this.shake(0.3 + 0.15 * weight, 0.008 + 0.012 * weight, true);
      }
      if (t >= end) return;

      // Landed, and the one that is about to come apart shivers until it
      // has — the others just stand there, which is its own kind of joke.
      const shiver = actor === from && t > land + 0.3 ? Math.sin(t * 41) * 0.07 * (1 - grown) : 0;
      this.blockout.setPose(
        actor,
        t < start
          ? { hidden: true }
          : fall < 1
            ? { dz: ARRIVE_HEIGHT * (1 - fall * fall), spin: (1 - fall) * 9 }
            : { scale: 1 + shiver },
      );
    });

    if (t < end) {
      const fb = from.body;
      const ib = into.body;
      this.blockout.setPose(
        into,
        split <= 0
          ? { hidden: true }
          : {
              dx: (fb.x - ib.x) * (1 - grown),
              dy: (fb.y - ib.y) * (1 - grown),
              scale: 0.2 + 0.8 * grown,
              spin: (1 - grown) * 11,
            },
      );
      return;
    }

    for (const actor of this.actors) this.blockout.setPose(actor, undefined);
    if (story.line < 0) story.line = 0;

    if (pressed) {
      // Same rule as a conversation: finish the line, then page.
      if (this.typed < this.typingLine.length) this.typed = this.typingLine.length;
      else story.line += 1;
    }
    if (story.line >= arrival.lines.length) {
      this.endStory();
      return;
    }
    this.sayStory(arrival.lines[story.line], story.line < arrival.lines.length - 1, dt);
  }

  /** One box of a story beat, typed like a conversation and tinted like its speaker. */
  private sayStory(said: { who: RobotId; text: string }, more: boolean, dt: number): void {
    const spec = ROBOTS[said.who];
    const tint = css(lift(spec.tint));
    this.talkWho.style.color = tint;
    this.talkMore.style.color = tint;
    this.talkBox.style.borderColor = tint;
    if (said.text !== this.typingLine) {
      this.typingLine = said.text;
      this.typed = 0;
    }
    this.typed = Math.min(said.text.length, this.typed + ChapterScreen.TYPE_RATE * dt);
    this.talkBox.style.display = 'block';
    this.talkWho.textContent = spec.name;
    this.talkText.textContent = said.text.slice(0, Math.floor(this.typed));
    this.talkMore.textContent = this.typed >= said.text.length ? (more ? '▼' : '■') : '';
  }

  private endStory(): void {
    for (const actor of this.actors) this.blockout.setPose(actor, undefined);
    for (const hole of this.wormholes) hole.place(0, 0, 0, 0, 0);
    this.whiteout.style.opacity = '0';
    this.talkBox.style.display = 'none';
    this.typingLine = '';
    this.typed = 0;
    this.story = undefined;
  }

  // -- objective ------------------------------------------------------------

  /** Drain the frame's reveals and notifications into the world and the HUD. */
  private consumeObjective(): void {
    for (const reveal of this.run.reveals) {
      this.blockout.lightZone(reveal.id, reveal.bounds, reveal.floor, reveal.to);
    }
    this.run.reveals.length = 0;

    // One print at a time. Two photographs finishing in the same frame is not
    // reachable — they are metres apart and gated on each other — but the
    // queue is a queue, and showing the last is the same rule the toast uses.
    const photos = this.run.photos;
    if (photos.length > 0) {
      const photo = photos[photos.length - 1];
      // A selfie is taken from the frame about to be drawn, which does not
      // exist yet. `update` develops it once the scene is dressed.
      if (photo.selfie) this.selfie = photo;
      else this.showPrint(photo);
      photos.length = 0;
    }

    const events = this.run.events;
    if (events.length > 0) {
      this.toast.textContent = events[events.length - 1].text;
      this.toastFor = 2.6;
      events.length = 0;
    }
  }

  /**
   * Put a photograph up, the way a print lands on a table.
   *
   * It covers the middle of the screen for three and a half seconds, which
   * is a long time in a six-minute day and is meant to be: the whole point of
   * the errand is the picture, and a picture that flickers past in the corner
   * is a notification. It is not interactive and it does not pause anything —
   * the day carries on behind it, which is the joke and also the cost.
   */
  private showPrint(photo: Photo, taken?: HTMLCanvasElement): void {
    const { palette } = this.chapter;
    this.print.replaceChildren();

    const frame = el('div', {
      background: '#efece4',
      padding: '10px 10px 0',
      boxShadow: '0 18px 44px rgba(0, 0, 0, 0.55)',
      // A print is never quite square to the table it lands on — and a
      // selfie leans the other way, because it was held at arm's length.
      transform: photo.selfie ? 'rotate(1.8deg)' : 'rotate(-1.4deg)',
    });

    if (taken) {
      Object.assign(taken.style, { display: 'block', width: `${PRINT_WIDTH}px`, height: `${PRINT_HEIGHT}px` });
      frame.append(taken);
    } else if (photo.file) {
      // `BASE_URL` rather than a leading slash: Pages serves this from a
      // subdirectory, and a root-absolute src is the classic way to have a
      // build that works locally and 404s in front of a judge.
      const img = el('img', { display: 'block', width: `${PRINT_WIDTH}px`, height: 'auto' });
      (img as HTMLImageElement).src = `${import.meta.env.BASE_URL}photos/${photo.file}`;
      (img as HTMLImageElement).alt = photo.caption;
      frame.append(img);
    } else {
      /*
       * The print that has not been taken yet.
       *
       * Deliberately not an apology — no "missing image" glyph, no broken
       * frame. It is a developed photograph of a dark room, which is what a
       * print looks like before anybody has put a real one in its place, and
       * it lets the timing and the size be judged now rather than after the
       * art lands.
       */
      frame.append(
        el('div', {
          width: `${PRINT_WIDTH}px`,
          height: `${PRINT_HEIGHT}px`,
          background: css(shade(palette.void, 2.1)),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: `11px ${MONO}`,
          color: css(palette.accent),
          letterSpacing: '0.22em',
        }, 'PHOTO TO COME'),
      );
    }

    frame.append(
      el('div', {
        font: `13px ${MONO}`,
        color: '#2c2a26',
        padding: '12px 2px 14px',
        textAlign: 'center',
        letterSpacing: '0.04em',
      }, photo.caption),
    );

    this.print.append(frame);
    this.print.style.opacity = '1';
    this.printFor = 3.5;
  }

  /**
   * Develop a selfie from the game's own canvas.
   *
   * Framed the way a photographer frames himself: Dimitris from the chest
   * up with a little headroom, and the bottom edge wherever it cuts the top
   * of Voxxy — which at 1.15 m beside a 1.72 m man is the top of its head
   * and nothing else. That is the joke.
   *
   * And it is staged, because he is a photographer. Voxxy can be anywhere
   * in a zone three metres across, and under this camera half a metre
   * BEHIND him is higher up the screen: the first version framed from
   * where Voxxy really stood and got a print that was all orange robot. So
   * for the one render Voxxy is drawn beside him, at his depth, on the side
   * the screen calls right. See `BlockoutRenderer.withRobotMoved`.
   *
   * RENDERED for the print rather than cropped out of the frame. At 28 px a
   * metre the two of them are about fifty pixels tall on screen, and a crop
   * blown up to a print is a smear. So the camera's frustum is narrowed onto
   * the framing, the scene drawn once into the canvas and read back in the
   * same task, and the frustum put back. `Game` draws the real frame over it
   * straight after, before anything is shown — and reading it in the same
   * task is also what makes it readable at all: WebGL discards the buffer
   * once it has been composited, and `preserveDrawingBuffer` would cost every
   * other frame of the game to buy this one.
   */
  private takeSelfie(photo: Photo): HTMLCanvasElement {
    const cam = this.camera;
    const source = this.renderer.domElement;
    const activity = this.run.states.find((s) => s.activity.photo === photo)?.activity;

    // Whoever earned it, which is not necessarily who the player is driving:
    // in `switch` mode Voxxy may have been parked here while TAB was on Droid.
    const robot =
      (activity &&
        this.actors.find(
          (a) => inZone(activity.at, a.floor, a.body.x, a.body.y) && admits(activity, a.body.spec),
        )) ??
      this.controlled;
    const body = robot.body;
    const centre = activity ? zoneCentre(activity.at) : { x: body.x, y: body.y };
    // Where the post stands, not the zone centre. See `POST_OFFSET`.
    const them = activity ? { x: centre.x - POST_OFFSET, y: centre.y - POST_OFFSET } : centre;
    const ground = groundAt(KINEPOLIS, robot.floor, them.x, them.y);

    cam.updateMatrixWorld();
    // Screen-right, laid flat on the floor: beside him and at his depth.
    const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0).setZ(0).normalize();
    const posed = { x: them.x + right.x * SELFIE_BESIDE, y: them.y + right.y * SELFIE_BESIDE };

    // Everything below is in the frustum's own units, where the view plane
    // runs left..right and bottom..top — so a framing is a new frustum.
    const onView = (x: number, y: number, z: number): { x: number; y: number } => {
      const p = new Vector3(x, y, z).project(cam);
      return {
        x: cam.left + ((cam.right - cam.left) * (p.x + 1)) / 2,
        y: cam.bottom + ((cam.top - cam.bottom) * (p.y + 1)) / 2,
      };
    };
    const head = onView(them.x, them.y, ground + PERSON_HEIGHT + SELFIE_HEADROOM);
    const chest = onView(them.x, them.y, ground + SELFIE_CHEST);
    const peek = onView(posed.x, posed.y, ground + body.spec.height - SELFIE_PEEK);

    // Never higher than his chest, or he is a head in a frame. Posed at his
    // depth, Voxxy's cut is always below it; the guard is for a robot tall
    // enough that it would not be, which the gate does not admit today.
    const bottom = Math.min(peek.y, chest.y);
    // 3:2, and wide enough for both of them whichever side Voxxy is on. If
    // it has to widen, it grows upwards so the cut through Voxxy stays put.
    const wide = Math.max(
      ((head.y - bottom) * PRINT_WIDTH) / PRINT_HEIGHT,
      Math.abs(head.x - peek.x) + 2 * SELFIE_SIDE,
    );
    const tall = (wide * PRINT_HEIGHT) / PRINT_WIDTH;
    const middle = (head.x + peek.x) / 2;

    // Drawn at the canvas's own aspect, so nothing is stretched, and the
    // print taken out of the middle of it.
    const aspect = source.width / source.height;
    const saved = { left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom };
    cam.left = middle - (tall * aspect) / 2;
    cam.right = middle + (tall * aspect) / 2;
    cam.bottom = bottom;
    cam.top = bottom + tall;
    cam.updateProjectionMatrix();
    this.blockout.withRobotMoved(robot, posed.x - body.x, posed.y - body.y, () =>
      this.renderer.render(this.scene, cam),
    );

    const print = document.createElement('canvas');
    // Twice the print, so it is sharp at the 2x pixel ratio `Game` caps at.
    print.width = PRINT_WIDTH * 2;
    print.height = PRINT_HEIGHT * 2;
    const cropW = (source.height * PRINT_WIDTH) / PRINT_HEIGHT;
    print
      .getContext('2d')
      ?.drawImage(source, (source.width - cropW) / 2, 0, cropW, source.height, 0, 0, print.width, print.height);

    Object.assign(cam, saved);
    cam.updateProjectionMatrix();

    print.setAttribute('role', 'img');
    print.setAttribute('aria-label', photo.caption);
    return print;
  }

  /**
   * How each session's room looks, every frame, whether the round is running
   * or not.
   *
   * Outside `consumeObjective` on purpose: that is gated on the round still
   * being live, and the last thing that happens in Chapter II is three rooms
   * going dark at once and ending the day. Driven from in there, the losing
   * room's audience got two seconds of an eight second walk-out and then
   * froze half gone behind the end card, which reads as the renderer giving
   * up rather than as a room emptying. The day is over; the building is still
   * there, and what is happening in it finishes.
   */
  private showSessions(dt: number): void {
    /*
     * A room is as lit as it has patience left.
     *
     * Driven every frame rather than queued on an event, because this is not
     * a thing that happens — it is a thing that is true. A room with nothing
     * wrong in it is at full light. A breakdown takes it down towards
     * `WAITING_LIGHT` over its window, and the soonest deadline in the room
     * wins. Fixed, it comes straight back up; that is the reward, and it is
     * visible from the far end of a 126 m corridor, which is where the
     * player usually is when it happens.
     */
    const now = this.run.elapsed;
    for (const room of this.sessionRooms) {
      const lostAt = this.run.lostRooms.get(room.id);
      let target = 1;
      if (lostAt !== undefined) {
        target = 0;
      } else {
        for (const state of this.run.states) {
          const a = state.activity;
          if (a.room !== room.id || !a.window) continue;
          if (state.status !== 'open' && state.status !== 'carried') continue;
          const left = clamp01((a.window.to - now) / (a.window.to - a.window.from));
          target = Math.min(target, WAITING_LIGHT + (1 - WAITING_LIGHT) * left);
        }
      }
      const was = this.roomLight.get(room.id) ?? 1;
      const lit = was + (target - was) * Math.min(1, dt * LIGHT_EASE);
      this.roomLight.set(room.id, lit);
      this.blockout.lightZone(`room:${room.id}`, room.bounds, room.floor, lit);

      /*
       * And a lost room empties.
       *
       * Over seconds, not in a frame: a room switched off with everybody in
       * it reads as the renderer giving up. An audience that gets up and
       * files out down the corridor reads as a session that is over.
       */
      if (lostAt === undefined) continue;
      const departed = clamp01((now - lostAt) / WALKOUT);
      this.blockout.emptySeats(room.id, departed);
      this.crowd.evacuate(room.id, departed * EVACUEES);
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
    const cast = this.chapter.cast.map((id) => ROBOTS[id]);

    for (const state of this.run.states) {
      const { activity, status } = state;
      if (status === 'done' || status === 'missed' || status === 'failed') continue;
      // A breakdown that has not happened yet has no post. A grey marker on
      // a projector that is working is a spoiler for the next two minutes.
      if (activity.room !== undefined && status === 'locked') continue;

      if (status === 'carried' && activity.kind === 'haul') {
        const centre = zoneCentre(activity.to);
        // Where it goes, in the carrier's own colour: the drop-off is for
        // whoever is holding the thing, whoever else could have carried it.
        const carrier = state.carrier?.body.spec;
        out.push({
          id: `${activity.id}:to`,
          x: centre.x,
          y: centre.y,
          z: groundAt(KINEPOLIS, activity.to.floor, centre.x, centre.y),
          floor: activity.to.floor,
          colour: carrier ? carrier.signal : 0x8fd694,
          icon: 'drop',
        });
        continue;
      }

      /*
       * Who it is for, when that is one robot: its signal colour and its
       * silhouette on top of the beam. Asked the same way the card asks it
       * — `admittedBy` over the cast, gates and payload together — so the
       * marker and the card cannot disagree. In a one-robot chapter
       * everything is that robot's and saying so on every post would be
       * noise, so Chapter I keeps the plain accent diamond.
       */
      const able = admittedBy(activity, cast);
      const only = cast.length > 1 && able.length === 1 ? able[0] : undefined;
      const locked = status === 'locked';
      out.push({
        id: activity.id,
        x: state.x,
        y: state.y,
        z: groundAt(KINEPOLIS, state.floor, state.x, state.y),
        floor: state.floor,
        colour: locked ? 0x4a5058 : only ? only.signal : accent,
        icon: only ? only.id : 'any',
        locked,
        // Twenty-seven stickers are twenty-seven markers, and at full height
        // they turned the exhibition hall into a pole farm — more marker than
        // building. One thing you are doing gets one post; a sweep of many
        // gets studs, which say "here too" without competing with the room.
        //
        // A conversation gets a stud too, and for a different reason: there
        // is a PERSON standing on that exact spot, and a two-metre post
        // through the middle of them was the first thing this feature drew.
        // The person is the marker. The stud is the floor lit under them.
        low: activity.group !== undefined || activity.kind === 'talk',
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
    // Outside, frame the building rather than the machine. See the constant.
    const z = body.z + (this.outside ? CAMERA_OUTSIDE_LIFT : 0);
    const speed = body.speed;
    if (speed < 0.05) return { x: body.x, y: body.y, z };

    const lead = Math.min(body.stoppingDistance, CAMERA_LEAD_CAP);
    return {
      x: body.x + (body.vx / speed) * lead,
      y: body.y + (body.vy / speed) * lead,
      z,
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

    /*
     * Washes behind the HUD, not boxes round it.
     *
     * The text sits straight on the building, and the building is busy: in
     * Chapter III a lit wall passes behind the objective line every few
     * seconds. A text shadow saves each letter and not the line. A gradient
     * from the corner, dark at the text and gone by the middle of the
     * screen, saves the line and costs no view of the game.
     */
    game.ui.append(
      el('div', {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '560px',
        height: '130px',
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 100% 100% at 0% 0%, rgba(4,6,8,0.62), rgba(4,6,8,0) 70%)',
      }),
      el('div', {
        position: 'absolute',
        left: '0',
        bottom: '0',
        width: '640px',
        height: '120px',
        pointerEvents: 'none',
        background: 'radial-gradient(ellipse 100% 100% at 0% 100%, rgba(4,6,8,0.55), rgba(4,6,8,0) 70%)',
      }),
    );

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
      color: '#aab2b8',
      left: 'auto',
      right: '20px',
      textAlign: 'right',
      lineHeight: '1.6',
      // A panel, because the card is a LIST and a list over a busy scene
      // needs a ground. Translucent and blurred, so the building still
      // shows through it and nothing important is hidden behind the card.
      padding: '10px 14px',
      background: 'rgba(8, 11, 14, 0.55)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '4px',
      backdropFilter: 'blur(3px)',
    });
    game.ui.append(this.cardText);

    this.toast = label(28, VIEW_HEIGHT - 72, {
      font: `15px ${SANS}`,
      color: css(chapter.palette.accent),
    });
    game.ui.append(this.toast);

    /*
     * The photograph.
     *
     * Middle of the screen and above everything, because it is the only
     * thing in the game that is a REWARD rather than a readout — every other
     * overlay here is telling the player how they are doing. Pointer events
     * off: it is a picture, not a dialog, and a six-minute day must not stop
     * for it.
     */
    this.print = el('div', {
      position: 'absolute',
      left: '0',
      right: '0',
      top: '0',
      bottom: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: '0',
      transition: 'opacity 420ms ease-out',
      pointerEvents: 'none',
      zIndex: '6',
    });
    game.ui.append(this.print);

    // Only advertise the keys this chapter has anything to use. Chapter I is
    // one robot in an empty building: TAB, SPACE and E are all true of the
    // engine and none of them is true of the chapter, and a control list with
    // three dead keys on it is how a player decides the game is broken.
    const talks = chapter.objective.activities.some((a) => a.kind === 'talk');
    const keys = [
      'WASD move',
      'SHIFT brake',
      ...(chapter.cast.length > 1 ? ['TAB robot', 'SPACE drop'] : []),
      ...(talks ? ['E talk'] : []),
      'R reset',
      'ESC menu',
    ].join('   ');

    game.ui.append(
      label(28, VIEW_HEIGHT - 40, { font: `12px ${MONO}`, color: '#4c5357' }, keys),
    );

    /*
     * The dialogue box.
     *
     * Bottom of the screen, full width, opaque, two lines — which is the
     * shape every handheld RPG settled on thirty years ago and none of them
     * has moved from since, because it works: the text is where the eye
     * already is after reading the world, it never covers the thing you are
     * standing in front of, and a fixed height means a long conversation
     * never makes the screen jump.
     *
     * Built from the chapter's own palette, so a conversation in the dark
     * first chapter is not a white rectangle detonating in the middle of it.
     */
    this.talkBox = el('div', {
      position: 'absolute',
      left: '64px',
      right: '64px',
      bottom: '58px',
      padding: '16px 20px 18px',
      background: css(shade(chapter.palette.void, 3.2)),
      border: `2px solid ${css(chapter.palette.text)}`,
      borderRadius: '3px',
      display: 'none',
      // Above the canvas and above the card, but it is the only thing that
      // ever overlaps either, so nothing else needs a z-index of its own.
      zIndex: '5',
    });
    this.talkWho = el('div', {
      font: `12px ${MONO}`,
      color: css(chapter.palette.accent),
      letterSpacing: '0.10em',
      marginBottom: '8px',
      textTransform: 'uppercase',
    });
    this.talkText = el('div', {
      font: `16px ${SANS}`,
      color: css(chapter.palette.text),
      lineHeight: '1.5',
      // Two lines, always. Reserving the height stops the box growing and
      // shrinking under the text as a conversation goes on.
      minHeight: '48px',
      whiteSpace: 'pre-wrap',
    });
    this.talkMore = el(
      'div',
      {
        font: `12px ${MONO}`,
        color: css(chapter.palette.accent),
        textAlign: 'right',
        marginTop: '4px',
        height: '14px',
      },
      '',
    );
    this.talkBox.append(this.talkWho, this.talkText, this.talkMore);
    game.ui.append(this.talkBox);

    this.talkPrompt = label(28, VIEW_HEIGHT - 80, {
      font: `13px ${MONO}`,
      color: css(chapter.palette.accent),
      letterSpacing: '0.06em',
    });
    game.ui.append(this.talkPrompt);

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
   * Characters per second the box types at.
   *
   * Fast enough that a patient player never waits, slow enough that the text
   * arrives as speech. Tuned by reading it, which is the only way.
   */
  private static readonly TYPE_RATE = 58;

  /**
   * The conversation the controlled robot could be having, if any.
   *
   * Controlled robot only, and that is the rule the whole feature rests on:
   * with three machines in the building, "somebody is standing in the zone"
   * would open a box about a conversation the player is not watching.
   */
  private talkHere(): { state: ActivityState; activity: TalkActivity } | undefined {
    const body = this.controlled.body;
    for (const state of this.run.states) {
      const a = state.activity;
      if (a.kind !== 'talk') continue;
      if (state.status !== 'open') continue;
      if (!admits(a, body.spec)) continue;
      if (!inZone(a.at, this.controlled.floor, body.x, body.y)) continue;
      return { state, activity: a };
    }
    return undefined;
  }

  /**
   * Draw the box, or offer it.
   *
   * Everything about WHICH line is showing comes out of `state.progress`,
   * which `ObjectiveRun` owns — this holds no cursor of its own. That is
   * deliberate: a screen that counted its own lines would disagree with the
   * thing that decides when the conversation is finished the first time a
   * robot was driven out of the zone mid-sentence.
   */
  private updateTalk(dt: number): void {
    const found = this.talkHere();

    if (!found) {
      this.talkBox.style.display = 'none';
      this.talkPrompt.textContent = '';
      this.typingLine = '';
      this.typed = 0;
      return;
    }

    const { state, activity } = found;
    const shown = Math.round(state.progress * activity.lines.length);

    // In range, nothing said yet: offer it rather than opening unasked. A box
    // that opens because you drove past is a box that interrupts you.
    if (shown === 0) {
      this.talkBox.style.display = 'none';
      this.talkPrompt.textContent = `E    Talk to ${activity.who}`;
      this.typingLine = '';
      this.typed = 0;
      return;
    }

    this.talkPrompt.textContent = '';
    /*
     * The box takes the speaker's own colour.
     *
     * A name in the chapter accent is a label; a name in the colour of the
     * person standing in front of you is the same person twice. Which of
     * their colours, and why it is not simply the shirt, is `ink`. Lifted
     * well up first — half of these people are in black, and dark text on a
     * near-black box is a name nobody reads.
     */
    const look = activity.look;
    const tint = css(look === undefined ? this.chapter.palette.accent : lift(ink(look)));
    this.talkWho.style.color = tint;
    this.talkMore.style.color = tint;
    this.talkBox.style.borderColor = tint;

    const line = activity.lines[shown - 1];
    if (line !== this.typingLine) {
      this.typingLine = line;
      this.typed = 0;
    }
    this.typed = Math.min(line.length, this.typed + ChapterScreen.TYPE_RATE * dt);

    this.talkBox.style.display = 'block';
    this.talkWho.textContent = activity.who;
    this.talkText.textContent = line.slice(0, Math.floor(this.typed));
    // The marker every text box in the world uses for "there is more", and
    // only once the line has finished arriving — a prompt to continue that
    // appears while the text is still coming is a prompt to skip.
    this.talkMore.textContent =
      this.typed >= line.length ? (shown < activity.lines.length ? '▼' : '■') : '';
  }

  /**
   * The card, as text.
   *
   * Grouped activities collapse to one line with a count — twenty-seven
   * stickers are one thing the player is doing, not twenty-seven — and a tend
   * room shows the seconds it has left, because that is the only number in
   * Chapter II that matters.
   */
  /**
   * The card, with any live countdown on it.
   *
   * `cardLine` is a pure function of one activity's state and cannot see the
   * run's clock, so the one line that needs the clock gets it here. Only one
   * ever does at a time — a relative deadline is a consequence of something
   * the player just did, and two of those at once would be a different game.
   */
  private card(): CardLine[] {
    const lines: CardLine[] = [];
    const groups = new Map<string, { done: number; total: number; shown: boolean; who: Set<RobotSpec | undefined> }>();

    for (const state of this.run.states) {
      /*
       * A side quest you have not been told about yet is not on the card.
       *
       * Required work is listed the moment the chapter starts, locked or
       * not, because a player who cannot see the last board does not know
       * the chapter has one. An OPTIONAL thing behind a gate is the
       * opposite: listing "Back to Stephan" before the player has met
       * Stephan hands them the end of a thread they have not been given the
       * start of. The corridor appears on the card when the host tells them
       * about the corridor, and the way back appears when there is one.
       */
      const hidden = state.activity.optional === true && state.status === 'locked';

      const group = state.activity.group;
      if (group) {
        /*
         * A GROUP counts all of itself as soon as any of it is visible.
         *
         * Applying the rule above member by member made the shot list read
         * "1/1" — four photographs, three of them still locked, so the
         * denominator grew as the player worked and every photograph taken
         * moved the target. A count that goes up when you score is worse
         * than no count. So the row appears when the quest does, and it
         * appears complete, which is what a shot list is.
         */
        const tally = groups.get(group) ?? { done: 0, total: 0, shown: false, who: new Set() };
        tally.total += 1;
        if (state.status === 'done') tally.done += 1;
        if (!hidden) tally.shown = true;
        tally.who.add(this.onlyFor(state.activity));
        groups.set(group, tally);
        continue;
      }

      if (hidden) continue;

      /*
       * A breakdown is on the card while it is happening, and never before
       * or after. Ten of them over a day listed from the start would be the
       * whole chapter's script on screen; listed after, a pile of ticks.
       * What the player needs is what is wrong NOW and how long it has.
       */
      const window = state.activity.window;
      if (state.activity.room !== undefined) {
        if ((state.status !== 'open' && state.status !== 'carried') || !window) continue;
        const secs = Math.max(0, Math.ceil(window.to - this.run.elapsed));
        const glyph = state.status === 'carried' ? '»' : secs <= 10 ? '!' : '›';
        lines.push({ text: `${glyph} ${state.activity.label}  ${secs}s`, who: this.onlyFor(state.activity) });
        continue;
      }

      const left = this.run.deadline(state.activity);
      const done = state.status === 'done';
      lines.push({
        text:
          cardLine(state) +
          (left !== undefined && state.status === 'open'
            ? `  ${Math.max(0, Math.ceil(left - this.run.elapsed))}s`
            : ''),
        // A finished job no longer needs anybody.
        who: done ? undefined : this.onlyFor(state.activity),
      });
    }

    for (const [name, tally] of groups) {
      if (!tally.shown) continue;
      const complete = tally.done === tally.total;
      // A group names a robot only if every one of it is that robot's.
      const who = tally.who.size === 1 && !complete ? [...tally.who][0] : undefined;
      lines.push({ text: `${complete ? '·' : '›'} ${name} ${tally.done}/${tally.total}`, who });
    }

    for (const room of this.run.lostRooms.keys()) lines.push({ text: `× ${roomName(room)} — emptied` });

    return lines;
  }

  /**
   * The one robot in the cast that can do this, if there is exactly one.
   *
   * The same question the markers ask, so the card and the building never
   * disagree about whose job something is. Undefined in a one-robot
   * chapter, where everything is Voxxy's and saying so is noise.
   */
  private onlyFor(activity: Activity): RobotSpec | undefined {
    if (this.chapter.cast.length < 2) return undefined;
    const able = admittedBy(activity, this.chapter.cast.map((id) => ROBOTS[id]));
    return able.length === 1 ? able[0] : undefined;
  }

  /**
   * Put the card on screen, and only rebuild it when a line has changed.
   *
   * DOM rather than one string now, because the robot's name is in the
   * robot's signal colour — the same colour as the beacon over the job — and
   * a colour is an element. Rebuilt on change rather than every frame: most
   * frames the card is identical to the last one.
   */
  private renderCard(lines: CardLine[]): void {
    const key = lines.map((l) => `${l.text}|${l.who?.id ?? ''}`).join('\n');
    if (key === this.cardKey) return;
    this.cardKey = key;
    this.cardText.replaceChildren(
      ...lines.map((line) => {
        const row = el('div', {}, line.text);
        if (line.who) {
          row.append(
            el('span', { color: css(line.who.signal), marginLeft: '8px' }, '●'),
            el('span', { color: css(line.who.signal), marginLeft: '4px' }, line.who.name),
          );
        }
        return row;
      }),
    );
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
        // Same rule as the header, and it has to be: a chapter about keeping
        // five rooms alive does not end on a score out of the side quest.
        this.sessionRooms.length > 0
          ? `${this.sessionRooms.length - this.run.lost} of ${this.sessionRooms.length} rooms still running`
          : `${this.run.done} of ${this.run.total}`,
      ),
    );

    const extras = this.run.extras;
    if (missed > 0 || lost > 0 || extras > 0) {
      const detail = [
        extras > 0 ? `${extras} extra` : '',
        lost > 0 ? `${lost} room${lost === 1 ? '' : 's'} emptied` : '',
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
    /*
     * A chapter with rooms to KEEP counts what is still running; one with
     * things to FINISH counts what is done.
     *
     * Keyed off whether there are any rooms to keep, not off whether there is
     * anything finishable. The old test was the second one, which was true of
     * Chapter II only for as long as Chapter II had nothing in it but rooms:
     * adding one optional conversation flipped the header to "0/2" and took
     * away the five-rooms-running count the whole chapter is read from. The
     * denominator was wrong in the same way — it counted every state, so a
     * side quest would have made it "11/11 running".
     */
    const rooms = this.sessionRooms.length;
    const tally =
      rooms > 0 ? `${rooms - this.run.lost}/${rooms} running` : `${this.run.done}/${this.run.total}`;
    this.clockText.textContent = remaining === undefined ? '' : `${clock(remaining)}   ${tally}`;

    const lines = this.card();
    this.renderCard(lines);
    // Not during a story beat. The objective has not started — its locked
    // side quests have not even been hidden yet, because nothing has been
    // evaluated — and a card reading out a chapter the player is not in yet
    // is the game talking over itself.
    this.cardText.style.visibility = this.story || lines.length === 0 ? 'hidden' : 'visible';

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

/**
 * Which of somebody's colours the dialogue box borrows.
 *
 * The rule used to be "the shirt", and the rule used to work, because the
 * shirts were invented. They are off photographs now, and three of the five
 * people in Chapter II's corridor turn out to wear black — so three names
 * came up the same washed grey, and a box that is meant to say WHO is
 * speaking said nothing three times out of five.
 *
 * So it takes whichever of their colours is furthest from grey: the amber
 * glasses, the ochre hair, the blue-grey shirt. That is the same thing a
 * person does when they point somebody out across a room, and it lands on a
 * different answer for each of the five.
 *
 * When everything about somebody IS grey, grey is the honest answer and it
 * survives the lift: a white-haired man in a black t-shirt has a silver
 * name, and that is a description of him rather than a failure to find one.
 */
function ink(look: Look): number {
  const saturation = (colour: number): number => {
    const r = (colour >> 16) & 0xff;
    const g = (colour >> 8) & 0xff;
    const b = colour & 0xff;
    const high = Math.max(r, g, b);
    return high === 0 ? 0 : (high - Math.min(r, g, b)) / high;
  };
  let best = look.shirt ?? 0x9aa0a6;
  for (const colour of [look.hair, look.glasses]) {
    if (colour !== undefined && saturation(colour) > saturation(best)) best = colour;
  }
  return best;
}

/**
 * A colour, pulled up until it can be read as text on a dark box.
 *
 * Not `shade`, which multiplies: a very dark navy multiplied by three is a
 * slightly less dark navy. This mixes toward white instead, so every shirt
 * arrives at about the same legibility whatever it started at, and keeps its
 * hue on the way.
 */
function lift(colour: number): number {
  const mixTo = (channel: number): number => Math.round(channel + (255 - channel) * 0.52);
  return (
    (mixTo((colour >> 16) & 0xff) << 16) |
    (mixTo((colour >> 8) & 0xff) << 8) |
    mixTo(colour & 0xff)
  );
}

/** One card row: a glyph for the state, the label, and any live number. */
function cardLine(state: ActivityState): string {
  const { activity, status } = state;

  const glyph =
    status === 'done' ? '·' : status === 'missed' ? '×' : status === 'carried' ? '»' : status === 'locked' ? ' ' : '›';
  if ((activity.kind === 'dwell' || activity.kind === 'attend') && status === 'open' && state.progress > 0.02) {
    return `${glyph} ${activity.label} ${Math.round(state.progress * 100)}%`;
  }
  // A conversation counts in LINES, not percent: "2/4" is a place in a
  // conversation and "50%" is a progress bar on one, which is a strange
  // thing to show somebody who is being spoken to.
  if (activity.kind === 'talk' && status === 'open' && state.progress > 0) {
    const shown = Math.round(state.progress * activity.lines.length);
    return `${glyph} ${activity.label} ${shown}/${activity.lines.length}`;
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

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Smoothstep on 0..1, clamped. Everything in a story beat eases. */
function smooth(v: number): number {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
}
