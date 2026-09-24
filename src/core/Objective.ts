/**
 * Running an objective: the state machine behind the card.
 *
 * `Activity.ts` says what a thing IS; this advances it against the
 * simulation, one fixed frame at a time. It is the only place that decides
 * that something has been done, missed, lost or won, which is why all three
 * chapters can be data.
 *
 * It reads actors and it writes exactly one thing back into the simulation:
 * `Body.payload`, when something is picked up or put down. That is the entire
 * coupling, and it is deliberate — a robot carrying a keg is not a robot in a
 * special state, it is a heavier robot.
 */

import {
  admits,
  inZone,
  zoneCentre,
  type Activity,
  type Photo,
  type Reveal,
} from './Activity';
import type { RobotId } from './RobotSpec';
import type { Actor } from './Sim';
import type { Level } from './Venue';

/**
 * What a chapter is trying to make the player do.
 *
 * One of the four things a chapter may change (see `Chapter.ts`), which is
 * why it is a structure rather than the sentence it used to be. The sentence
 * survives as `line`.
 */
export interface Objective {
  /** The one line in the HUD. Readable in a glance, or it is too long. */
  line: string;
  activities: Activity[];
  /** Seconds. Absent for an untimed round — Chapter I has no clock. */
  clock?: number;
  /**
   * Lose when this many activities have failed. Absent means the round
   * cannot be lost, only scored.
   */
  failLimit?: number;
  /**
   * Where winning takes you, if not to the end card.
   *
   * On the objective and not on the chapter for the same reason `reveal`
   * is on an activity: what finishing DOES is part of what the chapter asks
   * of you, and the objective is one of the four things a chapter may
   * change. A chapter that grew a `next` field would be a fifth.
   */
  exit?: Exit;
  /**
   * What happens before the objective starts running. The other half of an
   * `exit`: whatever one chapter sends through, the next one receives.
   */
  arrival?: Arrival;
}

/**
 * Leaving a chapter through the building rather than through a menu.
 *
 * Only a wormhole so far, and only one: Chapter I's last board powers Room
 * 8, and the power opens something under the robot that powered it. The
 * shape is a union so that a second way out does not have to be a flag.
 */
export interface Exit {
  kind: 'wormhole';
  /** The chapter on the far side, by id. `npm run objectives` checks it. */
  to: string;
}

/**
 * Arriving in a chapter: one robot in, and one more of it than went in.
 *
 * The cast grows by a robot a chapter, and until this it simply WAS bigger
 * when the next chapter loaded. `split` makes the new robot a consequence
 * rather than a casting decision: the wormhole pulls one machine through
 * and something in it comes out the other side as a body of its own.
 */
export interface Arrival {
  kind: 'split';
  /** The robot that comes through. Must be in the chapter's cast. */
  from: RobotId;
  /** The robot that comes out of it. Must be in the cast too. */
  into: RobotId;
  /** Said once they are both standing, one box at a time. */
  lines: { who: RobotId; text: string }[];
}

export type Status = 'locked' | 'open' | 'carried' | 'done' | 'missed' | 'failed';

export interface ActivityState {
  activity: Activity;
  status: Status;
  /**
   * Dwell and attend: 0..1 towards completion.
   * Tend: SECONDS of session left, which is why the field is not a fraction.
   */
  progress: number;
  /** Haul only: who has it. */
  carrier?: Actor;
  /** Chapter seconds at which this was completed. See `Activity.within`. */
  doneAt?: number;
  /** Where the thing is right now. Haul items move; everything else does not. */
  x: number;
  y: number;
  floor: Level;
}

/** Something the HUD should say once, briefly. */
export interface ObjectiveEvent {
  text: string;
  /** Chapter seconds at which it happened. */
  at: number;
}

/** How close you have to be to pick a thing up, metres. */
const PICKUP_RANGE = 1.4;

/** Slow enough to count as standing still, m/s. */
const STILL = 0.25;

/**
 * Slow enough to put something down safely, m/s.
 *
 * This is the number that makes a delivery a braking problem rather than a
 * navigation one: an unladen robot is under it almost immediately, and Biggy
 * carrying 200 kg needs about six metres of warning. Same rule for everybody,
 * wildly different consequences — which is the whole cast in one constant.
 */
const DROP_SPEED = 0.5;

export class ObjectiveRun {
  readonly objective: Objective;
  readonly states: ActivityState[];

  /** Seconds of chapter clock elapsed. */
  elapsed = 0;

  phase: 'running' | 'ended' = 'running';
  /** True when the round ended badly rather than merely ending. */
  failed = false;

  /** Consumed and cleared by the screen each frame. */
  readonly events: ObjectiveEvent[] = [];
  /** Zones to light, pushed as they are earned. Consumed by the renderer. */
  /**
   * Zones to light, drained by the screen each frame.
   *
   * Carries the id of the activity that asked, because the renderer keys its
   * light rigs by it — see `lightZone`. Without it two boards lighting the
   * same room would build two rigs, and a room whose light is DRIVEN rather
   * than switched would build one a frame.
   */
  readonly reveals: (Reveal & { id: string })[] = [];
  /**
   * Photographs taken, drained by the screen each frame.
   *
   * A queue rather than a flag, because the screen shows one print at a time
   * and the core has no business knowing that. If a player ever manages to
   * finish two photographs in one frame the screen can decide what to do
   * with the second; dropping it here would be the core deciding.
   */
  readonly photos: Photo[] = [];

  constructor(objective: Objective) {
    this.objective = objective;
    this.states = objective.activities.map((activity) => {
      const centre = zoneCentre(activity.at);
      return {
        activity,
        status: 'open' as Status,
        progress: activity.kind === 'tend' ? activity.capacity : 0,
        x: centre.x,
        y: centre.y,
        floor: activity.at.floor,
      };
    });
    // Tracks which actors were inside a tend zone last frame, so a tap fires
    // on ARRIVAL rather than continuously — otherwise parking on the rack
    // holds a room open for ever and Droid never has to come.
    this.inside = this.states.map(() => new Set<Actor>());
  }

  private readonly inside: Set<Actor>[];

  /**
   * Counted the way the player counts them: a GROUP is one thing.
   *
   * Twenty-seven stickers are one line on the card and one thing you either
   * did or did not do at the conference, so a counter reading "0/38" is
   * describing the data structure rather than the day. Tend rooms are not
   * counted at all — they cannot be finished, only kept.
   */
  private tally(): { done: number; total: number } {
    const groups = new Map<string, boolean>();
    let done = 0;
    let total = 0;

    for (const state of this.states) {
      if (state.activity.kind === 'tend') continue;
      const group = state.activity.group;
      if (group === undefined) {
        total += 1;
        if (state.status === 'done') done += 1;
        continue;
      }
      // A group is complete only when all of it is.
      const sofar = groups.get(group);
      groups.set(group, (sofar ?? true) && state.status === 'done');
    }

    for (const complete of groups.values()) {
      total += 1;
      if (complete) done += 1;
    }

    return { done, total };
  }

  get done(): number {
    return this.tally().done;
  }

  get total(): number {
    return this.tally().total;
  }

  get lost(): number {
    return this.states.filter((s) => s.status === 'failed').length;
  }

  /** Seconds left, or undefined on an untimed round. */
  get remaining(): number | undefined {
    return this.objective.clock === undefined
      ? undefined
      : Math.max(0, this.objective.clock - this.elapsed);
  }

  /**
   * Advance one rendered frame.
   *
   * `drop` is an edge, not a state: true only on the frame the player asked
   * to put something down.
   */
  /**
   * @param drop the SPACE key, this frame only. See `dropRequested`.
   * @param talk the talk key, this frame only, for the same reason: a held
   *   key would page through a whole conversation in a fifth of a second.
   */
  update(dt: number, actors: Actor[], drop: boolean, talk = false): void {
    if (this.phase === 'ended') return;
    this.elapsed += dt;

    this.states.forEach((state, index) => {
      this.advance(state, this.inside[index], dt, actors, drop, talk);
    });

    this.evaluate();
  }

  private advance(
    state: ActivityState,
    inside: Set<Actor>,
    dt: number,
    actors: Actor[],
    drop: boolean,
    talk: boolean,
  ): void {
    const a = state.activity;
    if (state.status === 'done' || state.status === 'missed' || state.status === 'failed') return;

    // Prerequisites. Freeing the shutter is what opens the loading bay.
    if (a.after?.some((id) => !this.isDone(id))) {
      state.status = 'locked';
      return;
    }

    // The window, which is the only thing in here that can take an activity
    // away from the player rather than give it to them.
    if (a.window) {
      if (this.elapsed < a.window.from) {
        state.status = 'locked';
        return;
      }
      if (this.elapsed > a.window.to) {
        state.status = 'missed';
        this.say(`Missed: ${a.label}`);
        return;
      }
    }

    // A relative deadline: so many seconds from whatever unlocked this. It is
    // checked AFTER `after`, because it is counted from when the last of them
    // finished and before that there is nothing to count from.
    if (a.within !== undefined && this.deadline(a) !== undefined) {
      const deadline = this.deadline(a) as number;
      if (this.elapsed > deadline) {
        state.status = 'missed';
        this.say(`Too late: ${a.label}`);
        return;
      }
    }

    if (state.status === 'locked') state.status = 'open';

    const here = actors.filter(
      (actor) =>
        admits(a, actor.body.spec) && inZone(a.at, actor.floor, actor.body.x, actor.body.y),
    );

    switch (a.kind) {
      case 'tap': {
        if (here.length > 0) this.complete(state);
        return;
      }

      case 'shove': {
        if (here.some((actor) => actor.body.momentum >= a.momentum)) this.complete(state);
        return;
      }

      case 'dwell': {
        /*
         * `everybody` wants the WHOLE cast, which is a different question
         * from the usual one and has to be asked against `actors` rather
         * than against `here`: `here` is already filtered to whoever the
         * gates admit, so asking it whether everyone is present is asking
         * whether everyone who turned up turned up.
         */
        const working = a.everybody
          ? actors.length > 0 &&
            actors.every(
              (actor) =>
                inZone(a.at, actor.floor, actor.body.x, actor.body.y) && actor.body.speed < STILL,
            )
          : here.some((actor) => actor.body.speed < STILL);
        // Decays when abandoned rather than resetting: leaving costs you the
        // time you spent, which is a cost, not a punishment.
        state.progress += (working ? dt : -dt) / a.seconds;
        if (state.progress >= 1) this.complete(state);
        else if (state.progress < 0) state.progress = 0;
        return;
      }

      case 'attend': {
        if (here.length > 0) {
          state.progress += dt / a.seconds;
          if (state.progress >= 1) this.complete(state);
        }
        return;
      }

      case 'haul': {
        this.advanceHaul(state, a, actors, drop);
        return;
      }

      case 'tend': {
        this.advanceTend(state, a, inside, dt, actors);
        return;
      }

      /*
       * A conversation, paged.
       *
       * `progress` is the fraction of the lines that have been SHOWN, so the
       * screen can ask which box to draw without keeping a cursor of its own
       * and drifting out of step with the thing that decides when this is
       * finished. One press shows the next line; the press after the last one
       * closes it and completes.
       *
       * Walking away resets it to the top rather than leaving it half read.
       * That is not a punishment — it is what makes the second robot able to
       * hear the whole thing, and it means a conversation is never left in a
       * state that depends on where somebody was four minutes ago.
       */
      case 'talk': {
        if (here.length === 0) {
          state.progress = 0;
          return;
        }
        if (!talk) return;
        const shown = Math.round(state.progress * a.lines.length);
        if (shown >= a.lines.length) {
          this.complete(state);
          return;
        }
        state.progress = (shown + 1) / a.lines.length;
        return;
      }
    }
  }

  private advanceHaul(
    state: ActivityState,
    a: Extract<Activity, { kind: 'haul' }>,
    actors: Actor[],
    drop: boolean,
  ): void {
    const carrier = state.carrier;

    if (!carrier) {
      // Pick up: close enough, able to lift it, and not already full.
      const taker = actors.find(
        (actor) =>
          admits(a, actor.body.spec) &&
          actor.floor === state.floor &&
          Math.hypot(actor.body.x - state.x, actor.body.y - state.y) <= PICKUP_RANGE &&
          actor.body.payload === 0,
      );
      if (taker) {
        taker.body.payload += a.mass;
        state.carrier = taker;
        state.status = 'carried';
        this.say(`${taker.body.spec.name} has the ${a.label.toLowerCase()} — ${a.mass} kg`);
      }
      return;
    }

    // Carried: the thing is wherever the robot is.
    state.x = carrier.body.x;
    state.y = carrier.body.y;
    state.floor = carrier.floor;

    const atDrop = inZone(a.to, carrier.floor, carrier.body.x, carrier.body.y);
    if (atDrop && carrier.body.speed < DROP_SPEED) {
      carrier.body.payload -= a.mass;
      state.carrier = undefined;
      const centre = zoneCentre(a.to);
      state.x = centre.x;
      state.y = centre.y;
      state.floor = a.to.floor;
      this.complete(state);
      return;
    }

    if (a.fragile && carrier.body.lastImpactSpeed > 1.2) {
      carrier.body.payload -= a.mass;
      state.carrier = undefined;
      state.status = 'open';
      this.say(`Spilled the ${a.label.toLowerCase()}`);
      return;
    }

    if (drop) {
      carrier.body.payload -= a.mass;
      state.carrier = undefined;
      state.status = 'open';
      this.say(`Put the ${a.label.toLowerCase()} down`);
    }
  }

  private advanceTend(
    state: ActivityState,
    a: Extract<Activity, { kind: 'tend' }>,
    inside: Set<Actor>,
    dt: number,
    actors: Actor[],
  ): void {
    // The day gets harder on its own. Linear, so it is readable from the
    // numbers rather than needing a curve to be tuned by feel.
    const drain = a.drain + a.drainRamp * this.elapsed;
    state.progress -= drain * dt;

    for (const actor of actors) {
      const within = inZone(a.at, actor.floor, actor.body.x, actor.body.y);
      const was = inside.has(actor);

      // Arriving buys time. Anyone can do it; only Voxxy can do it often
      // enough to matter, because only Voxxy can be somewhere else by now.
      if (within && !was) {
        state.progress = Math.min(a.capacity, state.progress + a.tapBonus);
        this.say(`${a.label}: +${a.tapBonus}s`);
      }

      // Standing still at the projector fixes it properly — and the projector
      // is 2 m up, which is the one thing Voxxy cannot do.
      if (within && actor.body.spec.height >= a.repairReach && actor.body.speed < STILL) {
        state.progress = Math.min(a.capacity, state.progress + (a.capacity / a.repairSeconds) * dt);
      }

      if (within) inside.add(actor);
      else inside.delete(actor);
    }

    if (state.progress <= 0) {
      state.progress = 0;
      state.status = 'failed';
      this.say(`${a.label} went dark`);
    }
  }

  /**
   * When an activity with a relative deadline runs out, in chapter seconds.
   *
   * The LAST of its prerequisites to finish starts the clock, which is the
   * only reading that makes sense when there is more than one: the deadline
   * cannot start before the thing it is a consequence of.
   */
  deadline(a: Activity): number | undefined {
    if (a.within === undefined || !a.after?.length) return undefined;
    let started = -Infinity;
    for (const id of a.after) {
      const at = this.states.find((s) => s.activity.id === id)?.doneAt;
      if (at === undefined) return undefined;
      started = Math.max(started, at);
    }
    return started + a.within;
  }

  private isDone(id: string): boolean {
    return this.states.some((s) => s.activity.id === id && s.status === 'done');
  }

  private complete(state: ActivityState): void {
    state.status = 'done';
    state.doneAt = this.elapsed;
    state.progress = 1;
    this.say(state.activity.label);
    if (state.activity.reveal) this.reveals.push({ ...state.activity.reveal, id: state.activity.id });
    if (state.activity.photo) this.photos.push(state.activity.photo);
  }

  private say(text: string): void {
    this.events.push({ text, at: this.elapsed });
  }

  /**
   * Has the round finished, and how?
   *
   * Three chapters, one rule set: you lose by losing too many things, you win
   * early by finishing everything there is to finish, and otherwise the clock
   * decides. Chapter I has no clock and no tend rooms, so only the middle
   * clause can fire; Chapter II has only tend rooms, so only the first and
   * last can.
   */
  private evaluate(): void {
    const { failLimit, clock } = this.objective;

    if (failLimit !== undefined && this.lost >= failLimit) {
      this.phase = 'ended';
      this.failed = true;
      return;
    }

    // A tend room never finishes and a side quest does not have to, so
    // neither is evidence that the round is over.
    const finishable = this.states.filter(
      (s) => s.activity.kind !== 'tend' && !s.activity.optional,
    );
    const settled = finishable.filter((s) => s.status === 'done' || s.status === 'missed');
    if (finishable.length > 0 && settled.length === finishable.length) {
      this.phase = 'ended';
      return;
    }

    if (clock !== undefined && this.elapsed >= clock) {
      this.phase = 'ended';
    }
  }
}
