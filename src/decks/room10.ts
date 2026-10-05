/**
 * The talk in Room 10, which Loïc gives when a robot finds him on its stage.
 *
 * A starting point to write over: one slide of each kind the deck can show.
 * See `Slide` in `./index.ts` for every field. Pictures go in `./images/`
 * and are named here by file name.
 */

import type { Deck } from './index';

export const ROOM_10_DECK: Deck = {
  title: 'Room 10',
  slides: [
    {
      background: 'room-10.jpg',
      title: 'Ghost Light',
      subtitle: 'Loïc Magnette · Room 10 · Devoxx Belgium 2026',
    },
    {
      title: 'A slide with words only',
      text: [
        'No picture behind this one, just the slide colour.',
        'Paragraphs are one entry each in `text`.',
      ],
    },
    {
      background: 'room-10.jpg',
      layout: 'left',
      title: 'Bullets, one at a time',
      bullets: ['`build: true` reveals them one press at a time', 'Back steps them away again', 'Useful for not reading ahead of yourself'],
      build: true,
      notes: 'Speaker notes: press N to show or hide them.',
    },
    {
      layout: 'left',
      title: 'Some code',
      code: [
        'export const ROOM_10_DECK: Deck = {',
        "  title: 'Room 10',",
        '  slides: [',
        "    { background: 'room-10.jpg', title: 'Ghost Light' },",
        '  ],',
        '};',
      ].join('\n'),
    },
    {
      background: 'room-10.jpg',
      layout: 'bottom',
      title: 'A picture, captioned',
      text: 'The `bottom` layout keeps the words out of the way of the picture.',
    },
    {
      background: 'room-10.jpg',
      fit: 'contain',
    },
    {
      title: 'Thank you',
      subtitle: 'ESC to go back to the conference',
    },
  ],
};
