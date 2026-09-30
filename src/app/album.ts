/**
 * The album: every photograph a player has earned, kept between visits.
 *
 * A print used to be up for three and a half seconds and then gone, which
 * made the shot list the one optional quest in the game with nothing to show
 * for it afterwards. Now each one is also stuck in here, and the album is
 * open from the menu and the end card with the ones still to find drawn as
 * blanks — which is the reason to go back for them.
 *
 * Which prints exist is read off the chapters, not listed: an activity with
 * a `photo` is a page in the album, so adding one to the shot list adds it
 * here. A print from a file is remembered by its id alone, since the file is
 * in the build. A selfie is a picture of the moment it was taken and exists
 * nowhere else, so it is kept as a small JPEG.
 *
 * Remembered in this browser only. Storage can be missing or refuse in a
 * private window, and then the album lasts the visit and nothing breaks.
 */

import { CHAPTERS } from '@/chapters/registry';
import type { Photo } from '@/core/Activity';
import { el, MONO, SANS } from './dom';
import { tabForKey, tabHeader, type Tab, type Tabs } from './tabs';

export interface Page {
  id: string;
  photo: Photo;
  /** Where to look for it while it is still a blank: the chapter and the job. */
  hint: string;
}

/** Every print in the game, in play order. */
export const PAGES: readonly Page[] = CHAPTERS.flatMap((chapter) =>
  chapter.objective.activities.flatMap((a) =>
    a.photo ? [{ id: a.id, photo: a.photo, hint: `${chapter.numeral}. ${chapter.title} — ${a.label}` }] : [],
  ),
);

interface Kept {
  /** When it was first taken, ms since the epoch. */
  at: number;
  /** A selfie's picture, as a data URL. */
  image?: string;
}

const KEY = 'ghost-light:album';
/** A selfie as kept: small, since it shares the browser's few megabytes. */
const KEPT_WIDTH = 360;
const KEPT_HEIGHT = 240;

let kept: Record<string, Kept> | undefined;

function load(): Record<string, Kept> {
  if (kept) return kept;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    kept = parsed && typeof parsed === 'object' ? (parsed as Record<string, Kept>) : {};
  } catch {
    kept = {};
  }
  return kept;
}

function save(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // Full or refused. The album still holds it for this visit.
  }
}

/** How many prints have been taken, of how many there are. */
export function albumCount(): { taken: number; total: number } {
  const book = load();
  return { taken: PAGES.filter((p) => book[p.id]).length, total: PAGES.length };
}

/**
 * Stick a print in. A selfie passes the canvas it was taken on, and a new
 * one replaces the old: the album keeps your latest picture of that moment.
 */
export function keepPhoto(photo: Photo, taken?: HTMLCanvasElement): void {
  const page = PAGES.find((p) => p.photo === photo);
  if (!page) return;
  const book = load();
  const entry: Kept = { at: book[page.id]?.at ?? Date.now() };
  if (taken) {
    try {
      const small = document.createElement('canvas');
      small.width = KEPT_WIDTH;
      small.height = KEPT_HEIGHT;
      small.getContext('2d')?.drawImage(taken, 0, 0, KEPT_WIDTH, KEPT_HEIGHT);
      entry.image = small.toDataURL('image/jpeg', 0.82);
    } catch {
      // A tainted or lost canvas: keep the print as taken, without the picture.
    }
  }
  book[page.id] = entry;
  save();
}

/** The picture kept for this print, if it has been taken: for the end card. */
export function keptPicture(photo: Photo): string | undefined {
  const page = PAGES.find((p) => p.photo === photo);
  return page ? pictureOf(page) : undefined;
}

function pictureOf(page: Page): string | undefined {
  const entry = load()[page.id];
  if (!entry) return undefined;
  // Only a selfie's own capture: a print that was a selfie once and is a
  // file now must show the file, not the frame a browser kept from before.
  if (entry.image && page.photo.selfie) return entry.image;
  return page.photo.file ? `${import.meta.env.BASE_URL}photos/${page.photo.file}` : undefined;
}

const THUMB_W = 210;
const THUMB_H = 140;
const BIG_W = 600;
const BIG_H = 400;

/**
 * The album's measures, in design pixels. On a phone the stage is drawn at
 * about half size, so an 11 px caption is five and a half real pixels: two
 * columns of bigger prints and bigger type instead, and the page scrolls
 * rather than squeezing five prints into one screen.
 */
function measures(touch: boolean) {
  return touch
    ? { columns: 2, thumbW: 300, thumbH: 200, caption: 17, hint: 17, title: 44, count: 18, close: 18, gap: '30px 40px', big: { w: 840, h: 560 } }
    : { columns: 3, thumbW: THUMB_W, thumbH: THUMB_H, caption: 11, hint: 11, title: 34, count: 13, close: 12, gap: '22px 26px', big: { w: BIG_W, h: BIG_H } };
}

/**
 * Open the album over whatever is on screen, in the 1280 × 720 UI layer.
 *
 * It takes every key while it is open, so ENTER on the menu behind it does
 * not start a chapter: ESC (or a click outside, or CLOSE) shuts it, and
 * from a print held up large goes back to the pages first.
 */
export function openAlbum(host: HTMLElement, touch: boolean, tabs?: Tabs): void {
  const m = measures(touch);
  // Opaque: a collection is read, and the menu showing through it is noise.
  const root = el('div', {
    position: 'absolute',
    inset: '0',
    background: '#06080a',
    zIndex: '12',
    boxSizing: 'border-box',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)',
    overflowY: 'auto',
    // The page is `touch-action: none` on a phone, so it never scrolls under
    // a thumb; this one panel is allowed to, vertically.
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

  const { taken, total } = albumCount();
  // In the souvenir album, the book's tabs; on its own, its own title.
  const turn = (tab: Tab): void => {
    shut();
    tabs?.go(tab);
  };
  if (tabs) page.append(...tabHeader(tabs, touch, m.title, turn));
  else {
    page.append(
      el('div', { font: `12px ${MONO}`, color: '#6f777c', letterSpacing: '0.24em' }, 'GHOST LIGHT'),
      el('div', { font: `${m.title}px ${SANS}`, color: '#f2f5f7', margin: '6px 0 4px' }, 'Album'),
      el('div', { font: `${m.count}px ${MONO}`, color: '#8d959b', marginBottom: '26px' }, `${taken} of ${total} prints`),
    );
  }

  const grid = el('div', {
    display: 'grid',
    gridTemplateColumns: `repeat(${m.columns}, ${m.thumbW + 20}px)`,
    gap: m.gap,
  });
  page.append(grid);

  const big = el('div', {
    position: 'absolute',
    inset: '0',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#06080a',
    cursor: 'pointer',
    zIndex: '13',
  });
  // Outside the scrolling page, over the whole album.
  host.append(big);

  /*
   * Every page is a button, blanks included, so the arrow keys walk the
   * grid the way it is drawn and a blank can be read for where its print is
   * to be had; ENTER on a print holds it up, ENTER on a blank does nothing.
   * CLOSE is the last stop, below the grid. In the large view LEFT and
   * RIGHT turn to the next print taken, and ESC, ENTER or SPACE put it
   * down and hand focus back to where it came from.
   */
  interface Cell {
    node: HTMLButtonElement;
    open?: () => void;
  }
  const cells: Cell[] = [];
  const earned: { entry: Page; src: string; cell: number }[] = [];
  let showing: number | undefined;

  const showBig = (at: number): void => {
    const { entry, src } = earned[at];
    showing = at;
    big.replaceChildren(print(src, entry.photo.caption, m.big.w, m.big.h, entry.photo.selfie ? 1.2 : -1, touch ? 20 : 14));
    big.style.display = 'flex';
  };
  const hideBig = (): void => {
    if (showing === undefined) return;
    const cell = cells[earned[showing].cell];
    showing = undefined;
    big.style.display = 'none';
    cell?.node.focus();
  };

  for (const entry of PAGES) {
    const src = pictureOf(entry);
    const kept = load()[entry.id] !== undefined;
    const node = button('album-cell');
    if (kept && src) {
      const at = earned.length;
      earned.push({ entry, src, cell: cells.length });
      node.append(print(src, entry.photo.caption, m.thumbW, m.thumbH, entry.photo.selfie ? 1.4 : -1.2, m.caption));
      node.setAttribute('aria-label', `Open ${entry.photo.caption}`);
      const open = (): void => showBig(at);
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        open();
      });
      cells.push({ node, open });
    } else {
      // A blank: the shape of a print, and where it is to be had.
      const blank = el('div', {
        width: `${m.thumbW + 20}px`,
        boxSizing: 'border-box',
        padding: '10px',
        border: '1px dashed rgba(255, 255, 255, 0.16)',
        textAlign: 'left',
      });
      blank.append(
        el(
          'div',
          {
            height: `${m.thumbH}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: `28px ${SANS}`,
            color: 'rgba(255, 255, 255, 0.18)',
          },
          '?',
        ),
        el('div', { font: `${m.hint}px ${MONO}`, color: '#8d959b', lineHeight: '1.5', paddingTop: '8px' }, entry.hint),
      );
      node.append(blank);
      node.style.cursor = 'default';
      node.setAttribute('aria-label', `Not taken yet: ${entry.hint}`);
      node.addEventListener('click', (event) => event.stopPropagation());
      cells.push({ node });
    }
    grid.append(node);
  }

  const close = button('album-close');
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
  };

  /** Where focus goes from `at` (a cell index, or `cells.length` for CLOSE). */
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

  // Capture, on the window, ahead of the game's own keyboard: while the
  // album is open no key reaches the screen behind it, and the browser's own
  // TAB and button activation are done here instead, so they cannot leak.
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
    const tab = tabs ? tabForKey(code) : undefined;
    if (tab && tab !== tabs?.active && !event.repeat) {
      turn(tab);
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
  // Start on the first print taken, or on CLOSE when there is none.
  // Focus without scrolling to it, and start the page at the top: on a
  // phone focusing CLOSE scrolled the tabs out of sight.
  const first = earned.length > 0 ? earned[0].cell : cells.length;
  (first >= cells.length ? close : cells[first].node).focus({ preventScroll: true });
  root.scrollTop = 0;
}

/** A bare button: focusable and announced, and drawn by what is put in it. */
export function button(className: string): HTMLButtonElement {
  const node = el('button', {
    background: 'none',
    border: 'none',
    padding: '0',
    margin: '0',
    font: 'inherit',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: '4px',
  });
  node.type = 'button';
  node.className = className;
  return node;
}

/** A print: the picture in a white border with its caption under it. */
function print(src: string, caption: string, w: number, h: number, lean: number, captionSize = 14): HTMLElement {
  const frame = el('div', {
    background: '#efece4',
    padding: '10px 10px 0',
    boxShadow: '0 14px 34px rgba(0, 0, 0, 0.55)',
    transform: `rotate(${lean}deg)`,
    width: `${w}px`,
  });
  const img = el('img', { display: 'block', width: `${w}px`, height: `${h}px`, objectFit: 'cover' });
  img.src = src;
  img.alt = caption;
  frame.append(
    img,
    el(
      'div',
      { font: `${captionSize}px ${MONO}`, color: '#2c2a26', padding: '9px 2px 11px', textShadow: 'none' },
      caption,
    ),
  );
  return frame;
}
