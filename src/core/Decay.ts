/**
 * What is left in a building nobody has come back to.
 *
 * This is `Crowd`'s mirror image, and deliberately built to the same shape:
 * `Crowd` fills the venue with the people in it, and this fills it with the
 * length of their absence. Same single density number, same seeded generator,
 * same rule that everything it makes is static and instanced so that ten
 * thousand pieces cost one draw call and nothing per frame.
 *
 * WHY IT EXISTS. Chapter I was the other two chapters in a colder palette at
 * a quarter of the exposure, and it read as exactly that — the same rooms
 * with the brightness down, rather than the same rooms thirty years later.
 * Darkness is not abandonment. Dust is, and grass through the floor is, and
 * neither of those can be a palette entry.
 *
 * WHY IT IS NOT IN THE VENUE. Rule 2: the venue is defined once and chapters
 * dress it. Grass in `kinepolis.ts` is grass in Chapter III as well, and the
 * whole sense-of-place argument is that this is ONE building. So the decay is
 * GENERATED from the venue's own geometry rather than drawn into it — the
 * same move the crowd makes, for the same reason.
 *
 * WHY IT IS NOT A FIFTH FIELD ON `Chapter`. Rule 3: four things, and this is
 * not a new one. `crowdDensity` is already "how full the building is", and
 * zero is already the only value Chapter I has. `ChapterScreen` reads a lamp
 * out of `lightLevel < 0.4` on exactly the same principle. An empty building
 * is a building nobody has swept.
 *
 * WHAT IT IS NOT. `SPEC.md` §9 — the building is EMPTY, NOT WRECKED, and the
 * reference everybody reaches for is a settled city rather than a smashed
 * one: nothing is broken, everything is covered. So there is no rubble in
 * here, nothing has fallen and nothing is overturned. Dust, growth and water
 * are the whole vocabulary, and all three are things that happen to a room
 * that is simply left alone.
 */

import { rectContains, type Level, type Rect, type Venue } from './Venue';
import { rect } from './Venue';

/**
 * A piece of decay: a box on a floor, in metres, like everything else here.
 *
 * Deliberately NOT `Decor`. Decor is a fact about the building that every
 * chapter shares; this is a fact about one era, and giving it the same type
 * would invite somebody to push it into `KINEPOLIS.decor` where it would
 * grow grass through Chapter III.
 */
export interface DecayPiece {
  floor: Level;
  bounds: Rect;
  /** Metres above the storey datum. Its base is the floor it stands on. */
  height: number;
  kind: 'drift' | 'growth' | 'stain' | 'sheet';
  /** 0..1, deterministic. The renderer uses it to vary tone. */
  tint: number;
}

/**
 * How deep a drift banks against a wall, metres, and how high it gets.
 *
 * Small numbers, and they have to be: a 0.3 m bank of silt along the foot of
 * a wall reads as thirty years at this zoom, and a knee-high one reads as a
 * sand dune indoors. The give-away is the LENGTH of the run, not its height —
 * unbroken drift down forty metres of wall is what says nobody has walked it.
 */
const DRIFT_DEEP = 1.15;
const DRIFT_HIGH = 0.26;

/** Metres of drift per piece. Short, so the run can bend and break. */
const DRIFT_STEP = 1.6;

/** Fraction of a wall run left clear, so it reads as drift and not as skirting. */
const DRIFT_GAPS = 0.28;

/**
 * Silt banked round the foot of something standing on the floor.
 *
 * The room-perimeter drifts above turned out to be nearly invisible, and the
 * reason is where the player stands: the exhibition hall is 52 m across and
 * a skirting of dust 25 m away at the wall is not what you are looking at.
 * The COLUMNS are. There are ninety of them on a 9 m grid, the player drives
 * between them for the whole chapter, and a column with silt heaped round its
 * base reads as thirty years from two metres away.
 */
const SKIRT_OUT = 0.85;
const SKIRT_HIGH = 0.19;

/** Biggest footprint that gets a skirt all the way round, metres. */
const SKIRT_MAX_SIDE = 3.0;

/**
 * Dust lying ON the floor, in sheets.
 *
 * This is the one that actually carries the chapter, and it was missing from
 * the first version entirely — which had dust only where the floor meets
 * something else, so the middle of every room was as swept as Chapter III.
 * A floor nobody has walked on is COVERED, not edged.
 *
 * Big, flat and irregular: 2 to 9 m across and a few centimetres thick, so
 * they read as a surface the floor has taken on rather than as objects on it.
 * The gaps between them are what make them read at all — an evenly dusted
 * floor is just a floor of another colour.
 */
const SHEET_MIN = 2.0;
const SHEET_MAX = 9.0;

/**
 * How thick a sheet is, metres — a RANGE, and it has to be one.
 *
 * This was a single constant, 0.035, and it made the whole chapter flicker.
 * Sheets are deliberately dense enough to overlap — that is what turns them
 * from pale rectangles into a covering — and every overlapping pair then had
 * its top face at exactly the same height. Two coplanar surfaces are a
 * depth-buffer coin toss, resolved per pixel, and re-tossed the moment the
 * camera moves a centimetre. Nothing about it looks like a z-fight while you
 * are writing it; it looks like the floor is boiling.
 *
 * A continuous range fixes it outright rather than by nudging: the chance
 * that two independent draws land within the depth buffer's resolution of
 * each other is not small, it is nil in any practical sense. The floor of the
 * range clears `DECAL_LIFT`, so the floor's own seam grid stays buried under
 * the dust rather than poking through it.
 */
const SHEET_HIGH_MIN = 0.042;
const SHEET_HIGH_MAX = 0.098;

/**
 * Metres of floor per sheet attempted.
 *
 * Low enough that sheets OVERLAP. At one per 22 m² they read as pale
 * rectangles lying about on a dark floor — patches, not a covering — and the
 * eye sorts them as objects. Overlapping ones merge into an irregular
 * continuous surface with dark floor showing through the gaps, which is what
 * a room nobody has crossed in thirty years actually looks like.
 */
const SHEET_PER_M2 = 11;

/**
 * Growth, metres.
 *
 * Tufts, not trees. A tree indoors is a different genre and it is the genre
 * `SPEC.md` §9 rules out — and at this camera a 4 m tree in the exhibition
 * hall would hide a robot, which the cutaway would then have to eat.
 */
const TUFT_MIN = 0.14;
const TUFT_MAX = 0.62;
const TUFT_SIZE = 0.44;

/**
 * Growth comes in PATCHES, not on a grid.
 *
 * Scattering single tufts on a 2.3 m grid gave a room with small boxes
 * standing about in it — the eye read them as litter, because one blade of
 * anything every two metres is not how a floor goes back to ground. Ground
 * comes back in patches: a seam lets water in, and what grows spreads from
 * there. So a clump is 6 to 20 tufts inside a couple of metres, and the
 * clumps are what get scattered.
 */
const CLUMP_SPAN = 2.4;
const CLUMP_MIN = 6;
const CLUMP_MAX = 20;

/** Metres of floor per clump attempted, before the daylight falloff. */
const CLUMP_PER_M2 = 40;

/**
 * How far daylight reaches in, metres, and what growth does past it.
 *
 * Things grow where the light is. The one source in a building with no power
 * is the glazed south elevation, so growth is dense at the front and gives up
 * as it goes north into the hall — which also means the player drives INTO
 * the dead part of the building rather than out of it.
 */
const DAYLIGHT_REACH = 55;

/**
 * What is left of the growth rate at the far end of that reach.
 *
 * Not much less than half, and it was 0.06 — which, with the reach bug that
 * had `south` reading off the FORECOURT thirty metres beyond the building,
 * meant the whole venue sat at the floor value and the hall grew nothing at
 * all. A gradient the player cannot see is not a gradient; it is an absence
 * with a comment on it.
 */
const DAYLIGHT_FLOOR = 0.42;

/** Stains: broad, flat, and rare. Metres. */
const STAIN_MIN = 1.4;
const STAIN_MAX = 4.6;
const STAIN_PER_ROOM = 5;

/**
 * A stain is a mark on the dust, not a thing standing on it — and a range,
 * for the reason above.
 *
 * It sits just ABOVE the sheets rather than under them. As a 12 mm mark lifted
 * off the plate by `DECAL_LIFT` it came out at 37 mm, two millimetres from
 * every sheet in the building, which was the second half of the flicker; and
 * where it did win the toss it was a damp patch drawn over the dust that
 * settled on it afterwards, which is the wrong way round anyway. The roof is
 * still leaking. The water is the newest thing in the room.
 */
const STAIN_HIGH_MIN = 0.104;
const STAIN_HIGH_MAX = 0.126;

export class Decay {
  readonly pieces: DecayPiece[] = [];

  private readonly random: () => number;

  /**
   * @param density 0..1. 0 builds nothing at all, which is what Chapters II
   *   and III get: they are the same building with people still in it.
   */
  constructor(venue: Venue, density: number, seed = 0xdecaced) {
    this.random = mulberry32(seed);
    if (density <= 0) return;

    // The south ELEVATION, which is where the daylight and therefore the
    // growth comes from. Taken over the rooms that are inside the building:
    // reading it off every room put it on the forecourt's far kerb, thirty
    // metres beyond the front door, and every gradient in here measured from
    // a line outside the building.
    const south = Math.min(
      ...venue.rooms.filter((r) => r.kind !== 'outside').map((r) => r.bounds.y),
    );

    for (const room of venue.rooms) {
      // Outside is already weather. It does not need silt drawn on it, and
      // the forecourt is 82 m wide — it would be half of everything here.
      if (room.kind === 'outside') continue;
      this.sheets(room.floor, room.bounds, venue, density);
      this.drift(room.floor, room.bounds, venue, density);
      this.grow(room.floor, room.bounds, venue, density, south);
      this.stain(room.floor, room.bounds, venue, density);
    }

    this.skirts(venue, density);
  }

  /**
   * Dust lying across the open floor, which is most of what you actually see.
   *
   * Sized on the room's own area rather than at a fixed count, because the
   * exhibition hall is 2400 m² and a BOF room is 150: a count that covers one
   * buries the other.
   */
  private sheets(floor: Level, room: Rect, venue: Venue, density: number): void {
    const tries = Math.round((room.w * room.h) / SHEET_PER_M2);
    for (let i = 0; i < tries; i += 1) {
      if (this.random() > density) continue;
      // Oblong more often than square, and along either axis: a patch of
      // settled dust follows whatever draught laid it down, and a floor of
      // squares reads as tiling.
      const long = SHEET_MIN + this.random() ** 1.5 * (SHEET_MAX - SHEET_MIN);
      const short = SHEET_MIN * (0.5 + this.random() * 0.9);
      const [w, h] = this.random() < 0.5 ? [long, short] : [short, long];
      const bounds = rect(
        room.x + this.random() * Math.max(room.w - w, 0),
        room.y + this.random() * Math.max(room.h - h, 0),
        w,
        h,
      );
      if (!this.clear(floor, bounds, venue)) continue;
      this.pieces.push({
        floor,
        bounds,
        height: SHEET_HIGH_MIN + this.random() * (SHEET_HIGH_MAX - SHEET_HIGH_MIN),
        kind: 'sheet',
        tint: this.random(),
      });
    }
  }

  /**
   * Silt heaped round the foot of everything standing on the floor.
   *
   * Two faces only — south and west — because those are the two the camera
   * can see, and a skirt on the far side of a column is a thousand boxes
   * nobody will ever look at. Same argument as `SHAFT_SKIN` in the venue.
   */
  private skirts(venue: Venue, density: number): void {
    for (const piece of venue.obstacles) {
      const b = piece.bounds;
      if (b.w > SKIRT_MAX_SIDE && b.h > SKIRT_MAX_SIDE) continue;
      if (this.random() > density * 0.8) continue;

      const out = SKIRT_OUT * (0.5 + this.random() * 0.5);
      const high = SKIRT_HIGH * (0.45 + this.random() * 0.55);
      const south = rect(b.x - out, b.y - out, b.w + out * 2, out);
      const west = rect(b.x - out, b.y, out, b.h);

      for (const bounds of [south, west]) {
        if (!this.clear(piece.floor, bounds, venue)) continue;
        this.pieces.push({
          floor: piece.floor,
          bounds,
          height: high,
          kind: 'drift',
          tint: this.random(),
        });
      }
    }
  }

  /**
   * Silt banked along the inside of a room's perimeter.
   *
   * Along the ROOM's edge rather than along every obstacle, and that is a
   * deliberate cheapening: the building has 745 obstacles and most of them
   * are columns and seat banks that a drift would only make fussy. The long
   * unbroken run down the side of a big room is the whole image.
   */
  private drift(floor: Level, room: Rect, venue: Venue, density: number): void {
    const runs: { along: 'x' | 'y'; at: number; from: number; to: number; inward: number }[] = [
      { along: 'x', at: room.y, from: room.x, to: room.x + room.w, inward: 1 },
      { along: 'x', at: room.y + room.h, from: room.x, to: room.x + room.w, inward: -1 },
      { along: 'y', at: room.x, from: room.y, to: room.y + room.h, inward: 1 },
      { along: 'y', at: room.x + room.w, from: room.y, to: room.y + room.h, inward: -1 },
    ];

    for (const run of runs) {
      for (let s = run.from; s < run.to - DRIFT_STEP; s += DRIFT_STEP) {
        if (this.random() < DRIFT_GAPS) continue;
        if (this.random() > density) continue;

        // Deeper and higher toward the ends of a run, because that is where
        // corners are and corners are where anything blown about collects.
        const t = (s - run.from) / Math.max(run.to - run.from, 1);
        const corner = 1 - Math.min(t, 1 - t) * 2;
        const deep = DRIFT_DEEP * (0.35 + 0.65 * corner ** 2) * (0.55 + this.random() * 0.45);
        const high = DRIFT_HIGH * (0.4 + 0.6 * corner) * (0.5 + this.random() * 0.5);

        const bounds =
          run.along === 'x'
            ? rect(s, run.inward > 0 ? run.at : run.at - deep, DRIFT_STEP, deep)
            : rect(run.inward > 0 ? run.at : run.at - deep, s, deep, DRIFT_STEP);

        if (!this.clear(floor, bounds, venue)) continue;
        this.pieces.push({ floor, bounds, height: high, kind: 'drift', tint: this.random() });
      }
    }
  }

  /**
   * Growth on a jittered grid, thinning away from the daylight.
   *
   * A grid and not a scatter, because a scatter clumps and a clump of grass
   * in the middle of a 2400 m² floor reads as a mistake rather than as a
   * floor going back to ground. The jitter is what stops it reading as a grid.
   */
  private grow(
    floor: Level,
    room: Rect,
    venue: Venue,
    density: number,
    south: number,
  ): void {
    const tries = Math.round((room.w * room.h) / CLUMP_PER_M2);
    for (let i = 0; i < tries; i += 1) {
      const cx = room.x + this.random() * room.w;
      const cy = room.y + this.random() * room.h;

      const reach = 1 - Math.min((cy - south) / DAYLIGHT_REACH, 1);
      const lit = DAYLIGHT_FLOOR + (1 - DAYLIGHT_FLOOR) * reach ** 1.7;
      if (this.random() > density * lit) continue;

      const blades = CLUMP_MIN + Math.floor(this.random() * (CLUMP_MAX - CLUMP_MIN));
      for (let b = 0; b < blades; b += 1) {
        // Round the clump's centre, thickest in the middle: `random()**0.5`
        // spreads evenly over a disc, and this deliberately does NOT, because
        // a patch of scrub is dense where it started and thins at the edge.
        const a = this.random() * Math.PI * 2;
        const r = this.random() ** 1.4 * (CLUMP_SPAN / 2);
        const size = TUFT_SIZE * (0.35 + this.random() * 0.65);
        const bounds = rect(
          cx + Math.cos(a) * r - size / 2,
          cy + Math.sin(a) * r - size / 2,
          size,
          size,
        );
        if (!this.clear(floor, bounds, venue)) continue;

        // Tallest at the middle of the clump, for the same reason.
        const fall = 1 - (r / (CLUMP_SPAN / 2)) * 0.55;
        this.pieces.push({
          floor,
          bounds,
          height: (TUFT_MIN + this.random() ** 1.6 * (TUFT_MAX - TUFT_MIN)) * fall,
          kind: 'growth',
          tint: this.random(),
        });
      }
    }
  }

  /** Water, from a roof nobody has been up to. Flat, broad, and rare. */
  private stain(floor: Level, room: Rect, venue: Venue, density: number): void {
    for (let i = 0; i < STAIN_PER_ROOM; i += 1) {
      if (this.random() > density * 0.7) continue;
      const w = STAIN_MIN + this.random() * (STAIN_MAX - STAIN_MIN);
      const h = STAIN_MIN + this.random() * (STAIN_MAX - STAIN_MIN);
      const bounds = rect(
        room.x + this.random() * Math.max(room.w - w, 0),
        room.y + this.random() * Math.max(room.h - h, 0),
        w,
        h,
      );
      if (!this.clear(floor, bounds, venue)) continue;
      this.pieces.push({
        floor,
        bounds,
        height: STAIN_HIGH_MIN + this.random() * (STAIN_HIGH_MAX - STAIN_HIGH_MIN),
        kind: 'stain',
        tint: this.random(),
      });
    }
  }

  /**
   * Is this square metre of floor free?
   *
   * Decay never collides — it is dressing — but a tuft of grass growing up
   * through a staircase, a seat bank or the reception counter is worse than
   * no tuft at all, and a drift banked over a void is a drift hanging in a
   * stairwell. Both were in the first version of this.
   *
   * Centre-point only, on purpose. A full overlap test against 745 obstacles
   * for every one of several thousand candidates is the kind of thing that
   * turns a chapter load into a visible pause, and the pieces are under a
   * metre across: a tuft whose centre is clear is a tuft you believe.
   */
  private clear(floor: Level, bounds: Rect, venue: Venue): boolean {
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;

    for (const room of venue.rooms) {
      if (room.floor !== floor) continue;
      if (!rectContains(room.bounds, cx, cy)) continue;
      // A hole in the plate has no floor to gather anything.
      if (room.voids?.some((v) => rectContains(v, cx, cy))) return false;
    }

    for (const piece of venue.obstacles) {
      if (piece.floor !== floor) continue;
      if (rectContains(piece.bounds, cx, cy)) return false;
    }
    return true;
  }
}

/**
 * The same generator `Crowd` uses, and a separate copy on purpose: importing
 * it would make one file's seed depend on how many numbers the other one
 * happened to draw.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
