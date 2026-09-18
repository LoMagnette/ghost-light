# Assets

## Supplied by the competition

Download from <https://game.devoxx.be/references.html> into `references/`.
These are Devoxx's files, not ours — they are **not** covered by this
repository's MIT licence, and large ones should stay out of the bundle.

### Robot model sheets

| File | Size |
|---|---|
| `references/robots/voxxy-robot.png` | 2752 × 1536, 5.1 MB |
| `references/robots/droid-robot.png` | 1376 × 768, 1.3 MB |
| `references/robots/biggy-robot.png` | 2752 × 1536, 4.0 MB |

Multi-angle orthographic turnarounds — the correct input for generating
8-direction sprite sheets.

### Floor plans

| File | Level |
|---|---|
| `references/venue/maps/hollywood-area.png` | Exhibition hall, raw |
| `references/venue/maps/exhibition-floor.jpg` | Exhibition hall, annotated |
| `references/venue/maps/cinema-venue-devoxx.png` | Auditoriums, raw |
| `references/venue/maps/devoxx-rooms.jpg` | Auditoriums, annotated |

**Done 18 Sep.** `src/venue/kinepolis.ts` is now built from these rather than
invented. Neither plan has a scale bar — `hollywood-area.png` says "no scale"
— so the hall is scaled from its printed area (2411.41 m²) and every
auditorium from its printed seat count. `npm run venue` re-checks it.

### Photographs and footage

14 venue photographs, copyleft, usable freely as texture and lighting
reference. Thousands more in the [BeJUG Flickr
archive](https://www.flickr.com/photos/bejug/albums/) — including earlier
editions, which is where era-accurate reference for Chapter II comes from.

Four unlisted drone flights give scale, ceiling heights and how one space opens
into the next. A plan gives layout; the footage gives volume.

## Palette source

**Done 18 Sep.** Every colour in `src/chapters/registry.ts` is measured off a
photograph and carries the frame it came from. Surfaces were read as material
colours and light sources as their brightest pixels, because the renderer
multiplies the palette by the chapter's light level — pre-dimming the palette
as well made Chapter I a black rectangle you could not play.

| Measured | Colour | From |
|---|---|---|
| Corridor carpet, dark | `#444c58` | `54051896620` |
| Concourse carpet, grey | `#777773` | `54051697728` |
| Concrete + painted wall | `#a7a7a1` | `54051697728` |
| White wall, lit | `#dbe1e4` | `54051896620` |
| Slatted warm wood | `#744724` | `54051914325` |
| Auditorium floor | `#1f2231` | `54835146677` |
| Hall floor under a crowd | `#2a2e31` | `54051774449` |
| **Red LED step strips** | `#f24471` | `54836329465` |
| Registration lamp, tungsten | `#eb9760` | `54051914325` |
| Hall cove at capacity | `#c8895f` | `54051774449` |

Taken from the photographs, not invented:

| Space | Reads as |
|---|---|
| Exhibition hall | White canopy, warm cove lighting, regular column grid |
| Corridors | Dark carpet, pendant disc lights, exposed concrete |
| Auditoriums | Raked seating, blue/red wall wash, **red LED step strips** |
| Registration | Slatted warm wood, grey carpet, curved cast concrete |
| Entrance, after dark | Canopy lit pink and blue |

## To generate

- [ ] Voxxy — 8 facings × (idle, walk, run)
- [ ] Droid — 8 facings × (idle, walk, run) + reach
- [ ] Biggy — 8 facings × (idle, walk, run) + shove
- [ ] Crowd NPC — needs to read at density 1.0 without killing the framerate
- [ ] Footfall audio, per robot — the highest-value sound in the game

## Rules

1. **The Robot Lab reference robot is not shippable in any form.** An entry
   that is that robot repainted scores zero of the 40 originality points.
2. Generated sprites go in `public/assets/`. Working files stay in
   `art/_work/`, which is git-ignored.
3. Keep the deployed bundle small. Judges load the hosted build first.
