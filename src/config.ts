/** Build-wide constants. Gameplay tuning lives in core/RobotSpec.ts, not here. */

export const GAME_TITLE = 'Ghost Light';

export const GAME_SUBTITLE = 'Three robots. One cinema. Three eras.';

/** Set true to draw collision shapes and a physics readout. Toggle with F1. */
export const DEBUG_DEFAULT = false;

/** Camera follow smoothing, per second. Lower is lazier. */
export const CAMERA_LERP = 6;

/**
 * Hardest the camera will ever look ahead, in metres.
 *
 * The lead itself is the robot's own stopping distance (see ChapterScene), so
 * this is only a guard: it stops a future fast robot, or a bug in the braking
 * numbers, from throwing the view off the robot entirely. Biggy's stopping
 * distance is 3.8 m, so in practice this never binds.
 */
export const CAMERA_LEAD_CAP = 5.0;

/**
 * Metres the camera looks UP the elevation while the cast is outside.
 *
 * Inside, a robot is the tallest thing that matters and the view is framed
 * on it. Outside, the thing worth looking at is ten metres of building, and
 * a camera centred on a 1.15 m machine puts all of it off the top of the
 * frame — you walk out of the doors and can see the pavement and nothing
 * else. Raising the look-at point drops the scene down the screen and the
 * elevation into it.
 *
 * Eased in by the usual camera lerp, so stepping out is a pan rather than a
 * cut.
 */
export const CAMERA_OUTSIDE_LIFT = 5.5;

/**
 * Momentum, kg·m/s, that saturates the impact and footfall feedback.
 *
 * These are PRESENTATION constants, not simulation ones — nothing here is ever
 * read by src/core, and changing them cannot alter where a robot ends up. They
 * live here with the camera for the same reason: they describe how the game is
 * shown, not how it behaves. Robot tuning belongs in core/RobotSpec.ts and
 * nowhere else.
 *
 * Both are scaled against Biggy, which peaks at roughly 1370 kg·m/s: a hit at
 * full tilt maxes the shake out, and Biggy's footfalls read as heavy well
 * before it is at speed while Voxxy's stay almost imperceptible.
 */
export const IMPACT_REFERENCE_MOMENTUM = 1400;
export const FOOTFALL_REFERENCE_MOMENTUM = 900;

/** Design resolution. The canvas scales to fit; the world does not reflow. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
