/**
 * Keyboard to DriveInput.
 *
 * The mapping is SCREEN-relative, not world-relative: W moves the robot up the
 * screen, which in a 2:1 isometric projection means north-west in world space.
 * Anyone who has played an isometric game expects this, and anyone who has not
 * works it out in about two seconds. World-relative controls in an isometric
 * view feel broken to every player who tries them, so do not "fix" this.
 *
 * Shift is the brake, and it is a real brake — it applies the robot's full
 * braking force rather than simply cutting the throttle. Releasing the stick
 * lets the robot coast on its own momentum, which is the whole point of the
 * heavy cast.
 */

import Phaser from 'phaser';
import type { DriveInput } from '@/core/Body';

const INV_SQRT2 = Math.SQRT1_2;

export class KeyboardController {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input unavailable — is the canvas focused?');
    }

    this.keys = keyboard.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SHIFT,SPACE,TAB',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  /** Read the current frame's intent. Safe to call every frame. */
  read(out: DriveInput): DriveInput {
    const up = this.keys.W.isDown || this.keys.UP.isDown;
    const down = this.keys.S.isDown || this.keys.DOWN.isDown;
    const left = this.keys.A.isDown || this.keys.LEFT.isDown;
    const right = this.keys.D.isDown || this.keys.RIGHT.isDown;

    // Screen axes, then rotate into the isometric world basis.
    const screenX = (right ? 1 : 0) - (left ? 1 : 0);
    const screenY = (down ? 1 : 0) - (up ? 1 : 0);

    if (screenX === 0 && screenY === 0) {
      out.dirX = 0;
      out.dirY = 0;
      out.throttle = 0;
    } else {
      // Derived from Iso.project, and it changes if that does. The viewer is
      // south-west of the building, so:
      //   screen right => world (+x, -y)   south-east
      //   screen down  => world (-x, -y)   south-west
      // W therefore walks you north-east, up the screen and up the plan.
      const wx = (screenX - screenY) * INV_SQRT2;
      const wy = -(screenX + screenY) * INV_SQRT2;
      const mag = Math.hypot(wx, wy);
      out.dirX = wx / mag;
      out.dirY = wy / mag;
      out.throttle = 1;
    }

    out.braking = this.keys.SHIFT.isDown;
    return out;
  }

  /** True on the frame the key went down. Used for one-shot actions. */
  justPressed(key: 'SPACE' | 'TAB'): boolean {
    return Phaser.Input.Keyboard.JustDown(this.keys[key]);
  }
}
