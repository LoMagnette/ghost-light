"""
Make the stickers the game ships from the author's originals.

    python3 tools/stickers.py

Reads every PNG in `sticker-sources/` (full size, not in the repository),
fits it into a transparent square, and writes a 384 x 384 copy into
`src/stickers/` under the same name. Transparency is kept: a sticker is its
die-cut shape and nothing else. See `src/stickers/README.md`.

Needs Pillow (`pip install pillow`).
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "sticker-sources"
OUT = ROOT / "src" / "stickers"
SIDE = 384

for source in sorted(SOURCES.glob("*.png")):
    picture = Image.open(source).convert("RGBA")
    # Onto a square, centred, whatever the original's proportions.
    edge = max(picture.size)
    square = Image.new("RGBA", (edge, edge), (0, 0, 0, 0))
    square.paste(picture, ((edge - picture.width) // 2, (edge - picture.height) // 2))
    small = square.resize((SIDE, SIDE), Image.LANCZOS)
    target = OUT / source.name
    small.save(target, "PNG", optimize=True)
    print(f"{source.name:20} {target.stat().st_size // 1024} KB")
