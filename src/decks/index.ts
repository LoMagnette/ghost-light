/**
 * Slide decks, as data.
 *
 * A conversation can end in a talk (`TalkActivity.deck`), and the talk is one
 * of these: a list of slides, each a background picture and some words, or
 * either alone. `app/Deck.ts` shows them; this says what they are.
 *
 * Pictures are found by FILE NAME, at build time, from `src/decks/images/`,
 * the same bargain as the portraits: drop a file in, name it on a slide, and
 * nothing else needs wiring. A name with no file behind it shows as a dashed
 * frame with the name in it rather than a 404, so a deck can be written
 * before its pictures exist.
 */

import { ROOM_10_DECK } from './room10';

export interface Slide {
  /**
   * The picture behind the slide: a file name in `src/decks/images/`
   * (`'venue.jpg'`), or a full URL. It fills the slide.
   */
  background?: string;
  /** `cover` (the default) fills the slide and crops; `contain` shows all of it, letterboxed. */
  fit?: 'cover' | 'contain';
  /**
   * How much the picture is darkened, 0..1, so the words stay readable.
   * Defaults to 0.45 when a slide has both a picture and words, 0 otherwise.
   */
  shade?: number;
  /** The slide's own colour, behind or instead of a picture. CSS. Default near-black. */
  color?: string;
  /** Where the words sit. `center` is the default. */
  layout?: 'center' | 'left' | 'bottom';

  title?: string;
  subtitle?: string;
  /** Paragraphs, one per entry. */
  text?: string | string[];
  bullets?: string[];
  /** Reveal the bullets one press at a time rather than all at once. */
  build?: boolean;
  /** A block of code, set in monospace and kept as written. */
  code?: string;
  /** For the speaker only: N shows them under the slide. */
  notes?: string;
}

export interface Deck {
  title: string;
  slides: Slide[];
}

/** Every deck a conversation may name, by the key it names it with. */
export const DECKS: Record<string, Deck> = {
  'room-10': ROOM_10_DECK,
};

const images = import.meta.glob('./images/*.{jpeg,jpg,png,webp,gif,svg,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(images)) byName.set(path.split('/').pop() ?? '', url);

/** The URL a slide's `background` names, or undefined if there is no such file. */
export function slideImage(name: string): string | undefined {
  if (/^(https?:|data:|blob:)/.test(name)) return name;
  return byName.get(name);
}
