/**
 * A speaker's colour: the dialogue box's name and border, and their card in
 * the who's who. Out of `ChapterScreen` so that both read the same person
 * the same way.
 */

import type { Look } from '@/core/Crowd';

/**
 * Which of somebody's colours the dialogue box borrows.
 *
 * The rule used to be "the shirt", and the rule used to work, because the
 * shirts were invented. They are off photographs now, and three of the five
 * people in Chapter II's corridor turn out to wear black — so three names
 * came up the same washed grey, and a box that is meant to say WHO is
 * speaking said nothing three times out of five.
 *
 * So it takes whichever of their colours is furthest from grey: the amber
 * glasses, the ochre hair, the blue-grey shirt. That is the same thing a
 * person does when they point somebody out across a room, and it lands on a
 * different answer for each of the five.
 *
 * When everything about somebody IS grey, grey is the honest answer and it
 * survives the lift: a white-haired man in a black t-shirt has a silver
 * name, and that is a description of him rather than a failure to find one.
 */
export function ink(look: Look): number {
  const saturation = (colour: number): number => {
    const r = (colour >> 16) & 0xff;
    const g = (colour >> 8) & 0xff;
    const b = colour & 0xff;
    const high = Math.max(r, g, b);
    return high === 0 ? 0 : (high - Math.min(r, g, b)) / high;
  };
  let best = look.shirt ?? 0x9aa0a6;
  for (const colour of [look.hair, look.glasses]) {
    if (colour !== undefined && saturation(colour) > saturation(best)) best = colour;
  }
  return best;
}

/**
 * A colour, pulled up until it can be read as text on a dark box.
 *
 * Not `shade`, which multiplies: a very dark navy multiplied by three is a
 * slightly less dark navy. This mixes toward white instead, so every shirt
 * arrives at about the same legibility whatever it started at, and keeps its
 * hue on the way.
 */
export function lift(colour: number): number {
  const mixTo = (channel: number): number => Math.round(channel + (255 - channel) * 0.52);
  return (
    (mixTo((colour >> 16) & 0xff) << 16) |
    (mixTo((colour >> 8) & 0xff) << 8) |
    mixTo(colour & 0xff)
  );
}
