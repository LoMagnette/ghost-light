/** Build-wide constants. Gameplay tuning lives in core/RobotSpec.ts, not here. */

export const GAME_TITLE = 'The Silence of Hall 8';

/** Working title only — change in one place when the real title lands. */
export const GAME_SUBTITLE = 'Three robots. One cinema. Three eras.';

/** Set true to draw collision shapes and a physics readout. Toggle with F1. */
export const DEBUG_DEFAULT = false;

/** Camera follow smoothing, per second. Lower is lazier. */
export const CAMERA_LERP = 6;

/** Design resolution. The canvas scales to fit; the world does not reflow. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
