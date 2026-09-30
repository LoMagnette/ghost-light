# Portraits

All eighteen real people, the cat and the dog have their portrait in (30 Sep).

Drop a picture here and it appears in the dialogue box beside whoever is
speaking, and on their card in the who's who. Nothing needs wiring: the game
finds it by file name at build time (see `src/app/portraits.ts`). Until a
picture exists, the frame shows their initials in their colour.

## The picture

**The real person, recognisable.** Their actual photograph, in full colour and
untreated: a face someone at Devoxx would know at a glance.

- **Square, 512 × 512.** The largest it is drawn is the who's who card held up
  on a phone or a high-density screen, about 600 real pixels; 512 is sharp
  there and everywhere smaller (92 px in the dialogue box). Under 400 goes soft.
- **Head and shoulders.** Top of the head near the top edge, eyes about a third
  of the way down, the face filling roughly 60% of the frame. Smaller than that
  and nobody is recognisable at 92 px.
- **Their own headshot**, facing the camera and lit from the front. The speaker
  photo on the Devoxx site is usually exactly this, and it is the picture
  people already know them by. No group shots, sunglasses, or strong back or
  side light.
- **PNG.** Put the full-size original in `portrait-sources/` (not in the
  repository) and run `python3 tools/portraits.py`: it writes the 512 × 512,
  256-colour copy the game ships into this folder, about 170 KB each. Keep one
  file per person: with two, which one shows is not defined.
- **Named as the game prints the name**: lower case, accents dropped, anything
  that is not a letter or a digit a hyphen. "Ana-Maria Mihalceanu" is
  `ana-maria-mihalceanu.png`.

**Agreement first.** Everything here ships in a public, MIT-licensed
repository. Tick a row only once that person has said yes to their photograph
being in the game.

## Real people: a photograph each

| Person | Where | File | Agreed |
|---|---|---|---|
| Stephan Janssen | Chapter II, the host | `stephan-janssen.png` | ☑ |
| James Gosling | Chapter II, a speaker in the corridor | `james-gosling.png` | ☑ |
| Brian Goetz | Chapter II, a speaker in the corridor | `brian-goetz.png` | ☑ |
| Chet Haase | Chapter II, a speaker in the corridor | `chet-haase.png` | ☑ |
| Rod Johnson | Chapter II, a speaker in the corridor | `rod-johnson.png` | ☑ |
| Bruno Souza | Chapter II, to meet in the corridor | `bruno-souza.png` | ☑ |
| Guillaume Laforge | Chapter II, to meet in the corridor | `guillaume-laforge.png` | ☑ |
| Antonio Goncalves | Chapter II, to meet in the corridor | `antonio-goncalves.png` | ☑ |
| Dimitris | Chapter III, the photographer | `dimitris.png` | ☑ |
| Josh Long | Chapter III, the shot list | `josh-long.png` | ☑ |
| Venkat Subramaniam | Chapter III, the group photo | `venkat-subramaniam.png` | ☑ |
| Tom Cools | Chapter III, to meet in the hall | `tom-cools.png` | ☑ |
| Brian Vermeer | Chapter III, to meet in the hall | `brian-vermeer.png` | ☑ |
| Kevin Dubois | Chapter III, to meet in the hall | `kevin-dubois.png` | ☑ |
| Alexander Chatzizacharias | Chapter III, to meet in reception | `alexander-chatzizacharias.png` | ☑ |
| Alina Yurenko | Chapter III, to meet upstairs | `alina-yurenko.png` | ☑ |
| Ana-Maria Mihalceanu | Chapter III, to meet upstairs | `ana-maria-mihalceanu.png` | ☑ |
| Holly Cummins | Chapter III, to meet upstairs | `holly-cummins.png` | ☑ |

`josh-long.png` here is his face; the print of him with Biggy is a different
file, `public/photos/josh-long.png`.

## Everyone else: optional

Not real people, so nothing to recognise and nobody to ask. Their initials
already work; a picture, if one is made, can be a close-up rendered from the
game's own model.

| Who | Where | File |
|---|---|---|
| Voxxy | Chapter I, the opening on the forecourt | `voxxy.png` |
| Droid | the wormhole arrivals | `droid.png` |
| Biggy | the Chapter III arrival | `biggy.png` |
| The cat | Chapter I | `the-cat.png` |
| The dog | Chapter I | `the-dog.png` |
| Registration | Chapter III, the desk | `registration.png` |
| Stand 11 | Chapter III, the stand crew | `stand-11.png` |
| Steward | Chapter III, outside Room 8 | `steward.png` |
