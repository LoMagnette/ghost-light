/**
 * The title sequence: a few lines over the dark building, one at a time,
 * before the menu is shown for the first time.
 *
 * It lives on the menu rather than being a screen of its own, because the
 * backdrop — the empty hall, the one lamp drifting — IS the intro, and a
 * separate screen would build the building twice and cut between them.
 *
 * It starts on its own (the author, 28 Sep: it should just play). But the
 * browser will not make a sound until the page has had a key or a click, and
 * the words are written to sit on Chapter I's music, so the FIRST key while
 * it runs turns the sound on rather than skipping — the hint says so. After
 * that any key skips, and ESC always does. The menu fades in once the words
 * have gone. Seen once, it is remembered, and I on the menu plays it again.
 */

import { INTRO_LINES, type IntroLine } from '@/chapters/intro';
import { el, MONO, SANS, SERIF, type Style } from './dom';

/** Seconds each line takes to arrive, and to leave. */
const FADE_IN = 0.9;
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
  private stage: 'lines' | 'closing' | 'done' = 'lines';
  /** No key yet: the next one is for sound, not for skipping. */
  private silent: boolean;
  private index = 0;
  private t = 0;

  /**
   * `silent` true when the page has had no key or click yet, so there is no
   * sound, and the first press is spent on turning it on. `accent` is the last line's
   * colour: Chapter I's, which is the ghost light's.
   */
  constructor(
    ui: HTMLElement,
    silent: boolean,
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

    this.silent = silent;
    this.hint.textContent = silent ? 'ANY KEY FOR SOUND  ·  ESC TO SKIP' : 'ANY KEY TO SKIP';
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('pointerdown', this.onKey, true);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.stage === 'lines') {
      const said = INTRO_LINES[this.index];
      const text = said.text;
      const hold = HOLD + text.length * PER_CHARACTER;
      const life = FADE_IN + hold + FADE_OUT;
      if (this.line.textContent !== text) {
        this.line.textContent = text;
        Object.assign(this.line.style, this.lookOf(said));
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

  /** How a line is set. See `IntroLine.look`. */
  private lookOf(said: IntroLine): Style {
    switch (said.look) {
      case 'date':
        return { font: `20px ${MONO}`, letterSpacing: '0.5em', color: '#8b9398' };
      case 'place':
        return { font: `52px ${SERIF}`, letterSpacing: '0.04em', color: '#f2f5f7' };
      case 'light':
        return { font: `24px ${SANS}`, letterSpacing: '0', color: this.accent };
      default:
        return { font: `24px ${SANS}`, letterSpacing: '0', color: '#d4dade' };
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('pointerdown', this.onKey, true);
    this.root.remove();
  }

  private readonly onKey = (event: Event): void => {
    if (event instanceof KeyboardEvent && event.repeat) return;
    if (this.stage !== 'lines') return;
    const escape = event instanceof KeyboardEvent && event.code === 'Escape';
    if (this.silent && !escape) {
      // This press unlocked the sound (see `installAudio`); it skips nothing.
      this.silent = false;
      this.hint.textContent = 'ANY KEY TO SKIP';
      return;
    }
    this.close();
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
