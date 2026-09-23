/**
 * The people in the building.
 *
 * `crowdDensity` has carried the emotional arc of the game on paper since the
 * first spec — 0.0 empty, 0.35 sparse, 1.0 at capacity — and until now it
 * drove nothing at all. This is what it drives.
 *
 * Two populations, and the split is the whole reason this is affordable:
 *
 *   - **Seated.** Thousands of them, and they never move. Built once, drawn
 *     as static instances parented to their storey, and costing nothing per
 *     frame. A full Room 8 is five hundred people and the same number of
 *     draw calls as an empty one.
 *   - **Movers.** A few hundred: the roamers walking the hall and the
 *     corridor, and one speaker on each stage in use. These are simulated,
 *     and they are the only ones that cost anything.
 *
 * The movers run at CROWD_HZ rather than at the physics timestep. They are
 * not rigid bodies and nothing about the game's outcome depends on them, so
 * paying 120 Hz for them would be buying precision the player cannot see. The
 * robots are unaffected by people; people get out of the way of robots. See
 * `avoid`.
 *
 * Deterministic, from a seeded generator. `src/core` had no randomness at all
 * before this file and that was worth keeping — a replay, a screenshot
 * harness and a bug report are all worth more when the building is populated
 * the same way twice.
 */

import { rectContains, type Level, type Rect, type Venue } from './Venue';
import { groundAt } from './Venue';
import type { Actor } from './Sim';
import { ISO_AZIMUTH } from './Iso';

/** Crowd steps per second. Not the physics rate, deliberately. */
export const CROWD_HZ = 20;

/**
 * How many of a dead room's audience are actually drawn walking out.
 *
 * Not all of them. Room 5 holds two hundred and fifty at this density and the
 * renderer's mover budget is four hundred for the whole building, so five
 * rooms emptying in full would be six hundred people nobody asked for. Three
 * dozen out of a door reads as a room emptying; the rest of the evidence is
 * the seats going bare behind them.
 */
const EVACUEES = 36;

/** How close a robot has to be before an attendant turns to it, metres. */
const ATTENDANT_NOTICE = 6;

/**
 * Which way somebody stands when they are waiting for you, and how far off it
 * they will turn once you arrive.
 *
 * The camera is fixed to the south-west and a face is on the FRONT of a head,
 * so an attendant who turns to track the player exactly will, half the time,
 * present the back of their skull to the only viewpoint this game has. That
 * cost nothing while a named person was a shirt and a haircut. It costs
 * everything now that the beard, the hairline and the glasses — the whole of
 * a likeness — are on the side of the head the player is not guaranteed to
 * see.
 *
 * So they face the viewer by default and turn no more than this off it. They
 * still turn towards whoever comes over, which is the one piece of body
 * language this renderer has and worth keeping; they just do it the way an
 * actor does, without ever playing the scene upstage. 75 degrees is the
 * widest angle that keeps both the beard and one lens of the glasses on
 * screen, found by photographing it rather than by reasoning about it.
 */
const TOWARDS_VIEWER = ISO_AZIMUTH + Math.PI;
const FACE_ARC = 1.31;

/** How fast an attendant walks back to its mark after being shoved, m/s. */
const POST_RETURN = 0.55;

/**
 * Roamers at full capacity, split across the storeys.
 *
 * Devoxx sells about 3200 tickets and most of them are sitting down at any
 * moment — which is what `seated` is for. This is the number on their feet:
 * the hall is 2500 m², so a couple of hundred of them is a busy trade floor
 * rather than a stadium concourse, and it is what the first pass at 130 a
 * storey visibly wanted more of.
 */
const ROAMERS_AT_CAPACITY = 440;

/** How fast a person walks, m/s, and how much that varies between people. */
const WALK_SPEED = 1.25;
const SPEED_SPREAD = 0.35;

/** Grid used to keep people out of the walls, metres. */
const CELL = 1.5;
/** Clearance a cell must have to be walkable, metres. Shoulder width. */
const PERSON_RADIUS = 0.34;

/**
 * How many people are in the building at capacity.
 *
 * Devoxx sells about this many tickets, and it is a real constraint rather
 * than a dial: filling every seat of all fourteen rooms puts 5221 people in
 * the auditoriums alone, plus everyone on their feet, which is most of a
 * second conference. `SPEC.md` §8 already holds the geometry to the printed
 * seat counts and the crowd to the modern ones — this is the same rule for
 * the population.
 *
 * Spent across the rooms in use rather than per room, so at capacity every
 * room is about two thirds full and the building holds the right number of
 * people. Which is also what a conference looks like: the rooms all have
 * somebody in them and none of them is turning people away.
 */
const ATTENDANCE = 3200;


/**
 * A person, in parts, metres.
 *
 * Three boxes rather than one, and the reason is that a single box is a
 * chocolate bar. At twenty-odd pixels tall what makes a shape read as a
 * human is almost entirely the silhouette: a head narrower than the
 * shoulders, shoulders wider than the hips, and a visible break between
 * them. Faces and arms cost geometry to say nothing at this scale; those
 * three proportions cost two extra boxes and say all of it.
 *
 * Kept here rather than in the renderer because it is a fact about a person
 * in metres, like everything else in `core/`.
 */
export const PERSON_HEIGHT = 1.72;
/** Hips, and the neck, in metres from the floor. */
export const PERSON_LEG_TOP = 0.8;
export const PERSON_NECK = 1.46;
/**
 * WIDE is side to side and THICK is front to back, and the distinction is
 * not pedantry: the two were the wrong way round to begin with, so every
 * walker in the building was turned ninety degrees and led with a shoulder.
 */
export const PERSON_SHOULDER = 0.44;
export const PERSON_TORSO_WIDE = 0.24;
export const PERSON_HIP = 0.3;
export const PERSON_THICK = 0.26;
/**
 * Arms, flush with the torso rather than proud of it.
 *
 * A real arm hangs INSIDE the shoulder width, so it barely changes the
 * outline — which is why the first attempt at them, built to stick out,
 * was invisible and got deleted. That was the wrong conclusion from the
 * right measurement: an arm at this size does not read as a silhouette, it
 * reads as TONE. Two darker strips either side of a lighter torso, all in
 * the same plane, and the body stops being one slab.
 */
export const PERSON_ARM_WIDE = 0.1;
export const PERSON_ARM_TOP = 1.3;
export const PERSON_ARM_BOTTOM = 0.86;
/**
 * The shoulders, as a rounded mass rather than a square cap.
 *
 * A flat slab across the top of the torso reads as epaulettes — a coat
 * hanger with a ball on it. Shoulders are the widest part of a person and
 * they are round, and rounding them is most of what separates a figure
 * from a post.
 */
export const PERSON_SHOULDER_BOTTOM = 1.14;
/**
 * The head, as an ellipsoid rather than a cube. Its height is the gap
 * between the neck and the top of the person, so there is only one number.
 */
export const PERSON_HEAD_WIDE = 0.21;

/**
 * How close a robot has to be before people move out of its way, metres,
 * over and above the robot's own radius.
 *
 * Scaled by speed as well, so a machine crossing the hall at three metres a
 * second opens a path ahead of itself and a parked one is walked around. That
 * bow wave is the single most valuable thing in this file: it is the only
 * place a player ever sees the crowd react to the mass they are driving.
 */
const AVOID_MARGIN = 1.1;
const AVOID_LEAD = 0.45;
/** How hard people are pushed out of the way, m/s. */
const AVOID_URGENCY = 3.2;

/**
 * How much room people give each other, metres.
 *
 * Without this they walk through one another, and because they all navigate
 * the same 1.5 m grid they converge on the same cells and stand in knots of
 * five. The knots are what read as wrong — a crowd where everybody overlaps
 * somebody is a crowd of ghosts.
 *
 * Resolved within a grid cell only, rather than against every neighbour: at
 * a couple of hundred people over a thousand cells almost every cell holds
 * nought or one, so this costs nothing, and the case it misses — two people
 * overlapping across a cell boundary — is the case nobody notices.
 */
const PERSONAL_SPACE = 0.55;

/**
 * What one named individual looks like, as against the crowd.
 *
 * The crowd is a MASS and takes one colour — that decision is defended at
 * length on `Palette.crowd` and it still holds. This is the exception it
 * always implied: somebody you can walk up to and have a conversation with
 * is not part of a mass, and five of them standing in one corridor all in
 * the same shirt is five of nobody.
 *
 * **The pixel budget, measured rather than assumed.** The first version of
 * this said a figure was twenty pixels tall and refused everything finer
 * than a shirt on that basis. It is not twenty. The camera fits 32 m across
 * 1280 px, which is 40 px/m across and — at 30 degrees of elevation — 34.6
 * px/m up, so a 1.72 m person stands 60 px tall and their head is 9 px by 8.
 * A spectacle frame is 0.035 m, which is 1.2 px: a thin dark line across a
 * nine-pixel head, and thin dark lines across heads are exactly what reads
 * at this size. Three of the levers below were cut by that bad number and
 * are back because the number was bad.
 *
 * What is still refused: anything that needs more than about a pixel to say
 * — an expression, an eye, a nose, a logo on a shirt. These are real people,
 * and a bad likeness is worse than an honest abstraction. Everything here is
 * a silhouette fact, the kind you would use to point somebody out across a
 * room: the one with the long grey hair, the one with the amber glasses.
 */
export interface Look {
  /** Torso and sleeves. Overrides the era's crowd colour entirely. */
  shirt?: number;
  /** Hair, and the beard too unless `beardHair` says otherwise. */
  hair?: number;
  /**
   * Where the hair starts. `receding` walks the cap back off the forehead;
   * `bald` takes the crown away entirely and leaves what grows at the sides,
   * which with `long` is the whole of one famous silhouette.
   */
  hairline?: 'full' | 'receding' | 'bald';
  /** Hair down past the ears to the shoulder, either side of the face. */
  long?: boolean;
  /**
   * How much beard, as a shape rather than a flag. The three are genuinely
   * different silhouettes at 9 px: stubble is a shading of the jaw, a goatee
   * is a narrow tab under the mouth, a full beard is wider than the mouth
   * and reaches the cheekbone.
   */
  beard?: 'stubble' | 'goatee' | 'full';
  /**
   * Beard colour, when it is not hair colour — which is not a detail. A man
   * with dark hair and a grey beard is a specific person, and rendering him
   * dark-bearded makes him a different one.
   */
  beardHair?: number;
  /** Frame colour. Glasses are 1.2 px and 1.2 px of frame is a face. */
  glasses?: number;
  /**
   * Multiplier on the whole figure. People differ by a head, which is 8% and
   * about five pixels — small, and the difference between five figures and
   * five of the same figure.
   */
  scale?: number;
}

export interface Person {
  x: number;
  y: number;
  /** Feet, metres above the storey datum. */
  z: number;
  floor: Level;
  /** Radians. Which way they are facing, for a renderer that cares. */
  heading: number;
  /**
   * 0..1, fixed for this person's lifetime. What they are wearing.
   *
   * A crowd is a mass and takes one palette colour — but a mass in exactly
   * one colour is a texture, not a crowd, and three thousand identical
   * figures read as packaging. This varies the lightness of each person's
   * clothing around that colour without ever leaving it, so the crowd is
   * still the era's own colour and still reads as people.
   */
  tint: number;
  /**
   * Somebody the OBJECTIVE put here, as opposed to somebody the ticket
   * allocation put here. An attendant holds its post and turns to whoever
   * comes over.
   *
   * On `Person` rather than on `Mover` because the renderer needs it and the
   * renderer is only ever handed `Person`. It is the one place the crowd's
   * "everybody is one colour" rule is broken, and it is broken on purpose —
   * see `personColours`.
   */
  posted?: boolean;
  /**
   * What this one IS, when it is not a person.
   *
   * The building has two animals living in it and they are posted the same
   * way an attendant is — stand somewhere, turn to whoever comes over, be
   * something you can walk up to. Everything about that is already here, and
   * the only thing that differs is the shape the renderer draws.
   */
  shape?: 'cat' | 'dog';
  /** Who they are, for the ones who are somebody. See `Look`. */
  look?: Look;
  /**
   * The room this person is in, for the ones who are in a room.
   *
   * Only the seated audience and the speakers carry it. Roamers belong to a
   * corridor and an attendant belongs to a post, and neither is a thing that
   * can be emptied.
   */
  room?: string;
}

/**
 * Somebody standing where an objective says a person should be.
 *
 * The conference already asks you to get a badge scanned, pick up a polo and
 * queue for the toilets, and until this existed it asked you to do all of it
 * in an empty building — twelve errands run past nobody. A post is one named
 * individual who stays put, so that walking up to a `talk` activity means
 * walking up to a PERSON.
 *
 * Placed from the chapter's own objective rather than from the venue, because
 * who is standing where is a fact about the era and not about the building.
 */
export interface Post {
  x: number;
  y: number;
  floor: Level;
  shape?: 'cat' | 'dog';
  look?: Look;
}

interface Mover extends Person {
  speed: number;
  /** Where they are walking to. */
  tx: number;
  ty: number;
  /** Last direction taken, so a walk looks purposeful rather than drunk. */
  dx: number;
  dy: number;
  /** A speaker paces its stage and never leaves it. */
  stage?: Rect;
  /** Spawned by `evacuate`, and taken away again by `reseat`. */
  left?: boolean;
  /** A speaker's stage while they are not on it. See `evacuate`. */
  wasStage?: Rect;
}

/** Walkable cells of one storey, as a set of packed grid coordinates. */
interface Floorplan {
  floor: Level;
  cells: Set<number>;
  /** Cell keys as an array, so a spawn can pick one in constant time. */
  list: number[];
}

/** Rooms people are allowed to wander, by storey. Not the auditoriums. */
const PUBLIC_ROOMS: Record<number, string[]> = {
  // The forecourt counts: the photograph this was built from is mostly
  // people walking across it towards the doors.
  0: ['hall', 'reception', 'forecourt'],
  1: ['corridor', 'foyer'],
};

export class Crowd {
  /** Everyone sitting down. Never moves after construction. */
  readonly seated: Person[] = [];
  /** Everyone on their feet. Moves; the renderer rewrites these each frame. */
  readonly movers: Person[] = [];

  private readonly venue: Venue;
  private readonly walkers: Mover[] = [];
  private readonly plans = new Map<Level, Floorplan>();
  private readonly random: () => number;
  private accumulator = 0;
  /** How many have already walked out of each room. See `evacuate`. */
  private readonly gone = new Map<string, number>();

  constructor(
    venue: Venue,
    density: number,
    activeRooms: readonly string[],
    posts: readonly Post[] = [],
    seed = 0x5eed,
  ) {
    this.venue = venue;
    this.random = mulberry32(seed);

    // Before the density gate, on purpose. An attendant is not part of the
    // crowd — they are there because the objective puts them there, and an
    // objective that says "talk to somebody" in a chapter with nobody in it
    // would otherwise be a conversation with an empty floor.
    this.placeAttendants(posts);

    if (density <= 0) return;

    for (const floor of [0, 1]) this.plans.set(floor, this.planFor(floor));

    // The people on their feet come out of the same ticket allocation as the
    // people in the seats. They are the same conference.
    const roamers = Math.round(density * ROAMERS_AT_CAPACITY);
    this.fillSeats(activeRooms, density, ATTENDANCE - roamers);
    this.placeSpeakers(activeRooms);
    this.placeRoamers(roamers);
  }

  /**
   * Advance the people. `dt` is the real frame delta.
   *
   * Runs its own accumulator at CROWD_HZ. Unlike the physics one this may
   * drop steps freely: a person who misses a tick is a person who walked a
   * little less far, which is not a thing anyone can notice or a thing any
   * outcome depends on.
   */
  advance(dt: number, actors: readonly Actor[]): void {
    if (this.walkers.length === 0) return;
    const step = 1 / CROWD_HZ;
    this.accumulator += Math.min(dt, 0.25);
    let steps = 0;
    while (this.accumulator >= step && steps < 4) {
      this.step(step, actors);
      this.accumulator -= step;
      steps += 1;
    }
  }

  private step(dt: number, actors: readonly Actor[]): void {
    this.separate();

    for (const mover of this.walkers) {
      // An attendant does not walk and is not pushed about by `avoid`: being
      // in the way is the job. All it does is turn, which is the one piece of
      // body language this renderer can express and the whole difference
      // between somebody waiting for you and a figure that happens to be
      // standing there.
      if (mover.posted) {
        this.face(mover, actors);
        // Pushed aside like anybody else, then back to the mark. Without the
        // push a robot parks INSIDE them — nothing in this game collides with
        // people, so a person who cannot be displaced is a person you stand
        // in — and without the return they are shoved out of their own
        // conversation by the first machine that arrives for it.
        this.avoid(mover, actors, dt);
        const backX = mover.tx - mover.x;
        const backY = mover.ty - mover.y;
        const away = Math.hypot(backX, backY);
        if (away > 0.04) {
          const step = Math.min(away, POST_RETURN * dt);
          mover.x += (backX / away) * step;
          mover.y += (backY / away) * step;
        }
        mover.z = groundAt(this.venue, mover.floor, mover.x, mover.y);
        continue;
      }

      const toX = mover.tx - mover.x;
      const toY = mover.ty - mover.y;
      const distance = Math.hypot(toX, toY);

      if (distance < 0.3) {
        this.retarget(mover);
      } else {
        const ux = toX / distance;
        const uy = toY / distance;
        mover.x += ux * mover.speed * dt;
        mover.y += uy * mover.speed * dt;
        mover.heading = Math.atan2(uy, ux);
      }

      this.avoid(mover, actors, dt);
      mover.z = groundAt(this.venue, mover.floor, mover.x, mover.y);
    }
  }

  /** Turn to the nearest robot on this storey, if one is close enough to be
   * talking to. Beyond that they keep whatever way they were already facing,
   * rather than snapping round to track somebody across the hall. */
  private face(mover: Mover, actors: readonly Actor[]): void {
    let best = ATTENDANT_NOTICE;
    let at: Actor | undefined;
    for (const actor of actors) {
      if (actor.floor !== mover.floor) continue;
      const d = Math.hypot(actor.body.x - mover.x, actor.body.y - mover.y);
      if (d < best) {
        best = d;
        at = actor;
      }
    }
    if (!at) return;
    const want = Math.atan2(at.body.y - mover.y, at.body.x - mover.x);
    // Turn towards them, but not past the point where the camera loses their
    // face. See FACE_ARC.
    let off = want - TOWARDS_VIEWER;
    off = Math.atan2(Math.sin(off), Math.cos(off));
    mover.heading = TOWARDS_VIEWER + Math.max(-FACE_ARC, Math.min(FACE_ARC, off));
  }

  /** Stop people standing inside each other. See PERSONAL_SPACE. */
  private separate(): void {
    const buckets = new Map<number, Mover[]>();
    for (const mover of this.walkers) {
      // A speaker has a stage to itself, and an attendant holds its post.
      if (mover.stage || mover.posted) continue;
      const key = pack(Math.floor(mover.x / CELL), Math.floor(mover.y / CELL));
      const bucket = buckets.get(key);
      if (bucket) bucket.push(mover);
      else buckets.set(key, [mover]);
    }

    for (const bucket of buckets.values()) {
      for (let i = 0; i < bucket.length; i += 1) {
        for (let j = i + 1; j < bucket.length; j += 1) {
          const a = bucket[i];
          const b = bucket[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= PERSONAL_SPACE) continue;

          // Two people who have managed to stand in exactly the same place
          // have no direction to separate along, so invent one.
          const nx = distance > 1e-4 ? dx / distance : 1;
          const ny = distance > 1e-4 ? dy / distance : 0;
          const push = (PERSONAL_SPACE - distance) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  /**
   * Step out of the way of anything heavy.
   *
   * Position is moved directly rather than a force being applied, because a
   * person is not a body in the simulation and giving them momentum would
   * mean giving them collision too. What matters is only what it looks like:
   * the crowd opens ahead of a moving robot and closes behind it.
   */
  private avoid(mover: Mover, actors: readonly Actor[], dt: number): void {
    for (const actor of actors) {
      if (actor.floor !== mover.floor) continue;
      const body = actor.body;
      const dx = mover.x - body.x;
      const dy = mover.y - body.y;
      const distance = Math.hypot(dx, dy);
      const range = body.spec.radius + AVOID_MARGIN + body.speed * AVOID_LEAD;
      if (distance >= range || distance < 1e-3) continue;

      // Hardest right next to the robot, fading to nothing at the edge of
      // its range, so nobody teleports out of the way of a distant machine.
      const urgency = (1 - distance / range) * AVOID_URGENCY * dt;
      mover.x += (dx / distance) * urgency;
      mover.y += (dy / distance) * urgency;
    }
  }

  /** Pick the next cell to walk to, preferring to keep going one way. */
  private retarget(mover: Mover): void {
    if (mover.stage) {
      // A speaker paces the stage rather than wandering the building.
      const s = mover.stage;
      mover.tx = s.x + s.w / 2;
      mover.ty = s.y + this.random() * s.h;
      mover.dx = 0;
      mover.dy = 0;
      return;
    }

    const plan = this.plans.get(mover.floor);
    if (!plan) return;

    const cx = Math.floor(mover.x / CELL);
    const cy = Math.floor(mover.y / CELL);

    let bestKey = -1;
    let bestWeight = -1;
    for (let i = 0; i < 8; i += 1) {
      const ox = NEIGHBOURS[i * 2];
      const oy = NEIGHBOURS[i * 2 + 1];
      const key = pack(cx + ox, cy + oy);
      if (!plan.cells.has(key)) continue;

      // Momentum, plus a little noise. Walking on is three times as likely as
      // turning, which is the difference between a crowd and a mosh pit.
      const alignment = ox * mover.dx + oy * mover.dy;
      const weight = (1 + alignment) ** 2 + this.random() * 1.4;
      if (weight > bestWeight) {
        bestWeight = weight;
        bestKey = key;
        mover.dx = ox;
        mover.dy = oy;
      }
    }

    if (bestKey < 0) {
      // Boxed in — usually a robot has shoved them against a wall. Fall back
      // to any cell at all rather than freezing on the spot forever.
      bestKey = plan.list[Math.floor(this.random() * plan.list.length)];
      mover.dx = 0;
      mover.dy = 0;
    }

    const [gx, gy] = unpack(bestKey);
    mover.tx = (gx + 0.5) * CELL;
    mover.ty = (gy + 0.5) * CELL;
  }

  // -- construction ---------------------------------------------------------

  /** Every cell of a storey a person could stand in. */
  private planFor(floor: Level): Floorplan {
    const cells = new Set<number>();
    const solids = this.venue.obstacles.filter((o) => o.floor === floor && o.height > 0.3);
    const rooms = this.venue.rooms.filter(
      (r) => r.floor === floor && (PUBLIC_ROOMS[floor] ?? []).includes(r.id),
    );

    for (const room of rooms) {
      const b = room.bounds;
      const x0 = Math.ceil(b.x / CELL);
      const x1 = Math.floor((b.x + b.w) / CELL);
      const y0 = Math.ceil(b.y / CELL);
      const y1 = Math.floor((b.y + b.h) / CELL);

      for (let gx = x0; gx < x1; gx += 1) {
        for (let gy = y0; gy < y1; gy += 1) {
          const x = (gx + 0.5) * CELL;
          const y = (gy + 0.5) * CELL;
          if (!rectContains(b, x, y)) continue;
          if (solids.some((o) => overlaps(o.bounds, x, y, PERSON_RADIUS + 0.2))) continue;
          cells.add(pack(gx, gy));
        }
      }
    }

    return { floor, cells, list: [...cells] };
  }

  /**
   * Put people in the seats of the rooms that are in use.
   *
   * Read off the seating the venue already has, one per seat, so a room fills
   * the way it was surveyed rather than the way anyone imagines it. At
   * density 1.0 that is every seat in every active room, which for Chapter III
   * is the shot the whole game has been building towards.
   */
  private fillSeats(activeRooms: readonly string[], density: number, budget: number): void {
    const rooms = this.venue.rooms.filter((r) => activeRooms.includes(r.id));
    if (rooms.length === 0) return;

    const seats = this.venue.decor.filter((piece) => {
      if (piece.material !== 'seat') return false;
      const x = piece.bounds.x + piece.bounds.w / 2;
      const y = piece.bounds.y + piece.bounds.h / 2;
      return rooms.some((r) => r.floor === piece.floor && rectContains(r.bounds, x, y));
    });

    // Whichever bites first: how full the era is, or how many tickets exist.
    const occupancy = Math.min(density, seats.length > 0 ? budget / seats.length : 0);

    for (const piece of seats) {
      const x = piece.bounds.x + piece.bounds.w / 2;
      const y = piece.bounds.y + piece.bounds.h / 2;
      const room = rooms.find((r) => r.floor === piece.floor && rectContains(r.bounds, x, y));
      if (!room) continue;
      // Thinned rather than filled from the front: a room at a third full is
      // a scattered room, not three solid blocks and an empty back.
      if (this.random() > occupancy) continue;

      this.seated.push({
        room: room.id,
        x,
        y,
        // ON the pan: the seat states where its own surface is, so the
        // height a person sits at is read off the furniture rather than
        // assumed from the tier under it.
        z: piece.height,
        floor: piece.floor,
        tint: this.random(),
        // Facing the stage, which is at the far end of the room from the
        // corridor — so west-side rooms look west and east-side rooms east.
        heading: room.bounds.x < 0 ? Math.PI : 0,
      });
    }
  }

  /**
   * A session is losing its audience. Put `wanted` of them in the corridor.
   *
   * Topped up rather than fired once, because people do not all leave when
   * the room finally dies — they leave while it is dying, which is the whole
   * point of it being a signal. Ask for a total and it spawns the difference.
   *
   *
   * The seats emptying is the renderer's half of this — see `emptySeats` —
   * and on its own it is people DISAPPEARING, which is not what
   * `docs/MECHANICS.md` §5.2 asks for. This is the half you actually watch:
   * a stream of people out of the door and away down the corridor, which is
   * also the only consequence of losing a room that the player has to drive
   * around afterwards.
   *
   * They are spawned at the DOOR rather than at their seats, and that is the
   * cheap trick that makes this affordable. Standing them up in the seating
   * would mean matching each mover to the seated instance being hidden, in
   * the renderer's departure order, across a module boundary `src/core` is
   * not allowed to see. Coming out of the doorway they have already stood up,
   * and nobody can count them against a room that is dark by then anyway.
   *
   * Capped, because two hundred and fifty new movers is most of the
   * renderer's budget for one room and there are five of them.
   */
  evacuate(roomId: string, wanted: number): void {
    const already = this.gone.get(roomId) ?? 0;
    const leaving = Math.min(EVACUEES, Math.round(wanted)) - already;
    if (leaving <= 0) return;
    this.gone.set(roomId, already + leaving);

    const room = this.venue.rooms.find((r) => r.id === roomId);
    if (!room) return;

    // The speaker stops being a speaker. A stage nobody is watching is not a
    // stage, and one still being paced in a dark room is a ghost.
    for (const mover of this.walkers) {
      if (mover.room !== roomId || !mover.stage) continue;
      // Kept rather than dropped: `R` restarts the round and the session has
      // to be able to be running again.
      mover.wasStage = mover.stage;
      mover.stage = undefined;
    }

    // The corridor side of the room, which is the end nearer the building's
    // centre line — same reading `backOfHouse` makes in `objectives.ts`.
    const b = room.bounds;
    const inward = b.x < 0 ? -1 : 1;
    const door = b.x < 0 ? b.x + b.w : b.x;

    const corridor = this.venue.rooms.find(
      (r) => r.floor === room.floor && r.kind === 'corridor',
    );

    for (let i = 0; i < leaving; i += 1) {
      const x = door - inward * (0.6 + this.random() * 1.8);
      const y = b.y + (0.15 + this.random() * 0.7) * b.h;
      const mover: Mover = {
        x,
        y,
        z: groundAt(this.venue, room.floor, x, y),
        floor: room.floor,
        heading: inward > 0 ? Math.PI : 0,
        tint: this.random(),
        speed: WALK_SPEED + (this.random() - 0.5) * SPEED_SPREAD,
        // Out into the corridor first. After that `retarget` takes over and
        // they are ordinary roamers, which is what somebody who has just left
        // a talk is.
        tx: corridor ? corridor.bounds.x + this.random() * corridor.bounds.w : x - inward * 8,
        ty: y + (this.random() - 0.5) * 6,
        dx: 0,
        dy: 0,
        left: true,
      };
      this.walkers.push(mover);
      this.movers.push(mover);
    }
  }

  /**
   * Put everybody back where the round started. Called on restart.
   *
   * The renderer refills the seats it emptied; this undoes the other half.
   * Without it `R` is a slow leak — every restart leaves the last round's
   * leavers wandering the corridor, and five rooms times a few restarts is
   * the mover budget gone on an audience that is no longer at the
   * conference.
   */
  reseat(): void {
    this.gone.clear();
    for (let i = this.walkers.length - 1; i >= 0; i -= 1) {
      const mover = this.walkers[i];
      if (mover.left) {
        this.walkers.splice(i, 1);
        const at = this.movers.indexOf(mover);
        if (at >= 0) this.movers.splice(at, 1);
        continue;
      }
      if (mover.wasStage) {
        mover.stage = mover.wasStage;
        mover.wasStage = undefined;
        mover.x = mover.stage.x + mover.stage.w / 2;
        mover.y = mover.stage.y + mover.stage.h / 2;
        this.retarget(mover);
      }
    }
  }

  /** One person at each post, facing the viewer until somebody comes over. */
  private placeAttendants(posts: readonly Post[]): void {
    for (const post of posts) {
      const mover: Mover = {
        x: post.x,
        y: post.y,
        z: groundAt(this.venue, post.floor, post.x, post.y),
        floor: post.floor,
        heading: TOWARDS_VIEWER,
        tint: this.random(),
        speed: 0,
        tx: post.x,
        ty: post.y,
        dx: 0,
        dy: 0,
        posted: true,
        shape: post.shape,
        look: post.look,
      };
      this.walkers.push(mover);
      this.movers.push(mover);
    }
  }

  /** One speaker on the stage of every room in use. */
  private placeSpeakers(activeRooms: readonly string[]): void {
    for (const id of activeRooms) {
      const stage = this.venue.rooms.find((r) => r.id === `${id}-stage`);
      if (!stage) continue;
      const b = stage.bounds;
      const mover: Mover = {
        // The stage is `<room>-stage`; the speaker belongs to the room, so
        // that when the room empties they walk off with everybody else.
        room: id,
        x: b.x + b.w / 2,
        y: b.y + b.h / 2,
        z: stage.elevation ?? 0,
        floor: stage.floor,
        heading: 0,
        tint: this.random(),
        // Slower than a walk. They are talking, not going anywhere.
        speed: 0.42,
        tx: b.x + b.w / 2,
        ty: b.y + b.h / 2,
        dx: 0,
        dy: 0,
        stage: b,
      };
      this.retarget(mover);
      this.walkers.push(mover);
      this.movers.push(mover);
    }
  }

  private placeRoamers(total: number): void {
    // Weighted to the storey with more public floor on it. The hall is one
    // big room and the corridor is 126 m long, so this is close to even.
    for (let i = 0; i < total; i += 1) {
      const floor = i % 2;
      const plan = this.plans.get(floor);
      if (!plan || plan.list.length === 0) continue;

      const key = plan.list[Math.floor(this.random() * plan.list.length)];
      const [gx, gy] = unpack(key);
      const x = (gx + 0.5) * CELL;
      const y = (gy + 0.5) * CELL;

      const mover: Mover = {
        x,
        y,
        z: groundAt(this.venue, floor, x, y),
        floor,
        heading: this.random() * Math.PI * 2,
        tint: this.random(),
        speed: WALK_SPEED + (this.random() - 0.5) * SPEED_SPREAD,
        tx: x,
        ty: y,
        dx: 0,
        dy: 0,
      };
      this.retarget(mover);
      this.walkers.push(mover);
      this.movers.push(mover);
    }
  }
}

/**
 * Sitting down, measured up from the pan — and it is an L, not a post.
 *
 * The first version stood a torso on the seat, and it read as a pillar
 * planted in front of the chair: no lap, no knees, and perched on the front
 * edge because it was centred on the pan. What says "sitting" is the
 * horizontal run of the thighs forward of a torso pushed back against the
 * rest, with head and shoulders showing over the seat back in front.
 */
export const SEATED_PERSON_HEIGHT = 0.86;
/** The lap: how far forward the thighs run, and how thick they are. */
export const SEATED_THIGH_LONG = 0.36;
export const SEATED_THIGH_HIGH = 0.16;
/** The torso, pushed back against the rest. */
export const SEATED_TORSO_TOP = 0.6;
export const SEATED_TORSO_THICK = 0.24;
export const SEATED_SHOULDER = 0.42;
/** Seated arms and shoulders, measured up from the pan like everything else. */
export const SEATED_TORSO_WIDE = 0.23;
export const SEATED_ARM_WIDE = 0.09;
export const SEATED_ARM_BOTTOM = 0.16;
export const SEATED_ARM_TOP = 0.5;
export const SEATED_SHOULDER_BOTTOM = 0.42;
/** Spine behind the pan's centre, lap forward of it. */
export const SEATED_SPINE_BACK = 0.07;
export const SEATED_LAP_FORWARD = 0.15;

const NEIGHBOURS = [1, 0, -1, 0, 0, 1, 0, -1, 1, 1, 1, -1, -1, 1, -1, -1];

/** Grid coordinates into one number. Offset so negatives pack cleanly. */
function pack(gx: number, gy: number): number {
  return (gx + 512) * 4096 + (gy + 512);
}

function unpack(key: number): [number, number] {
  return [Math.floor(key / 4096) - 512, (key % 4096) - 512];
}

function overlaps(r: Rect, x: number, y: number, radius: number): boolean {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return Math.hypot(x - cx, y - cy) < radius;
}

/**
 * A small, fast, seeded generator. Not cryptographic and does not need to be;
 * what it needs to be is the same every time the game is opened.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
