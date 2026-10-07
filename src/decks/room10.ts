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
      background: 'voxxy.png',
      title: 'Getting started?',
    },
    {
      title: 'It depends...',
      background: 'biggy.png',
    },
    {
      background: 'droid.png',
      title: 'Creativity?',
    },
    {
      background: 'end.png',
      title: 'Thank you!',
      subtitle: '',
    },
    {
      background: 'end.png',
      title: 'Have fun!',
      image: 'try-it.png',
      layout: 'left',
      subtitle: '',
    },
  ],
};
