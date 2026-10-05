# Decks

The talk in Room 10. Find Loïc on the stage in Chapter III, say hello, and the
deck opens almost full screen over the building, which waits: the clock, the
crowd and the robots stop until it is closed. Talk to him again for the talk
again, on the slide it was left on.

Straight there: `?chapter=capacity&at=37.4,6.5,1`.

## Writing it

The slides are `room10.ts`, one object per slide. Every field is optional and
any mix works; `Slide` in `index.ts` documents them.

```ts
{ background: 'stage.jpg', title: 'Big idea', subtitle: 'and a smaller one' },
{ title: 'Three things', bullets: ['one', 'two', 'three'], build: true, notes: 'say this' },
{ background: 'diagram.png', fit: 'contain' },          // a picture, whole
{ background: 'crowd.jpg', layout: 'bottom', title: 'A caption' },
{ layout: 'left', title: 'Code', code: 'record Robot(String name) {}' },
```

Pictures go in `images/` and are named by file name. Any of jpg, png, webp,
gif, svg, avif. A full URL works too. A name with no file shows as a dashed
frame saying which file is missing. Keep them around 1600 × 900 and a few
hundred KB: they ship in the game and its offline cache.

In text and bullets, `` `code` `` and `**bold**` work.

A second deck is a second file, added to `DECKS` in `index.ts` and named by
`deck:` on any `talk` activity.

## Presenting

| | |
|---|---|
| → ↓ SPACE PAGE DOWN E | next (or next bullet) |
| ← ↑ PAGE UP BACKSPACE | back |
| HOME / END | first / last |
| G | every slide; arrows and ENTER to jump |
| N | speaker notes |
| B or . | black screen; any key back |
| F | full screen |
| ESC or Q | back to the conference |

A presenter's clicker sends PAGE UP / PAGE DOWN (some send `.` for black),
so it works. With a mouse or on a phone, tap the right two thirds for next
and the left third for back, or swipe.
