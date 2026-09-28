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
 * Origin (0, 0) is on the building's centre line, 18.3 m in from the hall's
 * north wall. It was the centre of the two hall staircases until the hall was
 * re-measured one bay deeper (28 Sep): the staircases went north with the
 * wall and the column grid, and the origin stayed, because every coordinate
 * on floor 1 is measured from it. +x east, +y north, +z up.
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
 * The hall: 52.3 × 55.7 m, and very nearly all of it open floor.
 *
 * The width comes off `booth-map.png`, which is the same ground floor drawn
 * again with the Devoxx stand plan on it, and which scales itself: the large
 * stands are 24 m² and stack at a 175 px pitch, so 175 px is 6 m and their
 * 118 px width is 4.05 m — 4 × 6, exactly 24 m². At that scale the building
 * interior measures 52.3 m across.
 *
 * The depth is the COLUMN GRID's, and it used to be 49.4 m. That figure was
 * the line with the most ink on it, which is the outer edge of the steps in
 * front of the doors rather than the wall they stand against. Read off
 * `hollywood-area.png` against the columns, the door wall is 10.1 m south of
 * the last row of columns, not 3.8 m: one whole bay was missing, and the
 * threshold steps — a 3 m landing and 2 m of steps — had been squeezed into
 * the space left, as a shallow wedge (the author, 28 Sep: "they don't match
 * the plan"). The south wall stays where it was, because the reception, the
 * grand stair and all of floor 1 are registered to it, so the bay goes in at
 * the north: the wall, the grid, the stair cores and everything standing
 * among them moved 6.3 m north together.
 */
const HALL = rect(-23.5, -37.4, 52.3, 55.7);

/** The hall's north wall. Everything in the hall is laid out from it. */
const HALL_NORTH = HALL.y + HALL.h;

/** Printed on the plan. tools/venue.mjs holds the geometry to it. */
export const HALL_AREA_M2 = 2411.41;

/**
 * The hall's east side, which steps out twice going south.
 *
 * Mapped off `polo-desk.png`, the author's crop of `exhibition-floor.jpg`
 * (28 Sep), at that plan's 0.0798 m/px:
 *   - the north 26.3 m, where the east wall stands on column line 7 (the
 *     columns on it are built into it);
 *   - a middle stretch, 2.4 m further out, with the polo pickup's counter
 *     inside it, down to 40.5 m from the north wall;
 *   - the rest, out to the full width.
 * Beyond the first two is not hall. The plan leaves it white; the 2012
 * drawing has back rooms there (the stock bar and stores), which nobody
 * playing ever goes into. Until 28 Sep it was built as closed blocks, which
 * read as rooms with no way in (the author: "some closed space that
 * probably not be there"). Now it is outside: no floor, and a wall along
 * the line.
 */
const HALL_NE_WALL = -23.5 + 45.67; // column line 7: HALL.x + COLUMN_X[6]
const HALL_MID_WALL = HALL_NE_WALL + 2.4;
const HALL_STEP = HALL_NORTH - 26.3;
const HALL_MID_FOOT = HALL_NORTH - 40.5;
const HALL_EAST = HALL.x + HALL.w;
/** The two pieces of the box that are outside, north then middle. */
const HALL_OUTSIDE = [
  rect(HALL_NE_WALL, HALL_STEP, HALL_EAST - HALL_NE_WALL, HALL_NORTH - HALL_STEP),
  rect(HALL_MID_WALL, HALL_MID_FOOT, HALL_EAST - HALL_MID_WALL, HALL_STEP - HALL_MID_FOOT),
];

/**
 * The parts of the bounding box that are not exhibition floor.
 *
 * Every one of them is drawn on `hollywood-area.png`, and every one was cut
 * smaller than the drawing while the hall was a bay too short, because the
 * printed area was being met by a box that was missing 330 m² of its own:
 *
 *   - north-west, the toilets and the corridor in to them. 78 m².
 *   - north-east and east, outside the building: see `HALL_OUTSIDE`. These
 *     collide but are not drawn, and the hall's plate has them cut out.
 *   - south-west, the curved cast concrete in the photographs, which ends in
 *     a notch 3.5 m deep beside the threshold steps. 45 m².
 *
 * The stair cores and the columns are not floor either, and `HALL_FLOOR_M2`
 * takes them off too.
 */
function hallCutaways(): Obstacle[] {
  const solid: Obstacle[] = [
    { floor: 0, bounds: rect(HALL.x, HALL_NORTH - 6.0, 13.0, 6.0), height: 3.4 },
    // Outside, so nothing to see: there is no floor there to see it on.
    ...HALL_OUTSIDE.map((bounds): Obstacle => ({ floor: 0, bounds, height: 3.4, hidden: true })),
  ];

  // South-west: the notch, running east to where the concourse begins, and
  // the quarter-round standing on it. Bands are measured at their southern
  // edge so the approximation stays outside the true curve rather than
  // cutting in.
  const notch = 3.5;
  solid.push({ floor: 0, bounds: rect(HALL.x, HALL.y, RECEPTION.x - HALL.x, notch), height: 3.2 });
  const radius = 6.8;
  const bands = 6;
  const band = radius / bands;
  const cy = HALL.y + notch + radius;
  for (let i = 0; i < bands; i += 1) {
    const y = HALL.y + notch + i * band;
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

/**
 * The counter every stand is run from, at the FRONT of it.
 *
 * Which is where you meet one: you are talked to across it from the aisle,
 * and a counter tucked against the backdrop is a stand nobody is manning.
 * Set 0.3 m in from the edge so there is a lip of platform in front of it
 * rather than the counter being the edge.
 *
 * `DESK_SHARE` of the frontage, capped, so the small stands get a metre of
 * counter and the large ones two and a half rather than four — a desk, not a
 * partition, and the rest of the frontage is the way in. Which end it sits
 * at alternates up the rank, because a floor where every stand is the same
 * object twenty-seven times reads as wallpaper.
 */
const DESK_HEIGHT = 1.0;
const DESK_DEPTH = 0.6;
const DESK_SETBACK = 0.3;
const DESK_SHARE = 0.55;
const DESK_MAX = 2.4;

/** Gap between small stands in a rank, metres. You walk through it. */
const BOOTH_GAP = 1.0;

/**
 * South end of the booth field.
 *
 * Set from the north wall, like the grid the ranks stand on: between the last
 * two rows of columns, which leaves the 10 m bay in front of the doors to the
 * threshold steps and the people coming down them. The stands had been hard
 * against the curved south-west corner, which was only possible while that
 * bay was missing.
 */
const BOOTH_SOUTH = HALL_NORTH - 43.0;

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

      const counter = Math.min(depth * DESK_SHARE, DESK_MAX);
      solids.push({
        floor: 0,
        bounds: rect(
          rank.back === 'west'
            ? rank.x + rank.w - DESK_SETBACK - DESK_DEPTH
            : rank.x + DESK_SETBACK,
          i % 2 === 0 ? y : y + depth - counter,
          DESK_DEPTH,
          counter,
        ),
        height: DESK_HEIGHT,
        material: 'desk',
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
 * reason the broad flight at the boundary exists at all.
 */
const CONCOURSE_LEVEL = 1.2;

/**
 * The threshold between the reception concourse and the exhibition hall.
 *
 * You come in at street level and the hall is 1.2 m below you, so this is the
 * first level change anybody meets and the one that has to read as an
 * ARRIVAL. `stairs-exhibition-reception.png` — the author's crop of
 * `hollywood-area.png` — draws it, and `exhibition-floor.jpg` agrees: the
 * doors open onto a LANDING standing in the hall at concourse level, 3 m
 * deep and as wide as the three bays between the columns the doors are hung
 * between, and the steps go down from it on three sides, in a band 2 m deep
 * that wraps round its north face and both ends.
 *
 * It had been a wedge splayed out of the doorway at 45 degrees with no
 * landing at all, 3.15 m deep in total, because the hall was a bay short and
 * 3.8 m was all there was between the doors and the first row of columns.
 *
 * Built in the hall on purpose, as it always was. Fanning it back into the
 * concourse puts steps within a robot's step of the plate they are cut out
 * of, and a machine standing half a metre from the edge reads the flight
 * under it and sinks into the floor it is standing on. Fanned DOWNWARDS every
 * one of those points is a metre above the hall floor beside it, far out of
 * reach, and the question never arises.
 */

/** Steps in the flight. The rise divided by the building's riser, as always. */
const THRESHOLD_STEPS = Math.round(CONCOURSE_LEVEL / RISER);

/**
 * Tread depth, metres. The drawing's band is 2.0 m on its north face and
 * 1.9 m at the ends; seven goings of 0.28 is 1.96, the same all round.
 */
const THRESHOLD_GOING = 0.28;

/** Metres of steps round the landing. See `Link.wrap`. */
const THRESHOLD_WRAP = THRESHOLD_STEPS * THRESHOLD_GOING;

/** The landing's depth off the door wall, metres. */
const LANDING_DEPTH = 3.0;

/**
 * The landing: from the column the doors start at to the one they end at.
 *
 * A plate of its own at concourse height (see the `threshold` room) rather
 * than the flight's top tread: a tread 19.6 m by 3 m is a floor, and drawn as
 * one it would be solid to anything that cannot climb the flight.
 */
const THRESHOLD_LANDING = rect(
  HALL.x + COLUMN_X[1],
  HALL.y,
  COLUMN_X[4] - COLUMN_X[1],
  LANDING_DEPTH,
);

/** The steps and the landing together: what the flight's surface covers. */
const HALL_STEPS = rect(
  THRESHOLD_LANDING.x - THRESHOLD_WRAP,
  HALL.y,
  THRESHOLD_LANDING.w + THRESHOLD_WRAP * 2,
  LANDING_DEPTH + THRESHOLD_WRAP,
);

/**
 * Where the wall builder must leave a hole that no link accounts for: the
 * landing's width, which is the run of doors.
 *
 * A same-storey flight punches its own way through a wall, which covers every
 * other level change in the building. Not this one: it meets the wall across
 * its whole 23.5 m and is only at door height along the landing, so letting
 * it cut its own hole opens the wall to the full span and leaves the ends of
 * the steps running into open concourse. It says where instead.
 */
const HALL_OPENING = rect(THRESHOLD_LANDING.x, HALL.y - 1, THRESHOLD_LANDING.w, 2);

/**
 * The columns standing in the door wall.
 *
 * On the plan every column line runs on into the wall between the hall and
 * the concourse, and the doors are hung between them in pairs. In a wall
 * they are hidden; in the opening they are what the doorway is divided by.
 */
const DOOR_WALL_COLUMNS = [1, 2, 3, 4].map((i) => HALL.x + COLUMN_X[i]);

/**
 * Metres per pixel of `reception-desk.png`, the author's crop of the
 * reception, and x on it in metres. The drawing's pillars stand on these
 * columns' lines: column 2 is x 109 on it, column 4 x 730. The reception's
 * fit-out and the grand flight's east edge are both read off it.
 */
const DESK_PLAN_SCALE = (DOOR_WALL_COLUMNS[3] - DOOR_WALL_COLUMNS[1]) / (730 - 109);
const planX = (px: number) => DOOR_WALL_COLUMNS[1] + (px - 109) * DESK_PLAN_SCALE;

/**
 * The box at the landing's west end.
 *
 * Both drawings have it, from the concourse's west wall to the landing, as
 * deep as the landing: `hollywood-area.png` as a plain outline standing over
 * the ends of the steps, `exhibition-floor.jpg` crossed through, which is how
 * a plan draws a shaft or a void. Neither says what it is, so it is built as
 * what both agree on — a solid thing the steps do not run through — at
 * balustrade height over the landing.
 */
const THRESHOLD_BOX = rect(
  RECEPTION.x,
  HALL.y + WALL_THICKNESS / 2,
  THRESHOLD_LANDING.x - RECEPTION.x,
  LANDING_DEPTH - WALL_THICKNESS / 2,
);

/**
 * The toilets: the north-east corner of the building, east of the concourse.
 *
 * Mapped off `toilet-reception.png`, the author's crop of
 * `exhibition-floor.jpg` (28 Sep: "they should be on the top right corner").
 * That plan has the block where it writes "Toilets >": in the east wing,
 * against the building's north-east corner, not inside the concourse, which
 * is where `hollywood-area.png` had it and where it stood until now.
 *
 * Read at 0.079 m/px, the scale that gives the east wing its 19.8 m. Running
 * north to south:
 *
 *   the two toilets                        5.87 m, back to the hall wall
 *   the lobby you queue in, off reception  1.78 m
 *
 * The plan draws a 1.77 m passage between the toilets and the hall wall.
 * It stood here for an hour, and it made two walls at the back of the
 * block, one behind the other. The author wants a single wall, so the
 * toilets run back to the hall wall and take the passage's depth (28 Sep).
 * West to east it is:
 *   - something under the "Toilets >" label, 8 m;
 *   - the women's room, 5.34 m: basins on the west wall and four cubicles
 *     on the east;
 *   - the men's room, 3.93 m: two cubicles and two urinals on the west
 *     wall, and basins on the east;
 *   - a 2.1 m service strip on the building's edge, with a stair at its foot.
 * The two rooms together are 9.27 m, the frontage `hollywood-area.png` gave.
 *
 * The area under the label and the service strip are not built. Neither
 * drawing says what the first one is. The second belongs to the BOF rooms,
 * which are being rebuilt one at a time.
 */
const EAST_WING_X = RECEPTION.x + RECEPTION.w;
const EAST_EDGE = 42.1;
const SERVICE_STRIP = 2.1;
const TOILET_DEPTH = 1.77 + 4.1;
const TOILET_LOBBY = 1.78;
const WOMENS_W = 5.34;
const MENS_W = 3.93;

const TOILETS_NORTH = HALL.y;
const TOILETS_SOUTH = TOILETS_NORTH - TOILET_DEPTH;
// Where the plan's fittings stop: they fill the 4.1 m it drew the rooms as.
const FITTED_NORTH = TOILETS_SOUTH + 4.1;
const MENS = rect(EAST_EDGE - SERVICE_STRIP - MENS_W, TOILETS_SOUTH, MENS_W, TOILET_DEPTH);
const WOMENS = rect(MENS.x - WOMENS_W, TOILETS_SOUTH, WOMENS_W, TOILET_DEPTH);
const TOILET_LOBBY_RECT = rect(
  EAST_WING_X,
  TOILETS_SOUTH - TOILET_LOBBY,
  MENS.x + MENS.w - EAST_WING_X,
  TOILET_LOBBY,
);

/**
 * A strip of concourse floor under the back wall west of the women's room.
 *
 * The renderer measures a wall from the floor under its centre and cuts it
 * off 2.7 m above that floor. Nothing is built under the "Toilets >" label
 * yet, so this stretch of wall stood on the hall's datum and was cut 1.2 m
 * lower than the toilets' walls beside it (the author, 28 Sep: "too short
 * compare to the one next to him"). So was the hall's own south wall west
 * of it, for the same reason, so the plate runs the whole back of the
 * unbuilt area, from the concourse's east wall to the women's room. That
 * puts those walls on the concourse datum, as the wall between the hall and
 * the reception already is. A `landing` is a plate the wall builder leaves
 * alone, so this adds the floor and nothing else.
 */
const TOILET_BACK_PLATE = rect(EAST_WING_X, HALL.y - WALL_THICKNESS / 2, WOMENS.x - EAST_WING_X, WALL_THICKNESS);

/**
 * The BOF rooms: two of them, south of the toilets' lobby, down three steps.
 *
 * Mapped off `bof-rooms.png` (the author, 28 Sep): the rooms share the
 * lobby's south wall and run to the front of the building, the full width
 * of the east wing. A partition, the dashed line on the plan, splits them
 * into two separate rooms at the pier between their doors.
 *
 * Each room is entered from the reception through a pair of doors, about
 * 1.9 m, in a bay in the concourse's east wall. Inside each door a flight
 * of small steps runs along the wall, wider than the door: the plan draws it
 * as three nested outlines over 1.1 m, 3.9 m either side of the pier. So
 * there are three risers of `RISER`, and the rooms sit 0.54 m under the
 * concourse. The plan does not say up or down. They were built going up
 * for an hour, and the author says down (28 Sep).
 *
 * Biggy climbs nothing, so it never gets in, which it never needed to.
 * The front is the old BOF rooms' line, 0.4 m proud of the reception's
 * glass, which the curtain wall is built to leave alone.
 */
const BOF_NORTH = TOILETS_SOUTH - TOILET_LOBBY;
const BOF_FRONT = -60.8;
const BOF_SPLIT = (BOF_NORTH + BOF_FRONT) / 2;
const BOF_STEPS = 3;
const BOF_GOING = 0.35;
const BOF_RISE = BOF_STEPS * RISER;
const BOF_LEVEL = CONCOURSE_LEVEL - BOF_RISE;
/** From the pier to each end of a flight, and the door at the pier end. */
const BOF_PIER = 0.4;
const BOF_FLIGHT = 3.5;
const BOF_DOOR = 2.0;

const BOF_NORTH_ROOM = rect(EAST_WING_X, BOF_SPLIT, EAST_EDGE - EAST_WING_X, BOF_NORTH - BOF_SPLIT);
const BOF_SOUTH_ROOM = rect(EAST_WING_X, BOF_FRONT, EAST_EDGE - EAST_WING_X, BOF_SPLIT - BOF_FRONT);
const BOF_FLIGHTS = [
  rect(EAST_WING_X, BOF_SPLIT + BOF_PIER, BOF_STEPS * BOF_GOING, BOF_FLIGHT),
  rect(EAST_WING_X, BOF_SPLIT - BOF_PIER - BOF_FLIGHT, BOF_STEPS * BOF_GOING, BOF_FLIGHT),
];

/**
 * The wall either side of each BOF door.
 *
 * A flight crossing a wall opens it for its whole width. These flights are
 * wider than their doors, so this closes the rest. The pier between the two
 * doors is the wall builder's own. Each piece stands on the concourse, like
 * the rest of the wall it is in. Its centre is over the room's plate, which is
 * 0.54 m lower, hence the `datum`.
 */
function bofDoorJambs(): Obstacle[] {
  const jamb = (y: number, h: number): Obstacle => ({
    floor: 0,
    bounds: rect(EAST_WING_X - WALL_THICKNESS / 2, y, WALL_THICKNESS, h),
    datum: CONCOURSE_LEVEL,
    height: WALL_HEIGHT,
  });
  return [
    // North room: the door at the pier end, the jamb at the far end.
    jamb(BOF_SPLIT + BOF_PIER + BOF_DOOR, BOF_FLIGHT - BOF_DOOR),
    // South room: the same, mirrored.
    jamb(BOF_SPLIT - BOF_PIER - BOF_FLIGHT, BOF_FLIGHT - BOF_DOOR),
  ];
}

const bofSteps: Link[] = BOF_FLIGHTS.map((bounds, i) => ({
  id: i === 0 ? 'bof-2-steps' : 'bof-1-steps',
  from: 0,
  to: 0,
  bounds,
  base: BOF_LEVEL,
  rise: BOF_RISE,
  axis: 'x',
  // Down as you go in, eastward.
  ascending: false,
  riser: RISER,
}));

/**
 * What is in the two rooms, from the plan.
 *
 * Each cubicle bank collides as one hidden block, because a robot does not go
 * into a cubicle. What you see is the partitions, their fronts with a gap for
 * each door, and a pan in each cubicle. Basins are a counter along their wall.
 */
function toiletFitOut(): { solids: Obstacle[]; decor: Decor[] } {
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];
  const PARTITION = 2.0;
  const THIN = 0.05;
  const inset = WALL_THICKNESS / 2;

  const counter = (x: number) =>
    solids.push({
      floor: 0,
      bounds: rect(x, TOILETS_SOUTH + 0.4, 0.55, FITTED_NORTH - TOILETS_SOUTH - 0.6),
            height: 0.85,
      material: 'desk',
    });

  // A bank of `n` cubicles stacked north to south, `deep` across, with the
  // fronts facing `front` (-1 west, 1 east) and the pans against the far wall.
  const cubicles = (x: number, deep: number, north: number, n: number, pitch: number, front: -1 | 1) => {
    const y0 = north - n * pitch;
    solids.push({
      floor: 0,
      bounds: rect(x, y0, deep, n * pitch),
            height: PARTITION,
      hidden: true,
    });
    const faceX = front === -1 ? x : x + deep - THIN;
    const backX = front === -1 ? x + deep - 0.6 : x + 0.15;
    for (let i = 0; i <= n; i += 1) {
      decor.push({
        floor: 0,
        bounds: rect(x, y0 + i * pitch - THIN / 2, deep, THIN),
                height: PARTITION,
        material: 'structure',
      });
    }
    for (let i = 0; i < n; i += 1) {
      const c = y0 + i * pitch;
      const stile = (pitch - 0.7) / 2;
      decor.push(
        { floor: 0, bounds: rect(faceX, c, THIN, stile), height: PARTITION, material: 'structure' },
        { floor: 0, bounds: rect(faceX, c + pitch - stile, THIN, stile), height: PARTITION, material: 'structure' },
        { floor: 0, bounds: rect(backX, c + pitch / 2 - 0.2, 0.45, 0.4), height: 0.45, material: 'desk' },
      );
    }
  };

  // Women's: basins west, four cubicles east, opening west.
  counter(WOMENS.x + inset);
  cubicles(WOMENS.x + 3.04, WOMENS_W - 3.04 - inset, FITTED_NORTH - inset, 4, (FITTED_NORTH - TOILETS_SOUTH - 2 * inset) / 4, -1);

  // Men's: two cubicles in the north-west corner, opening east; two urinals
  // on the west wall south of them; basins on the east wall.
  cubicles(MENS.x + inset, 1.35, FITTED_NORTH - inset, 2, 0.93, 1);
  for (const y of [TOILETS_SOUTH + 0.9, TOILETS_SOUTH + 1.7]) {
    solids.push({
      floor: 0,
      bounds: rect(MENS.x + inset, y, 0.35, 0.4),
            height: 0.65,
      material: 'desk',
    });
  }
  counter(MENS.x + MENS.w - inset - 0.55);

  /*
   * The back wall between the hall's south-east corner and the women's room.
   *
   * The hall stops at x 28.8, the toilets start at 30.7, and nothing is
   * built under the "Toilets >" label, so no room owned this stretch of the
   * back line and the wall builder left it open. It is the building's
   * edge, like the rest of that line.
   *
   * It stands on `TOILET_BACK_PLATE`: see there for why it needs one.
   */
  const hallCorner = HALL.x + HALL.w - WALL_THICKNESS / 2;
  solids.push({
    floor: 0,
    bounds: rect(hallCorner, TOILET_BACK_PLATE.y, WOMENS.x - hallCorner, WALL_THICKNESS),
    height: WALL_HEIGHT,
    exterior: true,
  });

  return { solids, decor };
}

/*
 * No wheelchair ramp. `exhibition-floor.jpg` labels one off the landing's
 * east end, and it stood there for a day, but the author's drawing has steps
 * at that end as at the other and the author wants the steps (28 Sep). So
 * Biggy, which climbs nothing, stays on whichever level it starts on — which
 * the chapters already assumed: nothing heavy ever changes level.
 */

/**
 * The forecourt, and the way out onto it.
 *
 * Photographed in `references/venue/photos/54842743975_b835884445_k.jpg`:
 * you come out of a bank of glass doors onto a strip of asphalt, cross a
 * line of bollards and a band of brick setts, and you are on the road. The
 * building behind you is two storeys of curtain wall in a mullion grid
 * between pale precast flanks, with the sign high up and three banner poles
 * out front.
 *
 * It sits at CONCOURSE_LEVEL because that is what the concourse IS: you
 * come in at street level and go DOWN into the hall. The forecourt is not
 * a step down from reception, it is the same ground continuing.
 */
const FORECOURT = rect(-34, -88, 82, 27.6);

/**
 * Where the curtain wall starts, leaving solid precast west of it.
 *
 * Up here with the entrance rather than down with `CURTAIN_WALLS`, because
 * the two are laid out against each other: the precast flank carries the
 * star and the doors are punched into it, and the glass east of this line
 * carries the name. One number decides where the elevation changes.
 */
const GLAZING_START = -2.0;

/**
 * The bank of doors, hard against the WEST corner of the building.
 *
 * This is the only thing on the elevation placed by the route rather than
 * by the picture, and it is placed by the route because the route is what a
 * player uses. `exhibition-floor.jpg` leaves a clear 6.3 m aisle up the west
 * side of the concourse — west wall to the reception counter, with the grand
 * flight starting at x -5.65 — and that aisle runs the whole depth of the
 * building to the hall. Enter here and the stair is on your right and you
 * walk straight past it.
 *
 * Every other position fails that. Centred on the frontage, which is where
 * this started, put the doors dead in front of the grand flight: you came in
 * and the first thing you met was eight metres of staircase across your
 * nose. Moving it to the west end of the GLAZING — which is where the
 * photograph shows the crowd going in, and which was the last pass at this —
 * moved it 1.6 m and changed nothing about that.
 *
 * So the doors are a glazed bay in the precast rather than the first bay of
 * the curtain wall. That is the one place the elevation gives up something
 * to the plan: the photograph has the leaves where the glass begins. A
 * glazed slot in a precast flank is an ordinary way to build an entrance and
 * it keeps the star, the name and the sweep of glass where they belong,
 * which is more of the photograph than moving the glazing west would have
 * left.
 */
const ENTRANCE_WIDTH = 5.6;
const ENTRANCE_X = RECEPTION.x + 0.7;

/**
 * Where the ground floor's run of glass doors starts: right against the
 * entrance bank, so doors run unbroken from there to the east corner.
 *
 * Not `GLAZING_START`, which is the upper storey's glass. On the ground
 * floor the pier between the entrance and that line was built as precast
 * with a row of small windows, and the author says it is all glass doors
 * (28 Sep). The precast carries on above, and holds the star.
 */
const DOOR_RUN_START = ENTRANCE_X + ENTRANCE_WIDTH;

const WALL_OPENINGS: { floor: Level; bounds: Rect }[] = [
  { floor: 0, bounds: HALL_OPENING },
  // The doors themselves, and the only hole in this elevation. The curtain
  // wall east of them is WINDOW — see CURTAIN_WALLS — so this is the whole
  // of the way in and out of the building on foot.
  { floor: 0, bounds: rect(ENTRANCE_X, RECEPTION.y - 1.2, ENTRANCE_WIDTH, 2.4) },
];

const floor0Rooms: Room[] = [
  { id: 'hall', label: 'Exhibition Hall', kind: 'hall', floor: 0, bounds: HALL, voids: HALL_OUTSIDE },
  // After the hall, always: the wall builder asks "which room is on the far
  // side of this edge" and takes the first answer, and the answer for the
  // concourse's north wall has to be the hall.
  {
    id: 'threshold',
    label: 'Exhibition Hall',
    kind: 'landing',
    floor: 0,
    bounds: THRESHOLD_LANDING,
    elevation: CONCOURSE_LEVEL,
  },
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
  /*
   * East of the concourse: the toilets, and the lobby to them.
   * See `WOMENS` for the drawing. BOF 1, 2 and 3 stood south of them and the
   * author is rebuilding that side one room at a time (28 Sep), so the rest
   * of the east wing is the building's edge until they come back.
   */
  // South first, as they always were: BOF 1 is the one on the front.
  //
  // Each plate has its flight cut out of it. The plate is drawn as a block
  // from the ground up and the treads are too, so without the hole the two
  // shared the top step's face and every face along the flight's sides, and
  // the steps flickered (the author, 28 Sep).
  { id: 'bof-1', label: 'BOF 1', kind: 'service', floor: 0, bounds: BOF_SOUTH_ROOM, elevation: BOF_LEVEL, voids: [BOF_FLIGHTS[1]] },
  { id: 'bof-2', label: 'BOF 2', kind: 'service', floor: 0, bounds: BOF_NORTH_ROOM, elevation: BOF_LEVEL, voids: [BOF_FLIGHTS[0]] },
  { id: 'toilet-back-wall', label: 'Toilets', kind: 'landing', floor: 0, bounds: TOILET_BACK_PLATE, elevation: CONCOURSE_LEVEL },
  { id: 'toilet-lobby', label: 'Toilets', kind: 'corridor', floor: 0, bounds: TOILET_LOBBY_RECT, elevation: CONCOURSE_LEVEL },
  // The doors are where the plan hangs them: the women's at the west end of
  // its frontage, the men's at the east end.
  { id: 'toilets-women', label: 'Toilets', kind: 'service', floor: 0, bounds: WOMENS, elevation: CONCOURSE_LEVEL, doorSide: 'low', doorMargin: 0.5 },
  { id: 'toilets-men', label: 'Toilets', kind: 'service', floor: 0, bounds: MENS, elevation: CONCOURSE_LEVEL, doorSide: 'high', doorMargin: 0.7 },
  {
    id: 'forecourt',
    label: 'Outside',
    kind: 'outside',
    floor: 0,
    bounds: FORECOURT,
    elevation: CONCOURSE_LEVEL,
  },
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

/**
 * The corridor's WEST half: half of the measured 14.3 m, which is where its
 * west wall and the hall's flights still stand. Its east wall is further out
 * than the other half, at `CORRIDOR_EAST`.
 */
const CORRIDOR_HALF = 7.15;

/**
 * Where the grand flight's EAST edge is: the stair hall's east wall.
 *
 * `reception-desk.png` draws the flight wall to wall, 15.9 m, and that wall
 * is on its x 887. The flight had stopped 5.25 m short of it, at the
 * corridor's east wall, and the concourse beside it was flat floor. The
 * author wants it to run to the wall and the hallway upstairs to widen to
 * take it: the whole hallway, not just in front of Room 7 (28 Sep). So the
 * corridor's east wall, and every room on that side, stands `EAST_BAY`
 * further east. See `CORRIDOR_EAST`.
 */
const GRAND_EAST = planX(887);

/**
 * How much wider the corridor is on its east side than the 14.3 m it was
 * measured at: the grand flight's overrun. The east wall is centred on the
 * line the stair hall's east wall stands on downstairs.
 */
const EAST_BAY = GRAND_EAST + WALL_THICKNESS / 2 - CORRIDOR_HALF;

/**
 * The corridor's east wall, and the frontage of every room on that side.
 *
 * The hall's east flight moved with it and stands against it, as it always
 * stood against the corridor's east wall (`STAIR_EAST`). Its core in the hall
 * below moved with it too (the author, 28 Sep).
 */
const CORRIDOR_EAST = CORRIDOR_HALF + EAST_BAY;

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
const STAIR_EAST = rect(CORRIDOR_EAST - STAIR_WIDTH, STAIR_FOOT_Y - STAIR_RUN, STAIR_WIDTH, STAIR_RUN);

/**
 * The box each hall flight starts in, metres.
 *
 * `hollywood-area.png` draws both flights as enclosed cores: walls down both
 * sides and across the north end, and at the foot a vestibule with a pair of
 * doors in EACH side wall. You do not walk up to the bottom step from the
 * hall; you go in at the side, turn, and climb. The author confirmed it
 * against the building (28 Sep) — the flights had been open at the foot and
 * along both flanks, which made them two ramps standing in the room.
 *
 * On the plan the vestibule is about 5.4 m of a 3.1 m-wide core and the doors
 * sit 0.55–3.1 m from its north wall. The hall has 8.4 m between these feet
 * and its north wall, so the vestibule keeps its proportions at 4 m and the
 * doors stay in its northern half, with the doorway the building's usual 1.8 m
 * pair of leaves.
 */
export const CORE_VESTIBULE = 4.0;
export const CORE_DOOR = 1.8;
/** From the vestibule's north wall to the near jamb of its side doors. */
export const CORE_DOOR_SET = 0.5;

/**
 * Where the grand flight's WEST edge is, metres from the building's centre line.
 *
 * The flight is not centred on the corridor, and both plans say so. On
 * `cinema-venue-devoxx.png` its treads run from 2.4 m west of the centre line
 * to past the corridor's east wall, under the strip in front of Room 7; on
 * `hollywood-area.png` it is the same distance east of the hall flights' own
 * centre. It had been centred with a 1.5 m gap down each side, and the author
 * walked up it (28 Sep): the stair "is not aligned".
 *
 * It stopped at the corridor's east wall, 9.55 m wide, because Room 7
 * abutted the corridor. Now it runs wall to wall in its stair hall: see
 * `GRAND_EAST`.
 */
const GRAND_WEST = -2.4;


/**
 * The grand flight's pitch: the building's riser on a 0.26 m going.
 *
 * It had a ceremonial 0.15 over 0.36 of its own, which takes 11.9 m of run —
 * and there are not 11.9 m of run here. Both plans draw a SHORT flight: about
 * 6 m deep on the ground floor, with a landing halfway, and 7.5 m from its
 * head to the south wall upstairs. The run it took came out of the one thing
 * upstairs the author missed, the terrace in front of the stairhead
 * (`access-main-stairs.png`): at 11.9 m the head was 4.7 m from Rooms 5 and
 * 8, where the plan has it 10.4 m off them.
 *
 * It was 28 risers of 0.18 over 0.26, 7.3 m, which puts the head 9.3 m off
 * the rooms. The author asked for more steps, and then said what that means:
 * a LONGER flight (28 Sep). So it is 34 risers of 0.147 on a 0.30 m going,
 * 10.2 m, which is the comfortable pitch a grand stair has (twice the riser
 * plus the going is 0.59). Droid clears 0.147 as it cleared 0.18, and Biggy
 * still clears nothing.
 *
 * The foot is as far south as it goes: 0.4 m of landing, 0.95 m from the
 * glass doors. So the flight grew north, and its head is 2.1 m further into
 * the concourse than it was. The reception's fit-out is laid out from the
 * head (`planY`), so the island, the pillars and the stair hall's walls
 * moved north with it and keep their places relative to it. Upstairs the
 * head is 7.2 m off Rooms 5 and 8.
 */
const GRAND_STEPS = 34;
const GRAND_GOING = 0.3;
const GRAND_RUN = GRAND_STEPS * GRAND_GOING;

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
 *
 * 0.4 m of it since 28 Sep, down from 1.2: the flight took the rest when it
 * was lengthened (see `GRAND_STEPS`). On the ground floor the concourse runs on
 * past the well to the glass, so the foot still has floor in front of it.
 */
const GRAND_LANDING = 0.4;

/**
 * The WELL — the hole the grand flight comes up through. Exactly as wide as
 * the flight: walled on the west by the block round the curve, and on the
 * east by the corridor's east wall, so there is no drop beside the flight to
 * rail off.
 */
const GRAND_WELL = rect(
  GRAND_WEST,
  // The INNER FACE of the south wall, not its centreline. A wall is drawn
  // standing on the plate under it, and a well taken right to SOUTH_END leaves
  // the building's own end wall with no plate at all — 14.3 m of it hanging
  // over the reception, which `npm run venue` reports the moment you try it.
  SOUTH_END + WALL_THICKNESS / 2,
  GRAND_EAST - GRAND_WEST,
  GRAND_RUN + GRAND_LANDING,
);

const GRAND_STAIR = rect(GRAND_WELL.x, GRAND_WELL.y + GRAND_LANDING, GRAND_WELL.w, GRAND_RUN);

/**
 * The terrace: what you arrive on at the top of the grand flight.
 *
 * `access-main-stairs.png` is the south end of the auditorium level. The
 * corridor between Rooms 5 and 8 does not run on to the stairs. It opens into
 * a landing the full width of the corridor, and the flight starts from the
 * far side of it, in the east. West of the flight, the floor stops: the
 * corner is open to the reception below, a direct view down into the level
 * you came up from (the author, 28 Sep). Its edge runs east, turns through a
 * quarter circle, and comes down to the flight's west edge. So from the top
 * step you see open floor ahead and, on your left, the drop to the concourse.
 *
 * Measured off the plan relative to the stairhead: the edge's straight run is
 * 4.5 m north of the head, the curve is 2.5 m in radius, and it meets the
 * flight's west edge 2.0 m north of the head.
 *
 * Then the flight grew 2.1 m north (28 Sep, see `GRAND_STEPS`) and the edge
 * stayed where the plan puts it against the rooms: moved with the head, it
 * ran across half of Room 6's doorway. So the straight run is now 2.4 m past
 * the head, and the curve is tightened to 2.0 m so that it still comes down
 * onto the flight's west edge, 0.4 m north of the head.
 */
const TERRACE_WALL_PAST_HEAD = 2.4;
const TERRACE_CURVE = 2.0;

/** The corner that is open to the floor below: west of the flight, south of the curved edge. */
const TERRACE_BLOCK = rect(
  -CORRIDOR_HALF,
  SOUTH_END,
  GRAND_WEST + CORRIDOR_HALF,
  GRAND_STAIR.y + GRAND_STAIR.h + TERRACE_WALL_PAST_HEAD - SOUTH_END,
);

/**
 * The opening beside the terrace — see `TERRACE_BLOCK` — as rectangles.
 *
 * The quarter circle is cut in bands, each set by the curve at its NORTH
 * edge, so the steps stay just inside the true curve and the terrace keeps
 * all of its floor. Inset by half a wall from Room 6's frontage and from the
 * building's south wall, because a wall is drawn standing on the plate under
 * it (see GRAND_WELL).
 */
const TERRACE_BANDS = 6;

function terraceOpening(): Rect[] {
  const b = TERRACE_BLOCK;
  const west = b.x + WALL_THICKNESS / 2;
  const south = b.y + WALL_THICKNESS / 2;
  const top = b.y + b.h;
  const band = TERRACE_CURVE / TERRACE_BANDS;
  const east = b.x + b.w;
  const holes = [rect(west, south, east - west, top - TERRACE_CURVE - south)];
  for (let i = 0; i < TERRACE_BANDS; i += 1) {
    const y = top - TERRACE_CURVE + i * band;
    // Distance north of the curve's centre, at this band's north edge.
    const dy = y + band - (top - TERRACE_CURVE);
    const reach = Math.sqrt(Math.max(0, TERRACE_CURVE * TERRACE_CURVE - dy * dy));
    holes.push(rect(west, y, east - TERRACE_CURVE + reach - west, band));
  }
  return holes;
}

const TERRACE_OPENING = terraceOpening();

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
  // The grand flight is tested by its WELL, not its treads. The 1.5 m either
  // side of it is open to the reception below (see GRAND_WELL), and Room 6's
  // door, at the south end of its frontage, opened straight onto that drop:
  // 0.9 m out is in the well and not on the stair, so the flight let it
  // through and Room 6 was a room with no way in (the author, 28 Sep).
  // The open corner beside the terrace is no more a way in than a well is.
  // Room 6's south end stands against it.
  return [...ARRIVALS, GRAND_WELL, TERRACE_BLOCK].some((flight) => rectContains(flight, x, y));
}

/** Wall left between an auditorium's door and the end of its frontage. */
const DOOR_MARGIN = 1.2;

/**
 * How far the door must slide toward the end of the frontage to clear a hall
 * flight's stairwell, or DOOR_MARGIN when nothing is in the way.
 *
 * Rooms 3 and 10 have one: the flights stand against the corridor walls and
 * take 11.2 m of a 14.8 m frontage, so the door the alternation gives them
 * lands with a metre of it opening onto the well. `doorBlocked` looks at the
 * door's middle and so does not see it. The building's answer is the one
 * this takes — the door goes into the corner beside the stairhead.
 */
function doorMarginFor(bounds: Rect, side: -1 | 1, doorSide: 'low' | 'high'): number {
  const x = side === -1 ? bounds.x + bounds.w + 0.9 : bounds.x - 0.9;
  const end = doorSide === 'low' ? bounds.y : bounds.y + bounds.h;
  let margin = DOOR_MARGIN;
  for (const flight of [STAIR_WEST, STAIR_EAST]) {
    if (x < flight.x || x > flight.x + flight.w) continue;
    // Room between the room's end and the flight's near end, less a rail.
    const room =
      doorSide === 'low' ? flight.y - end : end - (flight.y + flight.h);
    if (room < 0) continue;
    margin = Math.min(margin, Math.max(0.1, room - RAIL_THICKNESS - DOOR_WIDTH));
  }
  return margin;
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
      const x = side === -1 ? -CORRIDOR_HALF - aud.depth : CORRIDOR_EAST;
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
        doorMargin: doorMarginFor(bounds, side, doorSide),
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
      decor.push(...roomNumeral(bounds, aud.number, side));
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
    bounds: rect(-CORRIDOR_HALF, SOUTH_END, CORRIDOR_HALF + CORRIDOR_EAST, northEnd - SOUTH_END),
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
/** Thickness of the backrest, front to back, metres. */
const SEAT_BACK_DEPTH = 0.17;
/** Top of the pan you sit on, above the tier. A cinema seat is low. */
const SEAT_PAN_TOP = 0.42;
const SEAT_PAN_THICKNESS = 0.09;

/**
 * Depth behind the back row: the cross aisle you enter along.
 *
 * Exported because it is the only clear floor in an auditorium that is not
 * the stage, so it is where anything a robot has to reach inside a room has
 * to stand. Chapter II's racks are placed down the middle of it.
 */
export const CROSS_AISLE = 2.5;

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
    /*
     * A seat is a pan and a back, not a block.
     *
     * Five thousand identical boxes read as corrugation — the rake of a
     * full auditorium came out as a ribbed slab rather than as seating.
     * Two pieces is enough to fix it, because what the eye is looking for
     * is the gap: a low pan with an upright behind it, and daylight over
     * the row in front.
     *
     * The backrest goes at the end AWAY from the stage, which is the end
     * the audience has its back to — high x in the west rooms, low x in
     * the east ones, the same asymmetry `seatX` is already built on.
     */
    const backX = side === -1 ? seatX + SEAT_DEPTH - SEAT_BACK_DEPTH : seatX;
    const panX = side === -1 ? seatX : seatX + SEAT_BACK_DEPTH;
    for (let n = 0; n < seats; n += 1) {
      const y = first + n * SEAT_PITCH;
      decor.push({
        floor: 1,
        bounds: rect(backX, y, SEAT_BACK_DEPTH, SEAT_WIDTH),
        base: tier,
        height: tier + SEAT_BACK,
        material: 'seatBack',
      });
      // The pan is the piece the crowd sits on and counts itself by, so
      // there is exactly one of these per seat in the building.
      decor.push({
        floor: 1,
        bounds: rect(panX, y, SEAT_DEPTH - SEAT_BACK_DEPTH, SEAT_WIDTH),
        base: tier + SEAT_PAN_TOP - SEAT_PAN_THICKNESS,
        height: tier + SEAT_PAN_TOP,
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
    const a = v0 + (v1 - v0) * (i / steps);
    const b = v0 + (v1 - v0) * ((i + 1) / steps);
    bars.push({
      u0: u - half,
      u1: u + half,
      /*
       * Low edge first, and it matters for every stroke that goes DOWN.
       *
       * A stroke from v 1 to v 0 walks its steps downward, so each band
       * came out with its top in `v0` and its bottom in `v1` — an inverted
       * box, which every consumer turned into a one-centimetre sliver at
       * the wrong height. It has been wrong since the stage letters were
       * written: the falling diagonal of every V and X in `#DEVOXX` was
       * missing, and at thirty metres across a dark auditorium nobody
       * noticed. KINEPOLIS put a K and an N on the front of the building
       * at eye level and they came out as bare uprights.
       */
      v0: Math.min(a, b),
      v1: Math.max(a, b),
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
    /*
     * The rest of KINEPOLIS, which is what the building calls itself.
     *
     * Not a borrowed wordmark: it is the name on the elevation in the
     * photograph, and putting it there is the difference between "a large
     * glazed building" and "the Kinepolis". Same strokes as the stage
     * letters, so a sign anywhere in the venue is drawn one way.
     */
    case 'K':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        ...diagonal(0.92, 1, su, 0.52, 7),
        ...diagonal(su, 0.48, 0.92, 0, 7),
      ];
    case 'I':
      return [{ u0: 0.5 - su / 2, u1: 0.5 + su / 2, v0: 0, v1: 1 }];
    case 'N':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        { u0: 1 - su, u1: 1, v0: 0, v1: 1 },
        ...diagonal(su, 1, 1 - su, 0, 9),
      ];
    case 'P':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        { u0: su, u1: 0.8, v0: 1 - sv, v1: 1 },
        { u0: 0.8, u1: 0.8 + su, v0: 0.5, v1: 1 - sv },
        { u0: su, u1: 0.8 + su, v0: 0.5 - sv / 2, v1: 0.5 + sv / 2 },
      ];
    case 'L':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        { u0: su, u1: 0.9, v0: 0, v1: sv },
      ];
    case 'S':
      return [
        { u0: 0, u1: 1, v0: 1 - sv, v1: 1 },
        { u0: 0, u1: su, v0: 0.5 - sv / 2, v1: 1 - sv },
        { u0: 0, u1: 1, v0: 0.5 - sv / 2, v1: 0.5 + sv / 2 },
        { u0: 1 - su, u1: 1, v0: sv, v1: 0.5 + sv / 2 },
        { u0: 0, u1: 1, v0: 0, v1: sv },
      ];
    /*
     * T, C and R, which exist for one reason: the name over the door is
     * "KINEPOLIS EVENT CENTER" and not "KINEPOLIS".
     *
     * The photograph is unambiguous about it and the two words are half the
     * length of the sign — cutting them was cutting the thing that says this
     * is a venue rather than a cinema.
     */
    case 'T':
      return [
        { u0: 0, u1: 1, v0: 1 - sv, v1: 1 },
        { u0: 0.5 - su / 2, u1: 0.5 + su / 2, v0: 0, v1: 1 - sv },
      ];
    case 'C':
      return [
        { u0: 0, u1: su, v0: sv, v1: 1 - sv },
        { u0: 0, u1: 1, v0: 1 - sv, v1: 1 },
        { u0: 0, u1: 1, v0: 0, v1: sv },
      ];
    case 'R':
      return [
        { u0: 0, u1: su, v0: 0, v1: 1 },
        { u0: su, u1: 0.8, v0: 1 - sv, v1: 1 },
        { u0: 0.8, u1: 0.8 + su, v0: 0.5, v1: 1 - sv },
        { u0: su, u1: 0.8 + su, v0: 0.5 - sv / 2, v1: 0.5 + sv / 2 },
        // The leg. Nine bands rather than the diagonal helper's default,
        // because over half a glyph's height a coarser stair reads as a
        // staircase rather than as a stroke.
        ...diagonal(0.42, 0.5, 0.94, 0, 9),
      ];
    default:
      return digit(character);
  }
}

/**
 * The ten digits, as seven segments.
 *
 * Seven-segment rather than a drawn numeral, for the same reason the letters
 * above are strokes: the renderer extrudes plan rectangles, so a shape made
 * of seven rectangles is free and a shape made of curves is a font project.
 * It also happens to be what a number painted on a floor looks like.
 */
function digit(character: string): Bar[] {
  const su = SIGN_STROKE / GLYPH_WIDTH;
  const sv = SIGN_STROKE / GLYPH_HEIGHT;

  const top: Bar = { u0: 0, u1: 1, v0: 1 - sv, v1: 1 };
  const middle: Bar = { u0: 0, u1: 1, v0: 0.5 - sv / 2, v1: 0.5 + sv / 2 };
  const bottom: Bar = { u0: 0, u1: 1, v0: 0, v1: sv };
  const upperLeft: Bar = { u0: 0, u1: su, v0: 0.5 - sv / 2, v1: 1 };
  const upperRight: Bar = { u0: 1 - su, u1: 1, v0: 0.5 - sv / 2, v1: 1 };
  const lowerLeft: Bar = { u0: 0, u1: su, v0: 0, v1: 0.5 + sv / 2 };
  const lowerRight: Bar = { u0: 1 - su, u1: 1, v0: 0, v1: 0.5 + sv / 2 };

  switch (character) {
    case '0':
      return [top, upperLeft, upperRight, lowerLeft, lowerRight, bottom];
    case '1':
      return [upperRight, lowerRight];
    case '2':
      return [top, upperRight, middle, lowerLeft, bottom];
    case '3':
      return [top, upperRight, middle, lowerRight, bottom];
    case '4':
      return [upperLeft, upperRight, middle, lowerRight];
    case '5':
      return [top, upperLeft, middle, lowerRight, bottom];
    case '6':
      return [top, upperLeft, middle, lowerLeft, lowerRight, bottom];
    case '7':
      return [top, upperRight, lowerRight];
    case '8':
      return [top, upperLeft, upperRight, middle, lowerLeft, lowerRight, bottom];
    case '9':
      return [top, upperLeft, upperRight, middle, lowerRight, bottom];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// The number on the floor outside each room
// ---------------------------------------------------------------------------

/**
 * Which room is Room 5?
 *
 * Nothing in the building answered that, and both later chapters ask it out
 * loud — "keep Room 5 running", "catch the talk in Room 11" — of a player
 * looking at fourteen identical doors down a 126 m corridor.
 *
 * The number goes on the wall at the back of the room, facing south, in
 * characters a metre tall on a dark plate. Three separate facts about this
 * renderer decide all three of those, and they have to be answered at once
 * — a pass that fixed them one at a time ended up painting the numbers on
 * the floor instead, which was a retreat rather than a design:
 *
 *   - The view is fixed to the south-west, so the faces you can see point
 *     south and west. A number on a north-south wall is either readable or
 *     hidden behind the wall it is bolted to, depending only on which side
 *     of the corridor its room is, and half a numbering system is worse
 *     than none. The back wall of a room runs east-west and faces south,
 *     so it is readable in every room in the building.
 *   - `MAX_DRAWN_HEIGHT` clips everything 2.7 m above the storey datum, so
 *     the sign hangs low — the characters top out at 2.15 m.
 *   - The key light is nearly overhead: a south-facing face reflects about
 *     a third of what an upward-facing one does, so light characters on a
 *     light wall are invisible however large they are. Hence `signPlate`.
 */

/** How far a character stands off the plate it is mounted on, metres. */
const SIGN_FACE = 0.06;

/** Across the wall at the back of the room, behind the last row. */
const INSIDE_DIGIT_W = 0.66;
const INSIDE_DIGIT_H = 1.05;
const INSIDE_DIGIT_GAP = 0.18;
const INSIDE_FOOT = 1.1;
const INSIDE_PAD = 0.3;

/**
 * Characters on a surface that faces south.
 *
 * A south face spans x and z, so a glyph's `u` runs along x and its `v` up
 * z. Reading runs +x: stand south of a plate looking north and east is on
 * your right — the same single viewer the stage letters are laid out for.
 */
function southFaceCharacters(
  characters: string,
  planeY: number,
  x: number,
  z: number,
  width: number,
  height: number,
  gap: number,
): Decor[] {
  const out: Decor[] = [];
  [...characters].forEach((character, index) => {
    const ox = x + index * (width + gap);
    for (const bar of glyph(character)) {
      out.push({
        floor: 1,
        bounds: rect(
          ox + bar.u0 * width,
          planeY - SIGN_FACE,
          (bar.u1 - bar.u0) * width,
          SIGN_FACE,
        ),
        base: z + bar.v0 * height,
        height: z + bar.v1 * height,
        material: 'signChar',
      });
    }
  });
  return out;
}

function roomNumeral(room: Rect, number: number, side: -1 | 1): Decor[] {
  const characters = String(number);
  const runWidth =
    characters.length * INSIDE_DIGIT_W + (characters.length - 1) * INSIDE_DIGIT_GAP;

  /*
   * The party wall closing the room's north end, seen from inside.
   *
   * Its south face looks back down the room at the camera, and nothing
   * stands in front of it: the room's own south wall is twenty metres
   * nearer the viewer and two metres tall, which at thirty degrees is far
   * under the line of sight.
   */
  const wallFace = room.y + room.h - WALL_THICKNESS / 2;
  // At the corridor end, over the cross aisle rather than over the seating,
  // so it is what you are looking at as you come through the door.
  const runX = side === -1 ? room.x + room.w - INSIDE_PAD - runWidth : room.x + INSIDE_PAD;

  return [
    {
      floor: 1,
      bounds: rect(
        runX - INSIDE_PAD,
        wallFace - SIGN_FACE / 2,
        runWidth + INSIDE_PAD * 2,
        SIGN_FACE / 2,
      ),
      base: INSIDE_FOOT - INSIDE_PAD,
      height: INSIDE_FOOT + INSIDE_DIGIT_H + INSIDE_PAD,
      material: 'signPlate',
    },
    ...southFaceCharacters(
      characters,
      wallFace - SIGN_FACE / 2,
      runX,
      INSIDE_FOOT,
      INSIDE_DIGIT_W,
      INSIDE_DIGIT_H,
      INSIDE_DIGIT_GAP,
    ),
  ];
}

/**
 * The Kinepolis star, as a raster of bars.
 *
 * It is the largest single thing on the front of the building after the
 * glass, and it is what makes the elevation that company's rather than any
 * event centre's. A five-pointed star has no axis-aligned edge anywhere on
 * it, and this renderer extrudes plan rectangles — so it is drawn the way a
 * star is drawn on a low-resolution screen, as rows of decreasing width.
 * Fourteen of them, and at thirty pixels nobody can tell.
 *
 * Same `Bar` space as the letters: u across, v up, both 0..1.
 */
function star(): Bar[] {
  const rows: [number, number, number, number][] = [
    // v0, v1, then the u extent of that row. Two entries where the legs
    // have split and the row is two bars rather than one.
    [0.88, 1.0, 0.44, 0.56],
    [0.78, 0.88, 0.4, 0.6],
    [0.7, 0.78, 0.36, 0.64],
    [0.63, 0.7, 0.0, 1.0],
    [0.56, 0.63, 0.07, 0.93],
    [0.48, 0.56, 0.15, 0.85],
    [0.4, 0.48, 0.2, 0.8],
    [0.33, 0.4, 0.24, 0.76],
  ];
  const bars: Bar[] = rows.map(([v0, v1, u0, u1]) => ({ u0, u1, v0, v1 }));

  // Below the waist the star is two legs, so each row is a pair.
  const legs: [number, number, number, number][] = [
    [0.22, 0.33, 0.19, 0.4],
    [0.11, 0.22, 0.13, 0.36],
    [0.0, 0.11, 0.06, 0.32],
  ];
  for (const [v0, v1, u0, u1] of legs) {
    bars.push({ u0, u1, v0, v1 });
    bars.push({ u0: 1 - u1, u1: 1 - u0, v0, v1 });
  }
  return bars;
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

/**
 * How far the front of the desk stands off the screen wall, metres.
 *
 * 1.45, and it was 1.35 until Chapter II needed the slot BEHIND the lectern.
 * The screen wall is 0.3 m thick on its line, so 1.35 left 0.70 m of clear
 * floor between its face and the lectern's back: Voxxy, 0.68 m across, with
 * a centimetre either side, which is a gap in the numbers and not one anybody
 * can drive into. 1.45 leaves 0.80 — the same gap the Chapter III stands put
 * between them, so "Voxxy fits and Droid does not" means one thing all over
 * the building. The mic cable a Chapter II breakdown sends Voxxy after is in
 * there.
 */
const DESK_STANDOFF = 1.45;

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
 * The hall's east wall where it steps: see `HALL_OUTSIDE`. North to south:
 * down column line 7, out along the step, down the middle stretch, and out
 * along its foot to the full width.
 *
 * The plan draws a door in the middle stretch, behind the counter, and a
 * pair at its foot. Both lead into the back rooms, which are not built, so
 * they are wall for now.
 */
function hallEastWalls(): Obstacle[] {
  const t = WALL_THICKNESS;
  const wall = (bounds: Rect): Obstacle => ({ floor: 0, bounds, height: WALL_HEIGHT, exterior: true });
  return [
    wall(rect(HALL_NE_WALL - t / 2, HALL_STEP - t / 2, t, HALL_NORTH - HALL_STEP + t / 2)),
    wall(rect(HALL_NE_WALL - t / 2, HALL_STEP - t / 2, HALL_MID_WALL - HALL_NE_WALL + t, t)),
    wall(rect(HALL_MID_WALL - t / 2, HALL_MID_FOOT - t / 2, t, HALL_STEP - HALL_MID_FOOT + t)),
    wall(rect(HALL_MID_WALL - t / 2, HALL_MID_FOOT - t / 2, HALL_EAST - HALL_MID_WALL + t / 2, t)),
  ];
}

/**
 * Walkable floor of the hall: the bounding box less the pieces that are not
 * really in it. This is the number that should match the 2411.41 m² printed on
 * the plan, and tools/venue.mjs checks that it does.
 *
 * "Not really in it" includes the stair cores and the columns. A printed
 * floor area is the floor, and neither is — the annotated plan leaves both
 * cores unshaded — and at 176 m² together they are not a rounding error.
 *
 * Assumes the cutaways do not overlap each other, which is true by
 * construction — keep it that way, or this silently under-counts.
 */
const CORE_FOOTPRINT = (STAIR_WIDTH + WALL_THICKNESS * 2) * (STAIR_RUN + CORE_VESTIBULE + WALL_THICKNESS);
export const HALL_FLOOR_M2 =
  HALL.w * HALL.h -
  HALL_CUTAWAYS.reduce((sum, o) => sum + o.bounds.w * o.bounds.h, 0) -
  CORE_FOOTPRINT * 2 -
  COLUMN_X.length * COLUMN_Y.length * COLUMN_SIZE * COLUMN_SIZE;


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
 * `groundAt`, which is a teleport dressed as a floor. The steps are the only
 * way between those two levels, and now the geometry says so.
 *
 * Everything else gets a wall, with a door punched in the middle of any run
 * that separates a room from circulation. Two auditoriums side by side get no
 * door, because cinemas do not open into each other.
 */
function derivedWalls(all: Room[], links: Link[]): { walls: Obstacle[]; decor: Decor[] } {
  const walls: Obstacle[] = [];
  const decor: Decor[] = [];
  const seen = new Set<string>();

  /*
   * A wall between two levels is measured from the higher one and goes down
   * to the lower one.
   *
   * The renderer stands a wall on the plate under its centre, and on a
   * shared edge that is the smaller room's. That is right while the smaller
   * room is the higher one, which the concourse always was against the hall.
   * The BOF rooms are the first smaller room that is LOWER than what it
   * faces. Their wall onto the reception stood on their floor and was cut
   * off 0.54 m under the reception's walls. So each wall is stood on the
   * higher floor either side of it (`datum`), and `base` takes it down to
   * the lower one.
   */
  const plateAt = (x: number, y: number, floor: Level): number | undefined => {
    let best: Room | undefined;
    for (const r of all) {
      if (r.floor !== floor || r.kind === 'outside' || !rectContains(r.bounds, x, y)) continue;
      if (!best || r.bounds.w * r.bounds.h < best.bounds.w * best.bounds.h) best = r;
    }
    return best ? (best.elevation ?? 0) : undefined;
  };
  let wallFloor: Level = 0;
  const reachDown = (b: Rect): { base?: number; datum?: number } => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const under = plateAt(cx, cy, wallFloor);
    if (under === undefined) return {};
    const across = (b.w < b.h
      ? [plateAt(cx - 0.3, cy, wallFloor), plateAt(cx + 0.3, cy, wallFloor)]
      : [plateAt(cx, cy - 0.3, wallFloor), plateAt(cx, cy + 0.3, wallFloor)]
    ).filter((e): e is number => e !== undefined);
    const high = Math.max(under, ...across);
    const low = Math.min(under, ...across);
    return {
      ...(high > under ? { datum: high } : {}),
      ...(low < high ? { base: low - high } : {}),
    };
  };

  /*
   * Outside is not a room with walls; it is the absence of them.
   *
   * The forecourt has to BE a room, because everything the simulation knows
   * about standing anywhere comes from rooms — but if the wall builder can
   * see it, the reception's south elevation stops being "outside air" and
   * becomes a party wall between two rooms, which is the one thing the
   * glass front is not. Hidden from this pass, the envelope stays the
   * envelope and the curtain wall still finds it.
   */
  const rooms = all.filter((room) => room.kind !== 'outside');

  for (const room of rooms) {
    // A stage is a PLATE, not an enclosure: a piece of floor lying inside the
    // auditorium it belongs to, at the foot of that room's rake. The room
    // around it already owns every wall it has, and letting it emit its own
    // put a second, shorter wall on top of each of them — identical in space,
    // different in extent, so the dedupe below could not see it.
    //
    // The threshold's landing is the same thing standing in the hall: its
    // edges are the steps and the box, never a wall.
    if (room.kind === 'stage' || room.kind === 'landing') continue;

    const b = room.bounds;
    wallFloor = room.floor;
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
               * cut its own hole. The terrace cannot: it meets the wall across
               * its whole 23.5 m and is only at door height along its landing,
               * and a ramp that once stood beside it punched eleven metres of
               * the wall between the hall and the reception simply out. It
               * says where its opening is instead — see WALL_OPENINGS.
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
        // The hall's bounding box runs on past the building on the east:
        // no wall on the box where the box is outside. `hallEastWalls`
        // builds the real line.
        if (room.kind === 'hall' && room.voids?.some((v) => rectContains(v, px, py))) {
          kind.push(0);
          continue;
        }

        const neighbour = rooms.find(
          (r) => r !== room && r.floor === room.floor && rectContains(r.bounds, ox, oy),
        );
        if (!neighbour) {
          kind.push(3); // outside air — this one is the building's envelope
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
        } else if (!mine && theirs && sameLevel) {
          kind.push(2); // room onto circulation — this one earns a door
          // ...but only onto circulation at its own level. BOF 3 stands on
          // the concourse, 1.2 m over the hall, and its north wall is the
          // hall's south wall east of the steps: it had punched a door in it
          // that opened onto a drop, which neither plan draws (the author,
          // 28 Sep: "a hole in the wall further on the side of the stairs").
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
        // Both read from the run being emitted, so both have to be taken
        // BEFORE `i` walks on to the next one.
        const envelope = kind[i] === 3;
        i = j;

        const pieces: [number, number][] = [];
        // A room that says where its door goes is trusted to have room for
        // it: the men's toilet is 3.9 m across and the plan still hangs a
        // door in it, where the default rule would have opened the whole side.
        const shortest = room.doorMargin !== undefined ? room.doorMargin + DOOR_WIDTH + 0.2 : DOOR_WIDTH * 1.6;
        if (doored && z - a > shortest) {
          // At one END of the frontage, not the middle. These rooms are fans:
          // the middle of the corridor wall is behind the seating, and the
          // doors are at the sides, alternating room by room.
          const margin = room.doorMargin ?? DOOR_MARGIN;
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
            walls.push({ floor: room.floor, bounds, height: WALL_HEIGHT, exterior: envelope, ...reachDown(bounds) });
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
 * into the hall. It is a short rise, so it is a link from floor 0 to floor 0,
 * which reads oddly in the type and is what the building does.
 *
 * Going UP, the concourse reaches the auditorium level by the ~16 m grand
 * flight the plan labels "∧ Rooms ∧". So there are THREE ways to floor 1: two
 * out of the hall and one out of the concourse. That matters for Chapter III,
 * where three robots and a full house need more than one staircase — and it
 * matters more now that Biggy cannot use any of them.
 */
const receptionStairs: Link[] = [
  // Concourse → hall: the landing, and the steps down from it on three sides.
  { id: 'hall-steps', from: 0, to: 0, bounds: HALL_STEPS, base: 0, rise: CONCOURSE_LEVEL, axis: 'y', ascending: false, riser: RISER, wrap: THRESHOLD_WRAP },
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
  // The one flight in the building with a riser of its own — see GRAND_RISER.
  // Stated as the rise over its own step count rather than as GRAND_RISER, so
  // the tread a robot is drawn on and the height it is drawn at cannot drift
  // apart when the rounding lands anywhere but exactly.
  { id: 'grand-stair', from: 0, to: 1, bounds: GRAND_STAIR, base: CONCOURSE_LEVEL, rise: FLOOR_HEIGHT - CONCOURSE_LEVEL, axis: 'y', ascending: true, riser: (FLOOR_HEIGHT - CONCOURSE_LEVEL) / GRAND_STEPS },
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
  ...bofSteps,
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
    .map((l) => (l.id === 'grand-stair' ? GRAND_WELL : l.bounds))
    // And the open corner beside the terrace, which is a well with no stair in it.
    .concat(TERRACE_OPENING);
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
  // One band per real riser. The robots are drawn stepping from riser to
  // riser (`climbOf` in the renderer), and a flight drawn with fewer, taller
  // treads than it has left them rising through thin air between the drawn
  // steps: the grand flight's 28 risers were 18 treads, the hall flights'
  // 34 were 18 too (the author, 28 Sep: "like he's flying").
  const treads = Math.max(1, Math.round(rise / (link.riser || RISER)));
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
 * flight and bury the steps wrapping round beneath it.
 *
 * So the bands are RINGS — each step is the frame left between its own
 * contour and the next one in — and a ring is three rectangles: the two
 * flanks and the nose. There is no fourth side, because the fourth side is
 * the wall the terrace climbs to meet. Whatever is left inside the top ring
 * is the landing, and the landing is a floor (see the `threshold` room), not
 * a tread: drawn as one, it would be solid to Biggy, which has to cross it.
 *
 * A flank may stop short of the wall: `clearWest` and `clearEast` metres of
 * it are left out, for whatever stands there instead — on the one terrace
 * there is, the box at its west end.
 */
function terraceSteps(link: Link, clearWest: number, clearEast: number): Obstacle[] {
  const b = link.bounds;
  const steps = Math.round(link.rise / link.riser);
  const going = (link.wrap ?? 0) / steps;

  const pieces: Obstacle[] = [];
  for (let k = 0; k < steps; k += 1) {
    // Step k counts UP from the bottom one, and is inset k goings from every
    // open side. Its depth, measured off the wall, is what the inset leaves.
    const x0 = b.x + k * going;
    const x1 = b.x + b.w - k * going;
    const depth = b.h - k * going;
    // Solid to anything that cannot climb this flight, walkable to anything
    // that can — the same rule as every other tread in the building.
    const step = {
      floor: link.from,
      height: (link.rise * (k + 1)) / steps,
      base: 0,
      linkId: link.id,
    };
    pieces.push({ ...step, bounds: rect(x0, b.y + clearWest, going, depth - clearWest) });
    pieces.push({ ...step, bounds: rect(x1 - going, b.y + clearEast, going, depth - clearEast) });
    pieces.push({ ...step, bounds: rect(x0 + going, b.y + depth - going, x1 - x0 - going * 2, going) });
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
    // A flight that also climbs from its flanks is not a run of bands.
    if (link.wrap) {
      // The box stands over the west flank's south end; the east one runs
      // to the wall.
      solid.push(...terraceSteps(link, LANDING_DEPTH, 0));
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
  /*
   * The glazed sweep east of the precast: DOORS, every bay of it.
   *
   * It was `window`, on the photograph's solid base under the glass, and a
   * robot could only get in at the bank of doors in the west corner. The
   * author says the bays are glass doors and you can come in through almost
   * any of them (28 Sep). So each bay is a doorway between two mullions,
   * under a head at `DOOR_HEAD`, with glass above it. The mullions are the
   * only part that collides. See `glazeFacade`.
   *
   * It starts at the entrance bank, not at the upper storey's glass: the
   * pier between the two is glass doors as well. See `DOOR_RUN_START`.
   */
  /*
   * NOT the whole frontage.
   *
   * The photograph has the left third of the elevation in solid precast
   * with a row of small windows at pavement level, and the glazed sweep
   * starting about where the doors do. Glazing the full 36 m made the
   * front one unbroken wall of glass, which is a different building — and
   * it left nowhere to put the star.
   */
  {
    floor: 0,
    bounds: rect(DOOR_RUN_START, RECEPTION.y - 0.6, RECEPTION.x + RECEPTION.w + 1 - DOOR_RUN_START, 1.2),
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
    bounds: rect(-CORRIDOR_HALF - 0.5, SOUTH_END - 0.6, CORRIDOR_HALF + CORRIDOR_EAST + 1, 1.2),
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
 * Height between transoms, metres. The grid runs both ways or it is slots.
 *
 * 1.5 put a single bar across a 3.2 m storey, which is a wall of glass cut in
 * half rather than a grid. The photograph's bays are near enough square
 * against a 2.6 m mullion pitch, so two bars a storey — and the elevation
 * gains the texture that tells a curtain wall from a painted rectangle.
 */
const TRANSOM_PITCH = 1.1;


/**
 * The head of a glazed door, metres: the same as the entrance bank's, so the
 * whole ground floor of the front is one line of doors. Glass above it.
 */
const DOOR_HEAD = 2.6;

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
function glazeFacade(walls: Obstacle[], rooms: Room[]): { walls: Obstacle[]; decor: Decor[] } {
  const kept: Obstacle[] = [];
  const decor: Decor[] = [];

  /*
   * A run that starts outside a band and ends inside it is cut at the band's
   * end first. The wall builder merges the front into one run from the
   * entrance to the east corner, and the whole of it was glazed off its
   * centre, so the precast pier between the doors and the glass came out as
   * glass doors under a precast storey.
   */
  const pieces: Obstacle[] = [];
  for (const wall of walls) {
    const b = wall.bounds;
    const band = CURTAIN_WALLS.find(
      (c) => c.floor === wall.floor && b.w >= b.h && c.bounds.w >= c.bounds.h &&
        b.y + b.h / 2 >= c.bounds.y && b.y + b.h / 2 <= c.bounds.y + c.bounds.h &&
        b.x < c.bounds.x && b.x + b.w > c.bounds.x,
    );
    if (!band) { pieces.push(wall); continue; }
    const cut = band.bounds.x;
    pieces.push({ ...wall, bounds: rect(b.x, b.y, cut - b.x, b.h) });
    pieces.push({ ...wall, bounds: rect(cut, b.y, b.x + b.w - cut, b.h) });
  }

  for (const wall of pieces) {
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
     * Most of it, anyway. This used to note that the doors do not open
     * because "there is nothing outside to open onto" — south of the line
     * the building's extents ran out and a robot through the glass would
     * step off the concourse into 1.2 m of nothing. There is a forecourt
     * now, so the bank of doors is a hole in this run rather than a pane:
     * see the entrance in WALL_OPENINGS, which stops the wall being built
     * across it in the first place.
     */
    const door = glazing.kind === 'door';
    // A run of doors collides only at its mullions: see the loop below.
    if (!door) kept.push({ ...wall, hidden: true });
    const along = b.w >= b.h; // which way the run lies
    const run = along ? b.w : b.h;
    // A window stands on a solid spandrel; a door comes down to its own
    // bottom rail. Same piece, and with the grid now shared between the two
    // storeys it is the ONLY thing that tells them apart — which is also all
    // the photograph shows: one wall of glass, standing on something upstairs
    // and reaching the pavement downstairs.
    /*
     * Which side of this run the building is on: +1 for the far side in
     * the thin direction, -1 for the near one.
     */
    const probe = (sign: number): boolean => {
      const px = along ? cx : cx + sign * 0.35;
      const py = along ? cy + sign * 0.35 : cy;
      return rooms.some(
        (r) => r.floor === wall.floor && r.kind !== 'outside' && rectContains(r.bounds, px, py),
      );
    };
    const inward = probe(1) ? 1 : -1;

    // Where the glass starts: on the sill for a window, over the head for a
    // door, which is open below it.
    const foot = door ? DOOR_HEAD : GLAZING_SILL;
    // The wall goes hidden and these take over drawing it, so they inherit
    // its place on the envelope with it — otherwise the one elevation the
    // player walks out to look at is the one left out of the elevation.
    const skin = wall.exterior;
    if (!door) decor.push({ floor: wall.floor, bounds: b, height: foot, exterior: skin });

    decor.push({
      floor: wall.floor,
      bounds: along
        ? rect(b.x, cy - PANE_THICKNESS / 2, b.w, PANE_THICKNESS)
        : rect(cx - PANE_THICKNESS / 2, b.y, PANE_THICKNESS, b.h),
      base: foot,
      height: wall.height,
      material: 'glazing',
      exterior: skin,
    });

    // One mullion at each end and the bays between them as near the pitch as
    // the run allows, so a 36 m front does not end on half a bay.
    const bays = Math.max(1, Math.round(run / MULLION_PITCH));
    for (let i = 0; i <= bays; i += 1) {
      const at = (i * (run - MULLION_WIDTH)) / bays;
      const post = along ? rect(b.x + at, b.y, MULLION_WIDTH, b.h) : rect(b.x, b.y + at, b.w, MULLION_WIDTH);
      // A door's frame comes down to the floor, and it is what you steer
      // between.
      decor.push({ floor: wall.floor, bounds: post, base: door ? 0 : foot, height: wall.height, exterior: skin });
      if (door) kept.push({ floor: wall.floor, bounds: post, height: wall.height, hidden: true });
    }

    // The head over a run of doors: the bar the glass above stands on.
    if (door) {
      decor.push({
        floor: wall.floor,
        bounds: along
          ? rect(b.x, cy + inward * PANE_THICKNESS - PANE_THICKNESS / 2, b.w, PANE_THICKNESS)
          : rect(cx + inward * PANE_THICKNESS - PANE_THICKNESS / 2, b.y, PANE_THICKNESS, b.h),
        base: DOOR_HEAD - 0.2,
        height: DOOR_HEAD,
        material: 'structure',
        exterior: skin,
      });
    }

    /*
     * And the transoms, which the first pass simply did not have.
     *
     * A curtain wall is a GRID. Drawn with uprights alone, every bay is one
     * tall sheet of glass and the elevation reads from the forecourt as a
     * row of dark slots rather than as a wall of windows — the photograph
     * has four or five horizontals for every upright. One more loop over
     * the same run.
     */
    /*
     * The spandrel: the solid band at the floor line above a glazed storey.
     *
     * The ground floor's glass tops out at the wall head and the first
     * floor's starts at its own datum, which left nearly two metres of
     * nothing between them — from the forecourt, a stripe of sky across the
     * middle of the building. Every curtain wall has a panel there hiding
     * the floor slab.
     *
     * Only the ground storey needs one: above the first floor is the roof.
     * The height is measured to the next floor from the concourse this run
     * stands on, which is the one plate a glazed elevation sits on here.
     */
    if (skin && wall.floor === 0) {
      decor.push({
        floor: wall.floor,
        // In the plane of the curtain wall and on the inner face of it, for
        // the same reason the transoms are: a panel centred on the wall
        // line belongs to the rooms on both sides of it, and dressing has
        // to belong to one.
        bounds: along
          ? rect(b.x, cy + inward * PANE_THICKNESS - PANE_THICKNESS / 2, b.w, PANE_THICKNESS * 2)
          : rect(cx + inward * PANE_THICKNESS - PANE_THICKNESS / 2, b.y, PANE_THICKNESS * 2, b.h),
        base: wall.height,
        height: FLOOR_HEIGHT - CONCOURSE_LEVEL,
        material: 'structure',
        exterior: true,
      });
    }

    const lifts = Math.max(1, Math.round((wall.height - foot) / TRANSOM_PITCH));
    for (let i = 1; i < lifts; i += 1) {
      const z = foot + ((wall.height - foot) * i) / lifts;
      decor.push({
        floor: wall.floor,
        /*
         * Thin, in the plane of the glass, and on the INSIDE face.
         *
         * Given the wall's own 0.3 m depth a transom reads as a slab of
         * building hanging in mid-air, which is what `npm run venue` said
         * of it — and rightly: a glazing bar is held by the mullions
         * either side, so it is dressing and names a material rather than
         * being a piece of wall that has lost its support.
         *
         * Naming a material then brings the other rule with it — dressing
         * has to sit wholly within one room — and a bar centred on the
         * wall line sits in two. So it is pushed to whichever face has a
         * room behind it, which is asked of the building rather than
         * assumed: these two elevations both face south, and the day one
         * does not, guessing would be silently wrong.
         */
        bounds: along
          ? rect(b.x, cy + inward * PANE_THICKNESS - PANE_THICKNESS / 2, b.w, PANE_THICKNESS)
          : rect(cx + inward * PANE_THICKNESS - PANE_THICKNESS / 2, b.y, PANE_THICKNESS, b.h),
        base: z,
        height: z + MULLION_WIDTH,
        material: 'structure',
        exterior: skin,
      });
    }
  }

  return { walls: kept, decor };
}

// ---------------------------------------------------------------------------
// Outside
// ---------------------------------------------------------------------------

/**
 * The forecourt, fitted out from the photograph.
 *
 * `references/venue/photos/54842743975_b835884445_k.jpg`: a strip of asphalt
 * at the doors, a line of bollards across it, a band of brick setts, and
 * then the road with its markings. Three banner poles stand in front of the
 * glass, and a neighbour's shed sits off to the east.
 *
 * Everything taller than the cutaway plane is marked `exterior`, which is
 * what gets it drawn its full height once a player is standing out here
 * looking back at the building. See `BlockoutRenderer.buildEnvelope`.
 */
const BOLLARD_LINE = FORECOURT.y + FORECOURT.h - 7.5;
const BOLLARD_PITCH = 2.6;
const BOLLARD = 0.24;
const BOLLARD_HEIGHT = 1.0;

/**
 * The elevation above the ground storey, in metres over the forecourt.
 *
 * The building has two storeys of curtain wall at the front and this file
 * only ever had one. The upper one is real over the corridor — that is the
 * window at the head of the grand stair — and over the other 30 m of
 * frontage there is no room up there at all, so above the spandrel the
 * elevation simply stopped at 6.2 m and the name hung in mid-air over it.
 *
 * From the forecourt that is the whole of what the photograph shows: a grid
 * of glass two storeys high between pale precast flanks, under a parapet.
 * So the upper storey is drawn as what it is — a skin, `exterior` only,
 * never collided and never seen from inside, in the plane of the ground
 * floor's own glass. The corridor's real window sits 0.6 m behind it and is
 * simply hidden by it, which is what a facade in one plane does.
 */
const UPPER_SILL = FLOOR_HEIGHT - CONCOURSE_LEVEL;
const UPPER_HEAD = UPPER_SILL + WALL_HEIGHT;
/** The parapet, and how far the roof stands above the top of the glass. */
const PARAPET_FOOT = UPPER_HEAD;
const PARAPET_HEIGHT = 1.0;

const BANNER_POLE = 0.22;
const BANNER_HEIGHT = 8.4;
/** Across the face of a banner, metres. Measured off the photograph's mast. */
const BANNER_WIDTH = 1.06;
/** Where the printed sleeve starts, metres above the forecourt. */
const BANNER_FOOT = 2.95;
/** The blue panel and its star, at the head of every one of them. */
const BANNER_HEAD = 1.5;

/**
 * The upper storey of the front elevation, the parapet over it, and the
 * panel joints in the precast flank.
 *
 * All of it `exterior` dressing on storey 0, which is the one thing that
 * makes this honest rather than a cheat: every piece starts above the
 * cutaway plane, so the storey never draws it and only the envelope does —
 * it exists for a player standing in the forecourt looking back, and for
 * nobody else. See `BlockoutRenderer.buildEnvelope`.
 *
 * The y of every piece is the facade plane, `doorY`, so the whole front is
 * ONE surface: sign, star, glass and parapet all sit in the same 0.2 m of
 * depth and the elevation reads flat, the way the photograph's does.
 */
function frontElevation(): Decor[] {
  const decor: Decor[] = [];
  const west = RECEPTION.x;
  const east = RECEPTION.x + RECEPTION.w + 1;
  const run = east - GLAZING_START;

  /*
   * The plane the whole elevation is built in.
   *
   * The south FACE of the reception's own wall, which is where the storey
   * below draws its glass — not `doorY`, which is where the signage and the
   * doors stand and is a quarter of a metre further out. Built off doorY the
   * upper storey overhung the lower one by that quarter metre and the
   * building came out with a string course across it at 6.2 m that the
   * photograph has no trace of.
   *
   * Everything here also has to finish north of `RECEPTION.y`: `npm run
   * venue` asks that dressing sit wholly within one room, and this is all
   * the forecourt's — the side it is seen from.
   */
  const face = RECEPTION.y - WALL_THICKNESS / 2;
  const inner = RECEPTION.y - face; // depth available before the room line
  /** How far signage and the parapet stand off that plane. */
  const PROUD = 0.06;

  /*
   * The precast flank, carried up.
   *
   * The wall builder stretches a ground-floor wall to the next floor's
   * datum and stops, so the west third topped out at 6.2 m — a two-storey
   * building with one storey of wall on a third of its front. This is the
   * rest of it, and it is what the star has to be mounted ON.
   */
  decor.push({
    floor: 0,
    bounds: rect(west, face, GLAZING_START - west, inner),
    base: UPPER_SILL,
    height: PARAPET_FOOT,
    material: 'structure',
    exterior: true,
  });

  /*
   * The upper glass: one pane the length of the run, the same grid over it
   * as the storey below.
   *
   * One pitch for both storeys — see MULLION_PITCH. The bays have to line
   * up floor to floor or the elevation reads as two buildings stacked.
   */
  decor.push({
    floor: 0,
    bounds: rect(GLAZING_START, face + 0.06, run, PANE_THICKNESS),
    base: UPPER_SILL,
    height: UPPER_HEAD,
    material: 'glazing',
    exterior: true,
  });

  const bays = Math.max(1, Math.round(run / MULLION_PITCH));
  for (let i = 0; i <= bays; i += 1) {
    decor.push({
      floor: 0,
      bounds: rect(
        GLAZING_START + (i * (run - MULLION_WIDTH)) / bays,
        face,
        MULLION_WIDTH,
        inner,
      ),
      base: UPPER_SILL,
      height: UPPER_HEAD,
      material: 'structure',
      exterior: true,
    });
  }

  const lifts = Math.max(1, Math.round(WALL_HEIGHT / TRANSOM_PITCH));
  for (let i = 1; i < lifts; i += 1) {
    const z = UPPER_SILL + (WALL_HEIGHT * i) / lifts;
    decor.push({
      floor: 0,
      bounds: rect(GLAZING_START, face, run, inner - 0.04),
      base: z,
      height: z + MULLION_WIDTH,
      material: 'structure',
      exterior: true,
    });
  }

  /*
   * The parapet, across the whole front.
   *
   * A curtain wall that stops at the head of its own glass leaves the sky
   * sitting straight on the top transom, and from the forecourt that is the
   * one thing that says "model" rather than "building". The photograph has
   * a solid precast band over the lot, standing proud of the glass — which
   * is why it is a little deeper than everything else here.
   */
  decor.push({
    floor: 0,
    bounds: rect(west, face - PROUD * 2, east - west, inner + PROUD * 2),
    base: PARAPET_FOOT,
    height: PARAPET_FOOT + PARAPET_HEIGHT,
    material: 'structure',
    exterior: true,
  });

  /*
   * And the joints between the precast panels on that flank.
   *
   * The photograph's west third is not a blank wall: it is a grid of big
   * cast panels with a shadow line between them, and that grid is most of
   * what gives the elevation its scale. Drawn as strips standing 6 cm proud
   * rather than as recesses, because the renderer extrudes plan rectangles
   * and a groove cut into a wall is a box inside a box — invisible. A proud
   * strip turns its own south face away from the key light and reads as the
   * line it is standing in for.
   */
  const panel = 3.6;
  for (let x = west + panel; x < GLAZING_START - 0.2; x += panel) {
    decor.push({
      floor: 0,
      bounds: rect(x, face - PROUD, 0.1, PROUD + 0.06),
      base: 0.2,
      height: PARAPET_FOOT,
      material: 'structure',
      exterior: true,
    });
  }
  for (let z = 3.0; z < PARAPET_FOOT - 0.2; z += 3.0) {
    decor.push({
      floor: 0,
      bounds: rect(west, face - PROUD, GLAZING_START - west, PROUD + 0.06),
      base: z,
      height: z + 0.1,
      material: 'structure',
      exterior: true,
    });
  }

  return decor;
}

function forecourtFitOut(): { solids: Obstacle[]; decor: Decor[] } {
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];

  // The band of setts between the footway and the road. Lighter than the
  // asphalt either side of it, which is the whole of how it reads.
  decor.push({
    floor: 0,
    bounds: rect(FORECOURT.x + 2, FORECOURT.y + 9, FORECOURT.w - 4, 4.2),
    height: 0.02,
    material: 'paving',
  });

  // Road markings: a broken centre line, well out from the building.
  for (let x = FORECOURT.x + 5; x < FORECOURT.x + FORECOURT.w - 5; x += 6.5) {
    decor.push({
      floor: 0,
      bounds: rect(x, FORECOURT.y + 4, 3.2, 0.16),
      height: 0.02,
      material: 'sign',
    });
  }

  /*
   * Bollards, and they are SOLID.
   *
   * A row of posts you drive straight through would be worse than none —
   * and they are on the line the photograph puts them on, between the
   * footway and the road. The pitch leaves 2.36 m of gap, which Biggy's
   * 1.44 m clears without having to aim.
   */
  for (let x = FORECOURT.x + 8; x < FORECOURT.x + FORECOURT.w - 8; x += BOLLARD_PITCH) {
    solids.push({
      floor: 0,
      bounds: rect(x, BOLLARD_LINE, BOLLARD, BOLLARD),
      height: BOLLARD_HEIGHT,
      material: 'paving',
    });
  }

  /*
   * Three banner poles in front of the glass, as in the photograph. Tall
   * enough to need the envelope, which is what `exterior` buys them.
   *
   * Placed by where they LAND on the elevation rather than by their own x,
   * which is the only way to keep them off the name. The view is fixed at
   * 45° from the south-west, so `project` puts a point at the same screen
   * column as one `(doorY - poleY)` metres further east on the facade — a
   * pole nearly three metres out in the forecourt covers a letter three
   * metres east of it. Guessing at that is how the last pass parked one
   * squarely on the E of KINEPOLIS, and a name with a letter missing is
   * worse than a pole in the wrong place.
   *
   * So all three land on the pier between the doors and the glazing: east
   * of the one opening a player has to find, west of the name and the
   * star. The masts themselves stand in front of the entrance bay, which
   * is where a venue puts its flags and where the photograph has them —
   * the offset is what carries them clear on screen. Standing them where
   * they LOOK like they stand would put them over the glass, crossing the
   * sign; that reads as a foreground object through a lens and as a hole
   * in the lettering in a flat isometric, which is the same call the file
   * makes for the auditorium signs.
   */
  const poleY = FORECOURT.y + FORECOURT.h - 3.2;
  for (const lands of [-6.9, -5.1, -3.3]) {
    const x = lands - (RECEPTION.y - 0.34 - poleY);
    decor.push({
      floor: 0,
      bounds: rect(x, poleY, BANNER_POLE, BANNER_POLE),
      height: BANNER_HEIGHT,
      material: 'paving',
      exterior: true,
    });
    /*
     * The banner itself: thin the way the camera looks at it, so what you
     * see is the face rather than the edge.
     *
     * It hangs nearly the whole pole. The photograph's banners are four
     * times as tall as they are wide and start at head height — a short
     * pennant near the top reads as a flag, and these are the long printed
     * sleeves a venue hangs down the length of a mast.
     */
    decor.push({
      floor: 0,
      bounds: rect(x - 0.42, poleY - 0.06, BANNER_WIDTH, 0.1),
      base: BANNER_FOOT,
      height: BANNER_HEIGHT - BANNER_HEAD - 0.1,
      material: 'sign',
      exterior: true,
    });
    // The panel at its head. Every banner in the photograph has one, and a
    // blank white flag is the one thing that reads as unfinished rather
    // than as blockout.
    const headFoot = BANNER_HEIGHT - BANNER_HEAD;
    decor.push({
      floor: 0,
      bounds: rect(x - 0.42, poleY - 0.1, BANNER_WIDTH, 0.1),
      base: headFoot,
      height: BANNER_HEIGHT,
      material: 'signAccent',
      exterior: true,
    });
    /*
     * And the star on that panel, which is the thing the photograph's
     * banners actually say.
     *
     * Proud of the panel by four centimetres, because the two are the same
     * plane otherwise and a star drawn inside its own plate is invisible.
     * Same shape as the one on the elevation — one star, drawn one way.
     */
    const badge = BANNER_WIDTH * 0.52;
    for (const bar of star()) {
      decor.push({
        floor: 0,
        bounds: rect(
          x - 0.42 + (BANNER_WIDTH - badge) / 2 + bar.u0 * badge,
          poleY - 0.14,
          (bar.u1 - bar.u0) * badge,
          0.08,
        ),
        base: headFoot + 0.14 + bar.v0 * (BANNER_HEAD - 0.28),
        height: headFoot + 0.14 + bar.v1 * (BANNER_HEAD - 0.28),
        material: 'sign',
        exterior: true,
      });
    }
  }

  /*
   * The entrance, made to read as one.
   *
   * WALL_OPENINGS takes the wall away so a robot can drive through, which
   * leaves a hole in the precast and nothing to say it is a door. So the
   * doors are drawn into it below.
   */
  /*
   * The signage's plane: just OUTSIDE the wall line, not across it.
   *
   * `npm run venue` asks that every piece of dressing sit wholly inside one
   * room, which is how it catches furniture straddling a wall. The first
   * pass put the door leaves on the boundary itself, half in the reception
   * and half on the forecourt, and got fifty-eight complaints for it. The
   * letters and the star belong to the forecourt: it is the side you see
   * them from.
   */
  const doorY = RECEPTION.y - 0.34;

  // The two storeys above the door head, which is the rest of the building
  // the photograph shows. Same plane, so it is put in from the same datum.
  decor.push(...frontElevation());

  /*
   * The bank of doors itself, built the way every other bay of the front is
   * (see `glazeFacade`): frames on the wall line down to the floor, a head
   * at `DOOR_HEAD` on the inside face, glass above it. It had its own
   * five-leaf frame standing 0.34 m proud of the wall, which read as a
   * different door from the rest of the front once the rest became doors
   * too (the author, 28 Sep: "the doors on the left are still a bit
   * weird"). The frames are collided here as there; the leaves between them
   * are the way in.
   */
  const face = RECEPTION.y;
  const bays = Math.max(1, Math.round(ENTRANCE_WIDTH / MULLION_PITCH));
  for (let i = 0; i <= bays; i += 1) {
    const post = rect(
      ENTRANCE_X + (i * (ENTRANCE_WIDTH - MULLION_WIDTH)) / bays,
      face - WALL_THICKNESS / 2,
      MULLION_WIDTH,
      WALL_THICKNESS,
    );
    decor.push({ floor: 0, bounds: post, height: WALL_HEIGHT, exterior: true });
    solids.push({ floor: 0, bounds: post, height: WALL_HEIGHT, hidden: true });
  }
  decor.push({
    floor: 0,
    bounds: rect(ENTRANCE_X, face + PANE_THICKNESS / 2, ENTRANCE_WIDTH, PANE_THICKNESS),
    base: DOOR_HEAD - 0.2,
    height: DOOR_HEAD,
    material: 'structure',
    exterior: true,
  });
  decor.push({
    floor: 0,
    bounds: rect(ENTRANCE_X, face - PANE_THICKNESS / 2, ENTRANCE_WIDTH, PANE_THICKNESS),
    base: DOOR_HEAD,
    height: WALL_HEIGHT,
    material: 'glazing',
    exterior: true,
  });

  /*
   * No canopy, and no floodlights.
   *
   * The canopy read as a porte-cochère and the photograph has none: it runs
   * glass from the pavement to the head straight past the entrance. The two
   * lamps bracketed over the leaves came out as black boxes hanging in the
   * doorway (the author, 28 Sep: "some artifact"), so they went too.
   */

  /*
   * The name on the building.
   *
   * High on the precast east of the entrance, where the photograph puts it.
   * `signAccent` rather than a blue, because a sign is lit by whatever the
   * era lights it with — the same rule the seats and the screens follow —
   * and a hard brand blue would be the one colour in the game that ignores
   * the chapter it is standing in.
   */
  /*
   * The whole name, not a third of it.
   *
   * "KINEPOLIS" alone was what would fit at letters a metre and a third
   * tall, and a metre and a third was chosen before there was an upper
   * storey for the sign to be mounted on. The photograph's letters are
   * smaller than that against the elevation and the sign is far longer:
   * it runs the whole glazed sweep, from the precast edge to the east
   * corner, which is exactly the proportion that makes the building read
   * as a hall someone books rather than as a cinema.
   */
  const NAME = 'KINEPOLIS EVENT CENTER';
  const letter = 0.92;
  const gap = 0.2;
  // Starting on the precast edge, where the photograph starts it, and ending
  // at the east corner: 22 characters at 1.12 m is 24.5 m of sign across a
  // 25.7 m sweep of glass.
  const nameX = GLAZING_START + 0.4;
  // Heights are measured from the FORECOURT, because that is the plate this
  // storey-0 dressing stands over. 5.4 m puts the letters just over the
  // spandrel — on the upper storey's glass, standing on the first floor
  // line, which is where the photograph hangs them.
  const nameFoot = 5.4;
  const nameHigh = 1.3;
  [...NAME].forEach((character, index) => {
    const at = nameX + index * (letter + gap);
    for (const bar of glyph(character)) {
      decor.push({
        floor: 0,
        bounds: rect(at + bar.u0 * letter, doorY - 0.1, (bar.u1 - bar.u0) * letter, 0.16),
        base: nameFoot + bar.v0 * nameHigh,
        height: nameFoot + bar.v1 * nameHigh,
        material: 'signAccent',
        exterior: true,
      });
    }
  });

  /*
   * The star, straddling the top of the elevation where the glazing meets
   * the precast.
   *
   * The photograph is precise about this and it was wrong here in both
   * axes: the star sat at the far west corner, clear of everything, at half
   * the size. It belongs directly over the head of the name, half on the
   * precast flank and half on the glass, running from the sign's own top
   * up to the parapet — a piece of signage large enough to be the thing you
   * see from the car park, which is the job it does on the real building.
   *
   * `sign` rather than an accent, because it is a pale star on a pale wall
   * in the photograph and it reads by its shape and its shadow line rather
   * than by colour.
   */
  const starW = 3.6;
  // Sitting a little more over the glass than over the precast, which is
  // what leaves the pier beside the entrance clear for the banner poles.
  const starX = GLAZING_START - 0.6;
  const starFoot = nameFoot + nameHigh - 0.3;
  const starH = PARAPET_FOOT + 0.4 - starFoot;
  for (const bar of star()) {
    decor.push({
      floor: 0,
      bounds: rect(starX + bar.u0 * starW, doorY - 0.14, (bar.u1 - bar.u0) * starW, 0.18),
      base: starFoot + bar.v0 * starH,
      height: starFoot + bar.v1 * starH,
      material: 'sign',
      exterior: true,
    });
  }

  /*
   * No row of small windows in the precast any more: the pier they were in
   * is glass doors, the whole of it (the author, 28 Sep: "it supposed to be
   * all glass"). See `DOOR_RUN_START`.
   */

  /*
   * The neighbour across the way — the shed in the right of the photograph.
   *
   * Not the Kinepolis and not pretending to be: a plain mass with a roof
   * line, there so that stepping outside puts the building in a PLACE
   * rather than on an empty plane. It stands outside the forecourt, so
   * nothing gives it a datum and its height is measured from zero — hence
   * the concourse level spelled out in it, which everything standing ON the
   * forecourt gets for free and must not add again.
   */
  solids.push({
    floor: 0,
    bounds: rect(FORECOURT.x + FORECOURT.w + 4, FORECOURT.y + 6, 30, 19),
    height: CONCOURSE_LEVEL + 6.4,
    material: 'booth',
    exterior: true,
  });

  return { solids, decor };
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
const FACADE = glazeFacade(WALLS.walls, [...floor0Rooms, ...floor1Rooms]);

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
      //
      // And just outboard of it as well. The well can run on past the flight
      // (the grand flight's landing at its foot), and then half a metre out is
      // floor beyond the far lip while the rail itself stands over the well.
      // A 0.4 m landing did exactly that (28 Sep).
      const floorAt = (out: number): boolean => {
        const ox = cx + Math.sign(cx - (b.x + b.w / 2)) * out;
        const oy = cy + Math.sign(cy - (b.y + b.h / 2)) * out;
        return rooms.some(
          (r) =>
            r.floor === link.to &&
            rectContains(r.bounds, ox, oy) &&
            // A hole in the plate is not floor to stand on. Without this the
            // grand flight kept a balustrade down each side of its well, in
            // mid air, once the well became wider than the flight.
            !r.voids?.some((v) => rectContains(v, ox, oy)),
        );
      };
      const guarding = floorAt(0.5) && floorAt(half + 0.05);
      if (!guarding) continue;
      decor.push({ floor: link.to, bounds: edge.bounds, base: 0, height: RAIL_HEIGHT });
    }
  }

  return { solids, decor };
}

/**
 * The centre of the reception: the information island, its pillars, and the
 * free-standing counter.
 *
 * Mapped off `reception-desk.png`, the author's crop of `hollywood-area.png`
 * (28 Sep), at 0.0208 m/px. Three things agree on that scale: the pillars'
 * 6.5 m pitch, the island's 5.6 m, and the flight's 15.9 m. The author's key
 * to it is:
 *   - the thick outlines are desks, about 1.5 m high;
 *   - the thin ones are real walls;
 *   - there are five pillars.
 *
 * PLACED ON THE COLUMN GRID. The pillars stand on the hall's own column lines
 * (`exhibition-floor.jpg` shows them in line with the columns in the door
 * wall): the island's two at column 2, the pair by the counter at column 3,
 * and the one at the stair hall's return at column 4. So x comes from the
 * grid, and y from the head of the grand flight, which is the line along
 * the bottom of the crop.
 *
 * That puts everything where the drawing has it, the flight included: it
 * runs to the stair hall's east wall (see `GRAND_EAST`). Its west edge is
 * the one thing off the drawing, 1.05 m east of it, because it is fixed by
 * the corridor upstairs (see `GRAND_WEST`).
 *
 * Reading the island, north to south:
 *   - a desk along the north, turning south down the east side;
 *   - a desk down the west side, with a pillar in the corner between the two;
 *   - an inner L-shaped desk, whose end is joined to the east leg by a short
 *     box of wall, and a wall runs on east from that box;
 *   - a wall along the south, with the door behind the west desk. It is
 *     tied to the pillar at the head of the flight.
 * Inside is the staff floor behind the desks. The drawing's "i" in a circle
 * is a symbol on the floor, not a thing standing on it.
 */

/**
 * Height of the desks. 1.5 m, the author's figure for the thick outlines.
 *
 * Chest height on Droid, over Voxxy's head, and still under the 1.6 m eye
 * line the cutaway assumes, so you see over every desk in the concourse. It
 * was 1.4 m, off an older reading of the drawing.
 */
const COUNTER_HEIGHT = 1.5;

/** The thin walls: 6 px on the drawing. */
const THIN_WALL = 0.15;

/** A point on `reception-desk.png`, in metres: the flight's head is y 407 there. See `planX`. */
const planY = (py: number) => GRAND_WELL.y + GRAND_WELL.h + (407 - py) * DESK_PLAN_SCALE;

/** A rectangle on the drawing, corners in pixels. */
const planRect = (x0: number, y0: number, x1: number, y1: number): Rect =>
  rect(planX(x0), planY(y1), planX(x1) - planX(x0), planY(y0) - planY(y1));

/** The island's outline: west desk to east leg, north desk to south wall. */
const ISLAND = planRect(85, 78, 360, 348);

/** The free counter, east of the island and 1.6 m off the head of the flight. */
const FREE_COUNTER = planRect(430, 303, 743, 330);

/**
 * The five pillars: column line and the drawing's y for each.
 *
 * Exported so the venue check can count them.
 */
export const RECEPTION_PILLARS = [
  { x: DOOR_WALL_COLUMNS[1], y: planY(130) },
  { x: DOOR_WALL_COLUMNS[2], y: planY(130) },
  { x: DOOR_WALL_COLUMNS[3], y: planY(130) },
  // These two by their south face, 0.08 m off the head, not their centre:
  // a 0.7 m pillar centred where the drawing's smaller one is overhangs the
  // top step.
  { x: DOOR_WALL_COLUMNS[1], y: planY(404) + COLUMN_SIZE / 2 },
  { x: DOOR_WALL_COLUMNS[2], y: planY(404) + COLUMN_SIZE / 2 },
];

/**
 * Where you are served: the aisle in front of the island's west desk.
 *
 * Exported because a chapter that wants "the reception desk" must not keep a
 * pair of numbers for it. This point has drifted twice in two passes — once
 * when the island replaced the old nine-metre desk enclosure, and again when
 * the grand flight was given its ceremonial pitch and took the island 3.5 m
 * north with it. Both times the literal in `objectives.ts` stayed exactly
 * where it was, and both times `npm run objectives` passed, because it asks
 * whether a robot FITS there and not whether anybody would queue there.
 *
 * Derived from the island, so the next time the island moves this follows.
 */
export const RECEPTION_DESK = {
  floor: 0 as const,
  x: ISLAND.x - 1.65,
  y: planY(243),
};

function receptionFitOut(): Obstacle[] {
  const desk = (bounds: Rect): Obstacle => ({ floor: 0, bounds, height: COUNTER_HEIGHT, material: 'desk' });
  const wall = (bounds: Rect): Obstacle => ({ floor: 0, bounds, height: WALL_HEIGHT });
  // A thin wall along a line on the drawing, centred on it.
  const across = (x0: number, x1: number, py: number) =>
    wall(rect(planX(x0), planY(py) - THIN_WALL / 2, planX(x1) - planX(x0), THIN_WALL));
  const down = (px: number, y0: number, y1: number) =>
    wall(rect(planX(px) - THIN_WALL / 2, planY(y1), THIN_WALL, planY(y0) - planY(y1)));

  return [
    // The desks.
    desk(planRect(85, 78, 360, 115)), // north
    desk(planRect(323, 115, 360, 233)), // down the east side
    desk(planRect(85, 148, 122, 338)), // west
    desk(planRect(213, 237, 308, 271)), // the inner L, across
    desk(planRect(213, 271, 247, 338)), // the inner L, down
    desk(FREE_COUNTER),

    // The box of wall between the inner desk's end and the east leg, and the
    // wall running on east from it.
    down(310, 240, 271),
    across(310, 354, 241),
    down(354, 241, 268),
    across(354, 424, 268),

    // The south wall and the door behind the west desk (x 143 to 192 on the
    // drawing), then its return down to the pillar at the head of the flight.
    across(93, 143, 346),
    across(192, 247, 346),
    down(96, 346, 381),

    // The pillars. Structure, so no material: they take the wall colour, as
    // the hall's columns do.
    ...RECEPTION_PILLARS.map(
      (p): Obstacle => ({
        floor: 0,
        bounds: rect(p.x - COLUMN_SIZE / 2, p.y - COLUMN_SIZE / 2, COLUMN_SIZE, COLUMN_SIZE),
        height: FLOOR_CLEAR,
      }),
    ),
  ];
}

/**
 * The polo pickup: an L-shaped counter in the hall's middle east stretch.
 *
 * Off `polo-desk.png`. It is not a room: it is a desk standing in the hall,
 * which is what the author wanted modelled (28 Sep). One run goes down the
 * west side from just under the step, 7.0 m long, with the fittings on its
 * inner face. The other goes along the south, out to the wall. The staff
 * floor inside the L is reached through the gap between the counter's
 * north end and the east wall. The public side is outside the L, where
 * `POLO_DESK` is.
 *
 * The plan also draws a thin line round it, 1.2 m off the counter. It is
 * not in the author's key, so it is left out. The column on line 7 stands
 * in the south run, as the plan hides it there.
 */
/** A counter's depth: the plan's double line, fittings and all. */
const POLO_COUNTER_DEPTH = 0.65;
const POLO_WEST_RUN = rect(HALL_NE_WALL - 2.0, HALL_STEP - 7.1, POLO_COUNTER_DEPTH, 7.0);
const POLO_SOUTH_RUN = rect(
  POLO_WEST_RUN.x,
  POLO_WEST_RUN.y,
  HALL_MID_WALL - WALL_THICKNESS / 2 - POLO_WEST_RUN.x,
  POLO_COUNTER_DEPTH,
);

/** Where you are served: the public side of the counter's west run. */
export const POLO_DESK = {
  floor: 0 as const,
  x: POLO_WEST_RUN.x - 0.9,
  y: POLO_WEST_RUN.y + POLO_WEST_RUN.h / 2,
  /** The middle of the counter across from it, and its top: where the polos are. */
  counterX: POLO_WEST_RUN.x + POLO_COUNTER_DEPTH / 2,
  counterTop: COUNTER_HEIGHT,
};

function poloDesk(): Obstacle[] {
  return [POLO_WEST_RUN, POLO_SOUTH_RUN].map(
    (bounds): Obstacle => ({ floor: 0, bounds, height: COUNTER_HEIGHT, material: 'desk' }),
  );
}

/**
 * The walls of the stair hall — the two the plan marks and the building had
 * none of.
 *
 * The grand flight was standing in open concourse with a balustrade down each
 * side. On `hollywood-area.png` it stands in a SLOT: a wall the full length
 * of the flight on each side, and the treads hatched right up to both of
 * them. That is a different room, and it is the one the plan draws — you come
 * in at the south corner, walk up the aisle with a wall on your right, and
 * the stair is a thing you turn into rather than a thing standing in the
 * middle of the floor.
 *
 * They sit on the WELL'S OWN SIDES, which is the honest anchor: the well is
 * this building's stand-in for that slot, so its edges are where the walls
 * go. Measured, the drawing's slot is 15.7 m wide against this well's 14.3 —
 * the same 9% the flight itself was reconciled by, and the same direction.
 *
 * The two sides are NOT the same length, which is the detail worth keeping:
 *
 *   west  — stops at the head of the flight and turns west to the pillar
 *           there, which is where `reception-desk.png` ends it: the pillar
 *           stands at the flight's corner. It ran on 0.5 m past the head
 *           until 28 Sep, and that left a gap between it and the pillar, and
 *           its end standing 0.7 m in front of the door behind the island
 *           (the author: "the pathway through the door ... is really short").
 *   east  — runs 5.8 m past the head and then returns west to the pillar on
 *           column 4. A thin wall comes 2.9 m back down from that pillar.
 *
 * The east side is placed off `reception-desk.png` on the column grid, not
 * on the well: see `RECEPTION_PILLARS`. The flight runs to it: see
 * `GRAND_EAST`.
 *
 * Both stop short of the entrance elevation by the LOBBY the plan leaves —
 * 80 px, 3.3 m — rather than running down to the foot of the flight. On the
 * drawing those are the same line, because its flight ends 3.3 m inside the
 * doors. This one keeps a 1.2 m landing at its foot (see `GRAND_LANDING`), so
 * a wall taken to its foot would close in on the entrance. The lobby is the
 * part a player uses, so the lobby wins, and the bottom steps come out past
 * the ends of the walls, as the foot of a broad flight does anyway.
 */
const STAIR_HALL_HEIGHT = FLOOR_HEIGHT - CONCOURSE_LEVEL;


/** Clear depth inside the entrance elevation before the walls start, metres. */
const STAIR_HALL_LOBBY = 3.3;

function grandStairHall(): Obstacle[] {
  const foot = RECEPTION.y + STAIR_HALL_LOBBY;
  const head = GRAND_WELL.y + GRAND_WELL.h;
  // Off the drawing: the east wall's inner face, the return's line, and the
  // east face of the pillar the return stops at.
  const east = planX(887);
  const back = planY(128);
  const pillar = RECEPTION_PILLARS[2];
  const corner = RECEPTION_PILLARS[3];
  const wall = (bounds: Rect): Obstacle => ({ floor: 0, bounds, height: STAIR_HALL_HEIGHT });

  return [
    wall(rect(GRAND_WELL.x - WALL_THICKNESS, foot, WALL_THICKNESS, head - foot)),
    // ...and west along the head to the pillar at the flight's corner. The
    // pillar is on the column grid and the flight is 1.05 m east of where the
    // drawing has it, so this is the piece of the drawing's slot wall that
    // the narrower flight left behind.
    wall(
      rect(
        corner.x + COLUMN_SIZE / 2,
        head - WALL_THICKNESS,
        GRAND_WELL.x - (corner.x + COLUMN_SIZE / 2),
        corner.y - COLUMN_SIZE / 2 - (head - WALL_THICKNESS),
      ),
    ),
    wall(rect(east, foot, WALL_THICKNESS, back - foot)),
    wall(
      rect(
        pillar.x + COLUMN_SIZE / 2,
        back - WALL_THICKNESS,
        east + WALL_THICKNESS - (pillar.x + COLUMN_SIZE / 2),
        WALL_THICKNESS,
      ),
    ),
    // The thin wall down from the pillar, with its stub turning west.
    wall(rect(planX(739) - THIN_WALL / 2, planY(268), THIN_WALL, pillar.y - COLUMN_SIZE / 2 - planY(268))),
    wall(rect(planX(717), planY(268), planX(742) - planX(717), THIN_WALL)),
  ];
}

/**
 * What goes round the opening: a balustrade on the edge, and below it the
 * two far sides of the drop and the concourse floor at the bottom.
 *
 * Only the auditorium level is ever drawn while you stand on it, so a hole
 * in its floor shows nothing at all, a black pit rather than a view. What is
 * drawn under it is the concourse's floor, 5 m down, and a skin on the north
 * and east rims, which are the two the camera sees into. Same trick as the
 * stairwells (see SHAFT_SKIN): decor, never collided.
 *
 * The balustrade IS collided. `voids` are render-only, and without it a
 * robot walks straight out across the drop on floor that the simulation
 * still thinks is there. Beside the flight itself the flight's own rail
 * does that job; this covers the curve and the 2 m between the curve and
 * the head of the stairs.
 */
function terraceEdge(): { solids: Obstacle[]; decor: Decor[] } {
  const solids: Obstacle[] = [];
  const decor: Decor[] = [];
  const drop = -(FLOOR_HEIGHT - CONCOURSE_LEVEL);
  const half = RAIL_THICKNESS / 2;
  const head = GRAND_STAIR.y + GRAND_STAIR.h;
  const top = TERRACE_BLOCK.y + TERRACE_BLOCK.h;

  // The rims the terrace meets: each band's north edge where the band above
  // does not cover it, and each band's east edge. The full-width base is
  // flush with the flight from the head south, and the flight's rail has it.
  const edges: Rect[] = [];
  const bands = TERRACE_OPENING.slice(1);
  const base = TERRACE_OPENING[0];
  edges.push(rect(base.x + base.w - half, head, RAIL_THICKNESS, top - TERRACE_CURVE - head));
  for (let i = bands.length - 1; i >= 0; i -= 1) {
    const band = bands[i];
    const east = band.x + band.w;
    edges.push(rect(east - half, band.y, RAIL_THICKNESS, band.h));
    const above = i === bands.length - 1 ? band.x : bands[i + 1].x + bands[i + 1].w;
    edges.push(
      rect(Math.min(above, east) - half, band.y + band.h - half, Math.abs(east - above) + RAIL_THICKNESS, RAIL_THICKNESS),
    );
  }
  for (const edge of edges) {
    solids.push({ floor: 1, bounds: edge, height: RAIL_HEIGHT });
    decor.push({ floor: 1, bounds: edge, base: drop, height: 0 });
  }
  for (const hole of TERRACE_OPENING) {
    decor.push({ floor: 1, bounds: hole, base: drop - TREAD_SLAB, height: drop, material: 'floorBelow' });
  }
  return { solids, decor };
}

/**
 * The walls round the two hall flights — see `CORE_VESTIBULE`.
 *
 * Floor 0 only, and full clear height like a column: from the hall a stair
 * core is a room, not a balustrade. The walls stand OUTSIDE the flight's own
 * bounds, so nothing about the stair rule changes — the treads are still what
 * a robot climbs or is refused by — and the only thing that has moved is
 * where you can step onto the bottom one from.
 */
function stairCores(): Obstacle[] {
  const walls: Obstacle[] = [];
  const wall = (bounds: Rect): void => {
    walls.push({ floor: 0, bounds, height: FLOOR_CLEAR });
  };
  for (const flight of [STAIR_WEST, STAIR_EAST]) {
    const west = flight.x - WALL_THICKNESS;
    const east = flight.x + flight.w;
    const north = STAIR_FOOT_Y + CORE_VESTIBULE;
    const doorTop = north - CORE_DOOR_SET;
    const doorFoot = doorTop - CORE_DOOR;
    for (const x of [west, east]) {
      // Beside the flight and the south half of the vestibule, then the stub
      // of wall between the doors and the north-east or north-west corner.
      wall(rect(x, flight.y, WALL_THICKNESS, doorFoot - flight.y));
      wall(rect(x, doorTop, WALL_THICKNESS, north - doorTop));
    }
    wall(rect(west, north, flight.w + WALL_THICKNESS * 2, WALL_THICKNESS));
  }
  return walls;
}

/**
 * The threshold's two solid pieces: the box at the landing's west end, and
 * the columns standing in the doorway. See `THRESHOLD_BOX`, `DOOR_WALL_COLUMNS`.
 */
function thresholdFit(): Obstacle[] {
  const pieces: Obstacle[] = [
    { floor: 0, bounds: THRESHOLD_BOX, height: CONCOURSE_LEVEL + RAIL_HEIGHT },
  ];
  for (const x of DOOR_WALL_COLUMNS) {
    pieces.push({
      floor: 0,
      bounds: rect(x - COLUMN_SIZE / 2, HALL.y - COLUMN_SIZE / 2, COLUMN_SIZE, COLUMN_SIZE),
      height: FLOOR_CLEAR,
    });
  }
  return pieces;
}

const BOOTHS = exhibitionBooths();
const STAIRS = stairMass(staircases);
const RAILS = stairRails(staircases, [...floor0Rooms, ...floor1Rooms]);
const FORECOURT_FIT = forecourtFitOut();
const TERRACE_EDGE = terraceEdge();
const TOILET_FIT = toiletFitOut();

export const KINEPOLIS: Venue = {
  rooms: [...floor0Rooms, ...floor1Rooms],
  obstacles: [
    ...exhibitionColumns(),
    ...BOOTHS.solids,
    ...HALL_CUTAWAYS,
    ...hallEastWalls(),
    ...poloDesk(),
    ...auditoriumSolids,
    ...STAIRS.solids,
    ...stairCores(),
    ...thresholdFit(),
    ...RAILS.solids,
    ...TERRACE_EDGE.solids,
    ...receptionFitOut(),
    ...grandStairHall(),
    ...railBesideWells(FACADE.walls, staircases),
    ...FORECOURT_FIT.solids,
    ...TOILET_FIT.solids,
    ...bofDoorJambs(),
  ],
  decor: [
    ...auditoriumDecor,
    ...WALLS.decor,
    ...RAILS.decor,
    ...STAIRS.decor,
    ...FACADE.decor,
    ...BOOTHS.decor,
    ...FORECOURT_FIT.decor,
    ...TERRACE_EDGE.decor,
    ...TOILET_FIT.decor,
  ],
  links: staircases,
  extents: [rect(HALL.x, -62, EAST_EDGE + 1 - HALL.x, HALL_NORTH + 62), rect(-46, SOUTH_END, 92, 150)],
};

/**
 * The line Devoxx draws across the upstairs corridor where the rooms in use
 * stop.
 *
 * Rooms 1, 2 and 11 to 14 have no sessions these days, and the conference
 * marks where its part of the corridor ends: a run of black drape from each
 * wall towards the middle, with the middle left open so you can still walk
 * through. Built from whichever rooms a chapter's day uses, not typed. Across
 * the corridor at the far edge of the northernmost room in use, and at the
 * near edge of the southernmost if any unused room lies beyond it. With every
 * room in use there is no line at all.
 *
 * Drape rather than a wall: it collides, because a line you can drive
 * through is not a line, but it is 2.4 m of fabric on posts, not structure.
 */
export function sessionLimits(inUse: readonly string[]): Obstacle[] {
  const corridor = floor1Rooms.find((r) => r.id === 'corridor');
  if (!corridor) return [];
  const auditoria = floor1Rooms.filter((r) => r.kind === 'auditorium');
  const used = auditoria.filter((r) => inUse.includes(r.id));
  const unused = auditoria.filter((r) => !inUse.includes(r.id));
  if (used.length === 0 || unused.length === 0) return [];

  const north = Math.max(...used.map((r) => r.bounds.y + r.bounds.h));
  const south = Math.min(...used.map((r) => r.bounds.y));
  const lines = [
    ...(unused.some((r) => r.bounds.y >= north - 0.01) ? [north] : []),
    ...(unused.some((r) => r.bounds.y + r.bounds.h <= south + 0.01) ? [south] : []),
  ];

  const c = corridor.bounds;
  const middle = c.x + c.w / 2;
  const out: Obstacle[] = [];
  for (const y of lines) {
    for (const [from, to] of [
      [c.x, middle - SESSION_GAP / 2],
      [middle + SESSION_GAP / 2, c.x + c.w],
    ]) {
      out.push({
        floor: 1,
        bounds: rect(from, y - DRAPE_THICKNESS / 2, to - from, DRAPE_THICKNESS),
        height: DRAPE_HEIGHT,
        material: 'drape',
      });
      // A post every couple of metres and one at each end: the uprights
      // are what make a length of fabric read as a barrier.
      const posts = Math.max(1, Math.round((to - from) / DRAPE_BAY));
      for (let i = 0; i <= posts; i += 1) {
        const x = from + ((to - from) * i) / posts;
        out.push({
          floor: 1,
          bounds: rect(
            Math.min(Math.max(x - DRAPE_POST / 2, from), to - DRAPE_POST),
            y - DRAPE_POST / 2,
            DRAPE_POST,
            DRAPE_POST,
          ),
          height: DRAPE_HEIGHT + 0.1,
          material: 'drapePost',
        });
      }
    }
  }
  return out;
}

/** The opening left in the middle of a session line, metres. Two people abreast, or Droid with room. */
const SESSION_GAP = 3.0;
const DRAPE_HEIGHT = 2.4;
const DRAPE_THICKNESS = 0.12;
const DRAPE_POST = 0.08;
/** Post spacing along a drape, metres. */
const DRAPE_BAY = 2.4;

/** Named spawn points, so chapters do not hard-code coordinates. */
export const SPAWNS = {
  /**
   * Inside the main entrance, at the foot of the west aisle.
   *
   * It used to be at x 18, "east of the grand stair", which was true of the
   * building when the doors were in the middle of the frontage and is not
   * true of it now: the way in is at the west corner and the aisle it opens
   * onto runs north between the west wall and the grand flight. A spawn
   * called `mainEntrance` thirty metres from the entrance is worse than no
   * spawn at all.
   */
  mainEntrance: { floor: 0 as const, x: -12.4, y: -58.4 }, // 1.2 m up, in the concourse
  /**
   * On the forecourt, far enough out to have the whole elevation in frame.
   *
   * The building is ten metres tall and the camera frames a robot, so where
   * you stand decides whether you are looking at a building or at a
   * pavement. This is the spot the front of the Kinepolis reads from.
   */
  forecourt: { floor: 0 as const, x: -4, y: -72 },
  /** Where the concourse opens into the hall. */
  // Between the southernmost column row, at y -27.28, and the foot of the
  // threshold steps at -32.44, on the centre line of the main aisle: the
  // cast lines up eastward from here, clear of both.
  hallEntrance: { floor: 0 as const, x: -1, y: -29.9 },
  /**
   * Centre of the hall, on the aisle midway between two rows of columns.
   *
   * A chapter lines its whole cast up east of this point, so what has to be
   * clear is the ROW, not the point. The column rows nearest here sit at
   * y -14.57 and -20.75, so -17.7 is over 3 m from either and clears Biggy's
   * 0.72 m for any x along the row. It is also 3 m south of the staircases,
   * which stand in the middle of the hall — the cast used to spawn inside
   * one of them, and the collision solver threw it 340 km.
   *
   * Worth knowing when driving: the grid is square and the isometric screen
   * axes sit at 45° to it, so holding right or left tracks a line of columns
   * and meets one every 9.2 m. That is the hall doing its job — but it means
   * a straight screen-axis run is never the fast way across.
   */
  hallCentre: { floor: 0 as const, x: -2.6, y: -17.7 },
  /**
   * Just south of the west flight, below its TOP.
   *
   * The flights climb southward, so this end of one is a storey of wall: drive
   * north from here and you meet it, which is what `npm run traverse` asserts.
   * The foot you can actually walk onto is at the far, northern end.
   */
  stairFoot: { floor: 0 as const, x: -6.0, y: -3.3 },
  /**
   * The south end of the corridor, between Rooms 6 and 7.
   *
   * North of the grand stairwell, and it has had to move north twice now for
   * the same reason: the well reached y -51.1, then -46.8 when the flight was
   * given its ceremonial pitch and grew 3.5 m (it is back at -51.4 since the
   * terrace, 28 Sep, so this now stands on it). Both times this point was left
   * inside it, and a chapter that starts here would drop its whole cast down
   * the stairs before the player touched a key. `npm run venue` catches it,
   * which is the only reason it is not still there.
   */
  corridorSouth: { floor: 1 as const, x: 0, y: -44 },
  corridorNorth: { floor: 1 as const, x: 0, y: 58 },
  /** Outside the keynote room. Chapter III's destination. */
  // In the corridor outside Room 8, not inside its seating — the cast lines
  // up eastward from here and Room 8's first seat bank starts 2.5 m in.
  keynoteDoor: { floor: 1 as const, x: -3, y: -31 },
  foyer: { floor: 1 as const, x: -24, y: 55 },
};
