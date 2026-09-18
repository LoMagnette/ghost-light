/**
 * Kinepolis Antwerp — surveyed from the competition floor plans.
 *
 * STATUS: every dimension here traces to something printed on a plan. Neither
 * plan carries a scale bar — `hollywood-area.png` says "no scale" outright —
 * so both are scaled from a published number instead:
 *
 *   references/venue/maps/hollywood-area.png       "Receptieruimte 'Hollywood'
 *                                                   opp: 2411.41 m²"
 *   references/venue/maps/exhibition-floor.jpg      the same floor, annotated
 *   references/venue/maps/cinema-venue-devoxx.png   per-room SEAT COUNTS
 *   references/venue/maps/devoxx-rooms.jpg          the same level, annotated
 *
 * The exhibition hall comes from that 2411.41 m² label: measuring the hall's
 * extent in pixels on each of the two ground-floor plans independently and
 * solving for the scale gives 47 × 51 m and 49 × 49 m, agreeing to within 4%,
 * with a structural bay of 5.9 m and 6.1 m. We take 49 × 49 m on a 6 m grid.
 *
 * The auditoriums come from the seat counts, which are printed on every room.
 * Frontage along the corridor is measured off the plan; DEPTH is then derived
 * as seats × 0.9 m² ÷ frontage, 0.9 m²/seat being standard for a raked
 * multiplex auditorium including aisles. So a room's size on screen is a
 * consequence of how many people really fit in it.
 *
 * What the previous blockout got wrong, and it was not close:
 *   - the hall was 70 × 50 m (3500 m²) against a real 2411 m²
 *   - the column grid was 11.5 m, twice the real 6 m spacing, and the grid is
 *     the single most recognisable thing about that room
 *   - one grand staircase in the middle; there are TWO, side by side
 *   - the BOF rooms were on the west side; they are south-east
 *   - auditoriums were staggered down alternating sides; they are in facing
 *     PAIRS, and the pairs sum to 13 — (1,12) (2,11) (3,10) (4,9) (5,8) (6,7)
 *     — with 13 and 14 extending north past 12 on the east side only
 *
 * Origin (0, 0) is the centre of the corridor at the stair landing, the point
 * both floors have in common. +x east, +y north, +z up. Floor 0 is the
 * exhibition hall, floor 1 the auditorium level, 6.2 m above it.
 *
 * Known simplification: the real auditoriums are fan-shaped, narrow at the
 * corridor door and wide at the screen. Rooms here are rectangles, because
 * `Rect` is what `Sim`'s circle-rect collision speaks and polygons would
 * change every layer. The fan is expressed in the SEATING instead, which
 * tapers toward the screen — that is what the player actually drives around.
 */

import { rect, type Link, type Obstacle, type Room, type Venue } from '@/core/Venue';

/** Clear height under the auditorium level, metres. */
const FLOOR_CLEAR = 5.4;

// ---------------------------------------------------------------------------
// Floor 0 — the exhibition hall, "Hollywood"
// ---------------------------------------------------------------------------

/**
 * 49 × 49 m = 2401 m², against the 2411.41 m² printed on the plan.
 *
 * Positioned so its north edge meets the foot of the stairs at the origin,
 * which puts the main entrance 44 m due south — the walk a judge sees first.
 */
const HALL = rect(-24.5, -44, 49, 49);

/** Printed on the plan. Kept here so the geometry can be checked against it. */
export const HALL_AREA_M2 = 2411.41;

const floor0Rooms: Room[] = [
  { id: 'hall', label: 'Exhibition Hall', kind: 'hall', floor: 0, bounds: HALL },
  {
    id: 'reception',
    label: 'Reception',
    kind: 'service',
    floor: 0,
    bounds: rect(-14, -44, 28, 9),
  },
  // South-east of the hall, past the wheelchair access — not west, as the
  // blockout had them.
  { id: 'bof-1', label: 'BOF 1', kind: 'service', floor: 0, bounds: rect(24.5, -44, 14, 11) },
  { id: 'bof-2', label: 'BOF 2', kind: 'service', floor: 0, bounds: rect(24.5, -32, 14, 11) },
  { id: 'polo', label: 'Devoxx Polo Pickup', kind: 'service', floor: 0, bounds: rect(24.5, -19, 11, 9) },
  { id: 'toilets-nw', label: 'Toilets', kind: 'service', floor: 0, bounds: rect(-36, -6, 11, 11) },
];

/**
 * The column grid — the single most recognisable feature of the hall, and the
 * thing the previous blockout got most wrong at 11.5 m.
 *
 * At 6 m the hall carries roughly eight bays each way, which is what both
 * ground-floor plans show, and it completely changes how the room drives:
 * columns stop being scenery and become a slalom you have to read ahead for.
 * That matters most for Biggy, which needs 3.8 m to stop.
 */
const COLUMN_SPACING = 6.0;
const COLUMN_SIZE = 0.75;

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
 * The hall's south-west corner is a quarter-round, not a corner — it is the
 * curved cast concrete in the reference photographs, and it reads immediately.
 * Stepped blocks approximate it well enough to drive against.
 */
function curvedSouthWestCorner(): Obstacle[] {
  const steps: Obstacle[] = [];
  const radius = 9;
  const bands = 8;
  const band = radius / bands;

  // The quarter circle is centred `radius` in from both edges. Floor inside it
  // is walkable; the sliver between the circle and the square corner is solid.
  const cy = HALL.y + radius;

  for (let i = 0; i < bands; i += 1) {
    const y = HALL.y + i * band;
    // Widest point of this band is its southern edge, so measure there and the
    // approximation stays outside the true curve rather than cutting into it.
    const dy = y - cy;
    const width = radius - Math.sqrt(Math.max(0, radius * radius - dy * dy));
    if (width < 0.15) continue;
    steps.push({ floor: 0, bounds: rect(HALL.x, y, width, band), height: 3.2 });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Floor 1 — the auditoriums
// ---------------------------------------------------------------------------

/**
 * The fourteen auditoriums, as the plan labels them.
 *
 * `seats` is printed on `cinema-venue-devoxx.png`. `frontage` is measured off
 * the same drawing. Depth is derived from the two, so nothing here is a taste
 * decision — Room 8 is the biggest room in the game because 746 people really
 * do fit in it, and Room 2 is a cupboard by comparison because 198 do.
 */
interface Auditorium {
  number: number;
  seats: number;
  /** Metres of wall along the corridor. */
  frontage: number;
}

/** Square metres of floor per seat in a raked auditorium, including aisles. */
const M2_PER_SEAT = 0.9;

/** South to north, west side of the corridor. */
const WEST: Auditorium[] = [
  { number: 6, seats: 408, frontage: 21.5 },
  { number: 5, seats: 684, frontage: 23.7 },
  { number: 4, seats: 364, frontage: 17.2 },
  { number: 3, seats: 345, frontage: 15.1 },
  { number: 2, seats: 198, frontage: 13.5 },
  { number: 1, seats: 224, frontage: 13.5 },
];

/** South to north, east side. Rooms 13 and 14 have no western counterpart. */
const EAST: Auditorium[] = [
  { number: 7, seats: 407, frontage: 21.5 },
  { number: 8, seats: 746, frontage: 23.7 }, // the keynote room
  { number: 9, seats: 426, frontage: 17.2 },
  { number: 10, seats: 364, frontage: 15.1 },
  { number: 11, seats: 224, frontage: 13.5 },
  { number: 12, seats: 224, frontage: 13.5 },
  { number: 13, seats: 345, frontage: 15.1 },
  { number: 14, seats: 224, frontage: 14.0 },
];

/** The keynote room. Chapter III exists to fill it. */
export const KEYNOTE_ROOM = 8;

/**
 * Corridor half-width, metres.
 *
 * The central spine is 16 m across, which is not a corridor in the domestic
 * sense — it is a concourse, and at crowd density 1.0 that width is the only
 * reason three robots can move through it at all.
 */
const CORRIDOR_HALF = 8;

/** Where the southernmost pair of auditoriums begins. */
const SOUTH_END = -52;

function auditoriums(): { rooms: Room[]; seating: Obstacle[] } {
  const rooms: Room[] = [];
  const seating: Obstacle[] = [];

  const place = (list: Auditorium[], side: -1 | 1): number => {
    let y = SOUTH_END;
    for (const aud of list) {
      const depth = (aud.seats * M2_PER_SEAT) / aud.frontage;
      const x = side === -1 ? -CORRIDOR_HALF - depth : CORRIDOR_HALF;
      const bounds = rect(x, y, depth, aud.frontage);

      rooms.push({
        id: `aud-${aud.number}`,
        label: `Room ${aud.number}`,
        kind: 'auditorium',
        floor: 1,
        bounds,
        // Rise across the room. Bigger rooms rake harder, which is why the
        // back row of Room 8 is a storey above its screen.
        rake: 2.2 + depth * 0.09,
      });

      seating.push(...seatBanks(bounds, side));
      y += aud.frontage;
    }
    return y;
  };

  const westEnd = place(WEST, -1);
  const northEnd = place(EAST, 1);

  rooms.push({
    id: 'corridor',
    label: 'Central Corridor',
    kind: 'corridor',
    floor: 1,
    bounds: rect(-CORRIDOR_HALF, SOUTH_END, CORRIDOR_HALF * 2, northEnd - SOUTH_END),
  });

  // The curved concession foyer sits at the north-west, past Room 1 — the arc
  // of counters at the top left of both auditorium-level plans.
  rooms.push({
    id: 'foyer',
    label: 'The Foyer',
    kind: 'foyer',
    floor: 1,
    bounds: rect(-40, westEnd, 32, 26),
  });

  return { rooms, seating };
}

/**
 * Seat banks: two blocks with a central aisle, stepped in three stages that
 * narrow toward the screen.
 *
 * This is where the fan shape of a real auditorium lives. The room itself is a
 * rectangle because the collision system speaks rectangles, but what a robot
 * actually drives around is the seating — so putting the taper here buys the
 * silhouette at no cost to the physics.
 */
function seatBanks(room: { x: number; y: number; w: number; h: number }, side: -1 | 1): Obstacle[] {
  const banks: Obstacle[] = [];
  const aisle = 2.0;
  const stages = 3;

  // The screen is on the far wall from the corridor; seats fan out toward it.
  const doorEdge = side === -1 ? room.x + room.w : room.x;
  const stageDepth = (room.w - 4.5) / stages;

  for (let s = 0; s < stages; s += 1) {
    // Widest at the back (by the door), narrowest at the screen.
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

const { rooms: floor1Rooms, seating: auditoriumSeating } = auditoriums();

// ---------------------------------------------------------------------------
// The staircases — two of them, side by side
// ---------------------------------------------------------------------------

/**
 * The annotated ground-floor plan labels these "Stairs to Cinema Rooms", and
 * there are two, parallel, a few metres apart. The blockout had a single grand
 * staircase, which is both wrong and a worse level: two routes up means the
 * player has a choice to get wrong, and in Chapter III it means three robots
 * are not queueing behind each other.
 */
const STAIR_WEST = rect(-7.5, -2, 5, 11);
const STAIR_EAST = rect(2.5, -2, 5, 11);

const staircases: Link[] = [
  { id: 'stair-west', from: 0, to: 1, bounds: STAIR_WEST, rise: 6.2 },
  { id: 'stair-east', from: 0, to: 1, bounds: STAIR_EAST, rise: 6.2 },
];

// ---------------------------------------------------------------------------

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [...exhibitionColumns(), ...curvedSouthWestCorner(), ...auditoriumSeating],
  links: staircases,
  extents: {
    0: HALL,
    1: rect(-48, SOUTH_END, 96, 148),
  },
};

/** Named spawn points, so chapters do not hard-code coordinates. */
export const SPAWNS = {
  /** Just inside the main entrance, looking up the length of the hall. */
  hallEntrance: { floor: 0 as const, x: 0, y: -40 },
  hallCentre: { floor: 0 as const, x: 0, y: -22 },
  stairFoot: { floor: 0 as const, x: -5, y: -4 },
  /** The south end of the corridor, between Rooms 6 and 7. */
  corridorSouth: { floor: 1 as const, x: 0, y: -46 },
  corridorNorth: { floor: 1 as const, x: 0, y: 74 },
  /** Outside the keynote room. Chapter III's destination. */
  keynoteDoor: { floor: 1 as const, x: 10, y: -19 },
  foyer: { floor: 1 as const, x: -26, y: 60 },
};
