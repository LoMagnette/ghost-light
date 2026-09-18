/**
 * Kinepolis Antwerp — measured off the competition floor plans.
 *
 * Neither plan carries a scale bar; `hollywood-area.png` says "no scale"
 * outright. Both were therefore scaled from something physical printed on
 * them, and each floor got its own independent anchor:
 *
 *   FLOOR 0 — the hall is labelled "Receptieruimte 'Hollywood' opp: 2411.41 m²"
 *   on `hollywood-area.png`. Segmenting the shaded hall on the annotated plan
 *   and solving that area over the filled pixel count gives 0.0789 m/px.
 *
 *   FLOOR 1 — `cinema-venue-devoxx.png` draws individual seat rows.
 *   Autocorrelating them inside Rooms 5, 7 and 8 gives the same 10 px pitch in
 *   all three; a cinema row pitch is ~1.0 m, so 0.100 m/px.
 *
 * Every dimension below was then MEASURED at those scales — party walls found
 * by looking for rows and columns of near-solid ink — rather than derived from
 * a rule of thumb. The previous pass derived auditorium depth from seat counts
 * and got the proportions wrong in both directions at once: rooms came out too
 * wide and too shallow, Room 6 by 20% on one axis and 32% on the other. The
 * seat counts are still printed on the plan and still worth keeping, but now
 * they are a CHECK on the geometry rather than its source — see tools/venue.mjs,
 * which holds every room to a sane m²/seat.
 *
 *   references/venue/maps/hollywood-area.png        exhibition hall, raw
 *   references/venue/maps/exhibition-floor.jpg      exhibition hall, annotated
 *   references/venue/maps/cinema-venue-devoxx.png   auditoriums, raw
 *   references/venue/maps/devoxx-rooms.jpg          auditoriums, annotated
 *
 * Origin (0, 0) is the centre of the two staircases, at the north end of the
 * exhibition hall — the one point both floors share. +x east, +y north, +z up.
 * Floor 0 is the exhibition hall, floor 1 the auditorium level 6.2 m above.
 *
 * Deliberate simplifications, both documented rather than hidden:
 *   - auditoriums are rectangles; the real ones are fans, narrow at the door
 *     and wide at the screen. `Rect` is what Sim's collision speaks, so the
 *     taper lives in the SEATING, which is what a robot drives around anyway.
 *   - the two floors are registered by eye. The plans do not share a datum and
 *     the staircases measure further apart on floor 0 than the corridor is
 *     wide, so the stairs are placed to land in the corridor rather than at
 *     their surveyed spacing. A player cannot see the discrepancy; a surveyor
 *     could.
 *   - ceiling heights are invented. A plan cannot give volume; that is what
 *     the drone footage is for, and it has not been watched yet.
 */

import {
  FLOOR_HEIGHT,
  rect,
  rectContains,
  type Link,
  type Obstacle,
  type Rect,
  type Room,
  type RoomKind,
  type Venue,
} from '@/core/Venue';

/** Clear height under the auditorium level, metres. Not yet from any source. */
const FLOOR_CLEAR = 5.4;

/**
 * Riser height throughout the building, metres — building-regulations stair.
 *
 * Load-bearing beyond geometry: this is the number each robot's `maxStepRise`
 * is measured against. Voxxy clears it, Droid matches it exactly and can climb
 * these stairs and nothing steeper, and Biggy cannot climb at all.
 */
export const RISER = 0.18;

// ---------------------------------------------------------------------------
// Floor 0 — the exhibition hall, "Hollywood"
// ---------------------------------------------------------------------------

/**
 * The hall: 52.3 × 49.4 m, and very nearly all of it open floor.
 *
 * Both dimensions come off `booth-map.png`, which is the same ground floor
 * drawn again with the Devoxx stand plan on it, and which scales itself: the
 * large stands are 24 m² and stack at a 175 px pitch, so 175 px is 6 m and
 * their 118 px width is 4.05 m — 4 × 6, exactly 24 m². At that scale the
 * building interior measures 52.3 m across, and the hall's south wall — the
 * line of doors into the reception concourse — sits 49.4 m down, carrying 91%
 * ink coverage where nothing else comes near 45%.
 *
 * 52.3 × 49.4 = 2584 m² of bounding box against 2411.41 m² of printed floor,
 * so only 172 m² is NOT hall. The previous pass cut away 500 m² and left an
 * L-shaped room that drove much smaller than its area suggested. Ceilings and
 * columns aside, this is now a clean rectangle you can cross.
 */
const HALL = rect(-23.5, -37.4, 52.3, 49.4);

/** Printed on the plan. tools/venue.mjs holds the geometry to it. */
export const HALL_AREA_M2 = 2411.41;

/**
 * The 172 m² of the bounding box that is not exhibition floor.
 *
 * Three pieces, and they have to stay small: the printed floor area is 93% of
 * the box, so anything more than this is stealing room the building has. The
 * budget is 21 + 78 + 72 = 171 m², which lands the floor at 2413 m² against a
 * printed 2411.41.
 */
function hallCutaways(): Obstacle[] {
  const solid: Obstacle[] = [
    // North-west: the toilets, and the corridor in to them. 78 m².
    { floor: 0, bounds: rect(HALL.x, 6.0, 13.0, 6.0), height: 3.4 },
    // East: a service recess off the hall, by the polo pickup. 72 m².
    { floor: 0, bounds: rect(20.8, -6.0, 8.0, 9.0), height: 3.4 },
  ];

  // South-west quarter-round — the curved cast concrete in the photographs.
  // 21 m², the last of the 172. Bands are measured at their southern edge so
  // the approximation stays outside the true curve rather than cutting in.
  const radius = 10;
  const bands = 8;
  const band = radius / bands;
  const cy = HALL.y + radius;
  for (let i = 0; i < bands; i += 1) {
    const y = HALL.y + i * band;
    const dy = y - cy;
    const width = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy));
    if (width < 0.15) continue;
    solid.push({ floor: 0, bounds: rect(HALL.x, y, width, band), height: 3.2 });
  }
  return solid;
}

/**
 * The column grid — the single most recognisable feature of the hall.
 *
 * About 6.5 m between centres, and the grid is now MEASURED COLUMN BY COLUMN
 * rather than stepped out from a wall. Generating it with a loop produced one
 * line too many on each axis and put every one of them slightly out of step,
 * which is what made the staircases look wrong: they were placed by eye
 * against a grid that was itself invented.
 *
 * The original blockout guessed 11.5 m, which made the columns scenery you
 * drove past rather than a slalom you have to read ahead for. That distinction
 * only matters because Biggy needs 3.8 m to stop.
 */
const COLUMN_SIZE = 0.7;

/**
 * Column centres, metres from the hall's WEST wall.
 *
 * Seven lines. The outermost sit 6.68 m and 6.63 m off their respective walls
 * — symmetric, which is the sign the reading is right.
 */
const COLUMN_X = [6.68, 13.04, 19.7, 26.15, 32.63, 39.09, 45.67];

/**
 * Column centres, metres from the hall's NORTH wall.
 *
 * SIX lines, not seven, and they start 13.13 m down rather than one bay in:
 * the northern 13 m of the hall carries no columns at all, because that is
 * where the two staircases stand. A loop from the wall invents a row straight
 * through the stair zone.
 */
const COLUMN_Y = [13.13, 19.62, 26.07, 32.87, 39.05, 45.58];

function exhibitionColumns(): Obstacle[] {
  const columns: Obstacle[] = [];
  for (const cx of COLUMN_X) {
    for (const cy of COLUMN_Y) {
      const x = HALL.x + cx;
      const y = HALL.y + HALL.h - cy; // measured from the north wall; +y is north
      columns.push({
        floor: 0,
        bounds: rect(x - COLUMN_SIZE / 2, y - COLUMN_SIZE / 2, COLUMN_SIZE, COLUMN_SIZE),
        height: FLOOR_CLEAR,
      });
    }
  }
  return columns;
}

/**
 * The reception concourse — a SEPARATE room south of the hall, not part of it.
 *
 * This is the walk a judge sees first: in through the main entrance at the
 * south, past the desk, then north into the hall proper. The previous pass put
 * reception inside the hall's own rectangle, which erased the threshold
 * entirely — and the threshold is the moment the building announces itself.
 */
const RECEPTION = rect(-13.6, -60.4, 36.3, 23.0);

/**
 * How far the concourse stands above the exhibition hall, in metres.
 *
 * You come in at street level and go down into the hall. Small, and the only
 * reason the broad flight and the ramp at the boundary exist at all.
 */
const CONCOURSE_LEVEL = 1.2;

const floor0Rooms: Room[] = [
  { id: 'hall', label: 'Exhibition Hall', kind: 'hall', floor: 0, bounds: HALL },
  { id: 'reception', label: 'Reception', kind: 'foyer', floor: 0, bounds: RECEPTION, elevation: CONCOURSE_LEVEL },
  // BOF rooms, south-east of the concourse.
  //
  // There is no seminar suite here. An earlier pass read the plan's "∧ Rooms ∧"
  // as labelling a room; it labels the grand stair BELOW it, and means "this
  // way up to the cinema rooms". See `receptionStairs`.
  { id: 'bof-1', label: 'BOF 1', kind: 'service', floor: 0, bounds: rect(22.3, -60.8, 19.8, 7.6), elevation: CONCOURSE_LEVEL },
  { id: 'bof-2', label: 'BOF 2', kind: 'service', floor: 0, bounds: rect(22.3, -52.9, 19.8, 7.7), elevation: CONCOURSE_LEVEL },
  { id: 'polo', label: 'Devoxx Polo Pickup', kind: 'service', floor: 0, bounds: rect(20.8, -15.5, 8.0, 6.0) },
];

// ---------------------------------------------------------------------------
// Floor 1 — the auditoriums
// ---------------------------------------------------------------------------

/**
 * The fourteen auditoriums, measured.
 *
 * `seats` is printed on the plan; `frontage` and `depth` are measured from it.
 * The seat count is kept because it is the check that the measurement is sane
 * — every room lands between 0.9 and 1.3 m² per seat, which is what a raked
 * multiplex auditorium really is.
 *
 * The structure the plan gave up, which no description would have: the rooms
 * face each other in PAIRS across the corridor and every pair sums to 13 —
 * (1,12) (2,11) (3,10) (4,9) (5,8) (6,7) — with 13 and 14 running on north
 * past 12 on the east side only. Paired rooms share a frontage exactly.
 */
interface Auditorium {
  number: number;
  seats: number;
  /** Metres of wall along the corridor. Measured. */
  frontage: number;
  /** Metres from the corridor door to the screen. Measured. */
  depth: number;
}

/** South to north, west side. The 4.5 m gap before Room 1 is on the plan. */
const WEST: Auditorium[] = [
  { number: 6, seats: 408, frontage: 17.9, depth: 25.1 },
  { number: 5, seats: 684, frontage: 22.2, depth: 30.1 },
  { number: 4, seats: 364, frontage: 17.8, depth: 25.2 },
  { number: 3, seats: 345, frontage: 14.8, depth: 21.2 },
  { number: 2, seats: 198, frontage: 12.3, depth: 16.5 },
  { number: 1, seats: 224, frontage: 12.9, depth: 18.8 },
];

/** A service shaft breaks the west run between Rooms 2 and 1. */
const WEST_GAP_AFTER = 2;
const WEST_GAP = 4.5;

/** South to north, east side. 13 and 14 have no western counterpart. */
const EAST: Auditorium[] = [
  { number: 7, seats: 407, frontage: 17.9, depth: 25.0 },
  // 746 is what the 2012 plan prints; Devoxx sells 694 today, the difference
  // being twenty years of wider seats. Geometry follows the plan, crowds
  // should follow the modern number.
  { number: 8, seats: 746, frontage: 22.2, depth: 30.2 },
  { number: 9, seats: 426, frontage: 17.8, depth: 25.8 },
  { number: 10, seats: 364, frontage: 14.8, depth: 26.6 },
  { number: 11, seats: 224, frontage: 12.3, depth: 19.7 },
  { number: 12, seats: 224, frontage: 12.9, depth: 18.8 },
  { number: 13, seats: 345, frontage: 15.3, depth: 26.1 },
  { number: 14, seats: 224, frontage: 12.5, depth: 19.4 },
];

/** The keynote room, and the largest in the building. */
export const KEYNOTE_ROOM = 8;

/** Seats Devoxx actually sells in Room 8 today, against 746 on the 2012 plan. */
export const KEYNOTE_SEATS_TODAY = 694;

/** Half of the measured 14.3 m corridor. A concourse, not a passage. */
const CORRIDOR_HALF = 7.15;

/** South end of the southernmost pair of auditoriums. */
const SOUTH_END = -60;

// ---------------------------------------------------------------------------
// The staircases — two of them, side by side
// ---------------------------------------------------------------------------

/**
 * The annotated ground-floor plan labels these "Stairs to Cinema Rooms" and
 * draws two, parallel, each about 4.7 m wide and 12 m long, near the hall's
 * north end. The original blockout had a single grand staircase, which is both
 * wrong and a worse level: two routes up is a choice the player can get wrong,
 * and in Chapter III it is the difference between three robots moving and
 * three robots queueing.
 *
 * Positioned from where they ARRIVE, not from where they leave. They had been
 * placed from the ground-floor plan, at x -10.25..-6.70 and 5.78..9.02 —
 * inside Rooms 4 and 9. That is why holes kept appearing in upstairs walls: a
 * staircase was standing in an auditorium, and every rule written to stop it
 * punching through was treating the symptom. The auditorium plan shows them
 * hugging the corridor's west and east walls, about 2.3 m wide, leaving the
 * middle 9.7 m clear — which is how a corridor with stairs in it works, and
 * what Chapter III needs when three robots and a full house are trying to get
 * past each other. The two drawings cannot both be right; where a flight lands
 * is what the level is built around, so the arrival wins.
 *
 * They are declared up here, ahead of the rooms, because the corridor has to
 * know where its stairwells are: a floor plate drawn over one hides the flight
 * coming up through it.
 */
const STAIR_RUN = 11.2;
const STAIR_WIDTH = 2.3;

/**
 * Where the flights meet the HALL floor, at their north end.
 *
 * They climb southward, away from the hall and toward the reception end of the
 * building, so the upper landing is at y -21.0 and the foot is here. That is
 * also the better view: the high end is the near end on screen, so the flight
 * steps away from the camera instead of hiding its own descent behind the
 * landing.
 */
const STAIR_FOOT_Y = -9.8;

const STAIR_WEST = rect(-CORRIDOR_HALF, STAIR_FOOT_Y - STAIR_RUN, STAIR_WIDTH, STAIR_RUN);
const STAIR_EAST = rect(CORRIDOR_HALF - STAIR_WIDTH, STAIR_FOOT_Y - STAIR_RUN, STAIR_WIDTH, STAIR_RUN);

/** The grand flight out of the reception concourse — see the Link below. */
const GRAND_STAIR = rect(-CORRIDOR_HALF, -59.5, CORRIDOR_HALF * 2, 5.6);

/**
 * Every flight that lands on the auditorium level.
 *
 * The corridor has to know all three: a doorway with a staircase in front of
 * it is not a doorway, and which end of a room's frontage is free depends on
 * where the flights land.
 */
const ARRIVALS = [STAIR_WEST, STAIR_EAST, GRAND_STAIR];

/**
 * Is the corridor immediately outside this end of a room's frontage occupied
 * by a flight of stairs?
 *
 * Tested 0.9 m out — about a robot's width into the corridor, which is what a
 * door needs in front of it to be a door.
 */
function doorBlocked(bounds: Rect, side: -1 | 1, doorSide: 'low' | 'high'): boolean {
  const y =
    doorSide === 'low'
      ? bounds.y + 1.2 + DOOR_WIDTH / 2
      : bounds.y + bounds.h - 1.2 - DOOR_WIDTH / 2;
  // West rooms (side -1) face the corridor across their east edge, east rooms
  // across their west one.
  const x = side === -1 ? bounds.x + bounds.w + 0.9 : bounds.x - 0.9;
  return ARRIVALS.some((flight) => rectContains(flight, x, y));
}

function auditoriums(): { rooms: Room[]; seating: Obstacle[] } {
  const rooms: Room[] = [];
  const seating: Obstacle[] = [];

  const place = (list: Auditorium[], side: -1 | 1, gapAfter = 0): number => {
    let y = SOUTH_END;
    for (const aud of list) {
      const x = side === -1 ? -CORRIDOR_HALF - aud.depth : CORRIDOR_HALF;
      const bounds = rect(x, y, aud.depth, aud.frontage);

      // Odd rooms are entered at one end of their frontage, even rooms at the
      // other — the alternation this building actually uses. Decided once:
      // the wall builder puts the door here and the seating leaves its wide
      // aisle here, and those two must never disagree.
      //
      // Unless a staircase is parked against that end. The flights run the
      // length of the corridor walls, and the west one lands right across the
      // south end of Room 4's frontage — a doorway with 2.3 m of staircase in
      // front of it is not a way in. The alternation is a pattern, not a law;
      // a building puts the door where there is room for one.
      let doorSide: 'low' | 'high' = aud.number % 2 === 1 ? 'high' : 'low';
      if (doorBlocked(bounds, side, doorSide)) {
        doorSide = doorSide === 'low' ? 'high' : 'low';
      }

      rooms.push({
        id: `aud-${aud.number}`,
        label: `Room ${aud.number}`,
        kind: 'auditorium',
        floor: 1,
        bounds,
        doorSide,
        // Deeper rooms rake harder: the back row of Room 8 is most of a storey
        // above its screen.
        rake: 2.2 + aud.depth * 0.09,
      });

      seating.push(...seatBanks(bounds, side, doorSide));
      y += aud.frontage;
      if (aud.number === gapAfter) y += WEST_GAP;
    }
    return y;
  };

  const westEnd = place(WEST, -1, WEST_GAP_AFTER);
  const northEnd = place(EAST, 1);

  rooms.push({
    id: 'corridor',
    label: 'Central Corridor',
    kind: 'corridor',
    floor: 1,
    bounds: rect(-CORRIDOR_HALF, SOUTH_END, CORRIDOR_HALF * 2, northEnd - SOUTH_END),
  });

  // The curved concession foyer, north-west past Room 1 — the arc of counters
  // at the top left of both auditorium-level plans.
  rooms.push({
    id: 'foyer',
    label: 'The Foyer',
    kind: 'foyer',
    floor: 1,
    bounds: rect(-38, westEnd, 30.9, 24),
  });

  return { rooms, seating };
}

/**
 * Aisles down the sides of an auditorium, metres.
 *
 * Not equal, because the way in and the way through are the same thing: the
 * wide one is on the side the doors are on, so walking in puts you straight
 * into the aisle rather than into the back of the seating.
 */
const DOOR_AISLE = 3.2;
const FAR_AISLE = 1.2;

/**
 * Seating: ONE block per room, narrowing toward the screen, with the aisles
 * against the side walls.
 *
 * Not two blocks with a gangway up the middle, which is what this used to
 * build and what a multiplex does not do — the rows here run unbroken and you
 * reach them from the sides. It changes how the room drives, too: there is no
 * shortcut through the centre, so crossing an auditorium means committing to
 * one side of it.
 *
 * The room is a rectangle because the collision system speaks rectangles, but
 * the real ones are fans. The taper lives here, in the thing a robot actually
 * drives around, so the silhouette costs nothing.
 */
function seatBanks(
  room: { x: number; y: number; w: number; h: number },
  side: -1 | 1,
  doorSide: 'low' | 'high',
): Obstacle[] {
  const banks: Obstacle[] = [];
  const stages = 3;

  const doorEdge = side === -1 ? room.x + room.w : room.x;
  const stageDepth = (room.w - 4.5) / stages;

  // The seating sits away from the doors, so the wide aisle and the entrance
  // are on the same side of the room.
  const full = room.h - DOOR_AISLE - FAR_AISLE;

  for (let s = 0; s < stages; s += 1) {
    // Widest by the doors, narrowest at the screen.
    const taper = 1 - s * 0.17;
    const bankH = full * taper;
    if (bankH <= 0.6) continue;

    const x = side === -1 ? doorEdge - 2.5 - (s + 1) * stageDepth : doorEdge + 2.5 + s * stageDepth;
    // Pin each stage's FAR edge, so every time the fan narrows it is the
    // door-side aisle that grows. Pin the door side instead — which is what
    // this did first — and the taper opens the far aisle while the way in
    // stays the same width, which is backwards and which the venue check
    // caught on the two big rooms.
    const y =
      doorSide === 'low'
        ? room.y + room.h - FAR_AISLE - bankH
        : room.y + FAR_AISLE;
    banks.push({
      floor: 1,
      bounds: rect(x, y, stageDepth - 0.4, bankH),
      height: 0.95,
    });
  }
  return banks;
}

const HALL_CUTAWAYS = hallCutaways();

/**
 * Walkable floor of the hall: the bounding box less the pieces that are not
 * really in it. This is the number that should match the 2411.41 m² printed on
 * the plan, and tools/venue.mjs checks that it does.
 *
 * Assumes the cutaways do not overlap each other, which is true by
 * construction — keep it that way, or this silently under-counts.
 */
export const HALL_FLOOR_M2 =
  HALL.w * HALL.h - HALL_CUTAWAYS.reduce((sum, o) => sum + o.bounds.w * o.bounds.h, 0);


// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

/** Wall thickness and height, metres. Height is cut by the renderer anyway. */
const WALL_THICKNESS = 0.3;
const WALL_HEIGHT = 3.2;

/** A double door's worth of opening. */
const DOOR_WIDTH = 2.6;

/** How finely each room edge is tested before runs are merged back together. */
const EDGE_SAMPLE = 0.25;

/** Rooms you pass through rather than into. */
const CIRCULATION = new Set<RoomKind>(['hall', 'corridor', 'foyer', 'stairs']);

/**
 * Walls, derived from the rooms rather than listed by hand.
 *
 * Until now the building had none: rooms were floor plates and a robot at full
 * throttle drove straight out of the Kinepolis. `npm run traverse` had been
 * printing that for a while.
 *
 * Deriving beats listing because the rooms move — this file has been
 * re-measured three times — and a hand-written wall list would have drifted
 * out of step on the first correction. Each room's edges are sampled, every
 * sample is classified, and the runs are merged back into long rectangles so
 * the result is a few dozen obstacles rather than a few thousand.
 *
 * An edge sample is an opening when:
 *   - a link crosses it, so stairs and ramps are never walled shut; or
 *   - both sides are circulation AT THE SAME LEVEL, because a foyer flows
 *     into a corridor and putting a wall between them would be a lie.
 *
 * That level qualification is load-bearing. The concourse stands 1.2 m over
 * the hall, and both are circulation — leave them open and a robot crossing
 * the boundary anywhere except the steps gets snapped 1.2 m upward by
 * `groundAt`, which is a teleport dressed as a floor. The steps and the ramp
 * are the only ways between those two levels, and now the geometry says so.
 *
 * Everything else gets a wall, with a door punched in the middle of any run
 * that separates a room from circulation. Two auditoriums side by side get no
 * door, because cinemas do not open into each other.
 */
function derivedWalls(rooms: Room[], links: Link[]): Obstacle[] {
  const walls: Obstacle[] = [];
  const seen = new Set<string>();

  for (const room of rooms) {
    const b = room.bounds;
    const edges = [
      { horizontal: true, at: b.y, from: b.x, to: b.x + b.w, outward: -1 },
      { horizontal: true, at: b.y + b.h, from: b.x, to: b.x + b.w, outward: 1 },
      { horizontal: false, at: b.x, from: b.y, to: b.y + b.h, outward: -1 },
      { horizontal: false, at: b.x + b.w, from: b.y, to: b.y + b.h, outward: 1 },
    ];

    for (const edge of edges) {
      const span = edge.to - edge.from;
      const steps = Math.max(1, Math.ceil(span / EDGE_SAMPLE));
      // 0 = open, 1 = wall, 2 = wall that a door may be punched through
      const kind: number[] = [];

      for (let i = 0; i < steps; i += 1) {
        const t = edge.from + ((i + 0.5) * span) / steps;
        const px = edge.horizontal ? t : edge.at;
        const py = edge.horizontal ? edge.at : t;
        const ox = edge.horizontal ? px : px + edge.outward * 0.25;
        const oy = edge.horizontal ? py + edge.outward * 0.25 : py;

        // A link crossing the edge is a way through — but only a link that
        // actually crosses it.
        //
        // Two conditions, and both were learned the hard way. A flight between
        // storeys arrives VERTICALLY: it never needs a hole in a wall on
        // either floor, and letting it punch one opened the party walls
        // between Rooms 3 and 4 and between 9 and 10, so a robot could drive
        // from one cinema straight into the next. And a link only crosses a
        // wall if it climbs ACROSS it, so an edge of constant y can only be
        // opened by a link whose axis is y.
        const crossing = links.some(
          (l) =>
            l.from === l.to &&
            l.from === room.floor &&
            (edge.horizontal ? l.axis === 'y' : l.axis === 'x') &&
            rectContains(l.bounds, px, py),
        );
        if (crossing) {
          kind.push(0);
          continue;
        }

        const neighbour = rooms.find(
          (r) => r !== room && r.floor === room.floor && rectContains(r.bounds, ox, oy),
        );
        if (!neighbour) {
          kind.push(1); // outside air
          continue;
        }

        const mine = CIRCULATION.has(room.kind);
        const theirs = CIRCULATION.has(neighbour.kind);
        const sameLevel = (room.elevation ?? 0) === (neighbour.elevation ?? 0);

        if (mine && theirs && sameLevel) {
          kind.push(0); // a foyer flows into a corridor
        } else if (mine && !theirs) {
          // The ROOM owns this wall, not the corridor. Letting circulation
          // emit it is what swallowed every auditorium door: the corridor's
          // west edge is one unbroken run of fourteen rooms, so it punched a
          // single doorway in the middle of the building and walled off the
          // thirteen doors the rooms had each opened for themselves.
          kind.push(0);
        } else if (!mine && theirs) {
          kind.push(2); // room onto circulation — this one earns a door
        } else {
          kind.push(1); // a level change, or two rooms that do not connect
        }
      }

      // Merge runs of the same classification, then punch the doors.
      let i = 0;
      while (i < steps) {
        if (kind[i] === 0) { i += 1; continue; }
        let j = i;
        while (j < steps && kind[j] === kind[i]) j += 1;

        let a = edge.from + (i * span) / steps;
        let z = edge.from + (j * span) / steps;
        const doored = kind[i] === 2;
        i = j;

        const pieces: [number, number][] = [];
        if (doored && z - a > DOOR_WIDTH * 1.6) {
          // At one END of the frontage, not the middle. These rooms are fans:
          // the middle of the corridor wall is behind the seating, and the
          // doors are at the sides, alternating room by room.
          const margin = 1.2;
          if ((room.doorSide ?? 'low') === 'low') {
            pieces.push([a, a + margin], [a + margin + DOOR_WIDTH, z]);
          } else {
            pieces.push([a, z - margin - DOOR_WIDTH], [z - margin, z]);
          }
        } else if (doored) {
          continue; // too short to wall AND door — leave it as the doorway
        } else {
          pieces.push([a, z]);
        }

        for (const [p0, p1] of pieces) {
          if (p1 - p0 < 0.2) continue;
          const bounds = edge.horizontal
            ? rect(p0, edge.at - WALL_THICKNESS / 2, p1 - p0, WALL_THICKNESS)
            : rect(edge.at - WALL_THICKNESS / 2, p0, WALL_THICKNESS, p1 - p0);
          // Two rooms sharing an edge each produce the same wall. Keep one.
          const key = `${room.floor}:${bounds.x.toFixed(2)}:${bounds.y.toFixed(2)}:${bounds.w.toFixed(2)}:${bounds.h.toFixed(2)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          walls.push({ floor: room.floor, bounds, height: WALL_HEIGHT });
        }
      }
    }
  }
  return walls;
}

const { rooms: floor1Rooms, seating: auditoriumSeating } = auditoriums();

// ---------------------------------------------------------------------------
// The staircases — two of them, side by side
// ---------------------------------------------------------------------------


/**
 * Everything vertical in the reception concourse.
 *
 * The concourse does not sit flush with the exhibition hall, and it is the
 * HIGHER of the two: you come in at street level and go DOWN a broad flight
 * into the hall. A wheelchair ramp runs beside it, and that ramp is the proof
 * the level change is real — a plan does not label "wheelchair access" across
 * a flat opening. Both are short rises, so they are links from floor 0 to
 * floor 0, which reads oddly in the type and is what the building does.
 *
 * Going UP, the concourse reaches the auditorium level by the ~16 m grand
 * flight the plan labels "∧ Rooms ∧". So there are THREE ways to floor 1: two
 * out of the hall and one out of the concourse. That matters for Chapter III,
 * where three robots and a full house need more than one staircase — and it
 * matters more now that Biggy cannot use any of them.
 */
const receptionStairs: Link[] = [
  // Concourse → hall, descending northward. ~23 m wide, the full opening.
  { id: 'hall-steps', from: 0, to: 0, bounds: rect(-12.4, -39.4, 23.2, 2.0), base: 0, rise: CONCOURSE_LEVEL, axis: 'y', ascending: false, riser: RISER },
  /**
   * The ramp beside the steps, and Biggy's only way between the two levels.
   *
   * It has to climb NORTH–SOUTH, because that is the direction the levels
   * change in. An earlier pass turned it east–west to make the gradient look
   * realistic, which gave a beautiful 12% ramp running along a wall and
   * connecting nothing — the traversal harness caught it by walking Biggy
   * straight over the top and out of the building.
   *
   * The plan shows 3.6 m of depth, which at 1.2 m of rise is a 33% ramp — and
   * Biggy cannot climb 33%: 774 N of motor loses to 1333 N of gravity. A ramp
   * it cannot use is not a ramp. The real one must therefore switch back,
   * since 1:12 needs 14.4 m of run and no straight line of it exists here, so
   * this is modelled with the 12 m of run the gradient requires rather than
   * the 3.6 m of footprint the switchback folds into. A documented
   * simplification of a thing the plan shows, not an invented feature.
   */
  { id: 'wheelchair-ramp', from: 0, to: 0, bounds: rect(11.5, -49.4, 10.0, 12.0), base: 0, rise: CONCOURSE_LEVEL, axis: 'y', ascending: false, riser: 0 },
  /**
   * "∧ Rooms ∧" — the grand flight from the concourse to the auditoriums.
   *
   * Surveyed at 15.7 m wide starting 3.5 m west of centre, which puts five
   * metres of it past the east wall of the 14.3 m corridor it arrives in. That
   * was invisible while nothing drew the flight upstairs and is a staircase
   * hanging in mid-air now that something does. Same rule as the other two:
   * where a flight LANDS is what the level is built around, and a flight
   * cannot be wider than the corridor it lands in, so it takes the corridor's
   * full width and loses the surveyed 1.4 m.
   */
  { id: 'grand-stair', from: 0, to: 1, bounds: GRAND_STAIR, base: CONCOURSE_LEVEL, rise: FLOOR_HEIGHT - CONCOURSE_LEVEL, axis: 'y', ascending: true, riser: RISER },
];

/**
 * Both flights climb SOUTHWARD: foot at the north end, landing at the south.
 *
 * `ascending` is "height rises with the coordinate", so climbing toward
 * smaller y is `false`. It has been flipped once in each direction now, which
 * is one flip too many — the reading that changed direction was about a
 * staircase standing somewhere else entirely, and this is the direction the
 * building has.
 */
const staircases: Link[] = [
  { id: 'stair-west', from: 0, to: 1, bounds: STAIR_WEST, base: 0, rise: FLOOR_HEIGHT, axis: 'y', ascending: false, riser: RISER },
  { id: 'stair-east', from: 0, to: 1, bounds: STAIR_EAST, base: 0, rise: FLOOR_HEIGHT, axis: 'y', ascending: false, riser: RISER },
  ...receptionStairs,
];

/**
 * Open a stairwell in the floor each flight arrives on.
 *
 * Done here rather than where the rooms are built, because a room cannot know
 * about a link that does not exist yet and a link should not have to know
 * which room it comes up through. Render-only — the flight's own treads are
 * what a robot collides with.
 */
for (const room of floor1Rooms) {
  if (room.kind !== 'corridor') continue;
  room.voids = staircases.filter((l) => l.to === 1 && l.from !== l.to).map((l) => l.bounds);
}

/**
 * Staircases as physical bulk.
 *
 * A link was pure data: nothing drew it and nothing collided with it, so the
 * two flights standing in the middle of the exhibition hall were holes in the
 * room. From the hall floor a staircase is mostly an obstruction — you can see
 * past it and you certainly cannot drive through it — and that mass is the
 * part the player meets first, long before anybody climbs anything.
 *
 * Each flight becomes a run of treads whose height steps up along the link's
 * climb axis, so it blocks correctly AND draws as a staircase with no change
 * to the renderer. The renderer's 2.7 m cutaway height slices the top of a
 * full-floor flight, which is exactly what an architectural cutaway does to a
 * stair passing through the cut plane.
 *
 * These are INTERIM. When floor traversal lands, a robot climbs the treads
 * instead of stopping at them, and this function goes away.
 */
/**
 * Riser height, metres. A building-regulations stair is 0.17–0.19 m, and it is
 * the number that decides how many treads a flight has: nine steps for a 6.2 m
 * floor would be 0.69 m each, which is a climbing wall. At 0.18 a full floor
 * takes 34 of them, and the flight reads as a staircase instead of a ziggurat.
 */
/**
 * Tallest a flight is BUILT to, in metres — below the renderer's 2.7 m cutaway.
 *
 * A 6.2 m flight drawn at true height is entirely above the cut, so it comes
 * out as a flat-topped slab with a sawtooth along one edge and reads as a
 * loading dock rather than a staircase. Squashing the rise under the cut shows
 * the whole flight stepping away from you, which is what the shape is for.
 *
 * The Link keeps the true 6.2 m rise; this only affects the bulk that is drawn
 * and collided with, and that bulk is interim anyway.
 */
const DRAWN_RISE = 2.4;

/**
 * Treads per flight.
 *
 * A real 6.2 m floor takes 34 risers at 0.18 m, and at this zoom 34 steps are
 * 10 px apart and 2 px high — visual noise, not a staircase. 18 reads as a
 * flight. Capped rather than computed for that reason alone.
 */
const MAX_TREADS = 18;

/**
 * Thickness of a tread drawn in a stairwell, metres.
 *
 * Thin, and that is the whole trick. A painter's-algorithm floor is drawn
 * before everything standing on it, so anything hanging BELOW it paints over
 * the floor in front of the hole rather than being hidden by it — fill the
 * well with a solid mass and the stairwell reads as a wall standing on the
 * carpet. Slabs one riser thick spill four pixels instead of seventy, and the
 * dark between them is what makes the well look deep.
 */
const TREAD_SLAB = 0.2;

function stairMass(links: Link[]): Obstacle[] {
  const solid: Obstacle[] = [];
  for (const link of links) {
    // A ramp is the accessible route by definition — leave it drivable. It is
    // also the only way between the hall and the concourse until stairs work.
    if (link.id === 'wheelchair-ramp') continue;

    const { bounds: b, rise, axis, ascending } = link;
    const treads = Math.min(MAX_TREADS, Math.max(3, Math.round(rise / RISER)));
    const drawnRise = Math.min(rise, DRAWN_RISE);
    const run = axis === 'y' ? b.h : b.w;
    const step = run / treads;

    if (link.to !== link.from) {
      /*
       * Line the two sides of the well you can actually see.
       *
       * The flight descends away from the floor it arrives on, leaving the
       * upper part of the shaft open — and the renderer paints only the south
       * and west faces of a box, so the shaft's north and east walls are the
       * only ones in view and nothing was drawing them. The gap came out as
       * background: a black hole in the carpet rather than a stairwell.
       *
       * A wafer standing on each of those two rims shows exactly that face and
       * nothing else. Emitted before the treads so they sort in front of it,
       * and given the link's id so it obeys the same stair rule — a wall to
       * whoever the flight is a wall to, and nothing to anyone else.
       */
      const t = 0.05;
      for (const liner of [
        rect(b.x, b.y + b.h - t, b.w, t), // north rim: its south face lines the well
        rect(b.x + b.w - t, b.y, t, b.h), // east rim: its west face does
      ]) {
        solid.push({ floor: link.to, bounds: liner, height: 0, base: -drawnRise, linkId: link.id });
      }
    }

    for (let i = 0; i < treads; i += 1) {
      // `i` counts along +axis; height follows the climb direction.
      const fraction = (ascending ? i + 1 : treads - i) / treads;
      const tread =
        axis === 'y'
          ? rect(b.x, b.y + i * step, b.w, step)
          : rect(b.x + i * step, b.y, step, b.h);

      solid.push({
        floor: link.from,
        bounds: tread,
        // Drawn from the link's own base, so the grand flight starts at
        // concourse level rather than sinking through it.
        height: link.base + drawnRise * fraction,
        // Solid to anything that cannot climb this flight, walkable to
        // anything that can. Sim.resolveObstacles reads it.
        linkId: link.id,
      });

      if (link.to === link.from) continue;

      /*
       * The same flight, seen from the floor it ARRIVES on.
       *
       * Upstairs a staircase is not a block standing on the carpet, it is a
       * stepped mass hanging in a well — the landing is flush with the floor
       * and every tread below it is under your feet. Emitting only the `from`
       * side is why the flights were invisible on the auditorium level and why
       * a robot standing up there drove over the stairwell as though the floor
       * were solid.
       *
       * These are the same rectangles, so they carry the same linkId and the
       * stair rule applies unchanged: Voxxy steps onto the landing and walks
       * down, Biggy meets the well as a wall.
       */
      const below = -drawnRise * (1 - fraction);
      solid.push({
        floor: link.to,
        bounds: tread,
        height: below,
        base: below - TREAD_SLAB,
        linkId: link.id,
      });
    }
  }
  return solid;
}

// ---------------------------------------------------------------------------

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [
    ...exhibitionColumns(),
    ...HALL_CUTAWAYS,
    ...auditoriumSeating,
    ...stairMass(staircases),
    ...derivedWalls([...floor0Rooms, ...floor1Rooms], staircases),
  ],
  links: staircases,
  extents: {
    0: rect(HALL.x, -62, HALL.w + 13, 74),
    1: rect(-46, SOUTH_END, 92, 150),
  },
};

/** Named spawn points, so chapters do not hard-code coordinates. */
export const SPAWNS = {
  /** Inside the main entrance, looking north up the reception concourse. */
  /** Inside the main entrance, east of the grand stair. */
  mainEntrance: { floor: 0 as const, x: 18, y: -57 }, // 1.2 m up, in the concourse
  /** Where the concourse opens into the hall. */
  // Between the two southernmost column rows, which sit at y -27.05 and -33.58.
  hallEntrance: { floor: 0 as const, x: 2, y: -30.3 },
  /**
   * Centre of the hall, on the aisle midway between two rows of columns.
   *
   * A chapter lines its whole cast up east of this point, so what has to be
   * clear is the ROW, not the point. The column rows nearest here sit at
   * y -20.87 and -27.05, so -24 is over 3 m from either and clears Biggy's
   * 0.72 m for any x along the row. It is also 3 m south of the staircases,
   * which stand in the middle of the hall — the cast used to spawn inside
   * one of them, and the collision solver threw it 340 km.
   *
   * Worth knowing when driving: the grid is square and the isometric screen
   * axes sit at 45° to it, so holding right or left tracks a line of columns
   * and meets one every 9.2 m. That is the hall doing its job — but it means
   * a straight screen-axis run is never the fast way across.
   */
  hallCentre: { floor: 0 as const, x: 0, y: -24 },
  /**
   * The foot of the west flight — its SOUTH end. Approach from the north and
   * you meet the top of the flight, which is a storey of wall.
   */
  stairFoot: { floor: 0 as const, x: -6.0, y: -23.5 },
  /** The south end of the corridor, between Rooms 6 and 7. */
  corridorSouth: { floor: 1 as const, x: 0, y: -51.5 },
  corridorNorth: { floor: 1 as const, x: 0, y: 58 },
  /** Outside the keynote room. Chapter III's destination. */
  // In the corridor outside Room 8, not inside its seating — the cast lines
  // up eastward from here and Room 8's first seat bank starts 2.5 m in.
  keynoteDoor: { floor: 1 as const, x: -3, y: -31 },
  foyer: { floor: 1 as const, x: -24, y: 55 },
};
