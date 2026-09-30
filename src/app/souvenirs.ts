/**
 * The souvenir album: prints, the who's who and stickers in one book, one
 * tab each. The one door every screen opens it by. See `tabs.ts`.
 */

import { albumCount, openAlbum } from './album';
import { castCount, openCast } from './cast';
import { openStickers, stickerCount } from './stickers';
import type { Tab, Tabs } from './tabs';

export type { Tab } from './tabs';

/** Everything in the album so far, per tab, for a button that opens it. */
export function souvenirCounts(): Record<Tab, string> {
  const p = albumCount();
  const c = castCount();
  const s = stickerCount();
  return { prints: `${p.taken}/${p.total}`, people: `${c.met}/${c.total}`, stickers: `${s.got}/${s.total}` };
}

/** Everything in the album, all tabs together: "6/36". */
export function souvenirTotal(): string {
  const p = albumCount();
  const c = castCount();
  const s = stickerCount();
  return `${p.taken + c.met + s.got}/${p.total + c.total + s.total}`;
}

/** Open the album on this tab, over whatever is on screen. */
export function openSouvenirs(host: HTMLElement, touch: boolean, tab: Tab = 'prints'): void {
  const tabs: Tabs = { active: tab, counts: souvenirCounts(), go: (next) => openSouvenirs(host, touch, next) };
  if (tab === 'prints') openAlbum(host, touch, tabs);
  else if (tab === 'people') openCast(host, touch, undefined, tabs);
  else openStickers(host, touch, tabs);
}
