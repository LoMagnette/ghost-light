/**
 * The view: where the camera stands and how big a metre is on screen.
 *
 * World space is metres: +x east, +y north along the floor, +z up. That is
 * also the scene's coordinate system — the renderer builds the building at
 * those exact coordinates and points a camera at it, so there is no longer a
 * projection function in the middle that the simulation and the drawing could
 * disagree about.
 *
 * What survives from the 2D renderer is the LOOK: an orthographic camera at a
 * fixed 45 degree azimuth from the south-west and a fixed elevation, which is
 * the classic isometric view. The two constants below are the whole of it, and
 * `render/IsoCamera.ts` derives the camera from them and nothing else.
 *
 * Nothing in `src/core` outside this file reads these — they describe how the
 * game is SHOWN. Keep it that way: the moment gameplay code reasons in pixels,
 * the physics stops being honest and the venue stops being to scale.
 */

/** Screen pixels per world metre along the isometric x axis. */
export const PPM = 28;

/**
 * Vertical squash of the floor plane. 0.5 gives the standard 2:1 look.
 *
 * In the 2D renderer this was a free parameter: the floor was squashed by it
 * and heights were drawn unsquashed, which is 2:1 *dimetric* and is not the
 * projection of any real camera. Here it is the SINE OF THE CAMERA'S
 * ELEVATION, so 0.5 means the camera looks down at exactly 30 degrees and the
 * floor grid comes out at the same 2:1 it always did.
 *
 * The one visible consequence of making the projection honest: a metre of
 * height now draws 1.22x taller than the 2D renderer drew it, because that is
 * what a 30 degree camera actually sees. The floor plan — every surveyed
 * coordinate in `venue/kinepolis.ts` — projects pixel for pixel as before.
 */
export const ISO_SQUASH = 0.5;

/** Camera elevation above the floor plane, radians. */
export const ISO_ELEVATION = Math.asin(ISO_SQUASH);

/**
 * Camera azimuth, radians, measured as a compass bearing of the direction the
 * camera LOOKS. The viewer stands to the south-west and looks north-east.
 *
 * This is the one number that decides which two faces of every box are in
 * sight (south and west), which way W walks on the keyboard, and whether the
 * building reads the same way round as the floor plans it was surveyed from.
 * Change it and `input/KeyboardController.ts` changes with it.
 */
export const ISO_AZIMUTH = Math.PI / 4;

export interface ScreenPoint {
  sx: number;
  sy: number;
}

/**
 * Project a world-space point (metres) to screen-space pixels.
 *
 * The renderer no longer calls this — the camera does the projecting now. It
 * is kept because it is the SPECIFICATION the camera is checked against: the
 * floor terms here and the camera built from the constants above must agree,
 * and `render/IsoCamera.ts` asserts exactly that. It is also what
 * `npm run venue -- --svg` draws the plans with.
 *
 * The `(x + y)` term is NEGATED, and that matters. Screen y grows downward, so
 * without the negation +y — north — lands at the BOTTOM of the screen and the
 * building renders 180 degrees from every drawing of it.
 */
export function project(x: number, y: number, z = 0): ScreenPoint {
  return {
    sx: (x - y) * PPM,
    sy: -(x + y) * PPM * ISO_SQUASH - z * PPM,
  };
}
