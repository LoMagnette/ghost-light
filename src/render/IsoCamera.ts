/**
 * The isometric camera.
 *
 * Orthographic, fixed angle, and derived entirely from the two constants in
 * `core/Iso.ts`. This is what replaced the 2D projection function: the
 * building is built at its surveyed metre coordinates and this looks at it,
 * so the simulation and the picture can no longer disagree about where a
 * thing is — there is only one set of coordinates now.
 *
 * Keeping it orthographic rather than perspective is not nostalgia. The venue
 * was surveyed off floor plans with no scale bar, and an orthographic view is
 * the only one in which a metre is a metre everywhere on screen — which is
 * what lets a judge hold the game up against the plan and recognise the
 * building. It is also what makes the 2:1 floor grid come out as a grid.
 */

import { OrthographicCamera, Vector3 } from 'three';
import { ISO_AZIMUTH, ISO_ELEVATION, PPM, project } from '@/core/Iso';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@/config';

/**
 * Screen pixels per world metre along the CAMERA'S OWN axes.
 *
 * Not the same number as PPM. PPM is measured along the screen's horizontal,
 * and one metre east travels only cos(45 degrees) of a metre along that
 * horizontal, so the camera has to be scaled up by the reciprocal to put a
 * metre east 28 px across. The azimuth is fixed at 45 degrees, hence the
 * literal; change ISO_AZIMUTH and this becomes PPM / sin(ISO_AZIMUTH).
 */
const PIXELS_PER_METRE_ON_SENSOR = PPM * Math.SQRT2;

/**
 * How far back the camera stands, metres.
 *
 * Irrelevant to the picture — an orthographic camera sees the same thing from
 * anywhere along its axis — and relevant only to the depth range. The building
 * is 150 m long and 6 m tall, so this has to clear the far corner of it from
 * every camera position the chapter can reach.
 */
const CAMERA_DISTANCE = 400;

/** Unit vector from what the camera looks at to where the camera stands. */
export const CAMERA_OFFSET = new Vector3(
  -Math.cos(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION),
  -Math.sin(ISO_AZIMUTH) * Math.cos(ISO_ELEVATION),
  Math.sin(ISO_ELEVATION),
);

/**
 * How much building fits across the screen, metres. About 32 — a third of the
 * exhibition hall.
 *
 * Camera shake is specified as a fraction of the viewport, which is how Phaser
 * specified it, so the tuning constants in config.ts did not have to move when
 * the renderer did.
 */
export const VIEW_WIDTH_METRES = VIEW_WIDTH / PIXELS_PER_METRE_ON_SENSOR;

export function createIsoCamera(): OrthographicCamera {
  const halfWidth = VIEW_WIDTH_METRES / 2;
  const halfHeight = VIEW_HEIGHT / 2 / PIXELS_PER_METRE_ON_SENSOR;

  const camera = new OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    1,
    CAMERA_DISTANCE * 2,
  );

  // The scene is z-up because the simulation is z-up. three.js defaults to
  // y-up, and leaving it that way would mean every piece of venue geometry
  // getting swizzled on the way in — sixteen hundred lines of surveyed
  // building silently transposed. Move the camera instead.
  camera.up.set(0, 0, 1);
  lookAtWorld(camera, 0, 0, 0);
  return camera;
}

/** Point the camera at a world position, keeping its fixed angle. */
export function lookAtWorld(camera: OrthographicCamera, x: number, y: number, z: number): void {
  camera.position.set(
    x + CAMERA_OFFSET.x * CAMERA_DISTANCE,
    y + CAMERA_OFFSET.y * CAMERA_DISTANCE,
    z + CAMERA_OFFSET.z * CAMERA_DISTANCE,
  );
  camera.lookAt(x, y, z);
}

/**
 * Check the camera against `Iso.project`, the projection the game was drawn
 * with for its first week.
 *
 * Rule 4 of CLAUDE.md is that three things encode which way the building faces
 * and all three must agree; flip one alone and the building turns inside out
 * or renders 180 degrees from every drawing of it. Two of those three are now
 * this file and `input/KeyboardController.ts`, and this is the assertion that
 * the camera is still the view the venue was surveyed for.
 *
 * Only the FLOOR terms are compared. Height is expected to differ by
 * 1/cos(elevation): the old renderer drew heights unsquashed, which is 2:1
 * dimetric and is not the projection of any real camera. See Iso.ISO_SQUASH.
 *
 * Dev only. It costs a handful of matrix multiplies at boot and it has caught
 * the mirrored building once already.
 */
export function assertMatchesProjection(camera: OrthographicCamera): void {
  lookAtWorld(camera, 0, 0, 0);
  camera.updateMatrixWorld(true);

  const probes = [
    [1, 0],
    [0, 1],
    [10, -7],
    [-23.5, -37.4], // the hall's south-west corner, as surveyed
  ];

  for (const [x, y] of probes) {
    const point = new Vector3(x, y, 0).project(camera);
    const sx = (point.x * VIEW_WIDTH) / 2;
    const sy = (-point.y * VIEW_HEIGHT) / 2;
    const want = project(x, y, 0);
    if (Math.abs(sx - want.sx) > 1e-6 || Math.abs(sy - want.sy) > 1e-6) {
      throw new Error(
        `Iso camera disagrees with Iso.project at (${x}, ${y}): ` +
          `camera (${sx.toFixed(4)}, ${sy.toFixed(4)}) vs ` +
          `projection (${want.sx.toFixed(4)}, ${want.sy.toFixed(4)})`,
      );
    }
  }
}
