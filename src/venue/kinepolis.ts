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
  type Level,
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

/** Thickness and height of a partition, metres. */
const WALL_THICKNESS = 0.3;
const WALL_HEIGHT = 3.2;

/**
 * Balustrade height and thickness, metres. Chest height on Droid, taller than
 * Voxxy. Up here with the walls because a wall that flanks a stairwell is one.
 */
const RAIL_HEIGHT = 1.2;
const RAIL_THICKNESS = 0.12;

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
 * The exhibition stands, as Devoxx lays the floor out.
 *
 * From `references/venue/maps/booth-map.png`: five ranks running north-south
 * in the southern half of the hall — two of small stands against the west
 * wall, two of large ones either side of a broad central aisle, one of small
 * ones to the east — plus two in the south-west corner by the curve. Twenty-
 * seven in all, which is the number the plan lets.
 *
 * The ranks are placed off the COLUMN GRID rather than traced off the image,
 * because that is what a stand fitter does: nothing is built round a column,
 * and the two narrow gaps between back-to-back ranks each have a column
 * standing in them, which is what makes them service gaps rather than aisles
 * a robot can get itself wedged in. `npm run venue` holds us to the first
 * half of that; laying this out broke it twice.
 *
 * They are solid, and that is the point of them as much as the look: an empty
 * 2400 m² hall is a car park, and Biggy needs 3.8 m to stop.
 */

/**
 * A stand is a shell scheme, and a shell scheme is a floor and some panels.
 *
 * They went in as solid 2.6 m boxes, which is what a stand looks like from
 * the outside and nothing like what one IS: you walk into a stand off the
 * aisle, and what stops you is the back of it. A block also throws away the
 * best thing about putting them here — Voxxy slips between two small stands
 * and Biggy has to go round, out of the same geometry.
 *
 * So each stand is a coloured platform you can drive onto, a back panel on
 * the side away from the aisle, and — on the large ones only — a side panel
 * wherever it has a neighbour to share one with. The small ones stand apart
 * with a metre between them and have no sides at all.
 */

/** Panel thickness and height, metres. */
const BOOTH_PANEL = 0.1;
const BOOTH_WALL = 2.5;

/** How proud of the hall floor a stand's platform sits, metres. */
const BOOTH_PLATFORM = 0.05;

/** Gap between small stands in a rank, metres. You walk through it. */
const BOOTH_GAP = 1.0;

/**
 * South end of the booth field.
 *
 * As far south as the hall's curved south-west corner allows the west rank to
 * come: the curve is modelled in 1.25 m bands and the one below this reaches
 * 0.73 m in off the wall, which is into the back of a stand.
 */
const BOOTH_SOUTH = -31.0;

/**
 * Stand sizes: 6 m² and 24 m², which is what the plan lets.
 *
 * A rank runs north-south, so a rank's WIDTH is how deep its stands are and
 * the numbers below are their frontage onto the aisle. 3 x 2 and 4 x 6.
 *
 * The first pass had them at 7.2 and 22.7 m² — near enough to look right and
 * wrong enough to matter, because every extra centimetre of stand comes
 * straight out of the aisle beside it, and the floor ended up with gaps you
 * could see through and not drive through.
 */
const STAND_S = 2.0;
const STAND_L = 6.0;
const RANK_S = 3.0;
const RANK_L = 4.0;

/**
 * Each rank: its west edge and width, which side its stands turn their backs
 * to, and the stands in it from the south up.
 *
 * Set against the column grid, which is what decides everything here. The
 * columns sit 6.4 m apart, so a rank and a usable aisle do not fit between
 * two of them: the ranks are paired instead, backing onto a column line from
 * either side with nothing but the column between them, and the aisles get
 * the whole of the next bay. That gives a 5.6 m aisle down the west side and
 * a 10.7 m one down the middle, each with one line of columns standing in it,
 * against the 1.6 m slots the first pass left.
 *
 * `back` follows from that pairing and is the same statement twice: a stand
 * faces the aisle, so its back is the side against the wall or the column.
 *
 * The plan also has two stands turned into the south-west corner. They are
 * the seven-and-seven in the west ranks here instead: square on the grid and
 * out of the aisle, which is worth more than the irregularity.
 */
const BOOTH_RANKS: {
  x: number;
  w: number;
  back: 'west' | 'east';
  stands: number[];
}[] = [
  { x: -22.5, w: RANK_S, back: 'west', stands: Array<number>(7).fill(STAND_S) },
  { x: -13.9, w: RANK_S, back: 'east', stands: Array<number>(7).fill(STAND_S) },
  { x: -10.0, w: RANK_L, back: 'west', stands: [STAND_L, STAND_L, STAND_L] },
  // All three large. The plan caps this rank with two small stands, and a
  // small stand in a 4 m rank is 8 m², which is not a size the plan lets.
  { x: 4.7, w: RANK_L, back: 'east', stands: [STAND_L, STAND_L, STAND_L] },
  { x: 9.6, w: RANK_S, back: 'west', stands: Array<number>(7).fill(STAND_S) },
];

function exhibitionBooths(): { solids: Obstacle[]; decor: Decor[] } {
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];

  for (const rank of BOOTH_RANKS) {
    // Large stands run together so they can share a side panel, which is what
    // makes "a side wall where there is a neighbour" mean anything. Small ones
    // stand apart.
    const shared = rank.w === RANK_L;
    let y = BOOTH_SOUTH;

    for (let i = 0; i < rank.stands.length; i += 1) {
      const depth = rank.stands[i];

      // The platform: drawn, never collided. Drive onto a stand and you are
      // standing on the stand.
      decor.push({
        floor: 0,
        bounds: rect(rank.x, y, rank.w, depth),
        height: BOOTH_PLATFORM,
        material: 'booth',
      });

      const backX = rank.back === 'west' ? rank.x : rank.x + rank.w - BOOTH_PANEL;
      solids.push({
        floor: 0,
        bounds: rect(backX, y, BOOTH_PANEL, depth),
        height: BOOTH_WALL,
        material: 'booth',
      });

      // One panel per boundary, not one per side: the stand to the north of
      // it owns the same wall. So the end stands get one side and everything
      // between them gets two, which is the rule stated the short way.
      if (shared && i < rank.stands.length - 1) {
        solids.push({
          floor: 0,
          bounds: rect(rank.x, y + depth - BOOTH_PANEL / 2, rank.w, BOOTH_PANEL),
          height: BOOTH_WALL,
          material: 'booth',
        });
      }

      y += depth + (shared ? 0 : BOOTH_GAP);
    }
  }

  return { solids, decor };
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

/**
 * The threshold between the reception concourse and the exhibition hall.
 *
 * You come in at street level and the hall is 1.2 m below you, so this is the
 * first level change anybody meets and the one that has to read as an
 * ARRIVAL. It was a flight in a slot: 20 m wide, 2 m deep, cut into the
 * concourse plate, standing in a hole in the wall with a stub of balustrade
 * at each end. Wide enough, and it still read as a fire exit, because a
 * staircase in a hole is a way out of a room rather than a way into one.
 *
 * So it is a terrace instead, standing in the HALL. Shallow steps, each one
 * wider than the step above it, splaying out of the doorway into the room:
 * you walk down the front of it or off either flank, and from the hall floor
 * it is something you climb towards rather than a gap you find. The doorway
 * is the top step and nothing more, which is why the wall no longer needs a
 * balustrade in it — there is no gap left beside the flight to fall down.
 *
 * Built in the hall on purpose. Fanning it back into the concourse gives the
 * same picture and a worse building: the steps beside the doorway would then
 * be within a robot's step of the concourse they are cut out of, and a
 * machine standing on the plate half a metre from the edge reads the flight
 * under it and sinks into the floor it is standing on. Fanned DOWNWARDS every
 * one of those points is a metre above the hall floor beside it, far out of
 * reach, and the question never arises.
 */

/** Tread depth, metres. Twice a staircase's, because this is not a staircase. */
const THRESHOLD_GOING = 0.45;

/**
 * How much wider each step is than the one above it, per side, in metres.
 *
 * The same as the going, so the terrace splays at 45 degrees in plan and its
 * corners are square. Anything else has to be justified by something, and
 * nothing here justifies it.
 */
const THRESHOLD_SPLAY = 0.45;

/** Steps in the flight. The rise divided by the building's riser, as always. */
const THRESHOLD_STEPS = Math.round(CONCOURSE_LEVEL / RISER);

/**
 * The terrace's footprint on the hall floor — the width the wall opening used
 * to be, which is as much of the hall as this is allowed to take.
 */
const HALL_STEPS = rect(-12.4, HALL.y, 23.2, THRESHOLD_STEPS * THRESHOLD_GOING);

/** Metres of the width given over to climbing it sideways. See `Link.wrap`. */
const THRESHOLD_WRAP = THRESHOLD_STEPS * THRESHOLD_SPLAY;

/** What is left of the width at the top: the doorway, and the top step. */
const THRESHOLD_DOOR = HALL_STEPS.w - (THRESHOLD_STEPS - 1) * THRESHOLD_SPLAY * 2;

/**
 * Where the wall builder must leave a hole that no link accounts for.
 *
 * A same-storey flight punches its own way through a wall, which covers every
 * other level change in the building. Not this one: a terrace meets the wall
 * across its whole 23 m and is only at door height for the middle 18, so
 * letting it cut its own hole opens the wall to the full span and leaves the
 * bottom steps running into open concourse. It says where instead.
 */
const HALL_OPENING = rect(
  HALL_STEPS.x + (THRESHOLD_STEPS - 1) * THRESHOLD_SPLAY,
  HALL.y - 1,
  THRESHOLD_DOOR,
  2,
);

/**
 * The toilets off the south-east of the concourse, and the corridor to them.
 *
 * Same 19.8 m frontage as the BOF rooms below, because on the plan all three
 * are one block of building served by one wall — and served, on the plan, off
 * a corridor along their south side, which is what gets a robot in there.
 * The rooms themselves are left empty on purpose for now.
 */
const TOILET_CORRIDOR = rect(22.3, -45.2, 19.8, 2.2);
const TOILETS = rect(22.3, -43.0, 19.8, 3.6);

/**
 * The wheelchair ramp from the concourse down into the hall.
 *
 * Ten metres wide because it stands for a ramp nobody draws — see the note on
 * the reception's plate — and the width is what makes it comfortably drivable
 * rather than what the building has.
 */
const RAMP = rect(11.5, -49.4, 10.0, 12.0);

/** The gap it needs in the wall at the bottom. A ramp, not a ten-metre hole. */
const RAMP_DOOR = 4.0;
const RAMP_OPENING = rect(
  RAMP.x + RAMP.w / 2 - RAMP_DOOR / 2,
  HALL.y - 1,
  RAMP_DOOR,
  2,
);

const WALL_OPENINGS: { floor: Level; bounds: Rect }[] = [
  { floor: 0, bounds: HALL_OPENING },
  { floor: 0, bounds: RAMP_OPENING },
];

const floor0Rooms: Room[] = [
  { id: 'hall', label: 'Exhibition Hall', kind: 'hall', floor: 0, bounds: HALL },
  {
    id: 'reception',
    label: 'Reception',
    kind: 'foyer',
    floor: 0,
    bounds: RECEPTION,
    elevation: CONCOURSE_LEVEL,
    /*
     * No hole in the plate any more.
     *
     * The old flight descended from the concourse, so it was drawn inside the
     * concourse's own slab and every tread of it was buried — hence a void.
     * The terrace that replaced it stands in the HALL and climbs to meet this
     * plate at its edge, so there is nothing of it under here to uncover.
     */
  },
  // BOF rooms, south-east of the concourse.
  //
  // There is no seminar suite here. An earlier pass read the plan's "∧ Rooms ∧"
  // as labelling a room; it labels the grand stair BELOW it, and means "this
  // way up to the cinema rooms". See `receptionStairs`.
  { id: 'bof-1', label: 'BOF 1', kind: 'service', floor: 0, bounds: rect(22.3, -60.8, 19.8, 7.6), elevation: CONCOURSE_LEVEL },
  { id: 'bof-2', label: 'BOF 2', kind: 'service', floor: 0, bounds: rect(22.3, -52.9, 19.8, 7.7), elevation: CONCOURSE_LEVEL },
  /*
   * The toilets, north of the BOF rooms and labelled on the plan.
   *
   * Modelled because the south-east corner of the concourse was 400 m² of
   * nothing, and because a building people believe in has the dull rooms in
   * it. The cubicle partitions are what makes it read as a toilet block
   * rather than a store — see `receptionFitOut`.
   */
  { id: 'toilet-corridor', label: 'Toilets', kind: 'corridor', floor: 0, bounds: TOILET_CORRIDOR, elevation: CONCOURSE_LEVEL },
  { id: 'toilets', label: 'Toilets', kind: 'service', floor: 0, bounds: TOILETS, elevation: CONCOURSE_LEVEL },
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
 * How much corridor is left at each side of the grand flight, metres.
 *
 * It used to be none: the flight was the full 14.3 m width of the corridor it
 * delivers you to, so its stairwell crossed the corridor wall to wall and the
 * south end of the auditorium level simply stopped there. A flight that wide
 * is not a staircase in a corridor, it IS the corridor.
 *
 * 1.5 m each side is a way past it and, at the top, something to put a
 * balustrade on — which is the other half of why the flight narrows. Measured
 * clear of both, it comes out at 1.35 m: Voxxy passes at 0.68 m across and
 * Droid at 0.92, and Biggy does not at 1.44. That is the right answer for a
 * machine that could not use the stairs it would be squeezing past anyway.
 */
const GRAND_SIDE = 1.5;

/**
 * The grand flight out of the reception concourse — see the Link below.
 *
 * Its long axis is the one you walk ACROSS: 11.3 m wide, centred in the 14.3 m
 * corridor it delivers you to, and 8.4 m deep for the 5.0 m it has to climb.
 */
const GRAND_RUN = runFor(FLOOR_HEIGHT - CONCOURSE_LEVEL);

/**
 * The WELL — the hole the grand flight comes up through — which is the full
 * width of the corridor, and a different rectangle from the flight in it.
 *
 * The corridor's floor stops dead at the head of the stairs, right across, and
 * what carries on south is the staircase alone with a balustrade down each
 * side. The 1.5 m either side of it is not a landing: it is the well, open to
 * the reception five metres below.
 *
 * Making it the flight's own rectangle left those two strips as floor — a
 * pair of 8.4 m ledges running down the sides of a stairwell to a dead end
 * against the south wall, which is not a thing buildings have.
 */
/**
 * Clear concourse at the FOOT of the flight, inside the well.
 *
 * A staircase lands on something. Run this flight down to the building's south
 * wall and the point a robot has to reach to arrive on floor 0 — the very
 * bottom of the climb — is inside that wall, so no machine of any size can
 * ever get there: Voxxy's centre stops 0.34 m short of it and Droid's 0.46 m,
 * and both walk to the bottom step and stand there for ever. It is not a
 * tuning problem, it is a staircase with no floor at the end of it.
 *
 * So the WELL reaches the wall and the FLIGHT stops short, and what you see
 * through the gap is the concourse the stairs land on.
 */
const GRAND_LANDING = 1.2;

const GRAND_WELL = rect(
  -CORRIDOR_HALF,
  // The INNER FACE of the south wall, not its centreline. A wall is drawn
  // standing on the plate under it, and a well taken right to SOUTH_END leaves
  // the building's own end wall with no plate at all — 14.3 m of it hanging
  // over the reception, which `npm run venue` reports the moment you try it.
  SOUTH_END + WALL_THICKNESS / 2,
  CORRIDOR_HALF * 2,
  GRAND_RUN + GRAND_LANDING,
);

const GRAND_STAIR = rect(
  GRAND_WELL.x + GRAND_SIDE,
  GRAND_WELL.y + GRAND_LANDING,
  GRAND_WELL.w - GRAND_SIDE * 2,
  GRAND_RUN,
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

      decor.push(projectionScreen(bounds, side, rake));

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
 * The projection screen on an auditorium's end wall.
 *
 * Drawn, never collided: the room's own screen wall is right behind it and
 * already stops anything that gets that far, and a robot cannot drive through
 * a screen without driving through the wall first.
 *
 * It stands ON THE STAGE, which is the whole reason it reads at all. The stage
 * is a rake below the corridor you came in from — 4.14 m in Room 8 — so a
 * screen filling that end wall is a four-metre object sunk into the floor, and
 * the deeper the room the bigger its screen, which is exactly the relationship
 * a cinema has.
 */
const SCREEN_SILL = 0.35;
const SCREEN_THICKNESS = 0.3;
/** Gap between the screen wall and the back of the screen, metres. */
const SCREEN_OFFSET = 0.25;
/** Bare wall left at each end of the frontage, metres. */
const SCREEN_MARGIN = 1.6;
/**
 * How far a screen rises, as a multiple of the room's own drop.
 *
 * It was 1 — the screen exactly filled the sunken part of the end wall, its
 * top level with the corridor and the back row — and that is a screen sized by
 * the floor rather than by the room. A cinema screen carries on well above the
 * back row; it is the tallest thing in the auditorium.
 *
 * `rake` stays the unit because it is the only dimension that knows how big a
 * room is: the stage sits a rake below the corridor, so a deeper house drops
 * further and has more wall. Room 8 gets 7.2 m and Room 2 gets 3.3, which is
 * the same proportion each had before, twice over.
 */
const SCREEN_RISE = 2;

/** Tallest a screen is drawn above its stage, whatever the room. */
const SCREEN_MAX_HEIGHT = 7.2;

function projectionScreen(room: Rect, side: -1 | 1, rake: number): Decor {
  const x = side === -1 ? room.x + SCREEN_OFFSET : room.x + room.w - SCREEN_OFFSET - SCREEN_THICKNESS;
  const top =
    SCREEN_SILL +
    Math.min(SCREEN_MAX_HEIGHT, Math.max(1.6, (rake - SCREEN_SILL) * SCREEN_RISE));
  return {
    floor: 1,
    bounds: rect(x, room.y + SCREEN_MARGIN, SCREEN_THICKNESS, room.h - SCREEN_MARGIN * 2),
    base: SCREEN_SILL,
    height: top,
    material: 'screen',
  };
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
        const crossing =
          links.some(
            (l) =>
              l.from === l.to &&
              l.from === room.floor &&
              (edge.horizontal ? l.axis === 'y' : l.axis === 'x') &&
              /*
               * ...and only a flight in a slot. A stepped flight is a made
               * thing as wide as the way through it, so it can be trusted to
               * cut its own hole. The other two here cannot: a terrace meets
               * the wall across its whole 23 m and is only at door height for
               * the middle 18, and the ramp is a 10 m drivable wedge standing
               * for a ramp a fraction of that. Letting it punch left eleven
               * metres of the wall between the hall and the reception simply
               * missing, which is what you notice from inside. Both say where
               * their opening is instead — see WALL_OPENINGS.
               */
              l.wrap === undefined &&
              l.riser > 0 &&
              rectContains(l.bounds, px, py),
          ) ||
          // An opening wider than the flight standing in it. See HALL_OPENING.
          WALL_OPENINGS.some((o) => o.floor === room.floor && rectContains(o.bounds, px, py));
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
              within(room.bounds, l.bounds) &&
              runsAlong(bounds, edge.horizontal, l.bounds),
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
/**
 * Is this wall one of the flight's own sides, or does it merely share a room
 * with it?
 *
 * "The flight is inside this room" was the whole test, and it holds for an
 * auditorium — a rake runs the length of both side walls by construction. It
 * stopped holding the moment a flight sat in the middle of a room instead of
 * filling it: the concourse terrace is 3 m of the exhibition hall's 49 m west
 * wall, eleven metres away from it, and the wall was being cut to its treads
 * and hung a metre in the air for the whole of that run.
 *
 * So: a wall is cut to a flight only where the flight runs most of the length
 * of it. Half is a wide margin either way — a rake covers about three quarters
 * of its side walls, the terrace covers a sixteenth of the hall's.
 */
function runsAlong(wall: Rect, horizontal: boolean, flight: Rect): boolean {
  const [from, span] = horizontal ? [wall.x, wall.w] : [wall.y, wall.h];
  const [start, length] = horizontal ? [flight.x, flight.w] : [flight.y, flight.h];
  const overlap = Math.min(from + span, start + length) - Math.max(from, start);
  return span > 0 && overlap / span >= 0.5;
}

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
  { id: 'hall-steps', from: 0, to: 0, bounds: HALL_STEPS, base: 0, rise: CONCOURSE_LEVEL, axis: 'y', ascending: false, riser: RISER, wrap: THRESHOLD_WRAP },
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
  { id: 'wheelchair-ramp', from: 0, to: 0, bounds: RAMP, base: 0, rise: CONCOURSE_LEVEL, axis: 'y', ascending: false, riser: 0 },
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
  room.voids = staircases
    .filter((l) => l.to === 1 && l.from !== l.to)
    // The grand flight's well is wider than the flight — see GRAND_WELL. Every
    // other flight fills its own hole exactly.
    .map((l) => (l.id === 'grand-stair' ? GRAND_WELL : l.bounds));
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

/**
 * A wrapped flight, drawn as the terrace it is.
 *
 * `treadsOf` cuts a flight into bands across its climb axis, which is right
 * for a staircase between two walls and wrong for one you can also walk up
 * from the side: the band at the top would be drawn the full width of the
 * flight and bury the six steps splaying out beneath it.
 *
 * So the bands are RINGS — each step is the frame left between its own
 * contour and the next one in — and a ring is three rectangles: the two
 * flanks and the nose. There is no fourth side, because the fourth side is
 * the wall the terrace climbs to meet.
 *
 * `i` counts DOWN from the top step at the wall, so step `i` is inset by the
 * steps still below it and is that many goings deep.
 */
function terraceSteps(link: Link): Obstacle[] {
  const b = link.bounds;
  const steps = Math.round(link.rise / link.riser);
  const going = b.h / steps;
  const splay = (link.wrap ?? 0) / steps;

  const pieces: Obstacle[] = [];
  for (let i = 0; i < steps; i += 1) {
    const inset = (steps - 1 - i) * splay;
    const depth = (i + 1) * going;
    // Solid to anything that cannot climb this flight, walkable to anything
    // that can — the same rule as every other tread in the building.
    const step = {
      floor: link.from,
      height: (link.rise * (steps - i)) / steps,
      base: 0,
      linkId: link.id,
    };
    pieces.push({ ...step, bounds: rect(b.x + inset, b.y, splay, depth) });
    pieces.push({ ...step, bounds: rect(b.x + b.w - inset - splay, b.y, splay, depth) });
    pieces.push({
      ...step,
      bounds: rect(
        b.x + inset + splay,
        b.y + depth - going,
        b.w - (inset + splay) * 2,
        going,
      ),
    });
  }
  return pieces;
}

/**
 * Flights with usable space under them.
 *
 * A staircase is drawn here as a run of solid treads, which makes it a wedge
 * of mass standing on the floor. That is right for the two flights into the
 * hall — the plan draws those as enclosed stair cores, walls all the way round
 * — and wrong for the grand flight, which stands in the middle of the
 * reception with nothing but air beside it. Five metres of rise puts its upper
 * half well over head height, and the plan shows exactly that: the treads are
 * hatched only as far as the cut, and north of it is open floor UNDER the
 * stairs.
 *
 * So above the headroom line the flight becomes a soffit — a slab following
 * the pitch with the concourse running on underneath it. Drawn, never
 * collided, because there is nothing at floor level there to walk into, which
 * is the whole point of the space.
 */
const OPEN_UNDER = new Set(['grand-stair']);

/** Clear height wanted under a flight before its underside becomes a soffit. */
const UNDER_STAIR_HEAD = 2.1;

/** How thick a flight is between its treads and its soffit, metres. */
const STAIR_SOFFIT = 0.4;

function stairMass(links: Link[]): { solids: Obstacle[]; decor: Decor[] } {
  const solid: Obstacle[] = [];
  const soffits: Decor[] = [];
  for (const link of links) {
    // A ramp is the accessible route by definition — leave it drivable. It is
    // also the only way between the hall and the concourse until stairs work.
    if (link.id === 'wheelchair-ramp') continue;

    // A flight that also climbs from its flanks is not a run of bands.
    if (link.wrap) {
      solid.push(...terraceSteps(link));
      continue;
    }

    const { bounds: b, axis } = link;
    const bands = treadsOf(link);
    const treads = bands.length;

    // Where this flight's underside clears the floor it stands on. That floor
    // is the flight's own base: the grand flight starts on the concourse, and
    // the concourse is what you walk about on under it.
    const soffitFrom = OPEN_UNDER.has(link.id)
      ? link.base + UNDER_STAIR_HEAD + STAIR_SOFFIT
      : Infinity;

    for (let i = 0; i < treads; i += 1) {
      const band = bands[i];
      const tread =
        axis === 'y'
          ? rect(b.x, band.from, b.w, band.to - band.from)
          : rect(band.from, b.y, band.to - band.from, b.h);

      // Drawn from the link's own base, so the grand flight starts at
      // concourse level rather than sinking through it.
      const surface = band.surface;

      // High enough to stand under: a slab on the pitch and nothing below it.
      //
      // Only the face this flight shows to the floor it LEAVES. The same tread
      // seen from the floor it arrives on is emitted below and is unchanged —
      // it is what stops a robot driving into the stairwell from up there, and
      // an early `continue` here silently took it away for the upper half of
      // the flight. `npm run traverse` had Biggy four metres into the well.
      if (surface >= soffitFrom) {
        soffits.push({
          floor: link.from,
          bounds: tread,
          height: surface,
          base: surface - STAIR_SOFFIT,
          // Heights measured from the storey datum, not from the plate this
          // happens to hang over. Same reason the wall bands carry it.
          linkId: link.id,
        });
      } else {
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
      }

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
  return { solids: solid, decor: soffits };
}

// ---------------------------------------------------------------------------

/**
 * Elevations that are curtain wall rather than building.
 *
 * The front of the Kinepolis is glass. You walk up to a wall of it, and the
 * concourse behind is lit through it all day — it is the first thing the
 * building says and the reason the entrance reads as an entrance from fifty
 * metres away. Drawn as a solid 3.2 m slab it is the back of a warehouse.
 *
 * A BAND rather than a wall rectangle, because the wall builder decides where
 * the runs fall and merges them; this only has to say which elevation. The
 * band is tight enough in x to leave the BOF rooms' own south wall alone,
 * which sits 0.4 m further out and is not glass.
 */
const CURTAIN_WALLS: { floor: Level; bounds: Rect; kind: 'window' | 'door' }[] = [
  // The entrance itself: the same glazing, coming down to the floor, and
  // some of it opens. "Windows that can be opened as a door" is the
  // building's own description and it is the right one — a door here is a
  // panel of the curtain wall on hinges, not a doorway cut in a wall.
  {
    floor: 0,
    bounds: rect(RECEPTION.x - 1, RECEPTION.y - 0.6, RECEPTION.w + 2, 1.2),
    kind: 'door',
  },
  /*
   * The same elevation a storey up, over the entrance and facing the head of
   * the grand stair.
   *
   * A curtain wall does not stop at the first floor slab, and this is the one
   * piece of it you meet from inside: you come up the grand flight and the
   * thing at the top of it is a window the height of the wall. Windows, not
   * doors — there is no walking out of the first floor.
   */
  {
    floor: 1,
    bounds: rect(-CORRIDOR_HALF - 0.5, SOUTH_END - 0.6, CORRIDOR_HALF * 2 + 1, 1.2),
    kind: 'window',
  },
];

/**
 * Solid base under a window, metres. Glass does not meet the floor.
 *
 * A door does: that is most of what tells the two apart in plan and all of
 * what tells them apart from across the concourse.
 */
const GLAZING_SILL = 0.45;

/**
 * Mullion centres and width, metres.
 *
 * ONE pitch for both storeys, because that is what a curtain wall is: a grid
 * that runs up the whole elevation and lines up floor to floor. The entrance
 * was drawn at a door leaf's 1.1 m on the theory that a bank of doors is
 * framed leaf by leaf, and across 36 m that is thirty-three posts — a picket
 * fence, and nothing like the photograph. The bays in that are wide enough to
 * read as panes of glass with frames round them rather than the other way
 * round, and the ground floor is the same grid coming down to the floor.
 */
const MULLION_PITCH = 2.6;
const MULLION_WIDTH = 0.14;

/**
 * The bottom rail of a glazed door, metres.
 *
 * Half a spandrel, and that difference is the point: a window sits on a
 * solid base you cannot walk through and a door comes down to the floor. A
 * push rail across the bank at hand height was tried first and is not worth
 * having — three pixels at this zoom, and the float check was right to call
 * a 36 m bar held up by nothing but mullions a wall hanging in the air.
 */
const DOOR_KICK = 0.2;

/** Thickness of the glass itself. Thin, so it reads as a plane. */
const PANE_THICKNESS = 0.08;

/**
 * Turn the walls on a glazed elevation into a curtain wall.
 *
 * The wall still stops a robot — a window is not a door — so what was there
 * stays, marked `hidden`. What you SEE instead is three things: the sill it
 * stands on, the mullions dividing it into bays, and one pane of glass the
 * length of the run. The pane is the only piece in the building that is
 * drawn translucent; see GLAZING_OPACITY in the renderer.
 */
function glazeFacade(walls: Obstacle[]): { walls: Obstacle[]; decor: Decor[] } {
  const kept: Obstacle[] = [];
  const decor: Decor[] = [];

  for (const wall of walls) {
    const b = wall.bounds;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    // In the band, and lying ALONG it. Without the second half a 0.4 m stub
    // of the BOF rooms' west wall — the return at the corner where the
    // entrance elevation stops — came out as a pane of glass on its own.
    const glazing = CURTAIN_WALLS.find(
      (c) =>
        c.floor === wall.floor &&
        rectContains(c.bounds, cx, cy) &&
        (c.bounds.w >= c.bounds.h) === (b.w >= b.h),
    );
    if (!glazing) {
      kept.push(wall);
      continue;
    }

    /*
     * The wall stays, for collision, and stops being drawn.
     *
     * The doors do not open in the simulation, and that is not an oversight
     * about doors — there is nothing outside to open onto. South of this line
     * the building's extents run out: no plate, no floor, a robot that got
     * through would step off the concourse into 1.2 m of nothing and keep
     * falling. They are doors when there is a forecourt to walk into.
     */
    kept.push({ ...wall, hidden: true });

    const door = glazing.kind === 'door';
    const along = b.w >= b.h; // which way the run lies
    const run = along ? b.w : b.h;
    // A window stands on a solid spandrel; a door comes down to its own
    // bottom rail. Same piece, and with the grid now shared between the two
    // storeys it is the ONLY thing that tells them apart — which is also all
    // the photograph shows: one wall of glass, standing on something upstairs
    // and reaching the pavement downstairs.
    const foot = door ? DOOR_KICK : GLAZING_SILL;
    decor.push({ floor: wall.floor, bounds: b, height: foot });

    decor.push({
      floor: wall.floor,
      bounds: along
        ? rect(b.x, cy - PANE_THICKNESS / 2, b.w, PANE_THICKNESS)
        : rect(cx - PANE_THICKNESS / 2, b.y, PANE_THICKNESS, b.h),
      base: foot,
      height: wall.height,
      material: 'glazing',
    });

    // One mullion at each end and the bays between them as near the pitch as
    // the run allows, so a 36 m front does not end on half a bay.
    const bays = Math.max(1, Math.round(run / MULLION_PITCH));
    for (let i = 0; i <= bays; i += 1) {
      const at = (i * (run - MULLION_WIDTH)) / bays;
      decor.push({
        floor: wall.floor,
        bounds: along
          ? rect(b.x + at, b.y, MULLION_WIDTH, b.h)
          : rect(b.x, b.y + at, b.w, MULLION_WIDTH),
        base: foot,
        height: wall.height,
      });
    }
  }

  return { walls: kept, decor };
}

/**
 * Stairwells whose flanking walls are balustrades rather than walls.
 *
 * The grand flight arrives between Rooms 6 and 7, so the corridor's own side
 * walls run the length of its well — and at 3.2 m they make the head of the
 * staircase a slot between two blank faces. A stair hall is not a slot: what
 * stands along the edge of a five-metre drop is something you can see over.
 *
 * The two flights into the hall are deliberately not in here. Their wells are
 * pressed against the corridor walls with no landing beside them, so lowering
 * those walls opens an auditorium to a stairwell nobody can stand in.
 */
const RAILED_WELLS = new Set(['grand-stair']);

/**
 * Metres of landing a wall may be from a well and still count as flanking it.
 * Wide enough for the grand flight's 1.5 m, narrow enough that the corridor's
 * far side is never in question.
 */
const FLANKING = 2.5;

/**
 * Lower the stretch of wall that runs alongside a stairwell to a balustrade.
 *
 * Still SOLID, and that is the point of doing it this way rather than deleting
 * the wall: a balustrade is something you see over, not something you walk
 * through, and the auditorium behind it is still entered by its own door. The
 * only thing that changes is how much of the building is in the way of looking
 * at the staircase.
 */
function railBesideWells(walls: Obstacle[], links: Link[]): Obstacle[] {
  const wells = links.filter((l) => RAILED_WELLS.has(l.id) && l.from !== l.to);

  return walls.flatMap((wall) => {
    let pieces = [wall];
    for (const well of wells) {
      pieces = pieces.flatMap((piece) => splitBesideWell(piece, well));
    }
    return pieces;
  });
}

function splitBesideWell(wall: Obstacle, well: Link): Obstacle[] {
  const b = wall.bounds;
  const w = well.bounds;
  // Only a wall on the well's own storey, running ALONG it, and close enough
  // to be the edge of its landing rather than something across the corridor.
  if (wall.floor !== well.to || b.h <= b.w) return [wall];
  const gap = Math.min(Math.abs(b.x - (w.x + w.w)), Math.abs(w.x - (b.x + b.w)));
  if (gap > FLANKING) return [wall];

  const lo = Math.max(b.y, w.y);
  const hi = Math.min(b.y + b.h, w.y + w.h);
  if (hi - lo < 0.2) return [wall];

  const out: Obstacle[] = [];
  if (lo - b.y > 0.05) out.push({ ...wall, bounds: rect(b.x, b.y, b.w, lo - b.y) });
  out.push({ ...wall, bounds: rect(b.x, lo, b.w, hi - lo), height: RAIL_HEIGHT });
  if (b.y + b.h - hi > 0.05) {
    out.push({ ...wall, bounds: rect(b.x, hi, b.w, b.y + b.h - hi) });
  }
  return out;
}

const WALLS = derivedWalls([...floor0Rooms, ...floor1Rooms], staircases);
const FACADE = glazeFacade(WALLS.walls);

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

/**
 * The flights that stand clear of a wall, and so are worth railing.
 *
 * The grand flight joined them by being narrowed: at the full width of the
 * corridor its sides WERE the corridor walls, and now there is 1.5 m of landing
 * past each one with a five-metre drop beside it.
 */
const RAILED = new Set(['stair-west', 'stair-east', 'grand-stair']);

function stairRails(links: Link[], rooms: Room[]): { solids: Obstacle[]; decor: Decor[] } {
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

    if (link.from === link.to) continue;

    /*
     * And the balustrade around the WELL, on the floor the flight arrives at.
     *
     * The rails above are the flight's own: they rake down with it, so by the
     * far end of the opening they are six metres below the corridor and the
     * hole in the floor has nothing around it at all. What a stairwell
     * actually has is a second, level balustrade following the edge of the
     * opening — and the two are different objects, which is why this is not
     * the same loop.
     *
     * Every side but the one the flight lands on. That one is the way in and
     * stays clear; walling it would make the staircase decorative.
     *
     * DRAWN, never collided, which is the one thing here that is not obvious.
     * Collision in this building is two-dimensional — `resolveCircleRect` has
     * never read a height — so a balustrade a robot would physically walk
     * UNDER, six metres below it at the foot of the flight, stops it dead
     * instead. As a solid this rail sealed the bottom of both staircases and
     * `npm run traverse` caught it on the first run. Nothing is lost by
     * dropping it: a robot cannot enter the well anyway, because the treads
     * cover the whole opening and a tread six metres under your feet is not
     * one you can step onto.
     */
    const landsAtLow = !link.ascending;
    const alongY = link.axis === 'y';
    const half = RAIL_THICKNESS / 2;
    // Straddling the edge of the opening rather than standing inside it: a
    // balustrade stands on the floor beside a hole, not over it, and half of
    // its footprint has to be on something or it is the floating-wall bug
    // again.
    const edges = [
      { at: 'low', bounds: alongY
          ? rect(b.x, b.y - half, b.w, RAIL_THICKNESS)
          : rect(b.x - half, b.y, RAIL_THICKNESS, b.h) },
      { at: 'high', bounds: alongY
          ? rect(b.x, b.y + b.h - half, b.w, RAIL_THICKNESS)
          : rect(b.x + b.w - half, b.y, RAIL_THICKNESS, b.h) },
      { at: 'side', bounds: alongY
          ? rect(b.x - half, b.y, RAIL_THICKNESS, b.h)
          : rect(b.x, b.y - half, b.w, RAIL_THICKNESS) },
      { at: 'side', bounds: alongY
          ? rect(b.x + b.w - half, b.y, RAIL_THICKNESS, b.h)
          : rect(b.x, b.y + b.h - half, b.w, RAIL_THICKNESS) },
    ];
    for (const edge of edges) {
      if (edge.at === (landsAtLow ? 'low' : 'high')) continue;
      /*
       * And only where there is floor for it to stand on.
       *
       * A well pushed hard against the edge of its storey has one side that is
       * the building's own outer wall, and a balustrade straddling THAT is
       * half over the opening and half over nothing: it floats, which is what
       * `npm run venue` said the moment the grand flight moved flush with the
       * south end. The wall already guards that edge. A rail is for an edge
       * the floor makes, not one the building does.
       */
      const cx = edge.bounds.x + edge.bounds.w / 2;
      const cy = edge.bounds.y + edge.bounds.h / 2;
      // Sampled half a metre OUTBOARD of the rail, not at the rail: a
      // balustrade straddles the lip of the opening, so its own centre is on
      // the line and answers yes to everything. What decides it is whether
      // there is floor on the far side for anyone to be standing on.
      const out = 0.5;
      const ox = cx + Math.sign(cx - (b.x + b.w / 2)) * out;
      const oy = cy + Math.sign(cy - (b.y + b.h / 2)) * out;
      const guarding = rooms.some(
        (r) =>
          r.floor === link.to &&
          rectContains(r.bounds, ox, oy) &&
          // A hole in the plate is not floor to stand on. Without this the
          // grand flight kept a balustrade down each side of its well, in mid
          // air, once the well became wider than the flight.
          !r.voids?.some((v) => rectContains(v, ox, oy)),
      );
      if (!guarding) continue;
      decor.push({ floor: link.to, bounds: edge.bounds, base: 0, height: RAIL_HEIGHT });
    }
  }

  return { solids, decor };
}

/**
 * The reception desk, the office behind it, and the toilet cubicles.
 *
 * The concourse was a bare plate with a staircase in it: 830 m² of the
 * building's front door with nothing in it to recognise. The plan has a
 * reception counter and its office standing north-west of the grand flight,
 * and toilets off the south-east corner, and all of it is what makes the
 * space read as somewhere you arrive rather than somewhere left over.
 *
 * Two heights and the difference between them is the point. The office is a
 * room and its south and east sides are 3.2 m walls; the counter along its
 * west and north is 1.1 m, which you see over from anywhere in the concourse.
 * A counter drawn at wall height is a room, and this is not a room — it is a
 * desk you walk up to.
 */

/** Height of anything you are meant to see over. Never above 1.4 m. */
const COUNTER_HEIGHT = 1.1;

/** How deep the counter top is, metres. A desk, not a wall. */
const COUNTER_DEPTH = 0.6;

/**
 * The reception enclosure, north-west of the stairwell.
 *
 * Its west side lines up with the well's, which is how the plan draws it: the
 * desk and the flight share an edge and you walk between them.
 */
const DESK = rect(GRAND_WELL.x, GRAND_WELL.y + GRAND_WELL.h + 3.0, 9.8, 5.0);

/** The way in behind the counter, metres off the enclosure's west corner. */
const DESK_DOOR = 2.2;

/** The store against the head of the stairs. Full height; a cupboard. */
const DESK_STORE = rect(GRAND_WELL.x, GRAND_WELL.y + GRAND_WELL.h, 3.6, 1.6);

function receptionFitOut(): Obstacle[] {
  return [
    // The office: walled on the two sides away from the concourse, with the
    // staff way in at the corner nearest the stairs. Closed on all four sides
    // it is a box nobody can be inside, which is a strange thing to build.
    {
      floor: 0,
      bounds: rect(DESK.x + DESK_DOOR, DESK.y, DESK.w - DESK_DOOR, WALL_THICKNESS),
      height: WALL_HEIGHT,
    },
    {
      floor: 0,
      bounds: rect(DESK.x + DESK.w - WALL_THICKNESS, DESK.y, WALL_THICKNESS, DESK.h),
      height: WALL_HEIGHT,
    },
    { floor: 0, bounds: DESK_STORE, height: WALL_HEIGHT },
    // The counter: the two sides the public stands at.
    {
      floor: 0,
      bounds: rect(DESK.x, DESK.y, COUNTER_DEPTH, DESK.h),
      height: COUNTER_HEIGHT,
      material: 'desk',
    },
    {
      floor: 0,
      bounds: rect(DESK.x, DESK.y + DESK.h - COUNTER_DEPTH, DESK.w, COUNTER_DEPTH),
      height: COUNTER_HEIGHT,
      material: 'desk',
    },
  ];
}

/**
 * The balustrade across the head of the grand well, either side of the flight.
 *
 * The floor stops right across the corridor at the head of the stairs, so the
 * 1.5 m beyond each side of the flight is an edge like any other and wants
 * something along it. It is also the only thing keeping a robot out of the
 * well: `voids` is render-only, so without this a machine walking south down
 * the side of the corridor finds the floor still there in the simulation and
 * strolls out over a five-metre drop.
 */
function grandWellHeadRails(): Obstacle[] {
  const head = GRAND_WELL.y + GRAND_WELL.h;
  const half = RAIL_THICKNESS / 2;
  return [GRAND_WELL.x, GRAND_STAIR.x + GRAND_STAIR.w].map((x) => ({
    floor: 1,
    bounds: rect(x, head - half, GRAND_SIDE, RAIL_THICKNESS),
    height: RAIL_HEIGHT,
  }));
}

const BOOTHS = exhibitionBooths();
const STAIRS = stairMass(staircases);
const RAILS = stairRails(staircases, [...floor0Rooms, ...floor1Rooms]);

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [
    ...exhibitionColumns(),
    ...BOOTHS.solids,
    ...HALL_CUTAWAYS,
    ...auditoriumSolids,
    ...STAIRS.solids,
    ...RAILS.solids,
    ...grandWellHeadRails(),
    ...receptionFitOut(),
    ...railBesideWells(FACADE.walls, staircases),
  ],
  decor: [
    ...auditoriumDecor,
    ...WALLS.decor,
    ...RAILS.decor,
    ...STAIRS.decor,
    ...FACADE.decor,
    ...BOOTHS.decor,
  ],
  links: staircases,
  extents: [rect(HALL.x, -62, HALL.w + 13, 74), rect(-46, SOUTH_END, 92, 150)],
};

/** Named spawn points, so chapters do not hard-code coordinates. */
export const SPAWNS = {
  /** Inside the main entrance, looking north up the reception concourse. */
  /** Inside the main entrance, east of the grand stair. */
  mainEntrance: { floor: 0 as const, x: 18, y: -57 }, // 1.2 m up, in the concourse
  /** Where the concourse opens into the hall. */
  // Between the two southernmost column rows, which sit at y -27.05 and
  // -33.58, and now on the centre line of the main aisle: the cast lines up
  // eastward from here and the east rank of stands begins at x 4.0.
  hallEntrance: { floor: 0 as const, x: -1, y: -32.4 },
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
  hallCentre: { floor: 0 as const, x: -2.6, y: -24 },
  /**
   * Just south of the west flight, below its TOP.
   *
   * The flights climb southward, so this end of one is a storey of wall: drive
   * north from here and you meet it, which is what `npm run traverse` asserts.
   * The foot you can actually walk onto is at the far, northern end.
   */
  stairFoot: { floor: 0 as const, x: -6.0, y: -9.6 },
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
