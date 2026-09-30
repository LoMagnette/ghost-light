# Photographs

Drop the prints in here. Vite copies `public/` to the site root, so a
file called `room-8.png` is served at `photos/room-8.png` and the game builds
that path off `import.meta.env.BASE_URL` — which is what makes it survive
GitHub Pages serving the whole thing from a subdirectory.

Nothing here is wired by filename. Each photograph is named in
`src/chapters/objectives.ts`, on the `photo` field of the activity that earns
it, and until a `file` is given the screen draws its own frame with the
caption in it. **The game is complete and playable with no files in this
folder** — that is deliberate, so the size, the timing and the interruption
could be judged before the art existed.

To wire one up, add `file` beside the caption that is already there:

```ts
photo: { caption: 'Room 8 — Droid, in front of the letters', file: 'room-8.png' },
```

Each frame has exactly one robot in it, and only that robot can earn it —
the gate on the activity guarantees the print never shows a machine the
player did not bring. Shoot them that way.

| Activity | Robot in the frame | Caption | Suggested file |
|---|---|---|---|
| `photo-room8` | **Droid** | Room 8 — Droid, in front of the letters | `room-8.png` |
| `photo-bejug` | **Voxxy** | BOF 1 — Voxxy under the BeJUG banner | `bejug-banner.png` |
| `photo-josh` | **Biggy**, shaking hands with Josh | Exhibition hall — Josh Long shakes hands with Biggy | `josh-long.png` |
| `photo-group` | **all three**, with Venkat | Exhibition hall — all three, with Venkat Subramaniam | `group.png` |
| `selfie-dimitris` | **Voxxy**, with Dimitris | Central aisle — a selfie with Dimitris and Voxxy | `dimitris-selfie.jpeg` |

The selfie with Dimitris was `selfie: true` until 30 Sep, taken off the
game's own canvas the moment it was finished; it is the author's picture
now. It is 1024 × 571, so the frame crops its sides to 3:2 and it is a
little soft held up in the album on a high-density screen.

## What the frame wants

- **1500 × 1000, 3:2 landscape.** The print is 340 × 227 as it lands, and
  600 × 400 held up in the album (840 × 560 on a phone), which on a
  high-density screen is well over 1000 real pixels. 1500 × 1000 is sharp
  everywhere. Another shape is cropped to 3:2 to fill the frame.
- **PNG, full colour** (the author, 30 Sep). About 0.9–1.9 MB each, 6 MB for
  the four, all in the download. Not reduced to 256 colours as the portraits
  are: these are photographic, and a 256-colour Biggy bands visibly.
- Anything in `public/` ships to a public repo under the MIT `LICENSE`. Only
  put pictures in here that are ours to license — which, for photographs of
  real people at a real conference, means asking first.
