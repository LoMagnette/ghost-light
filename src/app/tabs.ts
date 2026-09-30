/**
 * The album's tabs: prints, the who's who and stickers, one book.
 *
 * Each tab is still its own page (`album.ts`, `cast.ts`, `stickers.ts`) with
 * its own grid and keys; what they share is this header, which names all
 * three with their counts, and the keys that turn between them: 1, 2, 3, or
 * a click. Turning a tab shuts one page and opens the next in its place.
 */

import { el, MONO, SANS } from './dom';

export type Tab = 'prints' | 'people' | 'stickers';

export const TAB_ORDER: readonly Tab[] = ['prints', 'people', 'stickers'];

const TAB_NAME: Record<Tab, string> = { prints: 'Prints', people: "Who's who", stickers: 'Stickers' };

export interface Tabs {
  active: Tab;
  /** Open this tab, the current page having shut itself. */
  go: (tab: Tab) => void;
  /** "2/5", per tab. */
  counts: Record<Tab, string>;
}

/** The tab a key turns to, if it is one of the three. */
export function tabForKey(code: string): Tab | undefined {
  const at = ['Digit1', 'Digit2', 'Digit3'].indexOf(code);
  return at < 0 ? undefined : TAB_ORDER[at];
}

/**
 * The top of every page of the album: the book's name, and the three tabs.
 * `turn` is the page's own: it shuts the page, then opens the tab.
 */
export function tabHeader(tabs: Tabs, touch: boolean, title: number, turn: (tab: Tab) => void): HTMLElement[] {
  const row = el('div', { display: 'flex', gap: touch ? '14px' : '10px', margin: '14px 0 26px' });
  TAB_ORDER.forEach((tab, i) => {
    const on = tab === tabs.active;
    const node = el('div', {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: touch ? '9px 18px' : '6px 14px 6px 8px',
      borderRadius: '4px',
      border: `1px solid ${on ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.12)'}`,
      background: on ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      color: on ? '#f2f5f7' : '#8d959b',
      font: `${touch ? 18 : 13}px ${SANS}`,
      cursor: on ? 'default' : 'pointer',
    });
    if (!touch) {
      node.append(
        el(
          'span',
          { padding: '0 5px', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '3px', font: `bold 11px ${MONO}`, color: on ? '#eef2f4' : '#8d959b' },
          String(i + 1),
        ),
      );
    }
    node.append(el('span', {}, TAB_NAME[tab]), el('span', { color: '#6f777c', font: `${touch ? 16 : 12}px ${MONO}` }, tabs.counts[tab]));
    if (!on) {
      node.addEventListener('click', (event) => {
        event.stopPropagation();
        turn(tab);
      });
    }
    row.append(node);
  });
  return [
    el('div', { font: `12px ${MONO}`, color: '#6f777c', letterSpacing: '0.24em' }, 'GHOST LIGHT'),
    el('div', { font: `${title}px ${SANS}`, color: '#f2f5f7', margin: '6px 0 0' }, 'Collectables'),
    row,
  ];
}
