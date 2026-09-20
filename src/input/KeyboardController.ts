/**
 * Keyboard to DriveInput.
 *
 * The mapping is SCREEN-relative, not world-relative: W moves the robot up the
 * screen, which in an isometric view means north-east in world space. Anyone
 * who has played an isometric game expects this, and anyone who has not works
 * it out in about two seconds. World-relative controls in an isometric view
 * feel broken to every player who tries them, so do not "fix" this.
 *
 * Shift is the brake, and it is a real brake — it applies the robot's full
 * braking force rather than simply cutting the throttle. Releasing the stick
 * lets the robot coast on its own momentum, which is the whole point of the
 * heavy cast.
 */

import { ISO_AZIMUTH } from '@/core/Iso';
import type { DriveInput } from '@/core/Body';
import type { Keyboard } from './Keyboard';

/**
 * Screen right and screen up, as directions on the floor.
 *
 * Derived from the camera's azimuth rather than written out, because rule 4 is
 * that the camera and this file must agree about which way the building faces
 * and a hand-copied pair of 0.707s is exactly the sort of thing that agrees
 * until someone moves the camera.
 */
const RIGHT_X = Math.sin(ISO_AZIMUTH);
const RIGHT_Y = -Math.cos(ISO_AZIMUTH);
const UP_X = Math.cos(ISO_AZIMUTH);
const UP_Y = Math.sin(ISO_AZIMUTH);

export class KeyboardController {
  constructor(private readonly keys: Keyboard) {}

  /** Read the current frame's intent. Safe to call every frame. */
  read(out: DriveInput): DriveInput {
    const up = this.keys.isDown('KeyW', 'ArrowUp');
    const down = this.keys.isDown('KeyS', 'ArrowDown');
    const left = this.keys.isDown('KeyA', 'ArrowLeft');
    const right = this.keys.isDown('KeyD', 'ArrowRight');

    // Screen axes, then rotate into the isometric world basis.
    const screenX = (right ? 1 : 0) - (left ? 1 : 0);
    const screenY = (down ? 1 : 0) - (up ? 1 : 0);

    if (screenX === 0 && screenY === 0) {
      out.dirX = 0;
      out.dirY = 0;
      out.throttle = 0;
    } else {
      // Screen y grows downward, hence the negation on the up term. At the
      // camera's 45 degrees the viewer is south-west of the building, so:
      //   screen right => world (+x, -y)   south-east
      //   screen down  => world (-x, -y)   south-west
      // W therefore walks you north-east, up the screen and up the plan.
      const wx = screenX * RIGHT_X - screenY * UP_X;
      const wy = screenX * RIGHT_Y - screenY * UP_Y;
      const mag = Math.hypot(wx, wy);
      out.dirX = wx / mag;
      out.dirY = wy / mag;
      out.throttle = 1;
    }

    out.braking = this.keys.isDown('ShiftLeft', 'ShiftRight');
    return out;
  }
}
