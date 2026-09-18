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

import { rect, type Link, type Obstacle, type Room, type Venue } from '@/core/Venue';

/** Clear height under the auditorium level, metres. Not yet from any source. */
const FLOOR_CLEAR = 5.4;

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
 * 6.3 m between centres, measured on the booth map at the scale its own 24 m²
 * stands establish, and corroborated at 6.34 m on the annotated plan. The original
 * blockout guessed 11.5 m, which made the columns scenery you drove past
 * rather than a slalom you have to read ahead for. That distinction only
 * matters because Biggy needs 3.8 m to stop.
 */
const COLUMN_SPACING = 6.3;
const COLUMN_SIZE = 0.6;

function exhibitionColumns(): Obstacle[] {
  const columns: Obstacle[] = [];
  for (let x = HALL.x + COLUMN_SPACING; x < HALL.x + HALL.w - 1; x += COLUMN_SPACING) {
    for (let y = HALL.y + COLUMN_SPACING; y < HALL.y + HALL.h - 1; y += COLUMN_SPACING) {
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

const floor0Rooms: Room[] = [
  { id: 'hall', label: 'Exhibition Hall', kind: 'hall', floor: 0, bounds: HALL },
  { id: 'reception', label: 'Reception', kind: 'foyer', floor: 0, bounds: RECEPTION },
  // BOF rooms, south-east of the concourse.
  //
  // There is no seminar suite here. An earlier pass read the plan's "∧ Rooms ∧"
  // as labelling a room; it labels the grand stair BELOW it, and means "this
  // way up to the cinema rooms". See `receptionStairs`.
  { id: 'bof-1', label: 'BOF 1', kind: 'service', floor: 0, bounds: rect(22.3, -60.8, 19.8, 7.6) },
  { id: 'bof-2', label: 'BOF 2', kind: 'service', floor: 0, bounds: rect(22.3, -52.9, 19.8, 7.7) },
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

function auditoriums(): { rooms: Room[]; seating: Obstacle[] } {
  const rooms: Room[] = [];
  const seating: Obstacle[] = [];

  const place = (list: Auditorium[], side: -1 | 1, gapAfter = 0): number => {
    let y = SOUTH_END;
    for (const aud of list) {
      const x = side === -1 ? -CORRIDOR_HALF - aud.depth : CORRIDOR_HALF;
      const bounds = rect(x, y, aud.depth, aud.frontage);

      rooms.push({
        id: `aud-${aud.number}`,
        label: `Room ${aud.number}`,
        kind: 'auditorium',
        floor: 1,
        bounds,
        // Deeper rooms rake harder: the back row of Room 8 is most of a storey
        // above its screen.
        rake: 2.2 + aud.depth * 0.09,
      });

      seating.push(...seatBanks(bounds, side));
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
 * Seat banks: two blocks either side of a central aisle, in three stages that
 * narrow toward the screen.
 *
 * This is where the fan shape of a real auditorium lives. The room is a
 * rectangle because the collision system speaks rectangles, but what a robot
 * actually drives around is the seating — so the taper costs nothing and buys
 * the silhouette.
 */
function seatBanks(room: { x: number; y: number; w: number; h: number }, side: -1 | 1): Obstacle[] {
  const banks: Obstacle[] = [];
  const aisle = 2.0;
  const stages = 3;

  const doorEdge = side === -1 ? room.x + room.w : room.x;
  const stageDepth = (room.w - 4.5) / stages;

  for (let s = 0; s < stages; s += 1) {
    const taper = 1 - s * 0.17;
    const bankH = ((room.h - aisle) / 2) * taper - 1.2;
    if (bankH <= 0.4) continue;

    const x = side === -1 ? doorEdge - 2.5 - (s + 1) * stageDepth : doorEdge + 2.5 + s * stageDepth;
    const midY = room.y + room.h / 2;

    for (const dir of [-1, 1] as const) {
      banks.push({
        floor: 1,
        bounds: rect(x, midY + dir * (aisle / 2) - (dir < 0 ? bankH : 0), stageDepth - 0.4, bankH),
        height: 0.95,
      });
    }
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

const { rooms: floor1Rooms, seating: auditoriumSeating } = auditoriums();

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
 * Their surveyed spacing is wider than the corridor above, which the plans
 * cannot reconcile — see the note at the top of this file. They are placed to
 * land in the corridor.
 */
const STAIR_WEST = rect(-6.0, -6.2, 4.7, 12.2);
const STAIR_EAST = rect(1.3, -6.2, 4.7, 12.2);

/**
 * Everything vertical in the reception concourse, and there is more of it than
 * the first survey found.
 *
 * The concourse does not sit flush with the exhibition hall — a broad flight
 * spans most of the boundary, with a wheelchair ramp beside it. That ramp is
 * the proof: a plan does not label "wheelchair access" across a flat opening.
 * It is a short rise, so it is a link from floor 0 to floor 0, which reads
 * oddly in the type and is nonetheless what the building does.
 *
 * And the concourse reaches the auditorium level directly, by two more stairs:
 * a ~16 m grand flight in the middle — the one the plan labels "∧ Rooms ∧" —
 * and a narrow one against the west wall. So there are FOUR ways up from the
 * ground floor, not two, and only two of them start in the hall. That matters
 * for Chapter III: three robots and a full house need more than one staircase.
 */
const receptionStairs: Link[] = [
  // Hall ↔ concourse. ~23 m wide, the full width of the opening.
  { id: 'hall-steps', from: 0, to: 0, bounds: rect(-12.4, -39.4, 23.2, 2.0), rise: 1.2 },
  // The ramp beside it, east of the steps. Same rise, gentler, much longer.
  { id: 'wheelchair-ramp', from: 0, to: 0, bounds: rect(11.5, -41.0, 10.0, 3.6), rise: 1.2 },
  // "∧ Rooms ∧" — the grand flight from the concourse to the auditoriums.
  { id: 'grand-stair', from: 0, to: 1, bounds: rect(-3.5, -59.5, 15.7, 5.6), rise: 6.2 },
  // The narrow one against the west wall of the concourse.
  { id: 'concourse-stair', from: 0, to: 1, bounds: rect(-13.6, -57.5, 3.0, 5.2), rise: 6.2 },
];

const staircases: Link[] = [
  { id: 'stair-west', from: 0, to: 1, bounds: STAIR_WEST, rise: 6.2 },
  { id: 'stair-east', from: 0, to: 1, bounds: STAIR_EAST, rise: 6.2 },
  ...receptionStairs,
];

// ---------------------------------------------------------------------------

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [...exhibitionColumns(), ...HALL_CUTAWAYS, ...auditoriumSeating],
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
  mainEntrance: { floor: 0 as const, x: 18, y: -57 },
  /** Where the concourse opens into the hall. */
  hallEntrance: { floor: 0 as const, x: 2, y: -33 },
  /**
   * Centre of the hall, on the aisle midway between two rows of columns.
   *
   * A chapter lines its whole cast up east of this point, so what has to be
   * clear is the ROW, not the point. Column rows run at y = -31.1 + 6.3j;
   * sitting at -15.35 is 3.15 m from the nearest of them, which clears Biggy's
   * 0.72 m by a margin that holds for any x along the row.
   *
   * Worth knowing when driving: the grid is square and the isometric screen
   * axes sit at 45° to it, so holding right or left tracks a line of columns
   * and meets one every 8.9 m. That is the hall doing its job — but it means
   * a straight screen-axis run is never the fast way across.
   */
  hallCentre: { floor: 0 as const, x: 4.9, y: -15.35 },
  stairFoot: { floor: 0 as const, x: -2.5, y: -9 },
  /** The south end of the corridor, between Rooms 6 and 7. */
  corridorSouth: { floor: 1 as const, x: 0, y: -54 },
  corridorNorth: { floor: 1 as const, x: 0, y: 58 },
  /** Outside the keynote room. Chapter III's destination. */
  keynoteDoor: { floor: 1 as const, x: 5, y: -31 },
  foyer: { floor: 1 as const, x: -24, y: 55 },
};
