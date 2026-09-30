# Stickers

The author's sticker art for the album's Stickers tab: one per stand on
Chapter III's sticker round. The game finds each by file name at build time
(see `src/app/stickers.ts`). A stand with no file keeps its drawn placeholder,
so they can be added one at a time.

## The picture

- **PNG with a transparent background**, square. The sticker's own shape and
  its white die-cut edge are in the picture; everything outside the shape is
  transparent. The game adds a slight tilt and a shadow, so leave those out.
- **A little margin**: about 6% transparent space on each side, so the tilt
  does not clip a corner.
- **Named by stand**, in the order of the round: `stand-1.png` … `stand-8.png`.

## Adding them

Put the full-size originals in `sticker-sources/` at the repository root (it
is git-ignored), then run:

    python3 tools/stickers.py

It writes a 384 × 384 copy of each into this folder, transparency kept,
which is what the game ships. Needs Pillow (`pip install pillow`).

| Stand | File |
|---|---|
| 1 | `stand-1.png` |
| 2 | `stand-2.png` |
| 3 | `stand-3.png` |
| 4 | `stand-4.png` |
| 5 | `stand-5.png` |
| 6 | `stand-6.png` |
| 7 | `stand-7.png` |
| 8 | `stand-8.png` |
