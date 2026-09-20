/**
 * The three chapters, in play order.
 *
 * Order is load-bearing. Chapter 1 is first because an empty building is the
 * best tutorial we will ever get — no crowd, no NPCs, nothing competing for
 * attention — and because it is the cheapest thing to build, so the first
 * playable milestone doubles as the engine test. The reveal then runs the
 * right way round: the player starts in the silence not knowing what this
 * place was, and the historical chapters answer it. Ending on the building at
 * capacity is the point.
 *
 * Tone rule for every chapter: melancholy, never accusatory. The building is
 * empty, not wrecked. We never explain why, and the game is not interested in
 * blame. This is both better art and the only version that plays well on a
 * keynote stage.
 */

import type { Chapter } from './Chapter';

/**
 * Every colour below was measured off the competition photographs in
 * `references/venue/photos/`, and each one carries the frame it came from.
 * SPEC.md section 8 is explicit that the palettes come from the photographs
 * rather than from taste, because "a judge who recognises the same corridor in
 * three different lights believes the place exists" — and that only works if
 * the lights are the building's own.
 *
 * These are MATERIAL colours, not lit ones. The renderer multiplies them by
 * `0.35 + lightLevel * 0.65`, so Chapter I's darkness comes from its light
 * level (0.18 → 47%) and not from a palette that has been pre-dimmed. Doing
 * both, which is what the invented palettes did, made Chapter I a black
 * rectangle you could not play.
 *
 * Measured surfaces, for anything added later:
 *
 *   corridor carpet, dark     #444c58   photo 54051896620
 *   concourse carpet, grey    #777773   photo 54051697728
 *   concrete + painted wall   #a7a7a1   photo 54051697728
 *   white wall, lit           #dbe1e4   photo 54051896620
 *   slatted warm wood         #744724   photo 54051914325
 *   auditorium floor          #1f2231   photo 54835146677
 *   hall floor under a crowd  #2a2e31   photo 54051774449
 */

export const CHAPTER_ONE: Chapter = {
  id: 'silence',
  numeral: 'I',
  title: 'The Silence',
  era: 'later',
  tagline: 'Something is still walking the building.',
  brief:
    'The hall is dark and the chairs are empty. You do not know where you are yet. ' +
    'Find a way up, and find the thing that still has power.',
  controlMode: 'direct',
  cast: ['voxxy'],
  crowdDensity: 0,
  lightLevel: 0.18,
  palette: {
    void: 0x06080a,
    floor: 0x374250, // the dark corridor carpet, with the warmth taken out
    floorLine: 0x44505f,
    wall: 0x8d99a8, // concrete and painted wall under nothing but daylight leak
    wallShade: 0x545f6d,
    // The auditorium seats, which are blue and stay blue in every era — the
    // building never reupholstered. Measured off the one photograph of a room
    // with the house lights down, then un-dimmed: `lightLevel` does the dark.
    seat: 0x3f5175,
    // The cloth over the speaker's table, the same conference blue as the
    // lectern beside it. Still draped, in a room nobody has spoken in for
    // years — which is the chapter in one object.
    desk: 0x3a4a6b,
    sign: 0xe4e9ec, // the letters on the keynote stage, still standing
    // Fourteen screens with nothing on them. Cold and slightly grey, because
    // the only thing lighting them is whatever daylight reaches this far in.
    screen: 0xaeb6bd,
    // Stands nobody struck, under a decade of dust.
    booth: 0x5c6470,
    // Nothing switched on behind it: from the street the front of a dead
    // building is the darkest thing on it, colder than the concrete around.
    glazing: 0x49596b,
    // The red LED step strips, measured at their brightest in the one
    // photograph of the auditorium with everything else switched off. It is
    // a hot crimson, not the brick orange this used to guess at — and SPEC
    // calls it the single strongest image available for this chapter.
    accent: 0xf24471,
    text: 0x9fa8b0,
  },
  startFloor: 0,
  objective: 'Find the power',
};

export const CHAPTER_TWO: Chapter = {
  id: 'javapolis',
  numeral: 'II',
  title: 'JavaPolis',
  era: 'the early years',
  tagline: 'Half a building, and more people than anyone expected.',
  brief:
    'A community event that outgrew its room. Two robots, half the floor in use, ' +
    'and a conference being held together by hand.',
  controlMode: 'switch',
  cast: ['voxxy', 'droid'],
  crowdDensity: 0.35,
  lightLevel: 0.62,
  palette: {
    void: 0x0a0806,
    floor: 0x6d6154, // an older, warmer carpet than the one there now
    floorLine: 0x7d7062,
    wall: 0xc4a878,
    // The slatted warm wood behind the registration desk. Putting it on the
    // shaded faces gives this era a timber feel the other two do not have,
    // from one measured colour rather than a texture.
    wallShade: 0x7a5231,
    // JavaPolis sat in the same seats — but this era is lit by tungsten and
    // shot on film, and a blue that reads cold in Chapter I reads WRONG here.
    // The hue is the era's light, which is the whole job of a palette.
    seat: 0x6e4b52,
    // A trestle and a green baize, before anyone thought to brand the table.
    desk: 0x5d5236,
    sign: 0xefe2cc,
    // Tungsten on the same cloth. The screens of this era were smaller and
    // greyer, and this is the one surface in the room that shows the light.
    screen: 0xcfc3ab,
    // Painted board and trestle, lit by the same tungsten as everything else.
    booth: 0xa07d4c,
    // Tungsten behind it, and glass still reads darker than the frame it
    // sits in — which is the whole cue that it IS glass and not more wall.
    glazing: 0x5c4f38,
    accent: 0xeb9760, // the registration lamp — tungsten, and the era's whole mood
    text: 0xf2e8d8,
  },
  startFloor: 1,
  objective: 'Keep every room running',
};

export const CHAPTER_THREE: Chapter = {
  id: 'capacity',
  numeral: 'III',
  title: 'At Capacity',
  era: 'the full house',
  tagline: 'Too much building to walk yourself.',
  brief:
    'Every room is full. You cannot hand-drive three robots through this many people, ' +
    'so you stop trying. Give them intent. They have their own mass.',
  controlMode: 'direct-order',
  cast: ['voxxy', 'droid', 'biggy'],
  crowdDensity: 1,
  lightLevel: 0.85,
  palette: {
    void: 0x0a0c0e,
    // Warm, because the light is. Chapters I and III are the same rooms and
    // must not read as the same grey at two brightnesses — the cove lighting
    // photographed at capacity throws a peach cast over the white canopy, and
    // `lightLevel` is only a multiplier, so the palette has to carry the hue.
    floor: 0x33302c, // the hall floor, photographed under a full house
    floorLine: 0x433d36,
    wall: 0xbdb5a8, // the white canopy, warm under the cove
    wallShade: 0x77706a,
    // The same blue seats, under the peach cove light of a full house.
    seat: 0x4a5573,
    desk: 0x44547a, // conference blue, catching the warm light off the screen
    sign: 0xf2f2ee, // the letters, lit from the screen behind them
    // The brightest thing in the building at capacity: every room is running.
    screen: 0xe8e4da,
    // A full trade floor: modular shell scheme, and deliberately COOLER than
    // the warm white canopy it stands under. Picked at the canopy's own
    // colour first, and twenty-seven stands then read as twenty-seven lumps
    // of the building — the hall looked demolished rather than fitted out.
    booth: 0x99a1a8,
    // A full house behind it, so this is the one era where the glass is
    // lighter than the floor it shows. Still well under the warm canopy it
    // is framed by: a cool grey against a warm white is unmistakably glass.
    glazing: 0x6c757e,
    // The hall's warm cove lighting at capacity. SPEC calls this era "Devoxx
    // orange"; this is that orange as the building actually throws it, which
    // is softer and peachier than a brand hex.
    accent: 0xc8895f,
    text: 0xf2f5f7,
  },
  startFloor: 0,
  objective: 'Get everyone to the keynote',
};

export const CHAPTERS: Chapter[] = [CHAPTER_ONE, CHAPTER_TWO, CHAPTER_THREE];

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}
