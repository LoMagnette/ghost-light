# Portraits

Drop a picture here and it appears in the dialogue box beside whoever is
speaking. Nothing needs wiring: the game finds it by file name at build
time (see `src/app/portraits.ts`). Until a picture exists, the frame shows
the speaker's initials in their colour.

**Square**, about **256 × 256**. It is shown at 92 px, so 256 is sharp on a
retina screen and anything bigger is wasted bytes. `.jpeg`, `.jpg`, `.png`
or `.webp`. It is cropped to fill the frame, so keep the face in the middle.

| Speaker | Where | File |
|---|---|---|
| Voxxy | Chapter I, the opening on the forecourt | `voxxy.jpeg` |
| The cat | Chapter I | `the-cat.jpeg` |
| The dog | Chapter I | `the-dog.jpeg` |
| Stephan Janssen | Chapter II, the host | `stephan-janssen.jpeg` |
| James Gosling | Chapter II, a speaker | `james-gosling.jpeg` |
| Brian Goetz | Chapter II, a speaker | `brian-goetz.jpeg` |
| Gavin King | Chapter II, a speaker | `gavin-king.jpeg` |
| Rod Johnson | Chapter II, a speaker | `rod-johnson.jpeg` |
| Registration | Chapter III, the desk | `registration.jpeg` |
| Stand 11 | Chapter III, the stand crew | `stand-11.jpeg` |
| Steward | Chapter III | `steward.jpeg` |
| Dimitris | Chapter III, the photographer | `dimitris.jpeg` |
| Droid | the wormhole arrivals | `droid.jpeg` |
| Biggy | the Chapter III arrival | `biggy.jpeg` |

Everything here ships in a public, MIT-licensed repository. Pictures of real
people need their agreement first.
