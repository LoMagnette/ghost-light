# Portraits

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
- **JPEG at about 80%**, around 40–60 KB. `.jpg`, `.png` and `.webp` work too.
- **Named as the game prints the name**: lower case, accents dropped, anything
  that is not a letter or a digit a hyphen. "Ana-Maria Mihalceanu" is
  `ana-maria-mihalceanu.jpeg`.

**Agreement first.** Everything here ships in a public, MIT-licensed
repository. Tick a row only once that person has said yes to their photograph
being in the game.

## Real people: a photograph each

| Person | Where | File | Agreed |
|---|---|---|---|
| Stephan Janssen | Chapter II, the host | `stephan-janssen.jpeg` | ☐ |
| James Gosling | Chapter II, a speaker in the corridor | `james-gosling.jpeg` | ☐ |
| Brian Goetz | Chapter II, a speaker in the corridor | `brian-goetz.jpeg` | ☐ |
| Gavin King | Chapter II, a speaker in the corridor | `gavin-king.jpeg` | ☐ |
| Rod Johnson | Chapter II, a speaker in the corridor | `rod-johnson.jpeg` | ☐ |
| Bruno Souza | Chapter II, to meet in the corridor | `bruno-souza.jpeg` | ☐ |
| Guillaume Laforge | Chapter II, to meet in the corridor | `guillaume-laforge.jpeg` | ☐ |
| Antonio Goncalves | Chapter II, to meet in the corridor | `antonio-goncalves.jpeg` | ☐ |
| Dimitris | Chapter III, the photographer | `dimitris.jpeg` | ☐ |
| Josh Long | Chapter III, the shot list | `josh-long.jpeg` | ☐ |
| Venkat Subramaniam | Chapter III, the group photo | `venkat-subramaniam.jpeg` | ☐ |
| Tom Cools | Chapter III, to meet in the hall | `tom-cools.jpeg` | ☐ |
| Brian Vermeer | Chapter III, to meet in the hall | `brian-vermeer.jpeg` | ☐ |
| Kevin Dubois | Chapter III, to meet in the hall | `kevin-dubois.jpeg` | ☐ |
| Alexander Chatzizacharias | Chapter III, to meet in reception | `alexander-chatzizacharias.jpeg` | ☐ |
| Alina Yurenko | Chapter III, to meet upstairs | `alina-yurenko.jpeg` | ☐ |
| Ana-Maria Mihalceanu | Chapter III, to meet upstairs | `ana-maria-mihalceanu.jpeg` | ☐ |
| Holly Cummins | Chapter III, to meet upstairs | `holly-cummins.jpeg` | ☐ |

`josh-long.jpeg` here is his face; the print of him with Biggy is a different
file, in `public/photos/`.

## Everyone else: optional

Not real people, so nothing to recognise and nobody to ask. Their initials
already work; a picture, if one is made, can be a close-up rendered from the
game's own model.

| Who | Where | File |
|---|---|---|
| Voxxy | Chapter I, the opening on the forecourt | `voxxy.jpeg` |
| Droid | the wormhole arrivals | `droid.jpeg` |
| Biggy | the Chapter III arrival | `biggy.jpeg` |
| The cat | Chapter I | `the-cat.jpeg` |
| The dog | Chapter I | `the-dog.jpeg` |
| Registration | Chapter III, the desk | `registration.jpeg` |
| Stand 11 | Chapter III, the stand crew | `stand-11.jpeg` |
| Steward | Chapter III, outside Room 8 | `steward.jpeg` |
