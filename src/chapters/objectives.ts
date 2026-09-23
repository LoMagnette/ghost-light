/**
 * The three chapters' objectives, as data.
 *
 * Written in the vocabulary of `core/Activity.ts` and nothing else: no
 * chapter ships logic, and the only thing that varies between the three is
 * which activities are placed where. `docs/MECHANICS.md` §5 is the design
 * this implements, section by section.
 *
 * Positions are read OUT OF THE BUILDING wherever a room already says where
 * something is. A second copy of the venue's coordinates in here would be a
 * second thing to keep true, and the first one to drift.
 */

import type { Activity, Zone } from '@/core/Activity';
import type { Objective } from '@/core/Objective';
import { CROSS_AISLE, KINEPOLIS, RECEPTION_DESK } from '@/venue/kinepolis';
import { rect, type Level, type Rect } from '@/core/Venue';

/** A small square zone around a point. The usual shape of a thing to touch. */
function spot(floor: Level, x: number, y: number, size = 2.2): Zone {
  return { floor, bounds: rect(x - size / 2, y - size / 2, size, size) };
}

/** A room, as a zone — inset so the doorway itself does not count as inside. */
function roomZone(id: string, inset = 1.0): Zone {
  const room = KINEPOLIS.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`objective references a room that is not in the venue: ${id}`);
  const b = room.bounds;
  return {
    floor: room.floor,
    bounds: rect(b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2),
  };
}

/**
 * The cross aisle behind the back row, full width — the only floor in an
 * auditorium a robot can actually occupy.
 *
 * Being "in the room" has to mean standing somewhere the room lets you stand.
 * The rest of an auditorium is seating, which is one solid block per bank,
 * and the stage is four metres down a rake. So attending a talk means being
 * in the aisle you came in along, which is also where a person stands when
 * the room is full — the correct answer and the possible one, for once.
 */
function crossAisle(id: string): Zone {
  const room = KINEPOLIS.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`no such room: ${id}`);
  const b = room.bounds;
  const x = b.x < 0 ? b.x + b.w - CROSS_AISLE : b.x;
  return {
    floor: room.floor,
    bounds: rect(x, b.y + 1.0, CROSS_AISLE, b.h - 2.0),
  };
}

/** The cross aisle behind the back row, where an auditorium's kit lives. */
function backOfHouse(id: string): Zone {
  const room = KINEPOLIS.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`no such room: ${id}`);
  const b = room.bounds;
  // Rooms are entered from the corridor, which runs down the middle of the
  // building at x = 0 — so the corridor side of a room is whichever end of it
  // is nearer the centre line, and that is where you come in and where the
  // rack stands.
  const x = b.x < 0 ? b.x + b.w - CROSS_AISLE / 2 : b.x + CROSS_AISLE / 2;
  // Narrower than the aisle it stands in, or the zone reaches into the back
  // row and the marker ends up planted in the seating.
  return spot(room.floor, x, b.y + b.h / 2, CROSS_AISLE - 0.6);
}

const roomBounds = (id: string): { floor: Level; bounds: Rect } => {
  const room = KINEPOLIS.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`no such room: ${id}`);
  return { floor: room.floor, bounds: room.bounds };
};

// ---------------------------------------------------------------------------
// Chapter I — three boards, and the light spreads
// ---------------------------------------------------------------------------

/**
 * `docs/MECHANICS.md` §5.1.
 *
 * No clock and no failure: it is a tutorial and a mood piece, and the reward
 * for each board is that you can see more of the building than you could a
 * minute ago. The third is gated behind the other two so that the route is
 * the route — hall, concourse, upstairs — rather than a sprint to the stage
 * by a player who happened to guess right.
 */
const SILENCE: Activity[] = [
  {
    kind: 'tap',
    id: 'board-hall',
    label: 'Hall board',
    at: spot(0, -21.8, -8.0, 2.6),
    reveal: { ...roomBounds('hall'), to: 0.42 },
  },
  {
    kind: 'tap',
    id: 'board-concourse',
    label: 'Concourse board',
    at: spot(0, -11.0, -50.0, 2.6),
    reveal: { ...roomBounds('reception'), to: 0.5 },
  },
  /*
   * The two things still living here.
   *
   * `SPEC.md` §4 has Chapter I as an EMPTY building and the tagline is
   * "something is still walking the building" — which until now was a
   * promise nothing in the build kept. Two animals keep it, and they keep it
   * better than a light on a path would: an empty building with a cat in it
   * is stranger than an empty building, and a dog that has been asleep in a
   * dark exhibition hall for years is the whole chapter in one object.
   *
   * They are `talk` activities and nothing else. Everything a registration
   * desk uses — a post, a marker, a box of dialogue, a reach gate if it
   * wanted one — works unchanged on an animal; all that differs is `shape`,
   * which is what the renderer draws when it gets there.
   */
  {
    kind: 'talk',
    id: 'cat',
    label: 'The cat',
    who: 'The cat',
    shape: 'cat',
    // In the concourse, out in the open east of the reception island. Early
    // enough on the route that a player meets it before they know the
    // building, which is when a talking cat is at its most unsettling.
    at: spot(0, 2.5, -44.5, 3.0),
    lines: [
      'Do not run. I have been sitting on this a very long time and the mechanism is old.',
      'Every deck has one card in it that ends the game. In this building, that card is me.',
      'You have forty-five seconds. There is exactly one thing in here that defuses me.',
      'It has four legs and a beard, and it is not fond of me. Go.',
    ],
  },
  {
    kind: 'talk',
    id: 'dog',
    label: 'Find the dog',
    who: 'The dog',
    shape: 'dog',
    // Deep enough into the hall that the timer pulls the player NORTH, which
    // is the direction the chapter wants them going anyway — and across the
    // threshold terrace, so the level change is learned under pressure.
    at: spot(0, -16.0, -18.0, 3.2),
    after: ['cat'],
    lines: [
      'It is enormous, and it has been asleep. It opens one eye.',
      'Somewhere back in the concourse, something stops ticking.',
      'It goes back to sleep.',
    ],
  },
  {
    kind: 'tap',
    id: 'board-stage',
    label: 'Room 8 amplifier rack',
    // On the stage plate, 4.14 m below the corridor you came in from. The
    // only way down is the rake, which is a real staircase of 0.18 m risers —
    // so this last board is also the only part of Chapter I that tests
    // whether you can slow a robot down on a slope.
    at: spot(1, 35.3, -31.0, 2.6),
    after: ['board-hall', 'board-concourse'],
    reveal: { ...roomBounds('aud-8'), to: 0.62 },
  },
];

export const SILENCE_OBJECTIVE: Objective = {
  line: 'Find the power',
  activities: SILENCE,
};

// ---------------------------------------------------------------------------
// Chapter II — five rooms, draining
// ---------------------------------------------------------------------------

/**
 * `docs/MECHANICS.md` §5.2.
 *
 * The west side of the corridor, which is what "half the floor in use" means
 * in a building whose rooms face each other in pairs. Room 5 is the big one
 * at 684 seats and drains fastest, because the chapter should make you choose
 * between the room that matters and the room that is closest.
 *
 * Arriving buys eight seconds; a full reset needs three seconds standing
 * still at 2 m, and Voxxy is 1.15 m tall. That is the whole chapter: Voxxy
 * cannot fix anything and Droid cannot be everywhere.
 */
function tendRoom(id: string, label: string, drain: number): Activity {
  return {
    kind: 'tend',
    id: `tend-${id}`,
    label,
    room: id,
    at: backOfHouse(id),
    capacity: 45,
    drain,
    drainRamp: 0.004,
    tapBonus: 8,
    repairSeconds: 3,
    repairReach: 2.0,
    /*
     * The room's own house lights, and the whole reason this chapter can be
     * read off the building rather than off the HUD.
     *
     * `reveal` elsewhere is what COMPLETING something switches on — Chapter
     * I's three boards. A tend room never completes, so the screen drives
     * this continuously from the meter instead: full session, full light;
     * half a session, half lit; dark when it goes dark. Same data, same
     * renderer call, and `docs/MECHANICS.md` §5.2 asks for exactly this —
     * "a draining room visibly dims from the corridor. The meter is a
     * fallback, not the primary signal."
     *
     * `to` is what a running room is worth, not a target to arrive at.
     */
    reveal: { ...roomBounds(id), to: 1 },
  };
}

export const JAVAPOLIS_OBJECTIVE: Objective = {
  line: 'Keep every room running',
  clock: 240,
  failLimit: 3,
  activities: [
    tendRoom('aud-5', 'Room 5', 1.35),
    tendRoom('aud-4', 'Room 4', 1.15),
    tendRoom('aud-6', 'Room 6', 1.15),
    tendRoom('aud-3', 'Room 3', 1.0),
    tendRoom('aud-2', 'Room 2', 1.0),
  ],
};

// ---------------------------------------------------------------------------
// Chapter III — the conference
// ---------------------------------------------------------------------------

/**
 * One sticker per exhibition stand, read off the stands themselves.
 *
 * Twenty-seven of them are in the venue as `booth` dressing, so the sweep is
 * derived rather than typed: add a stand to the hall and it has a sticker on
 * it. They share a `group`, so the card carries one line with a count on it
 * rather than twenty-seven rows.
 *
 * The gate is `maxRadius` 0.40, which admits Voxxy at 0.34 and excludes Droid
 * at 0.46 and Biggy at 0.72. That is not a rule about stickers; it is the
 * width of the gap between two stands, and the robots answer it with the
 * dimensions they already had.
 */
function stickerSweep(): Activity[] {
  return KINEPOLIS.decor
    .filter((d) => d.material === 'booth')
    .map((stand, i) => ({
      kind: 'tap' as const,
      id: `sticker-${i}`,
      label: `Sticker, stand ${i + 1}`,
      group: 'stickers',
      gates: { maxRadius: 0.4 },
      at: {
        floor: stand.floor,
        bounds: rect(
          stand.bounds.x - 0.6,
          stand.bounds.y - 0.6,
          stand.bounds.w + 1.2,
          stand.bounds.h + 1.2,
        ),
      },
    }));
}

/**
 * `docs/MECHANICS.md` §5.3. Six minutes, fifteen things — twelve of them until
 * three conversations were added — and no day is long enough for fifteen.
 *
 * The one constraint everything else is arranged around: the keg is 200 kg,
 * and a Biggy carrying 200 kg cannot climb the building's only ramp — its
 * gradient limit falls from 0.11 to 0.075 against a 10% slope. So the keg
 * goes to the party stage in the HALL, and nothing heavy ever needs to change
 * level. See `maxSlopeLoaded` and the assertion in `npm run traverse`.
 */
export const CAPACITY_OBJECTIVE: Objective = {
  line: 'Do Devoxx. You cannot do all of it',
  clock: 360,
  activities: [
    {
      kind: 'dwell',
      id: 'badge',
      label: 'Get your badge scanned',
      // In the west aisle, in FRONT of the reception counter, not behind it.
      // It used to be at -5.0, -45.0, which was the middle of the old desk
      // enclosure — a 9.8 m box you could stand a marker in the middle of.
      // The concourse now carries the island the plan draws, 5.6 m across
      // with a metre of staff space behind the counter, so that point was
      // wedged between the counter and the office: the marker read as a
      // thing standing on the wrong side of the desk, and only Voxxy and
      // Droid could ever have got to it.
      //
      // Taken FROM the venue rather than typed, because the island has since
      // moved 3.5 m north and a literal would have been left standing in the
      // aisle beside a blank wall.
      at: spot(RECEPTION_DESK.floor, RECEPTION_DESK.x, RECEPTION_DESK.y, 3.0),
      seconds: 2,
    },

    /*
     * Three conversations, and they are doing three different jobs.
     *
     * A conference is people talking. Twelve activities that are all "drive
     * somewhere and wait" makes one out of a week of it, so these are the
     * counterweight — and each one also carries something the player would
     * otherwise have to be told by a tutorial box, which is the only reason
     * there is no tutorial box.
     *
     * Kept to three. A card with twelve lines on it is already at the limit
     * of what `SPEC.md` §3 will call one objective line on screen, and a game
     * where you stop every thirty metres to read is a game nobody finishes in
     * a six-minute day.
     */
    {
      kind: 'talk',
      id: 'talk-desk',
      // The same counter the badge is scanned at, and deliberately: you are
      // already stopped there, so the first conversation in the game costs
      // nothing but the press that discovers the key exists.
      label: 'Say hello at the desk',
      who: 'Registration',
      at: spot(RECEPTION_DESK.floor, RECEPTION_DESK.x, RECEPTION_DESK.y, 3.0),
      after: ['badge'],
      lines: [
        'There you are. Badge is on, so you are officially at a conference.',
        'Twelve things worth doing and one day to do them in. You will not get all of them. Nobody does.',
        'Pick the ones you will be sad to have missed.',
      ],
    },

    {
      kind: 'talk',
      id: 'talk-stand',
      label: 'Talk to the stand crew',
      who: 'Stand 11',
      // On the hall floor among the stands, where a robot is already driving
      // past on the sticker sweep.
      at: spot(0, 14.0, -24.0, 3.2),
      lines: [
        'Careful with that crate, it is heavier than it looks.',
        'Anything with weight in it changes how you stop, not how you start. Same motor, twice the distance.',
        'And the ramp is the one place that catches people out. Try it empty first.',
      ],
    },

    {
      kind: 'talk',
      id: 'talk-keynote',
      label: 'Ask the steward about the keynote',
      who: 'Steward',
      // Outside Room 8, upstairs, on the way to the thing everyone is going
      // to. Reach-gated: a steward leaning over a barrier talks to whoever is
      // tall enough to be at eye level, which is Voxxy and Droid, not Biggy —
      // and Biggy cannot get up here at all, which is the joke.
      at: spot(1, -3.0, -27.5, 3.4),
      gates: { reach: 1.0 },
      lines: [
        'Room 8, and it fills. If you are coming, come early.',
        'No, your big friend cannot. No goods lift in this building, and it will not do the stairs.',
        'It is not missing much. The talk is being recorded.',
      ],
    },

    ...stickerSweep(),

    {
      kind: 'dwell',
      id: 'polo',
      label: 'Pick up your polo',
      // The counter is at 2 m, so this is Droid's and nobody else's.
      at: roomZone('polo', 0.8),
      gates: { reach: 2.0 },
      seconds: 3,
    },

    {
      kind: 'haul',
      id: 'coffee',
      label: 'Coffee, and get it there',
      at: roomZone('foyer', 2.0),
      to: { floor: 1, bounds: rect(-6.0, -34.0, 12.0, 6.0) },
      mass: 2,
      fragile: true,
      // Biggy is excluded by the stairs long before it is excluded by this,
      // but a 430 kg machine carrying a tray of coffee is the wrong image
      // even where it can reach.
      gates: { maxRadius: 0.5 },
    },

    {
      kind: 'haul',
      id: 'crate',
      label: 'Crate of shirts to the pickup room',
      at: spot(0, 14.0, -20.0, 2.6),
      to: roomZone('polo', 0.8),
      mass: 60,
    },

    {
      kind: 'shove',
      id: 'shutter',
      label: 'Free the jammed shutter',
      at: spot(0, 24.0, 6.0, 3.2),
      // 900 kg·m/s: Droid peaks at 777 and cannot, Biggy cruises at 1366 and
      // must still be doing two thirds of its top speed. A run-up, or nothing.
      momentum: 900,
    },

    {
      kind: 'haul',
      id: 'keg',
      label: 'The keg, to the party stage',
      at: spot(0, 24.0, 9.5, 2.6),
      to: spot(0, -14.0, 4.0, 3.4),
      mass: 200,
      after: ['shutter'],
      window: { from: 0, to: 270 },
    },

    {
      kind: 'attend',
      id: 'talk-5',
      label: 'Catch the talk in Room 5',
      at: crossAisle('aud-5'),
      window: { from: 60, to: 100 },
      seconds: 22,
    },
    {
      kind: 'dwell',
      id: 'mic',
      label: 'Ask a question at the mic',
      // On the stage of Room 5, down the rake, at 2 m. Droid's `maxStepRise`
      // is 0.18 and the rake's riser is 0.18 — it gets down there by exactly
      // nothing to spare, which is the most Droid sentence in the game.
      at: roomZone('aud-5-stage', 0.4),
      gates: { reach: 2.0 },
      window: { from: 60, to: 110 },
      seconds: 2,
    },
    {
      kind: 'attend',
      id: 'talk-11',
      label: 'Catch the talk in Room 11',
      at: crossAisle('aud-11'),
      window: { from: 140, to: 180 },
      seconds: 22,
    },

    {
      kind: 'dwell',
      id: 'toilets',
      label: 'The queue for the toilets',
      at: roomZone('toilet-corridor', 0.6),
      seconds: 20,
    },

    {
      kind: 'attend',
      id: 'keynote',
      label: 'The keynote',
      at: crossAisle('aud-8'),
      window: { from: 320, to: 360 },
      seconds: 18,
    },
  ],
};
