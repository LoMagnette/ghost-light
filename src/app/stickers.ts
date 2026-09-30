/**
 * Stickers: the third tab of the album.
 *
 * Chapter III sends Voxxy round the stands for their stickers, and until
 * this a sticker was a tick on the card and nothing else. Now each one is
 * kept, like a print, and stuck on a page: what you have, and a dashed
 * blank where each of the rest goes.
 *
 * Which stickers exist is read off the chapters: every activity in the
 * `stickers` group is one. The stands are nobody in particular, so the art
 * is too: a shape, a colour and a word or a glyph from a Java day, drawn
 * here, and no company's mark.
 *
 * Remembered in this browser only, like the album and the who's who.
 */

import { CHAPTERS } from '@/chapters/registry';
import { button } from './album';
import { el, MONO, SANS } from './dom';
import { tabForKey, tabHeader, type Tab, type Tabs } from './tabs';

export interface Sticker {
  /** The activity's id. The sticker's key. */
  id: string;
  /** Its number in the set, from 1. */
  n: number;
  /** "Stand 3". */
  where: string;
}

/** Every sticker in the game, in the order the stands are visited. */
export const STICKERS: readonly Sticker[] = CHAPTERS.flatMap((chapter) =>
  chapter.objective.activities.filter((a) => a.group === 'stickers'),
).map((a, i) => ({ id: a.id, n: i + 1, where: a.label.replace(/^Sticker, stand/i, 'Stand') }));

/** What each sticker looks like, by its place in the set. Round if there are more stickers than designs. */
const ART: { text: string; shape: 'round' | 'hex' | 'tag' | 'pill'; ground: number; ink: number }[] = [
  { text: 'λ', shape: 'round', ground: 0xf28c28, ink: 0x1b1206 },
  { text: 'JVM', shape: 'hex', ground: 0x2f6fd0, ink: 0xffffff },
  { text: '{ }', shape: 'tag', ground: 0x3bb273, ink: 0x0b2416 },
  { text: '☕', shape: 'round', ground: 0x7a4bc2, ink: 0xffffff },
  { text: 'GC', shape: 'hex', ground: 0xd8433a, ink: 0xffffff },
  { text: '</>', shape: 'pill', ground: 0xf2c230, ink: 0x2a2106 },
  { text: '@Test', shape: 'tag', ground: 0x1f9aa8, ink: 0xffffff },
  { text: '2026', shape: 'round', ground: 0xe0457b, ink: 0xffffff },
];

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/*
 * The author's own sticker art, by file name: `src/stickers/stand-3.png` is
 * stand 3's. Found at build time, like the portraits, so adding one is
 * dropping a file in; a stand with no file keeps its drawn one. See
 * `src/stickers/README.md`.
 */
const files = import.meta.glob('../stickers/*.{png,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) byName.set((path.split('/').pop() ?? '').replace(/\.[^.]+$/, ''), url);

/** The file for this sticker, if the author has supplied one. */
function stickerFile(sticker: Sticker): string | undefined {
  return byName.get(`stand-${sticker.n}`);
}

/** A sticker, drawn: die-cut with a white edge, a little crooked, as stuck on by hand. */
export function stickerArt(sticker: Sticker, size: number): HTMLElement {
  const tilt = `rotate(${((sticker.n * 37) % 13) - 6}deg)`;
  const file = stickerFile(sticker);
  if (file) {
    // The author's: its own shape and white edge are in the picture, so only
    // the tilt and the shadow are added here.
    const img = el('img', {
      width: `${size}px`,
      height: `${size}px`,
      objectFit: 'contain',
      transform: tilt,
      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
      flex: '0 0 auto',
    });
    img.src = file;
    img.alt = `Sticker, ${sticker.where}`;
    return img;
  }
  const art = ART[(sticker.n - 1) % ART.length];
  const shapes = {
    round: { w: size, h: size, radius: '50%', clip: 'none' },
    hex: { w: size, h: size, radius: '0', clip: 'polygon(25% 4%, 75% 4%, 98% 50%, 75% 96%, 25% 96%, 2% 50%)' },
    tag: { w: size, h: size * 0.78, radius: `${size * 0.12}px`, clip: 'none' },
    pill: { w: size, h: size * 0.56, radius: `${size * 0.28}px`, clip: 'none' },
  } as const;
  const shape = shapes[art.shape];
  const edge = Math.max(2, Math.round(size * 0.05));
  // The white die-cut edge is the same shape, a little bigger, behind.
  const outer = el('div', {
    width: `${shape.w}px`,
    height: `${shape.h}px`,
    borderRadius: shape.radius,
    clipPath: shape.clip,
    background: '#f4f2ec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: tilt,
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
    flex: '0 0 auto',
  });
  const inner = el(
    'div',
    {
      width: `${shape.w - edge * 2}px`,
      height: `${shape.h - edge * 2}px`,
      borderRadius: shape.radius,
      clipPath: shape.clip,
      background: hex(art.ground),
      color: hex(art.ink),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: `bold ${Math.round(size * (art.text.length > 3 ? 0.22 : art.text.length > 1 ? 0.3 : 0.44))}px ${SANS}`,
      letterSpacing: '0.02em',
    },
    art.text,
  );
  outer.append(inner);
  return outer;
}

interface Kept {
  at: number;
}

const KEY = 'ghost-light:stickers';
let book: Record<string, Kept> | undefined;

function load(): Record<string, Kept> {
  if (book) return book;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    book = parsed && typeof parsed === 'object' ? (parsed as Record<string, Kept>) : {};
  } catch {
    book = {};
  }
  return book;
}

function save(): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    // Full or refused. The page still holds it for this visit.
  }
}

/** How many stickers have been collected, of how many there are. */
export function stickerCount(): { got: number; total: number } {
  const b = load();
  return { got: STICKERS.filter((s) => b[s.id]).length, total: STICKERS.length };
}

/** Keep a sticker. The sticker, the first time; undefined if already kept or not one. */
export function collectSticker(id: string): Sticker | undefined {
  const sticker = STICKERS.find((s) => s.id === id);
  if (!sticker) return undefined;
  const b = load();
  if (b[id]) return undefined;
  b[id] = { at: Date.now() };
  save();
  return sticker;
}

/**
 * The stickers page of the album. The album's keys: arrows walk the page,
 * 1 2 3 turn the tab, ESC shuts the book.
 */
export function openStickers(host: HTMLElement, touch: boolean, tabs: Tabs): void {
  const size = touch ? 150 : 110;
  const cellW = size + 70;
  const columns = touch ? 4 : 4;
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

  const turn = (tab: Tab): void => {
    shut();
    tabs.go(tab);
  };
  page.append(...tabHeader(tabs, touch, touch ? 44 : 34, turn));

  const grid = el('div', { display: 'grid', gridTemplateColumns: `repeat(${columns}, ${cellW}px)`, gap: touch ? '30px 26px' : '26px 22px' });
  page.append(grid);

  const b = load();
  const cells: HTMLButtonElement[] = [];
  for (const sticker of STICKERS) {
    const got = b[sticker.id] !== undefined;
    const node = button('album-cell');
    node.style.cursor = 'default';
    const cell = el('div', {
      width: `${cellW}px`,
      height: `${size + 64}px`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      border: got ? '1px solid transparent' : '1px dashed rgba(255, 255, 255, 0.16)',
      borderRadius: '8px',
    });
    // One height for the art whatever its shape, so the stand names line up.
    const slot = el('div', { height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' });
    if (got) slot.append(stickerArt(sticker, size));
    else slot.append(el('div', { font: `28px ${SANS}`, color: 'rgba(255, 255, 255, 0.18)' }, '?'));
    cell.append(slot);
    cell.append(el('div', { font: `${touch ? 16 : 11}px ${MONO}`, color: got ? '#aab2b8' : '#6f777c' }, got ? sticker.where : `${sticker.where} · III. At Capacity`));
    node.append(cell);
    node.setAttribute('aria-label', got ? `Sticker from ${sticker.where}` : `Not collected yet: ${sticker.where}`);
    node.addEventListener('click', (event) => event.stopPropagation());
    cells.push(node);
    grid.append(node);
  }

  const close = button('album-close');
  Object.assign(close.style, {
    font: `${touch ? 18 : 12}px ${MONO}`,
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
  };
  const focusAt = (at: number): void => (at >= cells.length ? close : cells[at]).focus();
  const onKey = (event: KeyboardEvent): void => {
    event.stopImmediatePropagation();
    event.preventDefault();
    const code = event.code;
    if (event.repeat) return;
    const tab = tabForKey(code);
    if (tab && tab !== tabs.active) {
      turn(tab);
      return;
    }
    if (code === 'Escape') {
      shut();
      return;
    }
    const n = cells.length;
    const at = document.activeElement === close ? n : cells.indexOf(document.activeElement as HTMLButtonElement);
    if ((code === 'Enter' || code === 'Space') && at >= n) {
      shut();
      return;
    }
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    if (code in step) focusAt(Math.max(0, Math.min(n, (at < 0 ? 0 : at) + step[code])));
    else if (code === 'Tab') focusAt(((at < 0 ? 0 : at) + (event.shiftKey ? n : 1)) % (n + 1));
  };
  window.addEventListener('keydown', onKey, true);
  close.addEventListener('click', shut);
  root.addEventListener('click', (event) => {
    if (event.target === root || event.target === page) shut();
  });
  host.append(root);
  // Focus without scrolling to it, and start the page at the top: on a
  // phone focusing CLOSE scrolled the tabs out of sight.
  const first = 0;
  (first >= cells.length ? close : cells[first]).focus({ preventScroll: true });
  root.scrollTop = 0;
}
