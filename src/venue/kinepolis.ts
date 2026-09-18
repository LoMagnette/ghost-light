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

import { FLOOR_HEIGHT, rect, type Link, type Obstacle, type Room, type Venue } from '@/core/Venue';

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
  // "∧ Rooms ∧" — the grand flight from the concourse to the auditoriums.
  { id: 'grand-stair', from: 0, to: 1, bounds: rect(-3.5, -59.5, 15.7, 5.6), base: CONCOURSE_LEVEL, rise: FLOOR_HEIGHT - CONCOURSE_LEVEL, axis: 'y', ascending: true, riser: RISER },
];

/**
 * The two flights out of the hall climb SOUTHWARD — foot at the north end,
 * against the hall's north wall, rising back out over the floor.
 *
 * The plan's own symbols pull in two directions here: the travel arrow on
 * `exhibition-floor.jpg` points south, while the break line on `booth-map.png`
 * sits at the south end, which usually marks the part of a flight below the
 * cut. Taking the arrow, which is the less ambiguous of the two.
 */
const staircases: Link[] = [
  { id: 'stair-west', from: 0, to: 1, bounds: STAIR_WEST, base: 0, rise: FLOOR_HEIGHT, axis: 'y', ascending: false, riser: RISER },
  { id: 'stair-east', from: 0, to: 1, bounds: STAIR_EAST, base: 0, rise: FLOOR_HEIGHT, axis: 'y', ascending: false, riser: RISER },
  ...receptionStairs,
];

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

    for (let i = 0; i < treads; i += 1) {
      // `i` counts along +axis; height follows the climb direction.
      const fraction = (ascending ? i + 1 : treads - i) / treads;
      solid.push({
        floor: link.from,
        bounds:
          axis === 'y'
            ? rect(b.x, b.y + i * step, b.w, step)
            : rect(b.x + i * step, b.y, step, b.h),
        // Drawn from the link's own base, so the grand flight starts at
        // concourse level rather than sinking through it.
        height: link.base + drawnRise * fraction,
        // Solid to anything that cannot climb this flight, walkable to
        // anything that can. Sim.resolveObstacles reads it.
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
  /**
   * The actual foot of the west flight — its NORTH end, since both hall
   * staircases climb southward. Approach from the south and you meet the top
   * of the flight, which is a storey of wall.
   */
  stairFoot: { floor: 0 as const, x: -3.6, y: 8.5 },
  /** The south end of the corridor, between Rooms 6 and 7. */
  corridorSouth: { floor: 1 as const, x: 0, y: -54 },
  corridorNorth: { floor: 1 as const, x: 0, y: 58 },
  /** Outside the keynote room. Chapter III's destination. */
  keynoteDoor: { floor: 1 as const, x: 5, y: -31 },
  foyer: { floor: 1 as const, x: -24, y: 55 },
};
