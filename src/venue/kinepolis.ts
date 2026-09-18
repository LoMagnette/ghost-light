/**
 * Kinepolis Antwerp — first-pass blockout.
 *
 * STATUS: proportions are plausible, not surveyed. This is deliberately a
 * blockout so that movement tuning can start on day one. Before the art pass,
 * refine these numbers against the official plans:
 *
 *   references/venue/maps/hollywood-area.png        exhibition hall, raw
 *   references/venue/maps/exhibition-floor.jpg      exhibition hall, annotated
 *   references/venue/maps/cinema-venue-devoxx.png   auditorium level, raw
 *   references/venue/maps/devoxx-rooms.jpg          auditorium level, annotated
 *
 * What must stay true even in a blockout, because it is what makes the place
 * recognisable: auditoriums 1-14 either side of one long central corridor, the
 * curved foyer at the west end, the grand staircase landing in that foyer, and
 * the exhibition hall directly below on a regular column grid.
 *
 * Origin (0, 0) is the foot of the grand staircase on the exhibition floor.
 */

import { rect, type Link, type Obstacle, type Room, type Venue } from '@/core/Venue';

// ---------------------------------------------------------------------------
// Floor 0 — the exhibition hall
// ---------------------------------------------------------------------------

const HALL = rect(-35, -50, 70, 50);

const floor0Rooms: Room[] = [
  { id: 'hall', label: 'Exhibition Hall', kind: 'hall', floor: 0, bounds: HALL },
  {
    id: 'reception',
    label: 'Reception',
    kind: 'service',
    floor: 0,
    bounds: rect(-14, -50, 28, 9),
  },
  { id: 'bof-1', label: 'BOF 1', kind: 'service', floor: 0, bounds: rect(-35, -22, 12, 10) },
  { id: 'bof-2', label: 'BOF 2', kind: 'service', floor: 0, bounds: rect(-35, -10, 12, 10) },
  { id: 'polo', label: 'Polo Pickup', kind: 'service', floor: 0, bounds: rect(23, -18, 12, 10) },
];

/** The column grid is the single most recognisable feature of the hall. */
const COLUMN_SPACING = 11.5;
const COLUMN_SIZE = 0.9;

function exhibitionColumns(): Obstacle[] {
  const columns: Obstacle[] = [];
  for (let x = HALL.x + COLUMN_SPACING; x < HALL.x + HALL.w - 2; x += COLUMN_SPACING) {
    for (let y = HALL.y + COLUMN_SPACING; y < HALL.y + HALL.h - 2; y += COLUMN_SPACING) {
      columns.push({
        floor: 0,
        bounds: rect(x - COLUMN_SIZE / 2, y - COLUMN_SIZE / 2, COLUMN_SIZE, COLUMN_SIZE),
        height: FLOOR_CLEAR,
      });
    }
  }
  return columns;
}

const FLOOR_CLEAR = 5.4;

// ---------------------------------------------------------------------------
// Floor 1 — the auditoriums
// ---------------------------------------------------------------------------

const CORRIDOR = rect(-46, 20, 92, 7);
const FOYER = rect(-46, -4, 30, 24);

/**
 * Fourteen auditoriums either side of the corridor. Widths vary the way the
 * real rooms do — the plan colour-codes them by capacity — so the corridor
 * does not read as a symmetrical game level.
 */
const AUDITORIUM_WIDTHS = [14, 11, 11, 17, 11, 11, 14, 11, 14, 11, 11, 17, 11, 14];

function auditoriums(): { rooms: Room[]; seating: Obstacle[] } {
  const rooms: Room[] = [];
  const seating: Obstacle[] = [];

  let northX = -46;
  let southX = -14; // south side starts east of the foyer
  const DEPTH = 21;

  AUDITORIUM_WIDTHS.forEach((width, index) => {
    const number = index + 1;
    const onNorth = index % 2 === 0;

    const x = onNorth ? northX : southX;
    const y = onNorth ? CORRIDOR.y + CORRIDOR.h : CORRIDOR.y - DEPTH;
    const bounds = rect(x, y, width, DEPTH);

    rooms.push({
      id: `aud-${number}`,
      label: `Room ${number}`,
      kind: 'auditorium',
      floor: 1,
      bounds,
      rake: 3.6,
    });

    // Seat blocks: two banks with a central aisle, leaving a walkway at the
    // back so a robot can cross the room without vaulting the seating.
    const aisle = 1.8;
    const bankWidth = (width - aisle - 3) / 2;
    const bankDepth = DEPTH - 7;
    seating.push({
      floor: 1,
      bounds: rect(x + 1.5, y + 4, bankWidth, bankDepth),
      height: 0.95,
    });
    seating.push({
      floor: 1,
      bounds: rect(x + 1.5 + bankWidth + aisle, y + 4, bankWidth, bankDepth),
      height: 0.95,
    });

    if (onNorth) northX += width;
    else southX += width;
  });

  return { rooms, seating };
}

const { rooms: auditoriumRooms, seating: auditoriumSeating } = auditoriums();

const floor1Rooms: Room[] = [
  { id: 'corridor', label: 'Central Corridor', kind: 'corridor', floor: 1, bounds: CORRIDOR },
  { id: 'foyer', label: 'The Foyer', kind: 'foyer', floor: 1, bounds: FOYER },
  ...auditoriumRooms,
];

// ---------------------------------------------------------------------------
// The grand staircase
// ---------------------------------------------------------------------------

const STAIRS = rect(-4, 0, 9, 14);

const grandStaircase: Link = {
  id: 'grand-staircase',
  from: 0,
  to: 1,
  bounds: STAIRS,
  rise: 6.2,
};

// ---------------------------------------------------------------------------

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [...exhibitionColumns(), ...auditoriumSeating],
  links: [grandStaircase],
  extents: {
    0: HALL,
    1: rect(-46, -4, 92, 72),
  },
};

/** Named spawn points, so chapters do not hard-code coordinates. */
export const SPAWNS = {
  hallEntrance: { floor: 0 as const, x: 0, y: -44 },
  hallCentre: { floor: 0 as const, x: 0, y: -25 },
  stairFoot: { floor: 0 as const, x: 0.5, y: -3 },
  foyer: { floor: 1 as const, x: -30, y: 8 },
  corridorWest: { floor: 1 as const, x: -38, y: 23.5 },
  corridorEast: { floor: 1 as const, x: 38, y: 23.5 },
  keynoteRoom: { floor: 1 as const, x: -39, y: 37 },
};
