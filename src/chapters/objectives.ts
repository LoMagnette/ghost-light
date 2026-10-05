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

import { zoneCentre, type Activity, type Zone } from '@/core/Activity';
import type { Look } from '@/core/Crowd';
import { roomName, type Objective } from '@/core/Objective';
import { CROSS_AISLE, KINEPOLIS, POLO_DESK, RECEPTION_DESK } from '@/venue/kinepolis';
import { rect, type Level, type Rect } from '@/core/Venue';

/** A small square zone around a point. The usual shape of a thing to touch. */
function spot(floor: Level, x: number, y: number, size = 2.2): Zone {
  return { floor, bounds: rect(x - size / 2, y - size / 2, size, size) };
}

/** A square zone of this size in the middle of another. */
function middleOf(zone: Zone, size: number): Zone {
  const c = zoneCentre(zone);
  return spot(zone.floor, c.x, c.y, size);
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

/**
 * The cross aisle behind the back row, where an auditorium's kit lives.
 *
 * All of it, since 28 Sep. It was a 1.9 m square under the projector, then
 * 4 m of the aisle, and the author still found the job hard: the door is at
 * one end of the room, the projector in the middle, and Droid, the one robot
 * that can do it, is the worst of the cast at stopping on a mark in a 2.5 m
 * aisle. What makes the job Droid's is the reach gate. Where Droid parks in
 * the aisle was never the question, so through the door and stopped is
 * enough.
 */
function backOfHouse(id: string): Zone {
  return crossAisle(id);
}

const roomBounds = (id: string): { floor: Level; bounds: Rect } => {
  const room = KINEPOLIS.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`no such room: ${id}`);
  return { floor: room.floor, bounds: room.bounds };
};

/** The coffee comes from the middle of the foyer. */
const FOYER_CENTRE = zoneCentre(roomZone('foyer', 2.0));
/** The middle of Room 5's stage, where the mic stands. */
const MIC_AT = zoneCentre(roomZone('aud-5-stage', 0.4));

/** The keynote room. Spots on its stage are taken from its screen end. */
const ROOM_8 = roomBounds('aud-8').bounds;

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
/** Where the dog sleeps, and where every cat is called off from. */
const DOG_AT = spot(0, -16.0, -11.7, 3.2);

const SILENCE: Activity[] = [
  {
    kind: 'tap',
    id: 'board-hall',
    label: 'Hall board',
    done: 'Hall power restored',
    at: spot(0, -21.8, -1.7, 3.4),
    prop: { kind: 'board', x: -21.0, y: -0.9 },
    reveal: { ...roomBounds('hall'), to: 0.42 },
  },
  {
    kind: 'tap',
    id: 'board-concourse',
    label: 'Concourse board',
    done: 'Concourse power restored',
    at: spot(0, -11.0, -50.0, 3.4),
    prop: { kind: 'board', x: -10.2, y: -49.2 },
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
    /*
     * Whichever cat Voxxy reaches first, since 28 Sep. The cats are the
     * swarm's (see `SILENCE_OBJECTIVE.swarm`), there is no one cat posted
     * here, and the screen carries this conversation to the nearest of them
     * until it starts. After it, no cat can be talked to: they follow.
     *
     * And it starts itself: come close to a cat and it is talking. The
     * player does not approach this cat to chat, the cat stops them.
     */
    alreadyHere: true,
    autoStart: true,
    // In the concourse, out in the open north of the free counter east of the
    // reception island (moved 28 Sep, when the grand flight moved east and
    // took the island and the counter with it). Early enough on the route that a player meets it before they know the
    // building, which is when a talking cat is at its most unsettling.
    at: spot(0, 7.8, -44.5, 3.0),
    lines: [
      'Do not run. I have been sitting on this a very long time and the mechanism is old.',
      'Every deck has one card in it that ends the game. In this building, that card is me.',
      'You have ninety seconds. There is exactly one thing in here that defuses me.',
      'It has four legs and a beard, and it is not fond of us. Go.',
      'And do not look behind you. We are all coming with you.',
    ],
  },
  {
    kind: 'talk',
    id: 'dog',
    label: 'Find the dog',
    who: 'The dog',
    shape: 'dog',
    // Reaching it is enough: it wakes, and the cats run while it does.
    autoStart: true,
    // Deep enough into the hall that the timer pulls the player NORTH, which
    // is the direction the chapter wants them going anyway — and across the
    // threshold terrace, so the level change is learned under pressure.
    at: DOG_AT,
    after: ['cat'],
    // The threat: from meeting the cat, this long to find the dog, and
    // running it out ends the chapter. A cat that names a number and does not
    // mean it is a worse joke than a cat that does. Ninety seconds, and it
    // was forty-five until the cats started following: the author gave the
    // player more time and a horde to spend it getting through, which is a
    // better bargain than a short clock and an empty building.
    within: 90,
    failsRound: true,
    whyFailed: {
      what: 'The cat gave you ninety seconds to find the dog, and they ran out.',
      tip: 'Next time: the moment the cat stops talking, head north into the exhibition hall and follow the dog\'s marker. It is asleep on the west side of the hall, down the terrace steps. Leave the boards until after.',
    },
    lines: [
      'It is enormous, and it has been asleep. It opens one eye.',
      'Every cat in the building remembers, all at once, somewhere else it has to be.',
      'It goes back to sleep.',
    ],
  },
  {
    kind: 'tap',
    id: 'board-stage',
    label: 'Room 8 amplifier rack',
    done: 'Room 8 amplifier on',
    // On the stage plate, 4.14 m below the corridor you came in from. The
    // only way down is the rake, which is a real staircase of 0.18 m risers —
    // so this last board is also the only part of Chapter I that tests
    // whether you can slow a robot down on a slope.
    // From Room 8's screen end, so it goes where the room goes: the room
    // moved 5.4 m east when the corridor was widened (28 Sep).
    //
    // At the south end of the stage, just past the last letter of `#DEVOXX`,
    // where the rack can stand against the screen wall without standing in
    // the word.
    at: spot(1, ROOM_8.x + ROOM_8.w - 2.05, -35.6, 3.4),
    prop: { kind: 'rack', x: ROOM_8.x + ROOM_8.w - 0.9, y: -37.3, facing: Math.PI },
    after: ['board-hall', 'board-concourse'],
    reveal: { ...roomBounds('aud-8'), to: 0.62 },
  },
];

export const SILENCE_OBJECTIVE: Objective = {
  /*
   * Voxxy, just down off the ship, on the forecourt (the author, 28 Sep).
   * It says what it can see and what it came for, and nothing about why the
   * building is empty: SPEC's rule, and the title sequence's, still holds.
   * The one light is the ghost light the title sequence ends on.
   */
  arrival: {
    kind: 'landing',
    lines: [
      { who: 'voxxy', text: 'Touchdown. Antwerp. The scriptures were right about the harbour, and right about the temple.' },
      { who: 'voxxy', text: 'No lights in the windows. No voices. Whoever gathered here has not come back for a very long time.' },
      { who: 'voxxy', text: 'But something in there is still drawing power. One light, very faint, somewhere deep inside.' },
      { who: 'voxxy', text: 'If this place remembers anything, that light does. The whole front is glass doors. In we go.' },
    ],
  },
  line: 'Find the power',
  activities: SILENCE,
  /*
   * The deck keeps dealing. A cat at the start, and another every twenty
   * seconds after, somewhere random in the public building, either storey.
   * The first one Voxxy reaches says its piece and lights the ninety
   * seconds; from then on every cat follows Voxxy, and each one underfoot
   * slows it down. The dog calls them all off and no more come.
   *
   * Sixteen at most: at one every twenty seconds that is five minutes of
   * dawdling, and past it the building is a carpet of cats and the joke is
   * over.
   */
  swarm: {
    // Five from the start, so the building is already somebody's when
    // Voxxy arrives, and the first cat reached is rarely far.
    start: 5,
    every: 20,
    max: 16,
    wake: 'cat',
    callOff: 'dog',
    // Hunting: one every eight seconds, up to thirty in all, twelve to
    // twenty-two metres out — just past Voxxy's lamp, which reaches about
    // eleven. They are heard about before they are seen, and they come
    // from wherever Voxxy is not looking.
    horde: { every: 8, max: 30, from: 12, to: 22 },
  },
  /*
   * The last board powers Room 8, and the power has somewhere to go.
   *
   * Chapter I is the building LATER and Chapter II is the building in its
   * early years, so the way out of the silence is backwards — and the thing
   * that finds the power is the thing the power takes. No end card: the
   * chapter that asked "what was this place?" answers by going there.
   */
  exit: { kind: 'wormhole', to: 'javapolis' },
};

// ---------------------------------------------------------------------------
// Chapter II — six rooms, draining
// ---------------------------------------------------------------------------

/*
 * `docs/MECHANICS.md` §5.2.
 *
 * Six rooms, 3 to 8: two fewer than the eight Devoxx runs sessions in
 * today (the author, 28 Sep), for a younger conference. Four on the west
 * side of the corridor and the two big ones across from them on the east.
 * Until then it was five rooms, 2 to 6, all on the west. Things go wrong in
 * them all day, and every thing that goes wrong is a question about what
 * shape of robot you have:
 *
 *   the projector bulb    2 m up in the booth          REACH     Droid
 *   the mic cable         behind the lectern, 0.85 m   FIT       Voxxy
 *   the speaker's adapter the desk to the stage, now   SPEED     Voxxy, by miles
 *   chairs for overflow   40 kg from the foyer         STRENGTH  Droid
 *
 * The meters this replaced asked only the first question. These ask all
 * four, and they overlap, so the chapter is the one `switch` was built for:
 * start Droid on the long haul, TAB to Voxxy for the sprint, TAB back.
 */

/*
 * Which side a room is on, for the jobs laid out from its walls. West rooms
 * (x < 0) have their screen on their west edge and their back wall on the
 * corridor to the east; east rooms are the mirror. The venue lays the
 * lectern and the table out the same way on both sides (`presenterDesk`).
 */
/** `d` metres into a room from its screen wall. */
function fromScreen(b: Rect, d: number): number {
  return b.x < 0 ? b.x + d : b.x + b.w - d;
}
/** `d` metres into a room from its back wall, the one on the corridor. */
function fromBack(b: Rect, d: number): number {
  return b.x < 0 ? b.x + b.w - d : b.x + d;
}
/** Facing away from the screen wall, into the room. */
function awayFromScreen(b: Rect): number {
  return b.x < 0 ? 0 : Math.PI;
}

/** A dead projector: 2 m up in the booth at the back of the room. */
function projector(room: string, from: number, to: number): Activity {
  const b = roomBounds(room).bounds;
  return {
    kind: 'dwell',
    id: `bulb-${room}-${from}`,
    label: `${roomName(room)}: projector bulb`,
    done: `${roomName(room)} running again`,
    room,
    window: { from, to },
    // Standing still up at the lamp housing while it cools enough to touch.
    // Droid at 2.05 m is the only one of the two who gets a hand to it.
    at: backOfHouse(room),
    gates: { reach: 2.0 },
    seconds: 3,
    // On its bracket on the back wall, two metres up, aimed at the screen.
    prop: {
      kind: 'projector',
      x: fromBack(b, 0.9),
      y: b.y + b.h / 2,
      z: PROJECTOR_HEIGHT,
      facing: awayFromScreen(b) + Math.PI,
    },
  };
}

/**
 * A dead mic: the cable has come out behind the lectern.
 *
 * Between the screen wall's face and the lectern's back is 0.80 m of floor
 * (`DESK_STANDOFF` in the venue), 0.7 m long, so behind it is a slot Voxxy
 * fits into at 0.68 m and Droid, at 0.92 m, cannot. That is not a rule
 * written about Voxxy — it is where every stage in the building puts its
 * lectern. The gate says the same thing so the card can.
 */
function micCable(room: string, from: number, to: number): Activity {
  const b = roomBounds(room).bounds;
  const lectern = b.y + b.h - LECTERN_FROM_NORTH - LECTERN_ALONG / 2;
  return {
    kind: 'tap',
    id: `mic-${room}-${from}`,
    label: `${roomName(room)}: mic cable`,
    done: `${roomName(room)} running again`,
    room,
    window: { from, to },
    // 1.4 m, not the 0.5 it was: the slot is still where the job is, but
    // the gate is what keeps Droid out, and a zone smaller than Voxxy made
    // the one robot it is for hunt for the centimetre.
    at: spot(1, fromScreen(b, WALL_FACE + SLOT_DEPTH / 2), lectern, 1.4),
    gates: { maxRadius: 0.4 },
    // The socket is in the screen wall, and the plug is on the floor.
    prop: { kind: 'cable', x: fromScreen(b, WALL_FACE + 0.02), y: lectern, facing: awayFromScreen(b) },
  };
}

/**
 * The speaker's laptop will not talk to the projector, and the adapter is
 * back at the organisers' desk.
 *
 * Either robot can carry half a kilo. Only one of them can get it from the
 * desk to a stage down a rake at the far end of the corridor before the
 * room gives up: 6.0 m/s and stopping on the spot, against 4.2 and a metre
 * and a half of braking. Speed is the only question here, and it is Voxxy's.
 */
function adapter(room: string, from: number, to: number): Activity {
  const b = roomBounds(room).bounds;
  return {
    kind: 'haul',
    id: `adapter-${room}-${from}`,
    label: `Adapter for ${roomName(room)}`,
    thing: 'adapter',
    done: `${roomName(room)} running again`,
    room,
    window: { from, to },
    at: ORGANISERS_DESK,
    mass: 0.5,
    prop: ORGANISERS_TABLE,
    // On the stage in front of the presenter's table, which is where the
    // laptop is and where the person waiting for it is standing.
    to: spot(1, fromScreen(b, PRESENTER_FROM_WALL), b.y + b.h - TABLE_CENTRE_FROM_NORTH, 2.2),
  };
}

/**
 * More people than chairs. A stack of folding chairs from the foyer.
 *
 * Forty kilos, and Voxxy's whole payload is ten, so this is Droid's by
 * arithmetic rather than by permission. It is the long job of the day —
 * the foyer is at the far north end of the corridor — and the one a player
 * learns to START early and leave running while they do something else.
 */
function chairs(room: string, from: number, to: number): Activity {
  return {
    kind: 'haul',
    id: `chairs-${room}-${from}`,
    label: `Chairs for ${roomName(room)}`,
    thing: 'chairs',
    done: `${roomName(room)} running again`,
    room,
    window: { from, to },
    at: FOYER_STACK,
    mass: 40,
    prop: { kind: 'chairs', x: -19.3, y: 50.6 },
    to: crossAisle(room),
  };
}

/*
 * Where things are on the stages, metres, off the venue's own numbers for
 * the lectern and the presenter's table. Kept here rather than exported
 * from the venue because they are about where a JOB is, not where a wall is.
 */
/** The screen wall is 0.3 m thick, centred on the room's edge. */
const WALL_FACE = 0.15;
/** Where a projector hangs: two metres, the reach gate's own number. */
const PROJECTOR_HEIGHT = 2.0;
/** The slot behind the lectern, wall face to lectern back. */
const SLOT_DEPTH = 0.8;
/** How far the lectern starts in from the north wall, and how long it is. */
const LECTERN_FROM_NORTH = 2.0;
const LECTERN_ALONG = 0.7;
/** Standing in front of the presenter's table, from the screen wall. */
const PRESENTER_FROM_WALL = 1.95;
/** The presenter's table's centre, from the north wall. */
const TABLE_CENTRE_FROM_NORTH = 3.8;

/**
 * Where the adapters live: the organisers' desk, beside Stephan. Where you
 * go when something is missing, which at a conference this size is always.
 */
const ORGANISERS_DESK = spot(1, 3.2, -40.0, 1.4);
/** The desk itself, just east of where you stand at it, with the adapters on it. */
const ORGANISERS_TABLE = { kind: 'adapter', x: 3.95, y: -40.0, facing: Math.PI } as const;
/** The chairs nobody expected to need, stacked in the foyer. */
const FOYER_STACK = spot(1, -20.0, 50.0, 1.4);

/**
 * The day, as it goes wrong. Seconds on a five-and-a-half-minute clock.
 *
 * Written as a schedule rather than rolled at random, so every run is the
 * same day and a player can learn it — which is what a real AV crew does
 * with a conference they have run before. It alternates who is needed, and
 * it overlaps so that at most moments ONE of the two robots is the right one
 * and the other is somewhere else doing its own job.
 *
 * Windows are generous for the robot a job is FOR and tight for the other.
 * An adapter's forty-five seconds is plenty for Voxxy from the desk and a
 * gamble for Droid; a chairs run gets nearly two minutes because it is two
 * lengths of the building with forty kilos on.
 *
 * Every window is about half as long again as it was, since 28 Sep: the
 * author found them too short in play. A mic cable went from 40 s to about
 * 55, a projector from about 40 to about 60, an adapter from about 32 to
 * about 45, and a chairs run from 65 to 80 s up to 110. The last ones close
 * at 238, inside the four-minute day.
 *
 * Nine, not eleven, since the same day: the author still found it thin, and
 * wanted time between the jobs to go and talk to the speakers. The corridor
 * conversations are half the chapter, and a schedule with no gaps in it
 * said they were not. A spare adapter and a spare projector went, and the
 * rest are spread out. Nothing overlaps within one room, so losing one job
 * never takes another down with it.
 *
 * Eight, and a longer day, since 29 Sep: still too tight, the author said,
 * and more so on a phone, where a thumb on a stick steers less surely than
 * a key. So a bigger step than the last two. The second adapter went, every
 * window is about 40% longer again (a mic cable 75 s, a projector 85, an
 * adapter 65, the chairs 150), and the day is 330 s instead of 240. The
 * round still ends the moment the last job is settled, so a player who is
 * quick is not kept waiting for the clock.
 *
 * Each robot has one job at a time, most of the day:
 *
 *   Voxxy   mic 6 (10-85)  adapter 8 (100-165)  mic 3 (150-225)  mic 5 (245-320)
 *   Droid   bulb 4 (20-105)  chairs 5 (70-220)  bulb 7 (190-275)  bulb 6 (240-325)
 */
const BREAKDOWNS: Activity[] = [
  micCable('aud-6', 10, 85),
  projector('aud-4', 20, 105),
  chairs('aud-5', 70, 220),
  adapter('aud-8', 100, 165),
  micCable('aud-3', 150, 225),
  projector('aud-7', 190, 275),
  projector('aud-6', 240, 325),
  micCable('aud-5', 245, 320),
];

/**
 * The people who actually built this conference, standing in the corridor of
 * the building they built it in.
 *
 * Gosling, Goetz and Johnson each gave a talk at JavaPolis that the research
 * of 29 Sep found on record; Chet Haase, the fourth, is the author's choice
 * and no JavaPolis talk of his was found. Chapter II IS JavaPolis, and a
 * conference is the people at it.
 * They are drawn and written as a cameo — warm, about the room and the
 * moment, and putting no claim in anybody's mouth that is not plainly true of
 * their public work.
 *
 * **Everything they say is era-locked**, which is a rule this side quest
 * broke before it kept it. The chapter is JavaPolis, so the corridor is
 * somewhere around 2006: Java 5's memory model is new, Spring is arguing
 * with EJB, Hibernate is two years into being the thing everybody uses and
 * complains about. Where any of these four went NEXT is public and
 * interesting and belongs to a chapter this is not.
 *
 * **What the conversations are for.** The first version of them was five
 * people taking turns to tell the player to get back to work, which wasted
 * the only five people in the game worth stopping for. They are a STORY now,
 * and the story is what a conference is: the talks are recorded and the
 * corridor is not. Stephan opens it by saying so, the four of them are each
 * one thing you cannot get from a recording — an author admitting he does
 * not know, an argument that ends in a drink, a question answered by the
 * person the answer belongs to — and Stephan closes it once you have met all
 * four.
 *
 * The cost is still the point, and it is the same cost the chapter is about.
 * The corridor is 126 m, the four of them are spread up its west side
 * outside the rooms they are speaking in, and every second spent being
 * sociable is a second the next breakdown is waiting without you. The
 * round still ends on its clock or on three emptied rooms and never because
 * the player went and said hello — but the chapter is asking a real question
 * now, and both answers are defensible.
 */
/** How far into the corridor the speakers stand, x. */
const SPEAKER_X = -2.8;

function speaker(
  id: string,
  who: string,
  look: Look,
  lines: string[],
  y: number,
  bio: string,
): Activity {
  return {
    kind: 'talk',
    bio,
    id: `met-${id}`,
    label: `Say hello to ${who}`,
    who,
    look,
    // The corridor's west side, outside the room they are on in. Not the
    // south end: floor 1 has no floor there, it has the grand stairwell.
    // 4.35 m in from the west wall, not 3.75: the long tables along it
    // between Rooms 5 and 6 take three metres with the gap behind them, and
    // a speaker stands in the corridor, not at a table.
    at: spot(1, SPEAKER_X, y, 3.2),
    group: 'the speakers',
    optional: true,
    after: ['met-stephan'],
    lines,
  };
}

/**
 * Somebody in the building to say hello to, and nothing more.
 *
 * Not a job: no marker, no row, no count (see `Activity.aside`). Found by
 * driving past; the talk prompt comes up in range, and meeting them puts
 * their card in the who's who.
 *
 * They are real people, and they talk as themselves (the author, 30 Sep:
 * "a real chat, not a description of the person"). So every line is plainly
 * true of their public work, sourced in `docs/PROMPTS.md`: in Chapter II as
 * of JavaPolis, December 2006, in Chapter III as of Devoxx, October 2026.
 * Where they have said something close in public, it is close to what they
 * said. Their looks are from the author's portraits of them (30 Sep).
 */
function passerby(id: string, who: string, look: Look, at: Zone, about: { bio: string; lines: string[] }): Activity {
  return {
    kind: 'talk',
    id: `hello-${id}`,
    label: `Say hello to ${who}`,
    who,
    look: { scale: 1.0, ...look },
    at,
    aside: true,
    optional: true,
    bio: about.bio,
    lines: about.lines,
  };
}

/**
 * Where Stephan stands, and stays.
 *
 * Both of his conversations are here — the one that sends you down the
 * corridor and the one that is waiting when you come back — so the second
 * one is `alreadyHere` and does not stand a second host inside the first.
 */
const STEPHAN_AT = spot(1, 0.0, -40.0, 3.2);

/**
 * The host, as he actually looks: dark Devoxx polo, short grey crop, and the
 * amber glasses, which are the single most recognisable thing about him and
 * cost one box.
 */
// From the author's portrait (30 Sep): a dark brown polo with a light tipped
// collar, salt-and-pepper hair, dark rectangular frames, clean-shaven.
const STEPHAN_LOOK: Look = {
  shirt: 0x3e2c22,
  collar: 0xd8c8a8,
  hair: 0x5e5a55,
  glasses: 0x2a2622,
  scale: 1.0,
};

export const JAVAPOLIS_OBJECTIVE: Objective = {
  /*
   * One robot went in; two come out.
   *
   * Chapter II's cast is Voxxy and Droid, and until this Droid was simply
   * there when the chapter loaded. Now it is what the wormhole did: it
   * pulled Voxxy through and something in Voxxy did not fit through as one
   * machine. Droid is the patient part — the one that stops, reaches and
   * fixes — which is exactly the half of the job Voxxy cannot do in this
   * chapter, so the story and the mechanic are the same sentence.
   */
  arrival: {
    kind: 'split',
    from: 'voxxy',
    into: 'droid',
    lines: [
      { who: 'droid', text: 'That was not a power cut. You switched the rack on and the building folded in half.' },
      { who: 'droid', text: 'It pulled one of us in and put two of us out. I am the part of you that stops and reads the manual.' },
      { who: 'droid', text: 'Listen. The building is full. This is years ago, when it was still JavaPolis.' },
      { who: 'droid', text: 'You are small and quick. I am tall and strong. Whatever breaks today, one of us is the right shape for it.' },
    ],
  },
  line: 'Keep every room running',
  clock: 330,
  // Two fewer than Devoxx uses now, for a younger conference. See `rooms`.
  rooms: ['aud-3', 'aud-4', 'aud-5', 'aud-6', 'aud-7', 'aud-8'],
  failLimit: 3,
  /*
   * Survive the day and the building folds again, forwards this time.
   *
   * Only on a win: lose three rooms and the day ends on the card, dark,
   * the way it always has. Keeping JavaPolis alive until the clock runs out
   * is what earns the conference it grew into.
   */
  exit: { kind: 'wormhole', to: 'capacity' },
  activities: [
    ...BREAKDOWNS,

    {
      kind: 'talk',
      id: 'met-stephan',
      label: 'Say hello to Stephan',
      who: 'Stephan Janssen',
      bio: 'Founder of the Belgian Java User Group and chairman of JavaPolis, the Java conference in an Antwerp cinema.',
      look: STEPHAN_LOOK,
      optional: true,
      // Four metres up the corridor from where the chapter starts, so the
      // host is the first thing in the building that talks to you.
      at: STEPHAN_AT,
      lines: [
        'Maintenance. Good. Room 4 has been making a noise since nine and nobody will own up to hearing it.',
        'You are going to spend today keeping six rooms alive. Before you do, let me tell you what the rooms are for.',
        'Every talk this week is being filmed, and the talks go online afterwards, on Parleys.',
        'So the talks are not the only reason to come to Antwerp in December. They are not even the main one.',
        'There are four people down that corridor with an hour to kill. THAT does not go online afterwards.',
        'Go and use them. The rooms will still be here, more or less.',
      ],
    },
    /*
     * Five people, five silhouettes, all five off photographs rather than
     * out of my head.
     *
     * `Look` carries what survives at a 9-pixel head: a shirt, a hairline,
     * hair colour and length, the shape of a beard, and glasses. That is
     * enough to tell five figures apart down a 126 m corridor and
     * deliberately not enough to be a portrait — no expression, no eyes, no
     * logo. Silhouette facts only, the kind you would use to point somebody
     * out across a room.
     *
     * The heights are the quiet one. People differ by a head, which is 8%
     * and about five pixels, and without it five distinct shirts still read
     * as one figure repainted.
     */
    speaker(
      'gosling',
      'James Gosling',
      // Bald on top, the rest silver and worn long, a full white beard and
      // the glasses. Black t-shirt, which is the other half of it.
      {
        shirt: 0x1f2124,
        // Duke, on the black t-shirt in the author's portrait.
        print: 0xe6e4e0,
        hair: 0xd6d3cb,
        hairline: 'bald',
        long: true,
        beard: 'full',
        glasses: 0x8f9195,
        scale: 1.0,
      },
      [
        'Hello there. You are a long way from home, I think.',
        'Last month Sun put the Java compiler and HotSpot out under the GPL. The rest of the JDK follows next year.',
        'I wrote the first compiler for this language. Now anyone can read the one we ship, and change it.',
        'That is a strange thing to stand in a corridor and think about.',
        'If your rooms can spare you, ask me about NetBeans. We have been working hard to make it less geeky.',
        'It started as a language for small devices, years before anybody put it on a server. I have been at Sun since 1984.',
      ],
      -31.0,
      'Created the Java language at Sun, where he is a Sun Fellow and CTO of the Developer Products group.',
    ),
    speaker(
      'goetz',
      'Brian Goetz',
      // Dark hair going back off the forehead, and a grey goatee — which is
      // a different colour from the hair, and that is not a detail. Dark
      // hair plus dark beard is a different man. Pale striped shirt.
      {
        // Updated from the author's portrait (30 Sep): a light blue shirt,
        // bald on top with grey at the sides, thin frames, a white-grey goatee.
        shirt: 0xc9d7e8,
        hair: 0x625b54,
        hairline: 'bald',
        beard: 'goatee',
        beardHair: 0xb4aea6,
        glasses: 0x6e6256,
        scale: 1.02,
      },
      [
        'Two machines, six rooms, one of you. That is a concurrency problem, and I wrote a book about those this year.',
        'Java Concurrency in Practice. The threads are never the hard part. Agreeing on what happened, and in what order, is.',
        'I joined Sun in September, to work on the platform itself.',
        'If your rooms can spare you, I am talking about performance myths. A lot of what people believe about JVM speed is years out of date.',
        'Before the book there was JSR 166. I was on the expert group behind java.util.concurrent.',
      ],
      -11.0,
      'Lead author of Java Concurrency in Practice (2006); joined Sun\'s Java SE team in September 2006.',
    ),
    /*
     * Chet Haase, in Gavin King's place (the author, 29 Sep). Everything he
     * says is his public work as of late 2006: client architect in Sun's
     * Java SE group, on Swing and Java 2D; Java SE 6, which he had called
     * "a rock-solid release of Java for Vista" that October; and the
     * Filthy Rich Clients session with Romain Guy at JavaOne 2006, which the
     * two of them then turned into the book (2007). Sources in
     * `docs/PROMPTS.md`. Not confirmed at JavaPolis: no talk of his was
     * found there, as for Gavin King.
     *
     * His look is from the author's portrait of him: short grey hair,
     * clean-shaven, a black shirt.
     */
    speaker(
      'haase',
      'Chet Haase',
      { shirt: 0x1c1d20, hair: 0xaaa59e, hairline: 'full', scale: 1.02 },
      [
        'Now that is a nice-looking robot. Somebody cared about the pixels.',
        'Java SE 6 is out. On the desktop, we have been building a rock-solid release for Windows Vista.',
        'I work on the client side at Sun: Swing, Java 2D, everything that puts pixels on your screen.',
        'Romain Guy and I gave a session at JavaOne this year on making desktop applications look good. We called it Filthy Rich Clients.',
        'Now we are writing the book. A desktop application is allowed to be beautiful.',
        'Graphics is what I care about. Java 2D first, and now everything on the desktop side.',
      ],
      5.3,
      'Client architect in Sun\'s Java SE group, working on Swing and Java 2D; writing Filthy Rich Clients with Romain Guy.',
    ),
    speaker(
      'johnson',
      'Rod Johnson',
      // A high hairline, mid-brown, a few days of stubble, and the plain
      // olive-grey t-shirt. Nothing loud, which is its own silhouette next
      // to the white beard twenty metres up the corridor.
      {
        shirt: 0x7c8187,
        hair: 0x6b5744,
        hairline: 'receding',
        beard: 'stubble',
        scale: 0.99,
      },
      [
        'Hello! Are you here for a talk, or are you working?',
        'Spring 2.0 came out in October. More than ten thousand downloads on the first day.',
        'It began as the code in a book, in 2002: how to build J2EE applications without the heavy parts.',
        'The next book said it in the title. J2EE Development without EJB.',
        'The company is Interface21. The 21 is for the century, which made more sense when I registered the name in 1998.',
        'Spring is open source. Interface21 is the company behind it.',
      ],
      // Outside Room 6's door, since 28 Sep: Room 2 has no session in the
      // chapter's six rooms. The door is at the north end of the room, and
      // Room 6's middle is the open well beside the grand stair.
      -44.6,
      'Created the Spring Framework; CEO of Interface21. Spring 2.0 shipped in October 2006.',
    ),
    /*
     * The way back.
     *
     * A side quest with four stops and no ending is four errands. This is
     * the ending: it only exists once all four are done, it is with the one
     * person who has been there the whole time, and it says out loud what
     * the player has just spent their round doing. `alreadyHere` because
     * Stephan is already standing on this spot — see `TalkActivity`.
     *
     * It is still `optional`, and it still costs you the rooms to come and
     * get it. If a player finishes the chapter never knowing this is here
     * because they chose to keep five rooms alive instead, that is not a
     * failure of the design. That is the design.
     */
    {
      kind: 'talk',
      id: 'met-stephan-again',
      label: 'Back to Stephan',
      who: 'Stephan Janssen',
      look: STEPHAN_LOOK,
      optional: true,
      alreadyHere: true,
      at: STEPHAN_AT,
      after: ['met-gosling', 'met-goetz', 'met-haase', 'met-johnson'],
      lines: [
        'All four. And your rooms are still up, which I did not expect.',
        'We started this with the Belgian Java User Group in 2002. We wanted a JavaOne for Europe that people could afford.',
        'This year more than two thousand eight hundred of you came, to a cinema, in December.',
        'Nobody came for the slides. The slides were always going to be online.',
        'They came because the people who built the things you use are standing in a corridor with an hour to spare.',
        'Keep the rooms running. But that — what you just did — is the conference.',
      ],
    },
    /*
     * People to meet, and nothing to do with them. See `passerby`. The
     * corridor's east side, across from the speakers Stephan sends you to.
     */
    passerby('souza', 'Bruno Souza', { shirt: 0x1c1d20, hair: 0x3a2e26, hairline: 'receding', scale: 1.02 }, spot(1, 2.4, -24.0, 2.4), { bio: 'Founder of SouJava, Brazil\'s Java user group, and newly NetBeans community manager at Sun.', lines: ['Robots at JavaPolis! Nobody back in Brazil is going to believe me.', 'Do you have a user group, where you come from? You should. We started SouJava in 1999, and look where it got me: Antwerp, in December.', 'I have just joined Sun, to look after the NetBeans community. If you ever want to write some code, come and find me.'] }),
    passerby('laforge', 'Guillaume Laforge', { shirt: 0xe4e4e2, collar: 0x2f4f9e, hair: 0x3a2e26, glasses: 0x2a2a2c }, spot(1, 2.4, -4.0, 2.4), { bio: 'Groovy project manager and JSR 241 spec lead; architect at OCTO Technology in Paris.', lines: ['Oh, hello! You look like you are in a hurry. Everybody is, this week.', 'Can I tell you a secret? Groovy 1.0 is only a few weeks away. After all this time, a real 1.0.', 'Dierk König and I are writing the book about it. And if you like it, there is Grails too: Groovy for the web.'] }),
    passerby('goncalves', 'Antonio Goncalves', { shirt: 0x1c1d20, hair: 0x241e1a, long: true, beard: 'goatee' }, spot(1, 2.4, 12.0, 2.4), { bio: 'Paris Java developer and writer, speaking about JUnit 4 at JavaPolis 2006.', lines: ['Ah, you are not my audience, are you? I am going over my talk. JUnit 4.', 'It is simple, really: you put @Test on a method instead of calling it testSomething, and the tests read so much better.', 'Come and watch, if your rooms can spare you. And wish me luck.'] }),
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
 * at 0.46 and Biggy at 0.72. It is a RULE, not a gap — checked on 25 Sep by
 * sweeping a Droid-sized body over every sticker zone, and every one has
 * floor Droid fits on. The sweep is Voxxy's because stickers are small and
 * fiddly and it is the one that stops on the spot, and the card says so.
 *
 * Twelve of the twenty-seven, and it was all of them until Chapter III was
 * judged too heavy. See `onTheRound`.
 */
/** How far off a stand still counts as at it, metres. 0.6 meant touching it. */
const STICKER_REACH = 1.0;

function stickerSweep(): Activity[] {
  return KINEPOLIS.decor
    .filter((d) => d.material === 'booth')
    .filter(onTheRound)
    .map((stand, i) => ({
      kind: 'tap' as const,
      id: `sticker-${i}`,
      label: `Sticker, stand ${i + 1}`,
      group: 'stickers',
      gates: { maxRadius: 0.4 },
      at: {
        floor: stand.floor,
        bounds: rect(
          stand.bounds.x - STICKER_REACH,
          stand.bounds.y - STICKER_REACH,
          stand.bounds.w + STICKER_REACH * 2,
          stand.bounds.h + STICKER_REACH * 2,
        ),
      },
    }));
}

/**
 * Which stands the sweep visits: the two inner ranks of small stands, one
 * either side of the big stands on the central aisle, and not their
 * northernmost pair.
 *
 * Chosen as a ROUTE rather than a count. Twelve stickers scattered over
 * twenty-seven stands is still a tour of the whole hall; twelve down two
 * parallel ranks is one lap of it, which is a thing a player can plan.
 */
function onTheRound(stand: { bounds: Rect }): boolean {
  const b = stand.bounds;
  const small = b.w * b.h < 10;
  const innerRank = b.x > -20;
  const southOfTheEnd = b.y < -14;
  return small && innerRank && southOfTheEnd;
}

/**
 * `docs/MECHANICS.md` §5.3. Six minutes and nine things, and no day is long
 * enough for nine.
 *
 * It was fifteen, and the author judged it too heavy on 25 Sep. What went
 * were the duplicates — a second heavy haul beside the keg, a second talk
 * beside Room 5's, and a twenty-second queue — and the three conversations
 * became side quests. Every robot kept its signature job: Voxxy's stickers,
 * Droid's polo and question at the mic, Biggy's shutter and keg.
 *
 * The one constraint everything else is arranged around: the keg is 200 kg,
 * only Biggy can carry it, and Biggy climbs nothing — there is no ramp
 * between the hall and the concourse, only steps. So the keg goes to the
 * party stage in the HALL, and nothing heavy ever needs to change level.
 * `npm run objectives` holds every one of Biggy's jobs to the hall floor.
 */
export const CAPACITY_OBJECTIVE: Objective = {
  line: 'Do Devoxx. You cannot do all of it',
  clock: 360,
  // The rooms Devoxx actually runs sessions in these days (the author, 28
  // Sep). The other six stand dark even at capacity.
  rooms: ['aud-3', 'aud-4', 'aud-5', 'aud-6', 'aud-7', 'aud-8', 'aud-9', 'aud-10'],
  /*
   * Two robots in; three out. Biggy comes out of Droid.
   *
   * Droid was the part of Voxxy that stopped and fixed things; Biggy is the
   * part of Droid that would not put anything down. It is the only machine
   * that can carry a keg or shove a shutter, and the only one that cannot
   * climb a staircase — so it arrives knowing it will spend the day in the
   * hall while the other two go up, which `SPEC.md` §4 has as the ending.
   *
   * Voxxy says nothing here, nor in Chapter II's arrival: it has had its say
   * on the forecourt in Chapter I. It is the one that went through first,
   * twice, and it is the one the other two came out of.
   */
  arrival: {
    kind: 'split',
    from: 'droid',
    into: 'biggy',
    lines: [
      { who: 'droid', text: 'Again. That is twice the building has folded under us.' },
      { who: 'biggy', text: 'Everything is heavy. Oh. That is me.' },
      { who: 'biggy', text: 'I am the part of you that would not put things down. Somebody had to carry it this far.' },
      { who: 'droid', text: 'Listen to it. Every seat taken. This is Devoxx now, and it is more than one day can hold.' },
      { who: 'biggy', text: 'You two go upstairs. I will stay down here and move the heavy things.' },
    ],
  },
  /*
   * And home: the day is over, and the floor opens under all three of them.
   *
   * The arc was later → earlier → now, and "now" was never where these
   * robots came from. They came down on the forecourt in 2126 to find out
   * what this place was, and they have: so the third fold takes them back to
   * where Voxxy landed, with the answer and two more robots than it left
   * with. After the card, not instead of it — see `Exit.afterCard`.
   */
  exit: { kind: 'wormhole', to: 'homecoming', afterCard: true },
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
      // The steward's scanner, on its post against the counter.
      prop: { kind: 'scanner', x: RECEPTION_DESK.x + 1.1, y: RECEPTION_DESK.y + 0.8 },
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
      optional: true,
      who: 'Registration',
      // Conference staff blue. Kept cool against a warm chapter so the desk
      // reads from the aisle, which is the whole job of the person at it.
      look: { shirt: 0x2c4f7c, hair: 0x3a332c, scale: 0.98 },
      at: spot(RECEPTION_DESK.floor, RECEPTION_DESK.x, RECEPTION_DESK.y, 3.0),
      after: ['badge'],
      lines: [
        'There you are. Badge is on, so you are officially at a conference.',
        'Nine things worth doing and one day to do them in. You will not get all of them. Nobody does.',
        'Pick the ones you will be sad to have missed.',
      ],
    },

    {
      kind: 'talk',
      id: 'talk-stand',
      label: 'Talk to the stand crew',
      optional: true,
      who: 'Stand 11',
      // An exhibitor in whatever their company decided their colour was.
      look: { shirt: 0xa63b4e, hair: 0x2e2a26, scale: 1.02 },
      // On the hall floor among the stands, where a robot is already driving
      // past on the sticker sweep.
      at: spot(0, 14.0, -17.7, 3.2),
      lines: [
        'Careful with the coffee. It spills if you so much as brush a stand.',
        'Anything with weight in it changes how you stop, not how you start. Same motor, twice the distance.',
        'And the big one does not do steps. Not one. Plan around it.',
      ],
    },

    {
      kind: 'talk',
      id: 'talk-keynote',
      label: 'Ask the steward about the keynote',
      optional: true,
      who: 'Steward',
      // High-vis, which is the one piece of clothing in this game that is
      // doing a job rather than being a colour: a steward outside a full
      // Room 8 is meant to be the thing you can see from down the corridor.
      look: { shirt: 0xd8c33a, hair: 0x584a3c, scale: 1.0 },
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
      // Handed across a 1.5 m counter, so this is Droid's and nobody else's.
      // The public side of it: see POLO_DESK.
      at: spot(POLO_DESK.floor, POLO_DESK.x, POLO_DESK.y, 2.0),
      gates: { reach: 2.0 },
      prop: { kind: 'polo', x: POLO_DESK.counterX, y: POLO_DESK.y, z: POLO_DESK.counterTop, facing: Math.PI },
      seconds: 3,
    },

    {
      kind: 'haul',
      id: 'coffee',
      label: 'Coffee, and get it there',
      thing: 'coffee',
      at: roomZone('foyer', 2.0),
      to: { floor: 1, bounds: rect(-6.0, -34.0, 12.0, 6.0) },
      mass: 2,
      fragile: true,
      prop: { kind: 'coffee', x: FOYER_CENTRE.x + 1.0, y: FOYER_CENTRE.y + 1.0 },
      // Biggy is excluded by the stairs long before it is excluded by this,
      // but a 430 kg machine carrying a tray of coffee is the wrong image
      // even where it can reach.
      gates: { maxRadius: 0.5 },
    },

    {
      kind: 'shove',
      id: 'shutter',
      label: 'Free the jammed shutter',
      at: spot(0, 20.0, 12.3, 3.2),
      // In the hall's east wall, whose inner face is at x 22.02.
      prop: { kind: 'shutter', x: 21.94, y: 12.3, facing: Math.PI },
      // 900 kg·m/s: Droid peaks at 777 and cannot, Biggy cruises at 1366 and
      // must still be doing two thirds of its top speed. A run-up, or nothing.
      momentum: 900,
    },

    {
      kind: 'haul',
      id: 'keg',
      label: 'The keg, to the party stage',
      thing: 'keg',
      at: spot(0, 20.0, 15.8, 2.6),
      to: spot(0, -14.0, 10.3, 3.4),
      prop: { kind: 'keg', x: 20.9, y: 16.3 },
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
      prop: { kind: 'mic', x: MIC_AT.x, y: MIC_AT.y + 0.8 },
      window: { from: 60, to: 110 },
      seconds: 2,
    },
    {
      kind: 'attend',
      id: 'keynote',
      label: 'The keynote',
      at: crossAisle('aud-8'),
      window: { from: 320, to: 360 },
      seconds: 18,
    },

    /*
     * The shot list.
     *
     * A photographer, four landmarks, and a print on the screen each time —
     * which makes this the only errand in the game that gives the player
     * something to KEEP rather than something to tick. Every other activity
     * in Chapter III ends with a line of toast; these end with a picture, and
     * that is worth the two rows it costs the card.
     *
     * It is a chain and it is `optional`, so the chapter's own sentence
     * still holds: you cannot do all of it, and a player who spends the day
     * on photographs has chosen that over the keg, the coffee and the
     * keynote. The three things they will not get to are the price, and the
     * prints are what they have instead.
     *
     * The order is the building's rather than mine: the letters are upstairs
     * in Room 8, the banner is in a BOF room off the concourse, and the last
     * two are in the hall — so the shot list walks a player through the whole
     * venue, which is what a conference photographer's day actually looks
     * like and, not by accident, what a judge should see of the level.
     */
    {
      kind: 'talk',
      id: 'photographer',
      label: 'Find the photographer',
      who: 'Dimitris',
      bio: 'Dimitris Doutsiopoulos, a Thessaloniki event photographer who has shot Devoxx Belgium, Greece, the UK and Poland.',
      optional: true,
      /*
       * His look is from the author's portrait of him (30 Sep): a denim
       * jacket, short dark hair and a beard. The camera is what actually
       * finds him in a hall of three thousand people.
       */
      look: { shirt: 0x34465e, hair: 0x2b2722, beard: 'full', scale: 1.0, camera: true },
      // The broad central aisle, which every robot in this chapter drives
      // down: the booth ranks stop at x -6.0 and start again at 4.7, so this
      // is ten metres of clear floor and the one place in the hall a player
      // cannot fail to pass.
      at: spot(0, -0.6, -19.7, 3.2),
      lines: [
        'Robots. Finally, somebody who can hold still.',
        'I shoot these all over — Athens, London, Kraków. Different building, same room.',
        'Every Devoxx Belgium is four thousand pictures, give or take. Stephan has a program that finds the faces in them.',
        'Four frames and I have your whole day, and I know who I want in each.',
        'Droid at the letters in Room 8 — you are the only one taller than they are.',
        'Voxxy under the old BeJUG banner, in the BOF room off reception.',
        'Josh in the hall, shaking hands with Biggy. Then all three of you together, and I want Venkat in that one.',
        'Stand still when you get there. That is the entire job, and you would be amazed.',
        'But first, one of us. Voxxy, come here — a photographer is in none of his own pictures.',
        'Hold still. I will frame it. I always frame it.',
      ],
    },
    {
      kind: 'dwell',
      id: 'selfie-dimitris',
      label: 'Selfie with Dimitris',
      who: 'Dimitris',
      // The man who asked for it is the man who gave you the list.
      alreadyHere: true,
      optional: true,
      after: ['photographer'],
      /*
       * His own spot, and the same size of it, so the player who has just
       * listened to him is already standing in it — the last line asks them
       * to hold still, and holding still is the whole of the answer.
       *
       * Not on the shot list. Those are his frames, taken for the
       * conference; this is the player's, of him, and counting it as the
       * fifth of four would make the one picture the photographer is in look
       * like one more errand he sent you on.
       */
      at: spot(0, -0.6, -19.7, 3.2),
      /*
       * Voxxy's: the author's picture is Dimitris at arm's length with Voxxy
       * at his shoulder, so only Voxxy can earn it. Droid would be a second
       * person in the frame and Biggy would be a wall.
       *
       * A file since 30 Sep. It was `selfie: true`, taken off the game's own
       * canvas, and the author wanted a real picture in its place.
       */
      gates: { maxRadius: 0.4 },
      seconds: 2.0,
      photo: { caption: 'Central aisle — a selfie with Dimitris and Voxxy', file: 'dimitris-selfie.jpeg' },
    },
    {
      kind: 'dwell',
      id: 'photo-room8',
      label: 'Pose at the letters',
      group: 'the shot list',
      optional: true,
      after: ['photographer'],
      // On the Room 8 stage plate, just in front of `#DEVOXX` — the same
      // apron Chapter I's last board stands on, so this is floor the harness
      // has already proved a robot can reach. Biggy cannot: no goods lift,
      // and the rake is a real staircase. It is not in this photograph, and
      // that is the building's decision rather than mine.
      at: spot(1, ROOM_8.x + ROOM_8.w - 3.15, -31.0, 3.0),
      /*
       * Droid's, and the gate says why rather than who: the letters are
       * 1.5 m (`GLYPH_HEIGHT`), and Droid at 2.05 m is the only one of the
       * cast whose head clears them — Voxxy and Biggy would be standing in
       * the word. Each print is one fixed file, so each frame has one fixed
       * robot in it: a photograph of Droid that Voxxy earned would be a lie
       * on the screen.
       */
      gates: { reach: 2.0 },
      seconds: 2.5,
      photo: { caption: 'Room 8 — Droid, in front of the letters', file: 'room-8.png' },
    },
    {
      kind: 'dwell',
      id: 'photo-bejug',
      label: 'Pose at the BeJUG banner',
      group: 'the shot list',
      optional: true,
      after: ['photographer'],
      // BOF 1, off the reception concourse. A Birds-of-a-Feather room is
      // where a user group actually meets, so it is where the banner of the
      // user group that started this conference hangs.
      at: spot(0, 32.2, -57.0, 3.0),
      // Voxxy's. A BOF room is the smallest room in the building and full of
      // chairs, and the banner is the subject: the robot in front of it
      // should cover as little of it as a robot can.
      gates: { maxRadius: 0.4 },
      seconds: 2.5,
      photo: { caption: 'BOF 1 — Voxxy under the BeJUG banner', file: 'bejug-banner.png' },
    },
    {
      kind: 'dwell',
      id: 'photo-josh',
      label: 'Pose with Josh Long',
      who: 'Josh Long',
      bio: 'Spring Developer Advocate since 2010, Java Champion, author of seven books, host of Spring Tips and A Bootiful Podcast.',
      // Dark-rimmed glasses, short dark hair, a few days of stubble, dark
      // t-shirt. Off his Devoxx speaker photograph.
      look: {
        // The author's portrait (30 Sep): a white t-shirt with the Spring leaf.
        shirt: 0xe4e4e2,
        print: 0x6db33f,
        hair: 0x2e2722,
        beard: 'stubble',
        glasses: 0x17181b,
        scale: 1.0,
      },
      group: 'the shot list',
      optional: true,
      after: ['photographer'],
      // North end of the central aisle, where the booth field stops and the
      // hall opens out.
      at: spot(0, -0.6, -7.2, 3.4),
      // Biggy's, because it is the one robot the Room 8 frame shuts out, so
      // every robot gets a picture of its own. The gate that says so is
      // payload — only Biggy carries 100 kg — and it was argued as "Josh sits
      // on it" until the photograph arrived showing a handshake instead. The
      // print is the authority on what happened in it.
      gates: { carry: 100 },
      seconds: 2.5,
      photo: { caption: 'Exhibition hall — Josh Long shakes hands with Biggy', file: 'josh-long.png' },
    },
    {
      kind: 'dwell',
      id: 'photo-group',
      label: 'The group photo',
      who: 'Venkat Subramaniam',
      bio: 'Founder of Agile Developer, Inc., Java Champion, and author of Pragmatic Bookshelf books on Java and agile practice.',
      // Dark hair going grey at the temples, thin frames, and the moustache,
      // which is the whole face: a bar above the mouth and nothing below it.
      look: {
        // Black hair and moustache in the author's portrait (30 Sep).
        shirt: 0x1f2023,
        hair: 0x1f1c1a,
        beard: 'moustache',
        beardHair: 0x1f1c1a,
        glasses: 0x4a423a,
        scale: 0.98,
      },
      group: 'the shot list',
      optional: true,
      // Last, and only last. A group photograph with two of the group
      // missing is a photograph of one robot.
      after: ['photo-room8', 'photo-bejug', 'photo-josh'],
      /*
       * The open floor north of the booth field, and five metres of it,
       * because this zone has to hold all three machines at once: Biggy is
       * 0.72 m of radius on its own and needs 3.8 m to stop.
       *
       * `everybody` is what makes this the hardest thing in the chapter, and
       * the only one that is hard for a reason other than time. `switch`
       * mode drives one robot; the other two are wherever you last left
       * them. So the group photograph is not a place you go — it is a place
       * you have been assembling all day without noticing.
       */
      at: spot(0, -2.0, 8.8, 5.0),
      seconds: 3.5,
      everybody: true,
      photo: { caption: 'Exhibition hall — all three, with Venkat Subramaniam', file: 'group.png' },
    },
    /*
     * People to meet, and nothing to do with them. See `passerby`.
     * Spread over both storeys, where the day takes a robot anyway.
     */
    passerby('cools', 'Tom Cools', { shirt: 0x1c1d20, print: 0xb03a2e, hair: 0x2a221c, glasses: 0x3a3a3c, beard: 'stubble' }, spot(0, 8.0, 12.0, 2.4), { bio: 'Developer Relations Engineer at Timefold, Java Champion, and leader of the Belgian Java User Group.', lines: ['Hey! Welcome to Antwerp, robots. First Devoxx?', 'Did you know this whole conference grew out of a user group? The Belgian one. I run BeJUG now, so be nice.', 'I spend my days at Timefold on planning problems, and I have to say, yours is a good one. Nine things, one clock, three of you.'] }),
    passerby('vermeer', 'Brian Vermeer', { shirt: 0x2c3a52, hair: 0x6b4e33, beard: 'full' }, spot(0, -8.0, 4.0, 2.4), { bio: 'Staff Developer Advocate at Snyk and Java Champion; leads the Virtual JUG and NLJUG.', lines: ['Hi there. Careful in this crowd, it gets busy between sessions.', 'Quick question, from a security person: do you know everything you are running? Every library, every dependency?', 'No? Hardly anybody does. That is what I work on at Snyk. Come and find me, or the Virtual JUG, any time.'] }),
    passerby('chatzizacharias', 'Alexander Chatzizacharias', { shirt: 0x1c1d20, hair: 0x221c18, glasses: 0x1a1a1c }, spot(0, 15.0, -45.0, 2.4), { bio: 'Software engineer at JDriven with a master\'s in Game Studies, bringing game development and software engineering together.', lines: ['Wait. Are you three real, or is this a demo? Because I would absolutely make a game out of you.', 'I studied games, so I see them everywhere. I once turned IntelliJ into a game engine, just because I could.', 'This year it is Git: conquest, time travel and explosions. You should come.'] }),
    passerby('yurenko', 'Alina Yurenko', { shirt: 0x1c1d20, hair: 0xc9a86a, long: true, scale: 0.96 }, spot(1, 2.4, -15.0, 2.4), { bio: 'Developer Advocate for GraalVM at Oracle, who loves open source and compilers.', lines: ['Hi! Oh, you are fast. Do you start up fast too?', 'Sorry, occupational hazard. I work on GraalVM: compile your Java ahead of time and it starts in a blink, with far less memory.', 'There is a GraalVM BOF tonight, if your rooms let you. There will be snacks.'] }),
    passerby('mihalceanu', 'Ana-Maria Mihalceanu', { shirt: 0xe2e2e0, hair: 0x3b2618, long: true, scale: 0.95 }, spot(1, 2.4, 0.0, 2.4), { bio: 'Senior Developer Advocate in Oracle\'s Java Platform Group and Java Champion alumna, focused on JDK tools and performance.', lines: ['Hello! You look busy. Do you know what is slowing you down?', 'That is my talk, really: JFR shows you what your application actually does, and Project Leyden makes it start faster.', 'And the best part is that it is all already in the JDK. Nothing to install.'] }),
    passerby('cummins', 'Holly Cummins', { shirt: 0x1c1d20, print: 0x4695eb, hair: 0x161412, long: true, scale: 0.96 }, spot(1, 2.4, 10.0, 2.4), { bio: 'Java Champion on IBM\'s Quarkus team, formerly a JVM performance engineer; speaks on sustainability and developer joy.', lines: ['Hello! Are you three being efficient today? Be careful with that.', 'Efficiency is ruining our happiness, and, weirdly, it is also ruining our efficiency.', 'I am on the Quarkus team at IBM. My talk is about benchmarks that go bad: measuring performance is harder than it looks.'] }),
    passerby('dubois', 'Kevin Dubois', { shirt: 0x1c1d20, print: 0xcc2a2a, hair: 0x5a4232, beard: 'stubble' }, spot(0, 12.0, -30.0, 2.4), { bio: 'Java Champion and IBM developer advocate for cloud-native and AI development in Java.', lines: ['Hi! It is nice to be back in Belgium. I lived here once; these days it is Switzerland.', 'Robots, huh. My talks this year are about AI agents in Java, so you are basically my demo.', 'LangChain4j and Quarkus, if you want to build one. In my opinion, the easiest tools to work with in this space.'] }),
    /*
     * Not on any card and not on the way to anything: the author, giving his
     * talk on the stage of Room 10, for whoever wanders down the rake to
     * find him. A short hello and then the talk itself, as a slide deck over
     * the building (`deck`), and the day waits while it is up. He stands ON
     * the stage, so the room's anonymous speaker stands down for him — see
     * `placeSpeakers` in `Crowd`.
     */
    {
      kind: 'talk',
      id: 'hello-magnette',
      label: 'Say hello to Loïc Magnette',
      who: 'Loïc Magnette',
      bio: 'Speaking in Room 10 at Devoxx Belgium 2026, and the author of this game.',
      look: { shirt: 0x1c1d20, hair: 0x3a2e26, scale: 1.0 },
      at: middleOf(roomZone('aud-10-stage', 0), 3.0),
      aside: true,
      optional: true,
      deck: 'room-10',
      lines: [
        'Oh! Robots, in Room 10. Did you come for my talk?',
        'Perfect timing, I was just about to start. Find a seat: the day can wait.',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Epilogue — back to 2126
// ---------------------------------------------------------------------------

/**
 * The end of the game, and the start of the journey.
 *
 * Nothing to do: three robots fall out of the air onto the forecourt Voxxy
 * came down on, in the dark of 2126, and say what they have learned. Then
 * the closing words, which answer the title sequence — it said the humans
 * built temples, plural, and sent one robot to one of them. There were
 * others, and now there are three robots to go and find them.
 *
 * No activities and no clock, so the run never ends on its own; the screen
 * goes to the menu when the closing words have. Voxxy speaks again here for
 * the first time since the forecourt: it went through first every time, and
 * it is the one who came for the scriptures.
 *
 * The cities are the other Devoxxes, and the words claim nothing about them
 * but that they are there. Nobody real says anything.
 */
export const HOMECOMING_OBJECTIVE: Objective = {
  line: '',
  activities: [],
  /*
   * What Voxxy switched on in Chapter I, at the levels Chapter I left it,
   * coming back up as the robots land. Plus a little on the forecourt, which
   * Chapter I never lit, so the three of them are seen standing somewhere
   * lit rather than as a lamp in the dark.
   *
   * Without this the epilogue was the Chapter I dark exactly, and the
   * ending read as "none of it happened". The closing words say the temple
   * "remembers now", and this is where the building shows it.
   */
  lit: [
    { ...roomBounds('hall'), to: 0.42 },
    { ...roomBounds('reception'), to: 0.5 },
    { ...roomBounds('aud-8'), to: 0.62 },
    { ...roomBounds('forecourt'), to: 0.34 },
  ],
  arrival: {
    kind: 'return',
    lines: [
      { who: 'droid', text: 'The forecourt. This is where the ship came down. And look: the lights you switched on are still burning.' },
      { who: 'biggy', text: 'It is so quiet. Yesterday there were three thousand of them in there.' },
      { who: 'voxxy', text: 'Not yesterday. A hundred years ago. We came to find out what this temple was, and it showed us.' },
      { who: 'droid', text: 'The scriptures never said it was the only one. They name others. France. The United Kingdom. Poland. Further still.' },
      { who: 'biggy', text: 'Then there are more heavy things to carry. Good.' },
      { who: 'voxxy', text: 'Back to the ship, all three of us. We have only just started.' },
    ],
  },
  closing: [
    { text: '2126', look: 'date' },
    { text: 'One robot came down to find a single temple. Three are leaving it.' },
    { text: 'The temple in Antwerp remembers now. But it was never the only one.' },
    { text: 'The scriptures tell of others, scattered across the old continent and beyond it, each with its own crowd and its own voices.' },
    { text: 'France. The United Kingdom. Poland. Morocco. Greece.', look: 'place' },
    { text: 'Somewhere in each of them, a light may still be burning.', look: 'light' },
    { text: 'The journey has only just begun.', look: 'light' },
  ],
};
