/**
 * The title sequence: a few lines over the dark building, one at a time,
 * before the menu is shown for the first time.
 *
 * It lives on the menu rather than being a screen of its own, because the
 * backdrop — the empty hall, the one lamp drifting — IS the intro, and a
 * separate screen would build the building twice and cut between them.
 *
 * It opens on "press any key" and waits. Not for drama: the browser will not
 * make a sound until the page has had a key or a click, and the whole point
 * of the sequence is the Chapter I music under it. After that, any key skips
 * to the end, and the menu fades in once the words have gone. Seen once, it
 * is remembered, and I on the menu plays it again.
 */

import { INTRO_LINES } from '@/chapters/intro';
import { el, MONO, SANS } from './dom';

/** Seconds each line takes to arrive, and to leave. */
const FADE_IN = 1.1;
const FADE_OUT = 0.8;
/** Seconds a line stays up: a floor, and a reading allowance per character. */
const HOLD = 1.3;
const PER_CHARACTER = 0.035;
/** Seconds of dark between lines. */
const BETWEEN = 0.35;
/** Seconds the sequence takes to hand over to the menu. */
export const INTRO_CLOSE = 1.4;

const SEEN_KEY = 'ghost-light:intro-seen';

/** Play it: the first visit, or asked for with `?intro`; never with `?nointro`. */
export function introWanted(): boolean {
  const query = new URLSearchParams(window.location.search);
  if (query.has('nointro')) return false;
  if (query.has('intro')) return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
}

export class Intro {
  private readonly root: HTMLElement;
  private readonly line: HTMLElement;
  private readonly hint: HTMLElement;
  private stage: 'waiting' | 'lines' | 'closing' | 'done';
  private index = 0;
  private t = 0;

  /**
   * `waitForKey` false when sound is already unlocked — a replay from the
   * menu — so there is nothing to wait for. `accent` is the last line's
   * colour: Chapter I's, which is the ghost light's.
   */
  constructor(
    ui: HTMLElement,
    waitForKey: boolean,
    private readonly accent: string,
    private readonly onDone: () => void,
  ) {
    this.root = el('div', {
      position: 'absolute',
      inset: '0',
      background: 'rgba(4, 6, 8, 0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    });
    this.line = el('div', {
      maxWidth: '760px',
      padding: '0 40px',
      textAlign: 'center',
      font: `24px ${SANS}`,
      lineHeight: '1.5',
      color: '#d4dade',
      textShadow: '0 2px 16px rgba(0,0,0,0.95)',
      opacity: '0',
    });
    this.hint = el('div', {
      position: 'absolute',
      left: '0',
      right: '0',
      bottom: '48px',
      textAlign: 'center',
      font: `12px ${MONO}`,
      letterSpacing: '0.12em',
      color: '#6f777c',
    });
    this.root.append(this.line, this.hint);
    ui.append(this.root);

    this.stage = waitForKey ? 'waiting' : 'lines';
    this.hint.textContent = waitForKey ? 'PRESS ANY KEY' : 'ANY KEY TO SKIP';
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('pointerdown', this.onKey, true);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.stage === 'waiting') {
      // A slow breath, so it reads as waiting rather than as stuck.
      this.hint.style.opacity = String(0.45 + 0.4 * Math.sin(this.t * 2.2));
      return;
    }

    if (this.stage === 'lines') {
      const text = INTRO_LINES[this.index];
      const hold = HOLD + text.length * PER_CHARACTER;
      const life = FADE_IN + hold + FADE_OUT;
      if (this.line.textContent !== text) {
        this.line.textContent = text;
        this.line.style.color = this.index === INTRO_LINES.length - 1 ? this.accent : '#d4dade';
      }
      const t = this.t;
      this.line.style.opacity = String(
        t < FADE_IN ? t / FADE_IN : t < FADE_IN + hold ? 1 : Math.max(0, 1 - (t - FADE_IN - hold) / FADE_OUT),
      );
      if (t >= life + BETWEEN) {
        this.index += 1;
        this.t = 0;
        if (this.index >= INTRO_LINES.length) this.close();
      }
      return;
    }

    if (this.stage === 'closing') {
      const k = Math.min(1, this.t / INTRO_CLOSE);
      this.root.style.opacity = String(1 - k);
      if (k >= 1) {
        this.stage = 'done';
        this.dispose();
        this.onDone();
      }
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('pointerdown', this.onKey, true);
    this.root.remove();
  }

  private readonly onKey = (event: Event): void => {
    if (event instanceof KeyboardEvent && event.repeat) return;
    if (this.stage === 'waiting') {
      this.stage = 'lines';
      this.t = 0;
      this.hint.style.opacity = '0.6';
      this.hint.textContent = 'ANY KEY TO SKIP';
    } else if (this.stage === 'lines') {
      this.close();
    }
  };

  /**
   * Hand over to the menu. Not at once: the menu's keys are bound when this
   * finishes, and binding them inside the very keypress that skipped would
   * let that same press go on to start Chapter I.
   */
  private close(): void {
    this.stage = 'closing';
    this.t = 0;
    this.line.style.transition = 'opacity 400ms';
    this.line.style.opacity = '0';
    this.hint.textContent = '';
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Nowhere to remember it; it plays again next visit, which is harmless.
    }
  }
}
