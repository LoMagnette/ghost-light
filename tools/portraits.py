"""
Make the portraits the game ships from the author's originals.

    python3 tools/portraits.py

Reads every PNG in `portrait-sources/` (full size, not in the repository) and
writes a 512 x 512, 256-colour copy of it into `src/portraits/`, where the
game finds it by file name. 256 colours with dithering is indistinguishable
from full colour in these painted portraits, at about 170 KB against 1.5 MB:
every portrait is in the download, so that is 3 MB instead of 30.

Needs Pillow (`pip install pillow`). Anything in `portrait-sources/superseded/`
is left alone.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "portrait-sources"
OUT = ROOT / "src" / "portraits"
SIDE = 512

for source in sorted(SOURCES.glob("*.png")):
    picture = Image.open(source).convert("RGB").resize((SIDE, SIDE), Image.LANCZOS)
    small = picture.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    target = OUT / source.name
    small.save(target, "PNG", optimize=True)
    print(f"{source.name:34} {target.stat().st_size // 1024} KB")
