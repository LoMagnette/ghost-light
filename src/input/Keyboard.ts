/**
 * Keyboard state, straight off the DOM.
 *
 * Phaser owned a keyboard plugin; three.js is a renderer and owns nothing of
 * the sort, so this is it. It is about forty lines, which is roughly what the
 * plugin was doing for us.
 *
 * Keys are identified by `KeyboardEvent.code` — physical position, not the
 * character produced. A judge on an AZERTY laptop presses the key where W is
 * on a QWERTY board and the robot walks north-east, which is the behaviour
 * every game has and `event.key` does not give you.
 */

export type KeyHandler = () => void;

/**
 * Keys the browser does something with that we do not want it doing.
 *
 * Tab moves focus out of the canvas, Space and the arrows scroll the page, and
 * F1 opens the browser's help. All four are bound to gameplay.
 */
const SWALLOWED = new Set([
  'Tab',
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'F1',
]);

export class Keyboard {
  private readonly down = new Set<string>();
  private readonly handlers = new Map<string, KeyHandler[]>();

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (SWALLOWED.has(event.code)) event.preventDefault();
    // Auto-repeat is a held key, not a new press. Firing one-shot handlers on
    // it means holding TAB cycles robots thirty times a second.
    if (event.repeat) return;
    this.down.add(event.code);
    const bound = this.handlers.get(event.code);
    if (bound) for (const handler of bound) handler();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.down.delete(event.code);
  };

  /**
   * Alt-tabbing away with a key held never delivers the keyup, so the robot
   * drives into a wall while the player is reading their mail.
   */
  private readonly onBlur = (): void => {
    this.down.clear();
  };

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  isDown(...codes: string[]): boolean {
    return codes.some((code) => this.down.has(code));
  }

  /** Call `handler` each time this key goes down. Returns an unbind function. */
  on(code: string, handler: KeyHandler): () => void {
    const bound = this.handlers.get(code) ?? [];
    bound.push(handler);
    this.handlers.set(code, bound);
    return () => {
      const list = this.handlers.get(code);
      if (!list) return;
      const at = list.indexOf(handler);
      if (at >= 0) list.splice(at, 1);
    };
  }

  /** Drop every binding but keep listening. Call when a screen goes away. */
  clearBindings(): void {
    this.handlers.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.handlers.clear();
    this.down.clear();
  }
}
