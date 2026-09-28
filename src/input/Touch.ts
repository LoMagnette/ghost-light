/**
 * Touch controls, for playing on a phone.
 *
 * Nothing here drives a robot directly. The stick writes `Keyboard.stick`
 * and every button presses or holds a key code, so a chapter answers a thumb
 * exactly the way it answers WASD, SHIFT and E — one set of bindings, and no
 * second input path to keep in step with it.
 *
 * Laid out in real screen pixels, OUTSIDE the scaled stage. The game frame
 * is 1280 × 720 shrunk to fit, which on a phone is about half size, and a
 * button half the size of a thumb is a button nobody can hit. So the
 * controls sit in a fixed layer of their own over the whole window, clear of
 * the notch (`env(safe-area-inset-*)`).
 *
 * The stick floats: it appears wherever the left thumb lands, in the left
 * part of the screen, and follows from there. A fixed stick is always
 * somewhere a hand is not.
 */

import type { Keyboard } from './Keyboard';

/** A phone or a tablet: a coarse pointer, or `?touch` to look at it on a desktop. */
export function isTouch(): boolean {
  if (new URLSearchParams(window.location.search).has('touch')) return true;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/** How far the stick's knob travels from where the thumb landed, CSS pixels. */
const REACH = 56;

/** What a chapter uses, so only its buttons are shown. */
export interface TouchLayout {
  /** TAB and SPACE: more than one robot, so switching and dropping. */
  crew: boolean;
}

interface Button {
  label: string;
  code: string;
  /** Held while touched, like the brake, rather than pressed once. */
  hold?: boolean;
  size: number;
  /** Only when the chapter has a crew. */
  crew?: boolean;
}

/** Bottom right, under the right thumb: the ones used while driving. */
const ACTIONS: Button[] = [
  { label: 'TALK', code: 'KeyE', size: 78 },
  { label: 'BRAKE', code: 'ShiftLeft', hold: true, size: 64 },
  { label: 'DROP', code: 'Space', size: 56, crew: true },
  { label: 'ROBOT', code: 'Tab', size: 56, crew: true },
];

/** Top middle, small: the ones used between attempts. */
const SYSTEM: Button[] = [
  { label: 'RESET', code: 'KeyR', size: 0 },
  { label: 'SOUND', code: 'KeyM', size: 0 },
  { label: 'MENU', code: 'Escape', size: 0 },
];

export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly crewOnly: HTMLElement[] = [];
  private readonly driving: HTMLElement[] = [];
  private talking = false;
  private stickId: number | undefined;
  private originX = 0;
  private originY = 0;

  constructor(
    private readonly keys: Keyboard,
    private readonly toggleSound: () => void,
  ) {
    this.root = div({
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '20',
      display: 'none',
      touchAction: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
    });

    // The stick's zone: the left of the screen, below the heading. Taps on
    // the rest of the screen still reach the game, the dialogue box included.
    const zone = div({
      position: 'absolute',
      left: '0',
      top: '18%',
      bottom: '0',
      width: '42%',
      pointerEvents: 'auto',
      touchAction: 'none',
    });
    this.base = div({
      position: 'absolute',
      width: `${REACH * 2}px`,
      height: `${REACH * 2}px`,
      marginLeft: `${-REACH}px`,
      marginTop: `${-REACH}px`,
      borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.28)',
      background: 'rgba(255,255,255,0.06)',
      display: 'none',
      pointerEvents: 'none',
    });
    this.knob = div({
      position: 'absolute',
      left: `${REACH - 26}px`,
      top: `${REACH - 26}px`,
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.32)',
      pointerEvents: 'none',
    });
    this.base.append(this.knob);
    zone.append(this.base);
    zone.addEventListener('pointerdown', this.onStickDown);
    zone.addEventListener('pointermove', this.onStickMove);
    zone.addEventListener('pointerup', this.onStickUp);
    zone.addEventListener('pointercancel', this.onStickUp);

    // Right thumb: the big one nearest the corner, the rest in an arc.
    const actions = div({
      position: 'absolute',
      right: 'calc(18px + env(safe-area-inset-right))',
      bottom: 'calc(18px + env(safe-area-inset-bottom))',
      display: 'grid',
      gridTemplateColumns: 'auto auto',
      gridTemplateRows: 'auto auto',
      gap: '12px',
      alignItems: 'end',
      justifyItems: 'end',
      pointerEvents: 'none',
    });
    const [talk, brake, drop, robot] = ACTIONS.map((b) => this.round(b));
    // Grid, read left to right: ROBOT DROP / BRAKE TALK.
    actions.append(robot, drop, brake, talk);

    const system = div({
      position: 'absolute',
      top: 'calc(8px + env(safe-area-inset-top))',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      pointerEvents: 'none',
    });
    system.append(...SYSTEM.map((b) => this.pill(b)));

    this.driving.push(zone, actions);
    this.root.append(zone, actions, system);
    document.body.append(this.root);
  }

  /** Put the controls up for a chapter. */
  show(layout: TouchLayout): void {
    // `display`, not `visibility`: a child's own `visible` would show through
    // the parent hidden while a dialogue box is up.
    for (const node of this.crewOnly) node.style.display = layout.crew ? 'flex' : 'none';
    this.root.style.display = 'block';
  }

  /**
   * While a dialogue box is up, the stick and the buttons step aside.
   *
   * On a phone the box has to be big to be read, and at the bottom of the
   * screen it is where both thumbs are. Tapping the box pages it, and paging
   * past the last line brings the controls back. Cheap to call every frame.
   */
  setTalking(on: boolean): void {
    if (on === this.talking) return;
    this.talking = on;
    if (on) {
      this.releaseStick();
      for (const b of ACTIONS) if (b.hold) this.keys.hold(b.code, false);
    }
    for (const node of this.driving) node.style.visibility = on ? 'hidden' : 'visible';
  }

  /** Take them down, and let go of anything held. */
  hide(): void {
    this.root.style.display = 'none';
    this.releaseStick();
    for (const b of ACTIONS) if (b.hold) this.keys.hold(b.code, false);
  }

  private round(b: Button): HTMLElement {
    const node = div(
      {
        width: `${b.size}px`,
        height: `${b.size}px`,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.35)',
        background: 'rgba(12,16,20,0.45)',
        color: 'rgba(255,255,255,0.8)',
        font: `600 ${b.size >= 70 ? 13 : 11}px ui-monospace, Menlo, monospace`,
        letterSpacing: '0.06em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        touchAction: 'none',
      },
      b.label,
    );
    this.wire(node, b);
    if (b.crew) this.crewOnly.push(node);
    return node;
  }

  private pill(b: Button): HTMLElement {
    const node = div(
      {
        padding: '7px 12px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.25)',
        background: 'rgba(12,16,20,0.45)',
        color: 'rgba(255,255,255,0.7)',
        font: '600 10px ui-monospace, Menlo, monospace',
        letterSpacing: '0.08em',
        pointerEvents: 'auto',
        touchAction: 'none',
      },
      b.label,
    );
    this.wire(node, b);
    return node;
  }

  private wire(node: HTMLElement, b: Button): void {
    const lit = (on: boolean): void => {
      node.style.background = on ? 'rgba(255,255,255,0.22)' : 'rgba(12,16,20,0.45)';
    };
    node.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      lit(true);
      if (b.hold) {
        node.setPointerCapture(event.pointerId);
        this.keys.hold(b.code, true);
      } else if (b.code === 'KeyM') {
        // Mute is listened for on the window, not bound per screen.
        this.toggleSound();
      } else {
        this.keys.press(b.code);
      }
    });
    const up = (): void => {
      lit(false);
      if (b.hold) this.keys.hold(b.code, false);
    };
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('pointerleave', () => {
      if (!b.hold) lit(false);
    });
  }

  private readonly onStickDown = (event: PointerEvent): void => {
    if (this.stickId !== undefined) return;
    event.preventDefault();
    this.stickId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const zone = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.originX = event.clientX;
    this.originY = event.clientY;
    this.base.style.left = `${event.clientX - zone.left}px`;
    this.base.style.top = `${event.clientY - zone.top}px`;
    this.base.style.display = 'block';
    this.moveKnob(0, 0);
  };

  private readonly onStickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickId) return;
    event.preventDefault();
    let dx = event.clientX - this.originX;
    let dy = event.clientY - this.originY;
    const d = Math.hypot(dx, dy);
    if (d > REACH) {
      dx *= REACH / d;
      dy *= REACH / d;
    }
    this.keys.stick.x = dx / REACH;
    this.keys.stick.y = dy / REACH;
    this.moveKnob(dx, dy);
  };

  private readonly onStickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.stickId) return;
    this.releaseStick();
  };

  private releaseStick(): void {
    this.stickId = undefined;
    this.keys.stick.x = 0;
    this.keys.stick.y = 0;
    this.base.style.display = 'none';
  }

  private moveKnob(dx: number, dy: number): void {
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }
}

function div(style: Partial<CSSStyleDeclaration>, text?: string): HTMLDivElement {
  const node = document.createElement('div');
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}
