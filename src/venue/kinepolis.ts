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
  type Decor,
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
 * building, so the upper landing is at the south end and the foot is here.
 * That is also the better view: the high end is the near end on screen, so the
 * flight steps away from the camera instead of hiding its own descent behind
 * the landing.
 *
 * SET AGAINST THE COLUMN GRID, not typed in. The flights stand in the bay
 * immediately behind the second row of columns, which is where `booth-map.png`
 * draws them — the pair either side of "Conference entrance", between Areas #1
 * and #2 at the back of the hall. They had been two bays south of that, which
 * put them in the middle of the floor: the plan has them 6.7 to 19.5 m off the
 * north wall and this had them at 21.8 to 33.0.
 *
 * Anchoring it to `COLUMN_Y` rather than restating a number is the point. Both
 * were read off the same drawing, and the columns are the thing in the hall you
 * can see the stairs standing between.
 */
const STAIR_FOOT_Y = HALL.y + HALL.h - COLUMN_Y[1] + STAIR_RUN;

const STAIR_WEST = rect(-CORRIDOR_HALF, STAIR_FOOT_Y - STAIR_RUN, STAIR_WIDTH, STAIR_RUN);
const STAIR_EAST = rect(CORRIDOR_HALF - STAIR_WIDTH, STAIR_FOOT_Y - STAIR_RUN, STAIR_WIDTH, STAIR_RUN);

/**
 * Tread depth, metres — how much floor each step of a flight takes up.
 *
 * With the building's 0.18 m riser this is a 31 degree stair, which is what
 * every flight in here except one already was. The grand flight was typed in
 * at 5.6 m deep for a 5.0 m rise, which is 28 steps of 20 cm: an 89% gradient
 * and a tread you cannot get a foot on. It read as a cliff standing in the
 * middle of the reception concourse, because that is what it was.
 *
 * So the run is DERIVED from the rise rather than measured off a drawing. A
 * flight's depth is not a free choice — it is the rise divided by the riser,
 * times this — and the plans do not carry a scale bar accurate enough to argue
 * with arithmetic.
 */
const GOING = 0.3;

/** How deep a flight has to be to climb `rise` metres at the building's riser. */
function runFor(rise: number): number {
  return Math.round(rise / RISER) * GOING;
}

/**
 * The grand flight out of the reception concourse — see the Link below.
 *
 * Its long axis is the one you walk ACROSS: 14.3 m wide, the full width of the
 * corridor it delivers you to, and 8.4 m deep for the 5.0 m it has to climb.
 */
const GRAND_STAIR = rect(
  -CORRIDOR_HALF,
  -59.5,
  CORRIDOR_HALF * 2,
  runFor(FLOOR_HEIGHT - CONCOURSE_LEVEL),
);

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

/**
 * Rooms the plan enters against the alternation.
 *
 * Room 8 is the only one. `cinema-venue-devoxx.png` draws its entrance as a
 * pair of doors a fifth of the way down its frontage from the NORTH end, where
 * the alternation puts it at the south — it shares its lobby with Room 9
 * rather than with Room 7, and Rooms 7 and 8 are both entered from the north
 * with no alternation between them at all.
 *
 * Kept as an exception rather than smuggled into the rule, because it is one:
 * thirteen rooms alternate and one does not. Inventing a cleverer formula that
 * happens to produce this would be fitting a curve to a single point.
 */
const ROOMS_AGAINST_ALTERNATION = new Set([8]);

function auditoriums(): {
  rooms: Room[];
  solids: Obstacle[];
  decor: Decor[];
  links: Link[];
} {
  const rooms: Room[] = [];
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];
  const links: Link[] = [];

  const place = (list: Auditorium[], side: -1 | 1, gapAfter = 0): number => {
    let y = SOUTH_END;
    for (const aud of list) {
      const x = side === -1 ? -CORRIDOR_HALF - aud.depth : CORRIDOR_HALF;
      const bounds = rect(x, y, aud.depth, aud.frontage);

      /**
       * A band of the room `d0` to `d1` deep from the SCREEN wall, running the
       * full frontage. Depth from the screen rather than from the corridor
       * because everything in here — stage, rake, seating — is laid out from
       * the screen back, and the two ends swap sides between the west rooms
       * and the east ones.
       */
      const depthAt = (d0: number, d1: number): Rect =>
        side === -1
          ? rect(bounds.x + d0, bounds.y, d1 - d0, bounds.h)
          : rect(bounds.x + bounds.w - d1, bounds.y, d1 - d0, bounds.h);

      // Odd rooms are entered at one end of their frontage, even rooms at the
      // other — the alternation this building mostly uses. Decided once: the
      // wall builder puts the door here and the seating leaves its wide aisle
      // here, and those two must never disagree.
      //
      // Two things overrule it, and both say the same thing about the rule.
      // ROOMS_AGAINST_ALTERNATION is the plan simply not alternating; and a
      // staircase parked against the chosen end is a doorway with 2.3 m of
      // flight in front of it, which is not a way in. The alternation is a
      // pattern, not a law; a building puts the door where there is room for
      // one.
      let doorSide: 'low' | 'high' = aud.number % 2 === 1 ? 'high' : 'low';
      if (ROOMS_AGAINST_ALTERNATION.has(aud.number)) {
        doorSide = doorSide === 'low' ? 'high' : 'low';
      }
      if (doorBlocked(bounds, side, doorSide)) {
        doorSide = doorSide === 'low' ? 'high' : 'low';
      }

      // One riser per row, so a deeper room does not rake more STEEPLY — every
      // auditorium in the building runs at 18% — it just falls further. Room 8
      // drops 4.50 m from its doors to its stage; Room 2 drops 2.16 m.
      const rake = rakeOf(bounds);

      /*
       * Everything from the screen wall back to the cross-aisle is NOT this
       * room's flat plate — it is the rake, and the stage at the bottom of it.
       * Cut it out of the plate so the flat floor is not painted over the
       * steps descending through it; `voids` is render-only, and what stands
       * in for the floor there is the rake's own treads.
       */
      const stage = stageDepth(bounds);
      const raked = depthAt(stage, stage + seatRows(bounds) * ROW_PITCH);
      // The plate is cut from the screen wall right back to the cross-aisle —
      // the stage as well as the rake. Cutting only the rake left this room's
      // flat floor still painted across its stage, four and a half metres in
      // the air over the stage's own plate and the letters standing on it.
      const dropped = depthAt(0, stage + seatRows(bounds) * ROW_PITCH);

      rooms.push({
        id: `aud-${aud.number}`,
        label: `Room ${aud.number}`,
        kind: 'auditorium',
        floor: 1,
        bounds,
        doorSide,
        rake,
        voids: [dropped],
      });

      /*
       * The stage: a flat plate a whole rake BELOW the corridor you came in
       * from. This is the thing the evaluation was really about — a level
       * change inside a storey, expressed the way the building expresses it,
       * with the same two primitives the reception concourse already uses. A
       * plate at a height, and a flight of steps down to it.
       */
      rooms.push({
        id: `aud-${aud.number}-stage`,
        label: `Room ${aud.number} stage`,
        kind: 'stage',
        floor: 1,
        bounds: depthAt(0, stage),
        elevation: -rake,
      });

      /*
       * The rake itself, as a flight of steps one tread per row of seats.
       *
       * It covers the whole seating footprint rather than just the aisles,
       * which is not a simplification: the seat banks are solid, so the only
       * part of this rectangle a robot can ever stand in IS the aisles. One
       * link does what twenty-eight would.
       *
       * Riser 0.18, so the stair rule decides who gets to the front: Voxxy and
       * Droid walk down, and Biggy — which climbs nothing — can reach the back
       * row of every auditorium in the building and no further.
       */
      links.push({
        id: `rake-${aud.number}`,
        from: 1,
        to: 1,
        bounds: raked,
        // Measured from the storey datum, which is the top of the rake: the
        // corridor is flush with the back row and the stage is DOWN from it.
        base: -rake,
        rise: rake,
        axis: 'x',
        // Height rises toward the corridor, and the corridor is east of the
        // west rooms and west of the east ones.
        ascending: side === -1,
        riser: RISER,
      });

      const fitOut = seatingFor(bounds, side, doorSide);
      solids.push(...fitOut.banks);
      decor.push(...fitOut.decor);
      solids.push(...presenterDesk(bounds, side));
      if (SIGNED_ROOMS.has(aud.number)) {
        const sign = devoxxSign(bounds, side);
        solids.push(...sign.solids);
        decor.push(...sign.decor);
      }
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

  return { rooms, solids, decor, links };
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
 * Row pitch, metres — and not a free choice.
 *
 * The auditorium plan carries no scale bar and was scaled by assuming exactly
 * this: 10 px between the drawn seat rows, a cinema row being ~1.0 m. Every
 * dimension on floor 1 rests on it, so the seating has to be laid out at the
 * same pitch or the building disagrees with the ruler used to measure it.
 */
export const ROW_PITCH = 1.0;

/** Seat pitch across a row, metres, and the seat inside it. */
export const SEAT_PITCH = 0.52;
const SEAT_WIDTH = 0.46;
/** Front to back. The rest of the row pitch is legroom. */
const SEAT_DEPTH = 0.52;
/**
 * How thick a tread is DRAWN when it hangs below the storey datum, metres.
 *
 * A flight rising out of a floor is a solid mass standing on it — that is what
 * a staircase looks like and it is what this drew. A rake descending BELOW the
 * floor is not: filled down to the stage, the nearest step of an east-side
 * auditorium becomes a 4.5 m wall across the room and you never see the
 * seating behind it. Drawn as a slab instead you see what you would really
 * see, which is the tread and the riser under it, with the next step showing
 * above. Thicker than one riser, so consecutive slabs overlap and the terrace
 * has no gaps in it.
 */
const TREAD_SLAB = 0.25;

/** Height of a seat back above the tier it stands on, metres. */
const SEAT_BACK = 0.85;

/** Depth behind the back row: the cross aisle you enter along. */
const CROSS_AISLE = 2.5;

/**
 * Depth of the stage — the flat plate in front of the first row, where the
 * screen is and where a person stands to talk.
 *
 * A FRACTION of the room, not a fixed 2 m. Two metres was a gangway rather
 * than a stage: the presenter's desk nearly filled it, and it is where Devoxx
 * puts a speaker, a lectern and a demo table. Room 8's is now 3.9 m.
 *
 * Proportional because the depth comes out of the SEATING — which is what
 * happens in a real building, one with a proper stage in it seats fewer people
 * — and a flat 4 m costs a 16 m screening room more than twice what it costs
 * the 30 m keynote hall. Room 2 lost a fifth of its seats to a stage it would
 * never have been built with. Big rooms take the full stage, small rooms take
 * the floor, and the cross aisle you walk in on is untouched either way.
 */
const STAGE_MIN = 2.4;
const STAGE_MAX = 4.0;
const STAGE_FRACTION = 0.13;

function stageDepth(room: Rect): number {
  return Math.min(STAGE_MAX, Math.max(STAGE_MIN, room.w * STAGE_FRACTION));
}

/**
 * How many rows of seats a room holds — and therefore how hard it rakes.
 *
 * One building riser per row, so a room's rake is `rows × RISER` and nothing
 * else. Deriving it rather than picking it is what keeps the three things that
 * must agree in step: the tier a seat stands on, the tread a robot climbs, and
 * the depth the stage sits below the corridor. Room 8 comes out at 25 rows and
 * 4.50 m, which is a 17.5% rake — a real multiplex number.
 */
function seatRows(room: Rect): number {
  return Math.floor((room.w - CROSS_AISLE - stageDepth(room)) / ROW_PITCH);
}

function rakeOf(room: Rect): number {
  return seatRows(room) * RISER;
}

/**
 * Seating, in three parts that all come off ONE envelope.
 *
 * A robot meets a block of seating; a player sees seats. Those are different
 * resolutions of the same thing and they must not be two descriptions of it —
 * so `widthAt` is the auditorium's fan, and the collision banks, the terracing
 * and the individual seats are all sampled from it. Move the taper and all
 * three move together.
 *
 * What the player sees is `decor`: a tier per row and a box per seat, five
 * thousand of them across the building. What a robot meets is `banks`: the
 * same three blocks as before, now `hidden`, because a 120 Hz solver has no
 * business testing five thousand rectangles to answer a question one rectangle
 * already answers — and because nothing can ever get between two seats anyway.
 * Biggy is 1.44 m across and a seat is 0.52 m wide.
 *
 * Rows run unbroken with the aisles against the side walls, which is what this
 * multiplex does — no gangway up the middle. It changes how the room drives:
 * crossing an auditorium means committing to one side of it.
 */
function seatingFor(
  room: Rect,
  side: -1 | 1,
  doorSide: 'low' | 'high',
): { banks: Obstacle[]; decor: Decor[] } {
  const banks: Obstacle[] = [];
  const decor: Decor[] = [];
  const stages = 3;

  const doorEdge = side === -1 ? room.x + room.w : room.x;
  const rows = seatRows(room);
  /** Depth of seating: exactly one row pitch per row, so a row is a tread. */
  const depth = rows * ROW_PITCH;
  /**
   * Depth from the doors to the back row. Whatever the row pitch does not
   * divide into goes here rather than into the rake — the cross-aisle is the
   * flexible dimension in a real auditorium, and the rake is not: every one of
   * its steps has to land on a row of seats.
   */
  const lead = room.w - stageDepth(room) - depth;
  const bankDepth = depth / stages;

  // The seating sits away from the doors, so the wide aisle and the entrance
  // are on the same side of the room.
  const full = room.h - DOOR_AISLE - FAR_AISLE;

  /**
   * How wide the seating is, `t` of the way from the back row to the screen.
   *
   * The room is a rectangle because the collision system speaks rectangles,
   * but the real ones are fans. This is the fan, and it is the only place it
   * is stated: the collision banks, the terracing and the seats all sample it.
   *
   * Stated as a MEAN and a SPREAD about the middle row rather than as a taper
   * off the back, because those two numbers do different jobs and used to be
   * one. The mean sets how many seats the building holds. The spread sets how
   * fan-shaped a room looks, and costs nothing.
   *
   * The spread WAS the whole 0.26 taper, which put 26% of Room 8's frontage
   * into the aisle by the time you reached the front row: 13.2 m of seating in
   * a 22.2 m room, with 7.8 m of empty floor down one side. A real auditorium
   * is that shape and at this zoom it reads as a funnel. 0.09 keeps the rooms
   * visibly fanned without pinching their fronts.
   *
   * The mean is 0.94 because the stages are 4 m. It was 0.87, tuned to land
   * the building within ten seats of the 5183 printed on the plan — and giving
   * every room a stage a person can stand on took two rows out of the big ones
   * and 365 seats out of the building. Widening the rows puts them back: 5221
   * against 5183. The rooms now hold the right number of people in a slightly
   * different shape, which is the trade the plan cannot arbitrate and is the
   * one deliberate departure from it in here.
   */
  const SEAT_FAN_MEAN = 0.94;
  const SEAT_FAN_SPREAD = 0.09;
  const widthAt = (t: number): number =>
    full * (SEAT_FAN_MEAN + SEAT_FAN_SPREAD * (0.5 - t));

  /**
   * CENTRE each row in the seatable width, so the fan opens both aisles.
   *
   * This pinned the far edge, which meant every millimetre the fan narrowed
   * came out of the door-side aisle alone: by the front row of Room 8 that
   * aisle was 7.8 m wide against 1.2 m on the far side, and a room with all
   * its empty floor down one side reads as a mistake rather than as a shape.
   * Splitting it keeps the way in the wider of the two — it starts 2 m wider
   * and both grow by the same amount — which is the property pinning was
   * protecting in the first place.
   *
   * The aisle to offset by is the one on the LOW side, which is the door's
   * when the door is low and the far aisle's when it is not. Adding both —
   * which this did at first — pushes the seating a whole far aisle up the
   * room, and the far side of every low-door auditorium lost its aisle
   * entirely: 0.12 m of gap in Room 12, against the 1.2 m it should have.
   */
  const yOf = (width: number): number =>
    room.y + (doorSide === 'low' ? DOOR_AISLE : FAR_AISLE) + (full - width) / 2;

  // -- what a robot meets: three blocks, and no longer drawn ----------------
  for (let s = 0; s < stages; s += 1) {
    const bankH = widthAt(s / stages);
    if (bankH <= 0.6) continue;
    const x = side === -1 ? doorEdge - lead - (s + 1) * bankDepth : doorEdge + lead + s * bankDepth;
    banks.push({
      floor: 1,
      bounds: rect(x, yOf(bankH), bankDepth - 0.4, bankH),
      height: 0.95,
      hidden: true,
    });
  }

  // -- what the player sees: a seat on every tread of the rake --------------
  for (let r = 0; r < rows; r += 1) {
    // 0 at the back row, 1 at the screen. Depth, width and height all read off
    // this one number, so a row cannot be wide in one and narrow in another.
    const t = (r + 0.5) / rows;
    const width = widthAt(t);
    if (width < SEAT_PITCH) continue;
    const y = yOf(width);

    /*
     * One riser per row, down from the corridor.
     *
     * The rake used to be drawn as a climb of about a third of its real rise,
     * because a 4.5 m mound of seating went straight through the renderer's
     * 2.7 m cutaway. Reading it as a DESCENT — which is what walking into a
     * cinema is — makes that problem disappear: the cut only ever trims what
     * stands above the floor, and every row of this is below it.
     *
     * It also makes the number honest. The tread a robot walks on is at
     * exactly this height, because both are `RISER` times the row index.
     */
    const tier = -r * RISER;

    // The row's own band of floor, and the edge of it the seat backs stand on:
    // the far edge from the screen, with the legroom in front of it.
    const bandX = side === -1
      ? doorEdge - lead - (r + 1) * ROW_PITCH
      : doorEdge + lead + r * ROW_PITCH;
    const seatX = side === -1 ? bandX + ROW_PITCH - SEAT_DEPTH : bandX;

    /*
     * The tread this row stands on, drawn only down the aisles.
     *
     * Between the aisles every row is hidden by the seats on the row in front
     * of it — a seat back is 0.85 m and a row is 0.18 m lower and a metre
     * nearer, so it covers its own legroom and then some. The aisles are the
     * whole of what you see of an auditorium floor, and they are also the only
     * part of it a robot can stand on.
     */
    for (const [from, to] of [
      [room.y, y],
      [y + width, room.y + room.h],
    ]) {
      if (to - from < 0.05) continue;
      decor.push({
        floor: 1,
        bounds: rect(bandX, from, ROW_PITCH, to - from),
        base: tier - TREAD_SLAB,
        height: tier,
        material: 'structure',
      });
    }

    const seats = Math.floor(width / SEAT_PITCH);
    // Centre the seats in the row: the half seat the pitch does not divide
    // into becomes a little more elbow room at each end, not a gap at one.
    const first = y + (width - seats * SEAT_PITCH) / 2 + (SEAT_PITCH - SEAT_WIDTH) / 2;
    for (let n = 0; n < seats; n += 1) {
      decor.push({
        floor: 1,
        bounds: rect(seatX, first + n * SEAT_PITCH, SEAT_DEPTH, SEAT_WIDTH),
        base: tier,
        height: tier + SEAT_BACK,
        material: 'seat',
      });
    }
  }

  return { banks, decor };
}

// ---------------------------------------------------------------------------
// The letters on the stage
// ---------------------------------------------------------------------------

/**
 * `#DEVOXX` stands on the stage of the two biggest rooms, in letters about as
 * tall as Voxxy — white, with the last X in the conference's orange.
 *
 * Photographed in `references/venue/photos/54836008506_68c9fc5562_k.jpg`:
 * freestanding letters on the apron in front of the screen, lit from the
 * screen behind them, the whole word a little over a third of the screen's
 * width. It is the single most recognisable thing in the building after the
 * column grid, and it is the object that tells a judge which conference this
 * is without a line of text on the HUD.
 *
 * ANACHRONISM, deliberate and flagged: the venue is defined once and the
 * chapters may only re-dress it, so the letters stand in Chapter II as well,
 * where the conference was still called JavaPolis. The alternative is
 * chapter-dependent geometry, which rule 2 forbids and which would cost far
 * more than this costs.
 */
const SIGN_TEXT = '#DEVOXX';

/** Rooms 5 and 8 — the two biggest, and the only two with a keynote stage. */
const SIGNED_ROOMS = new Set([5, 8]);

const GLYPH_HEIGHT = 1.5;
const GLYPH_WIDTH = 1.25;
const GLYPH_GAP = 0.25;
/** Thickness of a letter front to back, metres. */
const SIGN_DEPTH = 0.3;
/** Width of the stroke a letter is drawn with, metres. */
const SIGN_STROKE = 0.22;

/** A stroke of a letter, in glyph space: u across (0..1), v up (0..1). */
interface Bar {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/**
 * A diagonal, as a stair of upright bars.
 *
 * The renderer extrudes plan rectangles and nothing else, which is the whole
 * reason the building is cheap to draw — so a true diagonal is not available
 * and a stepped one is. At this scale each step is about five pixels, which
 * reads as a diagonal and is in any case a blockout: everything here is boxes.
 */
function diagonal(u0: number, v0: number, u1: number, v1: number, steps = 10): Bar[] {
  const bars: Bar[] = [];
  const half = SIGN_STROKE / GLYPH_WIDTH / 2;
  for (let i = 0; i < steps; i += 1) {
    const u = u0 + (u1 - u0) * ((i + 0.5) / steps);
    bars.push({
      u0: u - half,
      u1: u + half,
      v0: v0 + (v1 - v0) * (i / steps),
      v1: v0 + (v1 - v0) * ((i + 1) / steps),
    });
  }
  return bars;
}

/**
 * The seven glyphs the sign needs, as strokes. Not a font — a font is a
 * project, and `#DEVOXX` is seven letters that never change.
 */
function glyph(character: string): Bar[] {
  const su = SIGN_STROKE / GLYPH_WIDTH; // stroke width, across
  const sv = SIGN_STROKE / GLYPH_HEIGHT; // stroke width, up
  switch (character) {
    case '#':
      return [
        { u0: 0.22, u1: 0.22 + su, v0: 0.04, v1: 0.96 },
        { u0: 0.62, u1: 0.62 + su, v0: 0.04, v1: 0.96 },
        { u0: 0.04, u1: 0.96, v0: 0.3, v1: 0.3 + sv },
        { u0: 0.04, u1: 0.96, v0: 0.64, v1: 0.64 + sv },
      ];
    case 'D':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        { u0: su, u1: 0.78, v0: 1 - sv, v1: 1 },
        { u0: su, u1: 0.78, v0: 0, v1: sv },
        { u0: 0.78, u1: 0.78 + su, v0: sv, v1: 1 - sv },
      ];
    case 'E':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        { u0: su, u1: 0.92, v0: 1 - sv, v1: 1 },
        { u0: su, u1: 0.84, v0: 0.5 - sv / 2, v1: 0.5 + sv / 2 },
        { u0: su, u1: 0.92, v0: 0, v1: sv },
      ];
    case 'V':
      return [...diagonal(0.08, 1, 0.46, 0), ...diagonal(0.54, 0, 0.92, 1)];
    case 'O':
      return [
        { u0: 0, u1: su, v0: sv, v1: 1 - sv },
        { u0: 1 - su, u1: 1, v0: sv, v1: 1 - sv },
        { u0: 0, u1: 1, v0: 1 - sv, v1: 1 },
        { u0: 0, u1: 1, v0: 0, v1: sv },
      ];
    case 'X':
      return [...diagonal(0.06, 0, 0.94, 1), ...diagonal(0.94, 0, 0.06, 1)];
    default:
      return [];
  }
}

/**
 * The sign, placed on the stage of one auditorium.
 *
 * Each letter is solid to a robot as one block; the strokes are dressing.
 * Otherwise a robot could drive through the counter of a D.
 */
function devoxxSign(room: Rect, side: -1 | 1): { solids: Obstacle[]; decor: Decor[] } {
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];

  const glyphs = [...SIGN_TEXT];
  const length = glyphs.length * GLYPH_WIDTH + (glyphs.length - 1) * GLYPH_GAP;

  // The screen end of the room, a metre off the wall, standing on the 2 m of
  // stage the seating leaves in front of it.
  const x = side === -1 ? room.x + 0.7 : room.x + room.w - 0.7 - SIGN_DEPTH;

  /**
   * Which way the word runs along the frontage — and the one place in this
   * file where the camera wins over the building.
   *
   * The two rooms face each other across the corridor, so their audiences look
   * in opposite directions, so honestly modelled their signs do too. The
   * camera is fixed to the south-west and never moves: it reads Room 8's
   * letters from the front and Room 5's from behind, for the whole game. A
   * word that is mirrored in every frame it ever appears in does not read as a
   * point of view, it reads as a bug.
   *
   * So both words run the way the screen reads, -y being screen right. Room 5
   * pays for it: its letters are laid out for a viewer standing where its
   * audience is not. Same call as `drawnRise` on the staircases and the 2.7 m
   * cutaway — where the building and the camera disagree about something the
   * player can see, the camera wins, and it is written down.
   */
  const run = -1;
  const start = room.y + room.h / 2 - (run * length) / 2;

  glyphs.forEach((character, index) => {
    const at = start + run * (index * (GLYPH_WIDTH + GLYPH_GAP));
    const uOf = (u: number): number => at + run * u * GLYPH_WIDTH;
    // The last X is the one in the accent colour — the X of the wordmark.
    const material = index === glyphs.length - 1 ? 'signAccent' : 'sign';

    solids.push({
      floor: 1,
      bounds: rect(x, Math.min(at, uOf(1)), SIGN_DEPTH, GLYPH_WIDTH),
      height: GLYPH_HEIGHT,
      hidden: true,
    });

    for (const bar of glyph(character)) {
      const y0 = Math.min(uOf(bar.u0), uOf(bar.u1));
      const y1 = Math.max(uOf(bar.u0), uOf(bar.u1));
      decor.push({
        floor: 1,
        bounds: rect(x, y0, SIGN_DEPTH, y1 - y0),
        base: bar.v0 * GLYPH_HEIGHT,
        height: bar.v1 * GLYPH_HEIGHT,
        material,
      });
    }
  });

  return { solids, decor };
}

// ---------------------------------------------------------------------------
// The presenter's desk
// ---------------------------------------------------------------------------

/**
 * A draped trestle table with the branded lectern beside it, on the stage of
 * every auditorium.
 *
 * Photographed in the same frame as the letters
 * (`references/venue/photos/54836008506_68c9fc5562_k.jpg`): a cloth over the
 * table reaching almost to the floor, and a slim folding lectern to the
 * audience's left of it carrying the wordmark. Both were measured off that
 * photograph against the seats in the foreground — a seat back gives the
 * scale, and the ratio of a thing's height to its width survives the
 * perspective even where its absolute size does not.
 *
 * In EVERY room, not just the two with letters. Fourteen rooms with a desk in
 * each is what makes this a conference centre rather than a multiplex: it is
 * the object that says a person stood here and talked, and Chapter I is about
 * the fact that nobody does any more.
 *
 * Solid, and drawn from the same rectangle it collides with — unlike the seats
 * and the letters, a table's shape and its collision shape are the same thing.
 */
const TABLE_WIDTH = 1.9;
const TABLE_DEPTH = 0.8;
const TABLE_HEIGHT = 0.75;
const LECTERN_WIDTH = 0.7;
const LECTERN_DEPTH = 0.5;
const LECTERN_HEIGHT = 1.2;

/** Gap between the lectern and the table, metres. They nearly touch. */
const DESK_GAP = 0.15;

/** How far the front of the desk stands off the screen wall, metres. */
const DESK_STANDOFF = 1.35;

/**
 * How far the desk sits in from the side wall it stands by, metres.
 *
 * Wide enough that Biggy — 1.44 m across — can still get onto the stage past
 * it in the rooms where this end is also the end the doors are on. A metre and
 * a half looked fine on the plan and left three centimetres.
 */
const DESK_INSET = 2.0;

/**
 * The desk stands at the NORTH end of every stage, and that is the camera
 * talking rather than the building.
 *
 * Isometric from the south-west: a room's north wall is the far one and its
 * south wall stands between the stage and the viewer. A 1.2 m lectern needs
 * three metres of clearance to show above a 2.7 m wall drawn in front of it,
 * and against the south wall it has one and a half — so in the seven rooms
 * whose doors are at that end, the lectern was simply gone. Not occluded
 * interestingly: absent.
 *
 * The real building has no opinion here — a desk goes where the AV crew put
 * it, and these rooms mirror each other anyway — so this costs no honesty and
 * buys a presenter's desk you can see in all fourteen. Same call as the
 * direction the letters read in.
 */
function presenterDesk(room: Rect, side: -1 | 1): Obstacle[] {
  /** A box `d0` to `d1` deep from the screen wall, `span` wide from `y`. */
  const at = (d0: number, d1: number, y: number, span: number): Rect =>
    side === -1
      ? rect(room.x + d0, y, d1 - d0, span)
      : rect(room.x + room.w - d1, y, d1 - d0, span);

  // Measured from the north wall, running back toward the centre of the stage.
  const along = (a: number, span: number): number => room.y + room.h - a - span;

  return [
    {
      floor: 1,
      bounds: at(
        DESK_STANDOFF - LECTERN_DEPTH,
        DESK_STANDOFF,
        along(DESK_INSET, LECTERN_WIDTH),
        LECTERN_WIDTH,
      ),
      height: LECTERN_HEIGHT,
      material: 'desk',
    },
    {
      floor: 1,
      bounds: at(
        DESK_STANDOFF - TABLE_DEPTH,
        DESK_STANDOFF,
        along(DESK_INSET + LECTERN_WIDTH + DESK_GAP, TABLE_WIDTH),
        TABLE_WIDTH,
      ),
      height: TABLE_HEIGHT,
      material: 'desk',
    },
  ];
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
function derivedWalls(rooms: Room[], links: Link[]): { walls: Obstacle[]; decor: Decor[] } {
  const walls: Obstacle[] = [];
  const decor: Decor[] = [];
  const seen = new Set<string>();

  for (const room of rooms) {
    // A stage is a PLATE, not an enclosure: a piece of floor lying inside the
    // auditorium it belongs to, at the foot of that room's rake. The room
    // around it already owns every wall it has, and letting it emit its own
    // put a second, shorter wall on top of each of them — identical in space,
    // different in extent, so the dedupe below could not see it.
    if (room.kind === 'stage') continue;

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

          /*
           * A wall running ALONG a flight has to step down with it.
           *
           * Every wall in the building used to be one rectangle standing on
           * one height, looked up at its own centre — fine while a room was
           * flat, and wrong the moment an auditorium floor started dropping
           * 4.5 m from its doors to its stage. The two side walls of every
           * room hung at corridor level over a floor that had gone, and you
           * could see under them into the void.
           *
           * The rectangle stays, because collision does not care about height
           * and one rectangle is cheaper than twenty-five. What is DRAWN is
           * cut into the same bands the treads use — literally the same
           * function — so the wall and the floor beside it cannot drift.
           */
          /*
           * The flight this wall runs along — and it has to be THIS room's.
           *
           * A party wall sits on the line between two auditoriums, so it
           * grazes the neighbour's rake by the half-thickness of the wall, and
           * `find` returned whichever of the two came first in the list. Room
           * 8's south wall was being cut to Room 7's rake, which ends eight
           * metres short of it: everything past that got no surface, fell back
           * to the room's flat plate, and hung four metres over Room 8's stage.
           *
           * A room's own flight is the one inside it. Nothing else is.
           */
          const rake = links.find(
            (l) =>
              l.from === l.to &&
              l.from === room.floor &&
              l.rise > 0 &&
              l.axis === (edge.horizontal ? 'x' : 'y') &&
              within(room.bounds, l.bounds),
          );
          if (!rake) {
            walls.push({ floor: room.floor, bounds, height: WALL_HEIGHT });
            continue;
          }

          walls.push({ floor: room.floor, bounds, height: WALL_HEIGHT, hidden: true });
          for (const part of alongBands(bounds, edge.horizontal, coarsen(treadsOf(rake), WALL_STEP))) {
            decor.push({
              floor: room.floor,
              bounds: part.bounds,
              // Outside the flight the renderer finds the plate underneath on
              // its own, which is right: those ends stand on the cross-aisle
              // at the top and the stage at the bottom. Over the flight it
              // must NOT, because `treadsOf` already answered from the storey
              // datum — hence the linkId, which is what tells it apart.
              base: part.surface,
              height: (part.surface ?? 0) + WALL_HEIGHT,
              linkId: part.surface === undefined ? undefined : rake.id,
            });
          }
        }
      }
    }
  }
  return { walls, decor };
}

/**
 * Treads per drawn step of a wall running alongside a flight.
 *
 * The wall has to reach the floor or you see under it, and following every
 * tread exactly costs 564 pieces and about 3 ms a frame on the auditorium
 * level. Two treads to a step halves that for a bottom edge that sits at most
 * one riser — five pixels — below the floor it meets, which is under the
 * seating and the aisle slabs anyway. Four was cheaper again and started to
 * show as a lip along the aisle.
 */
const WALL_STEP = 2;

/** Group treads `n` at a time, keeping the LOWER surface so nothing floats. */
function coarsen(
  bands: { from: number; to: number; surface: number }[],
  n: number,
): { from: number; to: number; surface: number }[] {
  const out = [];
  for (let i = 0; i < bands.length; i += n) {
    const group = bands.slice(i, i + n);
    out.push({
      from: group[0].from,
      to: group[group.length - 1].to,
      surface: Math.min(...group.map((b) => b.surface)),
    });
  }
  return out;
}

/** Is `inner` wholly inside `outer`? Tolerant by a millimetre, for rounding. */
function within(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - 1e-3 &&
    inner.y >= outer.y - 1e-3 &&
    inner.x + inner.w <= outer.x + outer.w + 1e-3 &&
    inner.y + inner.h <= outer.y + outer.h + 1e-3
  );
}

/**
 * Cut a wall into the bands of the flight it runs along, plus whatever sticks
 * out at either end.
 */
function alongBands(
  wall: Rect,
  horizontal: boolean,
  bands: { from: number; to: number; surface: number }[],
): { bounds: Rect; surface?: number }[] {
  const lo = horizontal ? wall.x : wall.y;
  const hi = lo + (horizontal ? wall.w : wall.h);
  const slice = (from: number, to: number): Rect =>
    horizontal
      ? rect(from, wall.y, to - from, wall.h)
      : rect(wall.x, from, wall.w, to - from);

  const out: { bounds: Rect; surface?: number }[] = [];
  const first = Math.max(lo, bands[0].from);
  const last = Math.min(hi, bands[bands.length - 1].to);
  /*
   * An end carries the height of the end of the flight it left, rather than no
   * height at all.
   *
   * Past the foot of a rake is the stage, which is at exactly the rake's
   * lowest surface; past its head is the cross-aisle, at exactly its highest.
   * So this agrees with the plate every time the plate is the right answer —
   * and it is right in the one case the plate got wrong, which is a wall whose
   * own centre lands on neither plate and so reads the flat floor of the room.
   */
  if (first - lo > 0.01) out.push({ bounds: slice(lo, first), surface: bands[0].surface });
  for (const band of bands) {
    const from = Math.max(band.from, lo);
    const to = Math.min(band.to, hi);
    if (to - from > 0.01) out.push({ bounds: slice(from, to), surface: band.surface });
  }
  if (hi - last > 0.01) {
    out.push({ bounds: slice(last, hi), surface: bands[bands.length - 1].surface });
  }
  return out;
}

const {
  rooms: floor1Rooms,
  solids: auditoriumSolids,
  decor: auditoriumDecor,
  links: auditoriumRakes,
} = auditoriums();

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
  // Fourteen more, one per auditorium. A rake is a staircase; it was only ever
  // drawn as scenery because nothing could express a floor that goes down.
  ...auditoriumRakes,
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
 * Treads per flight.
 *
 * A real 6.2 m floor takes 34 risers at 0.18 m, and at this zoom 34 steps are
 * 10 px apart and 2 px high — visual noise, not a staircase. 18 reads as a
 * flight. Capped rather than computed for that reason alone.
 */
const MAX_TREADS = 18;

/**
 * Shallowest tread worth drawing, metres.
 *
 * The cap above is really a statement about tread SIZE — 18 steps in an 11.2 m
 * flight is 0.62 m each — and stated as a count it lies about long flights. An
 * auditorium rake runs 25 m and wants a step every metre, one per row of
 * seats, and getting 18 instead would put its steps out of register with the
 * seating standing on them. So: eighteen treads, or as many as fit at 0.62 m
 * apart, whichever is more. Every flight in the building is unchanged.
 */
const MIN_TREAD = 0.62;


/**
 * How thick the skin on the far walls of a stairwell is, metres.
 *
 * A well cut through a floor plate has four sides and the camera sees two of
 * them — the north and east ones, because the viewer stands to the south-west.
 * The other two are behind the viewer's side of the hole and would only wall
 * the well off from the person looking into it. So two wafers on the far rim,
 * reaching from the floor below up to the plate, and nothing on the near side.
 */
const SHAFT_SKIN = 0.06;

/**
 * The bands a flight is built from: where each tread starts along the climb
 * axis, and how high its surface is above the `from` floor's datum.
 *
 * Extracted because two things need it and they must not disagree — the treads
 * themselves, and any WALL running alongside them, which has to step down with
 * the floor rather than hang over it.
 */
function treadsOf(link: Link): { from: number; to: number; surface: number }[] {
  const { bounds: b, rise, axis, ascending } = link;
  const run = axis === 'y' ? b.h : b.w;
  const treads = Math.min(
    Math.max(3, Math.round(rise / (link.riser || RISER))),
    Math.max(MAX_TREADS, Math.floor(run / MIN_TREAD)),
  );
  const step = run / treads;
  const start = axis === 'y' ? b.y : b.x;

  const bands = [];
  for (let i = 0; i < treads; i += 1) {
    // `i` counts along +axis; height follows the climb direction.
    const fraction = (ascending ? i + 1 : treads - i) / treads;
    bands.push({
      from: start + i * step,
      to: start + (i + 1) * step,
      surface: link.base + rise * fraction,
    });
  }
  return bands;
}

function stairMass(links: Link[]): Obstacle[] {
  const solid: Obstacle[] = [];
  for (const link of links) {
    // A ramp is the accessible route by definition — leave it drivable. It is
    // also the only way between the hall and the concourse until stairs work.
    if (link.id === 'wheelchair-ramp') continue;

    const { bounds: b, axis } = link;
    const bands = treadsOf(link);
    const treads = bands.length;

    for (let i = 0; i < treads; i += 1) {
      const band = bands[i];
      const tread =
        axis === 'y'
          ? rect(b.x, band.from, b.w, band.to - band.from)
          : rect(band.from, b.y, band.to - band.from, b.h);

      // Drawn from the link's own base, so the grand flight starts at
      // concourse level rather than sinking through it.
      const surface = band.surface;
      solid.push({
        floor: link.from,
        bounds: tread,
        height: surface,
        /*
         * A rake's treads collide but do not draw.
         *
         * They run the full frontage, because the seat banks are solid and
         * that is the cheapest rectangle that stops Biggy — but a 22 m box per
         * row is 22 m of fill per row, and all but the aisles at either end of
         * it is behind a seat. Drawn where it is actually visible instead, by
         * `seatingFor`, which is the only code that knows how wide the seating
         * is on any given row. Worth 3 ms a frame on the auditorium level.
         */
        hidden: surface < 0,
        // A step below the floor is a slab you look down onto; one above it is
        // a mass standing on the floor. See TREAD_SLAB.
        base: surface < 0 ? surface - TREAD_SLAB : Math.min(0, link.base),
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
       *
       * They hang at their TRUE depth. Under the 2D renderer they could not:
       * a painter's floor pass had already been and gone, so anything drawn
       * deeper than the near lip of the opening came out in front of the
       * carpet instead of behind it, and the well had to be cut back to a
       * wedge of what the projection could show. A depth buffer answers that
       * question correctly for every tread, so the building is simply built.
       */
      const climbed = (band.surface - link.base) / link.rise;
      const fromAbove = -link.rise * (1 - climbed);
      solid.push({
        floor: link.to,
        bounds: tread,
        height: fromAbove,
        base: fromAbove - TREAD_SLAB,
        linkId: link.id,
      });

      if (i === treads - 1) {
        /*
         * The two far walls of the shaft, once per flight.
         *
         * A hole cut in a floor plate has four sides and the viewer, standing
         * to the south-west, can only ever see into it past the near two. So
         * the north and east sides get a skin from the floor below up to the
         * plate, and the south and west sides get nothing — a wall there would
         * stand between the camera and the well it is meant to enclose.
         */
        const shaft = { floor: link.to, height: 0, base: -link.rise, linkId: link.id };
        solid.push({ ...shaft, bounds: rect(b.x + b.w - SHAFT_SKIN, b.y, SHAFT_SKIN, b.h) });
        solid.push({ ...shaft, bounds: rect(b.x, b.y + b.h - SHAFT_SKIN, b.w, SHAFT_SKIN) });
        // And the landing at the bottom, which is the floor below seen from
        // up here. Only the storey you are standing on is drawn, so without it
        // you look down a stairwell into the same black as the sky outside.
        solid.push({
          ...shaft,
          bounds: b,
          height: -link.rise,
          base: -link.rise - TREAD_SLAB,
        });
      }
    }
  }
  return solid;
}

// ---------------------------------------------------------------------------

const WALLS = derivedWalls([...floor0Rooms, ...floor1Rooms], staircases);

/**
 * Balustrades down both sides of the two flights into the exhibition hall.
 *
 * Those two stand free in the middle of a 52 x 49 m room — every other flight
 * in the building runs against a wall — so they are the ones that actually
 * have a handrail you can see, and at 1.2 m it is a real object: it is chest
 * height on Droid and taller than Voxxy.
 *
 * It is also the only thing stopping a robot walking off the side of a
 * staircase six metres in the air, which nothing did before. That is why the
 * collision rectangle carries NO linkId: `linkId` means "solid to whoever
 * cannot climb this flight", and being able to climb a flight has never
 * entitled anyone to step off the edge of it. The rail is solid to everybody.
 *
 * Drawn and collided as two different shapes, the same way a wall running
 * alongside a rake is: one rectangle the full length for the solver, which
 * does not read heights anyway, and a run of bands for the eye, cut to the
 * flight's own treads so the rail steps down with it.
 */
const RAIL_HEIGHT = 1.2;
const RAIL_THICKNESS = 0.12;

/** The flights that stand clear of a wall, and so are worth railing. */
const RAILED = new Set(['stair-west', 'stair-east']);

function stairRails(links: Link[]): { solids: Obstacle[]; decor: Decor[] } {
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];

  for (const link of links) {
    if (!RAILED.has(link.id)) continue;
    const b = link.bounds;
    // Along the climb axis, on the two long sides.
    const sides =
      link.axis === 'y'
        ? [
            rect(b.x, b.y, RAIL_THICKNESS, b.h),
            rect(b.x + b.w - RAIL_THICKNESS, b.y, RAIL_THICKNESS, b.h),
          ]
        : [
            rect(b.x, b.y, b.w, RAIL_THICKNESS),
            rect(b.x, b.y + b.h - RAIL_THICKNESS, b.w, RAIL_THICKNESS),
          ];

    const bands = coarsen(treadsOf(link), WALL_STEP);
    const floors = link.from === link.to ? [link.from] : [link.from, link.to];

    for (const side of sides) {
      for (const floor of floors) {
        solids.push({ floor, bounds: side, height: RAIL_HEIGHT, hidden: true });

        for (const part of alongBands(side, link.axis === 'x', bands)) {
          if (part.surface === undefined) continue; // the rail IS the flight
          // Seen from the floor it arrives on, the whole flight hangs a storey
          // lower — the same correction the treads make in `stairMass`.
          const surface =
            floor === link.from ? part.surface : part.surface - (link.base + link.rise);
          decor.push({
            floor,
            bounds: part.bounds,
            base: surface,
            height: surface + RAIL_HEIGHT,
            linkId: link.id,
          });
        }
      }
    }
  }

  return { solids, decor };
}

const RAILS = stairRails(staircases);

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [
    ...exhibitionColumns(),
    ...HALL_CUTAWAYS,
    ...auditoriumSolids,
    ...stairMass(staircases),
    ...RAILS.solids,
    ...WALLS.walls,
  ],
  decor: [...auditoriumDecor, ...WALLS.decor, ...RAILS.decor],
  links: staircases,
  extents: [rect(HALL.x, -62, HALL.w + 13, 74), rect(-46, SOUTH_END, 92, 150)],
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
   * Just south of the west flight, below its TOP.
   *
   * The flights climb southward, so this end of one is a storey of wall: drive
   * north from here and you meet it, which is what `npm run traverse` asserts.
   * The foot you can actually walk onto is at the far, northern end.
   */
  stairFoot: { floor: 0 as const, x: -6.0, y: -10.2 },
  /**
   * The south end of the corridor, between Rooms 6 and 7.
   *
   * North of the grand stairwell, which now reaches y -51.1: this used to be
   * 1.5 m inside it, and a chapter that starts here would have dropped its
   * whole cast down the stairs before the player touched a key.
   */
  corridorSouth: { floor: 1 as const, x: 0, y: -48 },
  corridorNorth: { floor: 1 as const, x: 0, y: 58 },
  /** Outside the keynote room. Chapter III's destination. */
  // In the corridor outside Room 8, not inside its seating — the cast lines
  // up eastward from here and Room 8's first seat bank starts 2.5 m in.
  keynoteDoor: { floor: 1 as const, x: -3, y: -31 },
  foyer: { floor: 1 as const, x: -24, y: 55 },
};
