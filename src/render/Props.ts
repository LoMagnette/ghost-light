/**
 * The objects the jobs are about.
 *
 * A marker says whose job something is; this says what the job IS. Each
 * prop is a handful of boxes in the building's own blockout language, built
 * in its own frame — x out of its front, z up from the floor it stands on —
 * and turned to face wherever the objective says it faces.
 *
 * A prop is at most three things:
 *
 *   - the FIXTURE, which stays put: the cabinet, the table, the frame;
 *   - the ITEM, which a haul carries off: the adapter, the chairs, the keg;
 *   - a LAMP, one unlit material that says how it is: red and blinking while
 *     broken, green once fixed, dark once the room is lost.
 *
 * Lamps are unlit on purpose, for the reason the markers are: Chapter I is
 * played at a light level of 0.18, and a distribution board you cannot see
 * is not a thing to find.
 *
 * Nothing here knows about activities. `ChapterScreen` says what each prop
 * is doing and `BlockoutRenderer` puts it there.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Object3D,
  TorusGeometry,
} from 'three';
import type { PropKind } from '@/core/Activity';

/** How a fix is, as far as its lamp is concerned. */
export type PropCondition = 'working' | 'broken' | 'dead';

export interface PropView {
  kind: PropKind;
  /** Stays where the prop stands. Empty for a haul that has no stand. */
  fixture: Group;
  /** What a haul carries off. Absent on a fix. */
  item?: Group;
  /** Rests this far above the fixture's floor while it is on its stand. */
  itemTop: number;
  /** Items that share a stand sit this far apart along it. */
  slotSpacing: number;
  /** Depth of the item, front to back, so a carrier holds it clear of itself. */
  itemDepth: number;
  lamp?: MeshBasicMaterial;
  /** The part that moves when it is fixed: the shutter's panel, the plug. */
  moving?: Object3D;
  /** 0 broken, 1 working; eased towards the condition every frame. */
  fixed: number;
  seed: number;
}

const LAMP = {
  working: 0x5dff8a,
  broken: 0xff3b2a,
  dead: 0x202326,
  /** The projector's lens, which is white when it is doing its job. */
  lens: 0xfff4d6,
  /** A shutter's beacon is a warning, not a fault. */
  amber: 0xffb020,
};

/** The steel of cabinets, frames and posts. */
const STEEL = 0x6f767d;
const DARK = 0x1f2226;
const PALE = 0xd3d6da;
const TIMBER = 0x7a5a3c;
/** Devoxx orange, for the one thing in here that is the conference's own. */
const ORANGE = 0xf08a24;

function box(
  colour: number,
  w: number,
  d: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
  material?: MeshLambertMaterial | MeshBasicMaterial,
): Mesh {
  const mesh = new Mesh(new BoxGeometry(w, d, h), material ?? new MeshLambertMaterial({ color: colour }));
  mesh.position.set(x, y, z + h / 2);
  return mesh;
}

/** A cylinder standing up the z axis, like everything else in this world. */
function drum(
  colour: number,
  r: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
  material?: MeshLambertMaterial | MeshBasicMaterial,
): Mesh {
  const mesh = new Mesh(new CylinderGeometry(r, r, h, 18), material ?? new MeshLambertMaterial({ color: colour }));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z + h / 2);
  return mesh;
}

function lampMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: LAMP.broken });
}

export function buildProp(kind: PropKind, seed: number): PropView {
  const fixture = new Group();
  const view: PropView = { kind, fixture, itemTop: 0, slotSpacing: 0.6, itemDepth: 0.3, fixed: 0, seed };

  switch (kind) {
    /*
     * A distribution board, the thing Chapter I is looking for: the kind of
     * power cabinet an event hall has standing on its floor, grey, on a
     * plinth, with a yellow hazard plate and the lamp on top that goes green
     * when Voxxy throws the switch. Free-standing rather than on a wall,
     * because the camera is in the south-west and a board on a west or south
     * wall would be behind the wall it hangs on.
     */
    case 'board': {
      view.lamp = lampMaterial();
      fixture.add(
        box(DARK, 0.5, 0.86, 0.1),
        box(STEEL, 0.46, 0.8, 1.3, 0, 0, 0.1),
        box(DARK, 0.02, 0.36, 1.18, 0.235, -0.19, 0.16),
        box(DARK, 0.02, 0.36, 1.18, 0.235, 0.19, 0.16),
        box(0xe8c21f, 0.02, 0.24, 0.18, 0.25, -0.19, 1.05),
        box(0, 0.2, 0.2, 0.1, 0, 0, 1.4, view.lamp),
        // The feed, a fat cable out along the floor.
        box(DARK, 0.9, 0.1, 0.08, -0.6, 0.25, 0),
      );
      break;
    }

    /** Room 8's amplifier rack: a black nineteen-inch cabinet and its LEDs. */
    case 'rack': {
      view.lamp = lampMaterial();
      fixture.add(box(DARK, 0.6, 0.6, 1.3));
      for (let i = 0; i < 4; i += 1) {
        const z = 0.18 + i * 0.27;
        fixture.add(box(0x3a3f45, 0.02, 0.52, 0.2, 0.3, 0, z));
        fixture.add(box(0, 0.02, 0.05, 0.05, 0.315, 0.2, z + 0.1, view.lamp));
      }
      break;
    }

    /*
     * The projector, up on its bracket on the back wall. Its lens is the
     * lamp: white while the room has a picture, blinking red while it has
     * none. Two metres up, which is the whole of why it is Droid's.
     */
    case 'projector': {
      view.lamp = lampMaterial();
      // The bracket comes down from the ceiling void to the projector.
      fixture.add(box(DARK, 0.06, 0.06, 0.55, -0.05, 0, 0.26));
      fixture.add(box(PALE, 0.42, 0.34, 0.2, 0.02, 0, 0.06));
      fixture.add(box(0x9aa0a6, 0.02, 0.3, 0.03, 0.02, 0, 0.26));
      const lens = drum(0, 0.075, 0.06, 0, 0, 0, view.lamp);
      // Out of the front, along x.
      lens.rotation.set(0, 0, Math.PI / 2);
      lens.position.set(0.25, 0.08, 0.16);
      fixture.add(lens);
      break;
    }

    /*
     * A mic cable that has come out behind the lectern: a coil on the floor,
     * the socket in the screen wall, and the plug lying loose between them.
     * Fixed, the plug is back in the socket.
     */
    case 'cable': {
      view.lamp = lampMaterial();
      const coil = new Mesh(new TorusGeometry(0.16, 0.025, 6, 18), new MeshLambertMaterial({ color: DARK }));
      coil.position.set(0.22, 0, 0.03);
      fixture.add(coil);
      fixture.add(box(PALE, 0.04, 0.14, 0.14, -0.02, 0, 0.25));
      fixture.add(box(0, 0.02, 0.04, 0.04, 0.01, 0, 0.36, view.lamp));
      const plug = box(0x2e3136, 0.14, 0.06, 0.06);
      view.moving = plug;
      fixture.add(plug);
      break;
    }

    /*
     * The organisers' desk and the adapters on it. The desk stays; each
     * adapter is a white brick with its cable, and it is the one that goes.
     */
    case 'adapter': {
      fixture.add(box(TIMBER, 0.7, 1.4, 0.05, 0, 0, 0.7));
      for (const y of [-0.62, 0.62]) fixture.add(box(DARK, 0.6, 0.05, 0.7, 0, y, 0));
      view.itemTop = 0.75;
      view.slotSpacing = 0.36;
      view.itemDepth = 0.24;
      const item = new Group();
      item.add(box(0xf2f2ef, 0.24, 0.16, 0.07), box(DARK, 0.2, 0.03, 0.03, 0.04, 0.09, 0));
      view.item = item;
      break;
    }

    /** A stack of folding chairs, for a room with more people than seats. */
    case 'chairs': {
      const item = new Group();
      for (let i = 0; i < 6; i += 1) {
        const z = i * 0.11;
        item.add(box(0x2d4f82, 0.46, 0.46, 0.03, 0.03, 0, z + 0.06));
        item.add(box(STEEL, 0.03, 0.46, 0.34, -0.23, 0, z + 0.06));
        item.add(box(STEEL, 0.46, 0.03, 0.06, 0.03, 0.22, z), box(STEEL, 0.46, 0.03, 0.06, 0.03, -0.22, z));
      }
      view.item = item;
      view.itemDepth = 0.5;
      view.slotSpacing = 0.62;
      break;
    }

    /** A counter in the foyer and a tray of coffee on it. */
    case 'coffee': {
      fixture.add(box(TIMBER, 0.6, 1.3, 0.92), box(0x5c4330, 0.64, 1.34, 0.04, 0, 0, 0.92));
      view.itemTop = 0.96;
      view.itemDepth = 0.34;
      const item = new Group();
      item.add(box(0x3b3e44, 0.34, 0.44, 0.02));
      for (const [x, y] of [
        [-0.08, -0.12],
        [0.08, -0.12],
        [-0.08, 0.12],
        [0.08, 0.12],
      ]) {
        item.add(drum(0xf4efe6, 0.045, 0.1, x, y, 0.02), drum(0x3a2618, 0.04, 0.005, x, y, 0.12));
      }
      view.item = item;
      break;
    }

    /** Two hundred kilos of steel keg. Biggy's by looking at it. */
    case 'keg': {
      const item = new Group();
      item.add(drum(0xb4bbc1, 0.27, 0.62), drum(0x8a9197, 0.285, 0.05, 0, 0, 0.06));
      item.add(drum(0x8a9197, 0.285, 0.05, 0, 0, 0.51), drum(DARK, 0.06, 0.06, 0, 0, 0.62));
      item.add(box(0x2a6fd6, 0.02, 0.18, 0.12, 0.27, 0, 0.3));
      view.item = item;
      view.itemDepth = 0.56;
      break;
    }

    /*
     * The loading-bay shutter, in the hall's east wall. The panel is down and
     * jammed until something heavy enough hits it; then it rolls up into its
     * box and stays there.
     */
    case 'shutter': {
      view.lamp = lampMaterial();
      const width = 3.0;
      const height = 2.55;
      fixture.add(box(STEEL, 0.14, 0.12, height, 0, width / 2, 0), box(STEEL, 0.14, 0.12, height, 0, -width / 2, 0));
      fixture.add(box(0x555b61, 0.3, width + 0.12, 0.25, 0, 0, height - 0.25));
      fixture.add(box(0, 0.06, 0.16, 0.1, 0.16, width / 2 - 0.2, height - 0.2, view.lamp));
      // The panel hangs from the top of the opening, so it can be rolled up
      // by scaling it towards its roll.
      const panel = new Group();
      panel.position.z = height - 0.25;
      const slats = 9;
      const slat = (height - 0.25) / slats;
      for (let i = 0; i < slats; i += 1) {
        panel.add(box(i % 2 ? 0x9da4aa : 0x8a9197, 0.05, width - 0.1, slat, 0, 0, -(i + 1) * slat));
      }
      view.moving = panel;
      fixture.add(panel);
      break;
    }

    /** The audience mic at the foot of the stage, on a tall stand. */
    case 'mic': {
      view.lamp = lampMaterial();
      fixture.add(drum(DARK, 0.18, 0.03), drum(DARK, 0.02, 1.86, 0, 0, 0.03));
      fixture.add(box(DARK, 0.16, 0.05, 0.05, 0.07, 0, 1.86), box(0x3a3f45, 0.07, 0.07, 0.12, 0.15, 0, 1.82));
      fixture.add(box(0, 0.02, 0.05, 0.02, 0.19, 0, 1.93, view.lamp));
      break;
    }

    /** A steward's badge scanner on its post; the screen goes green. */
    case 'scanner': {
      view.lamp = lampMaterial();
      fixture.add(drum(DARK, 0.16, 0.03), drum(STEEL, 0.035, 1.0, 0, 0, 0.03));
      const head = box(0x2b2e33, 0.2, 0.28, 0.14, 0, 0, 1.0);
      head.rotation.y = -0.4;
      fixture.add(head);
      const screen = box(0, 0.02, 0.2, 0.08, 0.1, 0, 1.06, view.lamp);
      screen.rotation.y = -0.4;
      fixture.add(screen);
      break;
    }

    /** Folded polos on the counter, in the conference's orange. */
    case 'polo': {
      for (let i = 0; i < 4; i += 1) {
        fixture.add(box(i % 2 ? ORANGE : 0xe07a18, 0.32, 0.28, 0.05, 0, -0.18, i * 0.05));
        fixture.add(box(i % 2 ? 0xe07a18 : ORANGE, 0.32, 0.28, 0.05, 0, 0.18, i * 0.05));
      }
      break;
    }
  }

  return view;
}

/**
 * Show a prop's condition, eased: a shutter rolls up rather than vanishing.
 * `t` is the renderer's clock, for the blink.
 */
export function showCondition(view: PropView, condition: PropCondition, t: number, dt: number): void {
  const target = condition === 'working' ? 1 : 0;
  view.fixed += (target - view.fixed) * Math.min(1, dt * 3);
  if (Math.abs(view.fixed - target) < 0.002) view.fixed = target;

  if (view.lamp) {
    // Twice a second, each on its own phase, so a floor of them does not
    // blink in step.
    const on = Math.sin((t + view.seed) * Math.PI * 4) > -0.2;
    const colour =
      condition === 'dead'
        ? LAMP.dead
        : condition === 'working'
          ? view.kind === 'projector'
            ? LAMP.lens
            : LAMP.working
          : !on
            ? LAMP.dead
            : view.kind === 'shutter'
              ? LAMP.amber
              : LAMP.broken;
    view.lamp.color.setHex(colour);
  }

  const k = view.fixed;
  if (view.kind === 'shutter' && view.moving) {
    view.moving.scale.z = 1 - 0.93 * k;
  }
  if (view.kind === 'cable' && view.moving) {
    // From loose on the floor beside the coil to home in the socket.
    view.moving.position.set(0.42 - 0.34 * k, 0.12 - 0.12 * k, 0.03 + 0.19 * k);
    view.moving.rotation.z = 0.7 * (1 - k);
  }
}

export function disposeProp(view: PropView): void {
  for (const root of [view.fixture, view.item]) {
    root?.removeFromParent();
    root?.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.geometry.dispose();
      (o.material as MeshLambertMaterial).dispose();
    });
  }
}
