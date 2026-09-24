# Photographs

Drop the four prints in here. Vite copies `public/` to the site root, so a
file called `room-8.jpg` is served at `photos/room-8.jpg` and the game builds
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
photo: { caption: 'Room 8 — in front of the letters', file: 'room-8.jpg' },
```

| Activity | Caption | Suggested file |
|---|---|---|
| `photo-room8` | Room 8 — in front of the letters | `room-8.jpg` |
| `photo-bejug` | BOF 1 — the BeJUG banner | `bejug-banner.jpg` |
| `photo-josh` | Exhibition hall — with Josh Long | `josh-long.jpg` |
| `photo-group` | Exhibition hall — all three, with Venkat Subramaniam | `group.jpg` |

## What the frame wants

- **340 px wide**, shown at 1× on a 1280 × 720 canvas. A 3:2 print at
  1020 × 680 gives a clean 3× for a retina screen and nothing larger is worth
  the bytes.
- **3:2 landscape.** The placeholder is 340 × 226, and the real ones should
  match it or the frame will jump between shots.
- **JPEG**, quality ~82. These go in the bundle and the whole build is
  currently 628 kB; four photographs should not be the largest thing in it.
- Anything in `public/` ships to a public repo under the MIT `LICENSE`. Only
  put pictures in here that are ours to license — which, for photographs of
  real people at a real conference, means asking first.
