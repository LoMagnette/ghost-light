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
  type Reveal,
} from './Activity';
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
  readonly reveals: Reveal[] = [];

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
  update(dt: number, actors: Actor[], drop: boolean): void {
    if (this.phase === 'ended') return;
    this.elapsed += dt;

    this.states.forEach((state, index) => {
      this.advance(state, this.inside[index], dt, actors, drop);
    });

    this.evaluate();
  }

  private advance(
    state: ActivityState,
    inside: Set<Actor>,
    dt: number,
    actors: Actor[],
    drop: boolean,
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
        const working = here.some((actor) => actor.body.speed < STILL);
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

  private isDone(id: string): boolean {
    return this.states.some((s) => s.activity.id === id && s.status === 'done');
  }

  private complete(state: ActivityState): void {
    state.status = 'done';
    state.progress = 1;
    this.say(state.activity.label);
    if (state.activity.reveal) this.reveals.push(state.activity.reveal);
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

    const finishable = this.states.filter((s) => s.activity.kind !== 'tend');
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
