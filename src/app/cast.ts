/**
 * The who's who: a card for everybody the robots have met, kept between
 * visits.
 *
 * A collection, the way a creature index is one: every card is in the book
 * from the start, numbered, and the ones not met yet are a silhouette, a
 * number and the chapter they are in — which is the reason to go and find
 * them. Met is spoken to (the first line of their conversation has been
 * said) or, for somebody who only poses, photographed with.
 *
 * Who is in it is read off the chapters, not listed: anything in an
 * objective with a `who` is somebody standing there, so adding a person to a
 * chapter adds a card. A person in two activities (Stephan, twice; Dimitris,
 * who talks and then poses) is one card, filed under the first.
 *
 * What a card SAYS is only what the game already says. Several of these
 * people are real, and a card is not the place to write them a biography:
 * their name, the chapter, where they are met, and the first thing they say
 * to you in it, which is on screen already. A portrait is the dialogue
 * box's, from `src/portraits/`, or their initials in their own colour.
 *
 * Remembered in this browser only, like the album, and for the same reasons.
 */

import { CHAPTERS } from '@/chapters/registry';
import type { Activity } from '@/core/Activity';
import type { Look } from '@/core/Crowd';
import { button } from './album';
import { css, el, MONO, SANS } from './dom';
import { portraitOf } from './portraits';
import { ink, lift } from './tint';

export interface Card {
  /** Their name, as the dialogue box prints it. The card's key. */
  who: string;
  /** Its number in the book, from 1, in play order. */
  n: number;
  /** "II. JavaPolis". */
  chapter: string;
  /** The chapter's accent, for the card's band. */
  accent: number;
  /** The job on the card that puts you in front of them. */
  where: string;
  /** The first thing they say, if they say anything. */
  line?: string;
  /** Who they are, in a sentence. See `Activity.bio`. */
  bio?: string;
  /** A person's colours, an animal's shape. */
  look?: Look;
  shape?: 'cat' | 'dog';
}

/** Everybody in the game, in play order, once each. */
export const CARDS: readonly Card[] = (() => {
  const cards: Card[] = [];
  for (const chapter of CHAPTERS) {
    for (const a of chapter.objective.activities) {
      const who = a.who;
      if (!who) continue;
      const known = cards.find((c) => c.who === who);
      if (known) {
        // Filed under the first, but a line said later still counts if the first said none.
        if (!known.line && a.kind === 'talk' && !a.narrated) known.line = a.lines[0];
        known.look ??= a.look;
        known.bio ??= a.bio;
        continue;
      }
      cards.push({
        who,
        n: cards.length + 1,
        chapter: `${chapter.numeral}. ${chapter.title}`,
        accent: chapter.palette.accent,
        where: a.label,
        // Only what they say. Narration is the game describing them, not them.
        line: a.kind === 'talk' && !a.narrated ? a.lines[0] : undefined,
        look: a.look,
        shape: a.shape,
        bio: a.bio,
      });
    }
  }
  return cards;
})();

/**
 * Has this activity just put the robot in front of its person? A
 * conversation from its first line; anything else, a pose, once it is done.
 */
export function meets(a: Activity, status: string, progress: number): boolean {
  if (!a.who) return false;
  if (a.kind === 'talk') return progress > 0 || status === 'done';
  return status === 'done';
}

interface Met {
  /** When first met, ms since the epoch. */
  at: number;
}

const KEY = 'ghost-light:cast';

let book: Record<string, Met> | undefined;

function load(): Record<string, Met> {
  if (book) return book;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    book = parsed && typeof parsed === 'object' ? (parsed as Record<string, Met>) : {};
  } catch {
    book = {};
  }
  return book;
}

function save(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // Full or refused. The book still holds it for this visit.
  }
}

/** How many of the cast have been met, of how many there are. */
export function castCount(): { met: number; total: number } {
  const b = load();
  return { met: CARDS.filter((c) => b[c.who]).length, total: CARDS.length };
}

/** Mark somebody met. Their card, the first time; undefined if already met or not in the book. */
export function meet(who: string): Card | undefined {
  const card = CARDS.find((c) => c.who === who);
  if (!card) return undefined;
  const b = load();
  if (b[who]) return undefined;
  b[who] = { at: Date.now() };
  save();
  return card;
}

/** A card's colour: the person's own, lifted to read on the dark, or the chapter's. */
export function tintOf(card: Card): string {
  return css(card.look ? lift(ink(card.look)) : card.accent);
}

/** Two letters for somebody without a portrait: "SJ", and "C" for the cat. */
function initials(who: string): string {
  return who
    .replace(/^The\s+/i, '')
    .split(/\s+/)
    .map((word) => word[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** The picture on a card: the portrait if there is one, their initials if not. */
export function face(card: Card, size: number): HTMLElement {
  const tint = tintOf(card);
  const frame = el('div', {
    width: `${size}px`,
    height: `${size}px`,
    boxSizing: 'border-box',
    border: `2px solid ${tint}`,
    borderRadius: '3px',
    overflow: 'hidden',
    background: '#15191c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    font: `bold ${Math.round(size * 0.3)}px ${SANS}`,
    color: tint,
    flex: '0 0 auto',
  });
  const url = portraitOf(card.who);
  if (url) {
    const img = el('img', { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    img.src = url;
    img.alt = card.who;
    frame.append(img);
  } else frame.textContent = initials(card.who);
  return frame;
}

/** "#04". */
export function number(card: Card): string {
  return `#${String(card.n).padStart(2, '0')}`;
}

/**
 * The book's measures, in design pixels. On a phone the stage is half size:
 * fewer, bigger cards, as the album does.
 */
function measures(touch: boolean) {
  return touch
    ? { columns: 3, w: 250, face: 150, name: 19, small: 15, title: 44, count: 18, close: 18, gap: '26px 30px', big: { w: 620, face: 300, name: 38, line: 26, small: 20 } }
    : { columns: 5, w: 176, face: 104, name: 14, small: 11, title: 34, count: 13, close: 12, gap: '20px 20px', big: { w: 440, face: 210, name: 28, line: 18, small: 13 } };
}

/**
 * One card, as a conference badge on a lanyard: the slot, a band in the
 * chapter's colour with the number, the face, the name. Big, it adds where
 * they were met and what they said. Not met, it is the badge's shape, a
 * silhouette and the number, and the chapter to look in.
 */
function badge(card: Card, met: boolean, m: ReturnType<typeof measures>, big: boolean): HTMLElement {
  const w = big ? m.big.w : m.w;
  const faceSize = big ? m.big.face : m.face;
  const nameSize = big ? m.big.name : m.name;
  const small = big ? m.big.small : m.small;
  const accent = css(card.accent);
  const root = el('div', {
    width: `${w}px`,
    // In the grid, as tall as the tallest in its row: a two-line hint
    // otherwise makes a ragged shelf of badges.
    height: big ? 'auto' : '100%',
    boxSizing: 'border-box',
    background: met ? '#0f1316' : 'transparent',
    border: met ? '1px solid rgba(255, 255, 255, 0.14)' : '1px dashed rgba(255, 255, 255, 0.16)',
    borderRadius: '8px',
    overflow: 'hidden',
    textAlign: 'center',
    boxShadow: met ? '0 12px 30px rgba(0, 0, 0, 0.55)' : 'none',
  });
  // The lanyard slot, and the band under it.
  const band = el('div', {
    position: 'relative',
    padding: `${big ? 26 : 16}px 12px ${big ? 10 : 6}px`,
    background: met ? accent : 'rgba(255, 255, 255, 0.04)',
    color: met ? '#06080a' : '#6f777c',
    font: `bold ${small}px ${MONO}`,
    letterSpacing: '0.12em',
    display: 'flex',
    justifyContent: 'space-between',
  });
  band.append(
    el('div', {
      position: 'absolute',
      left: '50%',
      top: big ? '9px' : '6px',
      width: big ? '44px' : '28px',
      height: big ? '8px' : '5px',
      marginLeft: big ? '-22px' : '-14px',
      borderRadius: '4px',
      background: '#06080a',
      opacity: met ? '0.85' : '0.6',
    }),
    el('span', {}, number(card)),
    el('span', {}, card.chapter.split('.')[0]),
  );
  root.append(band);

  const body = el('div', {
    padding: `${big ? 22 : 12}px ${big ? 26 : 10}px ${big ? 24 : 12}px`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  });
  root.append(body);
  if (met) {
    body.append(
      face(card, faceSize),
      el('div', { font: `bold ${nameSize}px ${SANS}`, color: '#f2f5f7', marginTop: big ? '16px' : '10px', lineHeight: '1.2' }, card.who),
      el('div', { font: `${small}px ${MONO}`, color: '#8d959b', marginTop: '4px', letterSpacing: '0.04em' }, card.chapter),
    );
    if (big) {
      if (card.bio) {
        body.append(
          el(
            'div',
            { font: `${small + 2}px ${SANS}`, color: '#c9d0d4', marginTop: '12px', lineHeight: '1.45', whiteSpace: 'normal' },
            card.bio,
          ),
        );
      }
      body.append(el('div', { font: `${small}px ${MONO}`, color: '#8d959b', marginTop: '10px' }, `On the list as: ${card.where}`));
      if (card.line) {
        body.append(
          el(
            'div',
            {
              font: `italic ${m.big.line}px ${SANS}`,
              color: tintOf(card),
              marginTop: '18px',
              lineHeight: '1.45',
              whiteSpace: 'normal',
              textAlign: 'left',
              borderLeft: `2px solid ${tintOf(card)}`,
              paddingLeft: '14px',
            },
            `“${card.line}”`,
          ),
        );
      }
    }
  } else {
    // A silhouette: a head and a pair of shoulders, and nothing to go on.
    const shadow = el('div', {
      width: `${faceSize}px`,
      height: `${faceSize}px`,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '3px',
      background: 'rgba(255, 255, 255, 0.03)',
    });
    const tone = 'rgba(255, 255, 255, 0.1)';
    shadow.append(
      el('div', {
        position: 'absolute',
        left: '50%',
        top: '18%',
        width: '38%',
        height: '38%',
        marginLeft: '-19%',
        borderRadius: '50%',
        background: tone,
      }),
      el('div', {
        position: 'absolute',
        left: '14%',
        top: '62%',
        width: '72%',
        height: '60%',
        borderRadius: '45% 45% 0 0',
        background: tone,
      }),
    );
    body.append(
      shadow,
      el('div', { font: `bold ${nameSize}px ${SANS}`, color: '#4d5458', marginTop: '10px' }, '? ? ?'),
      el('div', { font: `${small}px ${MONO}`, color: '#6f777c', marginTop: '4px', whiteSpace: 'normal' }, `Somewhere in ${card.chapter}`),
    );
  }
  return root;
}

/**
 * Open the who's who over whatever is on screen, in the 1280 × 720 UI
 * layer. The album's rules exactly: it takes every key while open, arrows
 * walk the cards, ENTER holds a met one up large, LEFT and RIGHT turn to the
 * next met, ESC puts it down and then shuts the book.
 */
export function openCast(host: HTMLElement, touch: boolean, onClose?: () => void): void {
  const m = measures(touch);
  const root = el('div', {
    position: 'absolute',
    inset: '0',
    background: '#06080a',
    zIndex: '12',
    boxSizing: 'border-box',
    overflowY: 'auto',
    touchAction: 'pan-y',
    overscrollBehavior: 'contain',
  });
  const page = el('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '46px 0 40px',
    minHeight: '100%',
    boxSizing: 'border-box',
  });
  root.append(page);

  const { met, total } = castCount();
  page.append(
    el('div', { font: `12px ${MONO}`, color: '#6f777c', letterSpacing: '0.24em' }, 'GHOST LIGHT'),
    el('div', { font: `${m.title}px ${SANS}`, color: '#f2f5f7', margin: '6px 0 4px' }, "Who's who"),
    el('div', { font: `${m.count}px ${MONO}`, color: '#8d959b', marginBottom: '26px' }, `${met} of ${total} met`),
  );

  const grid = el('div', { display: 'grid', gridTemplateColumns: `repeat(${m.columns}, ${m.w}px)`, gap: m.gap });
  page.append(grid);

  const big = el('div', {
    position: 'absolute',
    inset: '0',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(6, 8, 10, 0.96)',
    cursor: 'pointer',
    zIndex: '13',
  });
  host.append(big);

  interface Cell {
    node: HTMLButtonElement;
    open?: () => void;
  }
  const cells: Cell[] = [];
  const earned: { card: Card; cell: number }[] = [];
  let showing: number | undefined;

  const showBig = (at: number): void => {
    showing = at;
    big.replaceChildren(badge(earned[at].card, true, m, true));
    big.style.display = 'flex';
  };
  const hideBig = (): void => {
    if (showing === undefined) return;
    const cell = cells[earned[showing].cell];
    showing = undefined;
    big.style.display = 'none';
    cell?.node.focus();
  };

  const b = load();
  for (const card of CARDS) {
    const known = b[card.who] !== undefined;
    const node = button('cast-cell');
    node.style.display = 'block';
    node.append(badge(card, known, m, false));
    if (known) {
      const at = earned.length;
      earned.push({ card, cell: cells.length });
      node.setAttribute('aria-label', `Open ${card.who}'s card`);
      const open = (): void => showBig(at);
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        open();
      });
      cells.push({ node, open });
    } else {
      node.style.cursor = 'default';
      node.setAttribute('aria-label', `${number(card)}, not met yet: somewhere in ${card.chapter}`);
      node.addEventListener('click', (event) => event.stopPropagation());
      cells.push({ node });
    }
    grid.append(node);
  }

  const close = button('cast-close');
  Object.assign(close.style, {
    font: `${m.close}px ${MONO}`,
    color: '#c9d0d4',
    marginTop: '28px',
    padding: '10px 18px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '3px',
  });
  close.textContent = touch ? 'CLOSE' : 'ESC close';
  page.append(close);

  const shut = (): void => {
    window.removeEventListener('keydown', onKey, true);
    root.remove();
    big.remove();
    onClose?.();
  };

  const step = (at: number, code: string, back: boolean): number => {
    const n = cells.length;
    const cols = m.columns;
    switch (code) {
      case 'ArrowRight':
        return Math.min(at + 1, n);
      case 'ArrowLeft':
        return Math.max(at - 1, 0);
      case 'ArrowDown':
        return at >= n ? n : at + cols < n ? at + cols : n;
      case 'ArrowUp':
        return at >= n ? n - 1 : at - cols >= 0 ? at - cols : at;
      case 'Tab':
        return (at + (back ? n : 1)) % (n + 1);
      default:
        return at;
    }
  };
  const focusAt = (at: number): void => (at >= cells.length ? close : cells[at].node).focus();

  const onKey = (event: KeyboardEvent): void => {
    event.stopImmediatePropagation();
    event.preventDefault();
    const code = event.code;
    if (showing !== undefined) {
      if (event.repeat) return;
      if (code === 'ArrowRight' || code === 'ArrowLeft') {
        const next = showing + (code === 'ArrowRight' ? 1 : -1);
        if (next >= 0 && next < earned.length) showBig(next);
      } else if (code === 'Escape' || code === 'Enter' || code === 'Space') {
        hideBig();
      }
      return;
    }
    if (code === 'Escape') {
      if (!event.repeat) shut();
      return;
    }
    const at = document.activeElement === close ? cells.length : cells.findIndex((c) => c.node === document.activeElement);
    if (code === 'Enter' || code === 'Space') {
      if (event.repeat) return;
      if (at >= cells.length) shut();
      else if (at >= 0) cells[at].open?.();
      return;
    }
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Tab'].includes(code)) {
      focusAt(at < 0 ? 0 : step(at, code, event.shiftKey));
    }
  };
  window.addEventListener('keydown', onKey, true);
  big.addEventListener('click', hideBig);
  close.addEventListener('click', shut);
  root.addEventListener('click', (event) => {
    if (event.target === root || event.target === page) shut();
  });
  host.append(root);
  focusAt(earned.length > 0 ? earned[0].cell : cells.length);
}
