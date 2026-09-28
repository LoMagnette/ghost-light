# Audio

Decided 27 Sep, three days before the deadline. Nothing in the game makes a
sound yet; this is the plan for all of it, and the list of what the author
supplies.

## The decisions

| Question | Answer |
|---|---|
| Where the sound comes from | **Mixed.** The robots and the UI are synthesised in code; ambience and music are files the author generates or picks |
| What matters for the deadline | **All four:** the robots' weight, ambience per era, gameplay cues, music and story stings, in that order of priority |
| What the music feels like | **It follows the eras:** Chapter I sparse and melancholy, Chapter II warm and slightly retro, Chapter III upbeat and tighter as the clock runs down |

**Why mixed.** The simulation already reports every footfall and every impact
with its momentum; the camera shake reads them. A robot's sounds synthesised
from that number are its mass made audible, exactly, with no asset to fit —
which is the realism points, and is also why no file could do it as well.
Ambience and music are the opposite: texture and taste, where a good
recording beats anything a few oscillators can do in three days.

**Licensing.** Everything under `src/` ships in a public, MIT-licensed repo.
Synthesised sound is ours by construction. Files must be ours to license:
generated with a tool whose terms allow publishing them, or CC0. Each file's
source goes in `docs/PROMPTS.md`, which is where the genAI points are.

## 1. The robots: weight you can hear — synthesised

Driven by the events the sim already emits, scaled by momentum, per robot.

| Sound | Voxxy (45 kg) | Droid (190 kg) | Biggy (430 kg) |
|---|---|---|---|
| Footfall | light plastic tick, high | metallic clank, mid | deep thud with a sub-bass thump |
| Motor | thin whine, pitch rising fast with speed | mid servo hum | low drone that takes its time to rise |
| Braking | a squeak | a hiss | a long groan — it needs 3.8 m to stop |
| Impact | a knock | a clang | a boom, loud enough to be a mistake |
| Stairs | a quicker, brighter step on the treads | a careful double-step (it clears the riser by nothing) | — (it never climbs) |
| Carrying | — | a rattle when a load shifts | a creak under the keg |

## 2. Ambience per era — files

Volume follows `crowdDensity`, the same one number that fills the building:
empty, sparse, packed.

- **Chapter I:** room tone of an empty building, ventilation, drips from the
  damp, the buzz of the ghost light. Nearly silence.
- **Chapter II:** a sparse crowd murmur, warm hum, now and then a distant
  PA.
- **Chapter III:** a packed conference hall; applause spilling out of rooms.

## 3. Gameplay cues — synthesised, positioned

- **Chapter II breakdowns heard from their room's direction** before they
  are seen: mic feedback, a projector fan whining, the murmur of an
  overfull room. It also answers the off-screen problem the arrows do.
- A tick in a job's last ten seconds; a short chime when a job is done; a
  low tone when a room empties.

## 4. Music and story stings

- **Music — files**, one loop per chapter plus the menu, crossfaded on
  change. Chapter III can add a tension layer for its last minute.
- **Stings — synthesised:** the wormhole's rising whoosh on the way in, a
  reverse swell and a thud on landing, a shimmer as a robot splits; a camera
  shutter for the prints; a short blip per character in the dialogue box,
  pitched per speaker — the non-verbal voice `ROADMAP.md` parked, which
  makes no claim to be anybody's real voice.

## What the author supplies

Dropped into **`src/audio/`** and found by file name at build time, the way
portraits are — nothing to wire per file, and a missing one is simply
silent.

| File | What | Notes |
|---|---|---|
| `ambience-silence.ogg` | Chapter I: an empty building's room tone | Seamless loop, 30–60 s |
| `ambience-javapolis.ogg` | Chapter II: a sparse crowd, warm hum | Seamless loop, 30–60 s |
| `ambience-capacity.ogg` | Chapter III: a packed conference hall | Seamless loop, 30–60 s |
| `applause.ogg` | Applause from inside a room | One-shot, 3–6 s |
| `music-menu.ogg` | The menu | Loop, 1–2 min |
| `music-silence.ogg` | Chapter I: sparse, melancholy — pad or piano | Loop, 1–2 min |
| `music-javapolis.ogg` | Chapter II: warm, slightly retro, around 2006 | Loop, 1–2 min |
| `music-capacity.ogg` | Chapter III: upbeat | Loop, 1–2 min |
| `music-capacity-tense.ogg` | Chapter III's last minute, layered on top | Optional; same tempo and key as the above |

**Format.** `.ogg` (Vorbis or Opus) for size; `.mp3` works too. 44.1 or
48 kHz. Loops cut on a zero crossing so they do not click. Mixed quietly —
the synthesised robots sit on top. Each file is fetched the first time it
is wanted, so a big one delays only its own chapter's music, but keep the
folder to a few MB all the same: it is what a judge downloads.

**Built 28 Sep (`audio` branch):** the engine, the unlock on the first key
or click, M to mute (remembered), and music and ambience playback per
chapter with a 2.2 s crossfade that carries through the wormholes. The menu
plays `music-menu`, or Chapter I's track if there is none. Checked in a
headless browser with three test tones: nothing before the first key, the
same track carries from the menu into Chapter I without restarting, Chapter
II crossfades to its own, and mute survives a reload. Not yet built:
everything synthesised, and the Chapter III tension layer.

**The three tracks, 28 Sep.** Supplied by the author as `.mp3`, made with
Suno (the files' own tags say so):

| File | Title | Length | At the loop |
|---|---|---|---|
| `music-silence.mp3` | *forgotten technology* | 75.2 s | fades out over about 2 s and back in over 2 s: a breath every 75 s, which suits the chapter |
| `music-javapolis.mp3` | *Tech Conference Groove* | 74.9 s | near seamless |
| `music-capacity.mp3` | *Conference Groove* | 75.1 s | drops for its last second: a short dip every 75 s |

**Synthesised, 28 Sep (`src/app/sfx.ts`).** No files; all of it is
oscillators and filtered noise, heard from the camera (panned across the
screen, fading with distance, nothing from the other storey):

| Sound | When | Voxxy · Droid · Biggy |
|---|---|---|
| Footfall | every step the sim reports, level by momentum | tick · clank · sub thump |
| Impact | every collision, level by momentum | knock · clang · boom |
| Motor | always, pitch and level by speed, silent standing still | high whine, quick · mid hum · low drone, slow to rise |
| Job done | a status turns `done` | two notes up |
| Job missed, room lost | `missed` or `failed` | low, falling |
| Pick up · put down | a haul turns `carried`, and back | blip up · thunk down |
| Countdown | each of the last 10 s of the nearest deadline or the day's clock | tick; sharper in the last 3 |
| Speech | every other letter as a line types | a blip pitched per speaker, from their name; robots fixed high to low |
| Photograph | a print lands | shutter |
| Wormhole | leaving: a rising roar; arriving: each robot lands with its own impact, and a shimmer as one splits | |

**First listen, 28 Sep.** The author: music in II and III too loud to hear
the sounds, and Voxxy annoying. II's and III's tracks now play at half
level (`TRIM` in `audio.ts`); Voxxy's step is a soft 620 Hz tap instead of
a 1.7 kHz tick, and its motor a filtered hum topping out at 440 Hz instead
of a sawtooth at 880.

Not yet: brakes, stairs, loads rattling, the Chapter II breakdowns heard
from their room, the cats. Checked headless by counting nodes started while
driving each robot in the lab (Voxxy about 8 steps in 3 s, Droid 5, Biggy
2) with no errors; how it SOUNDS is for a person to judge.

Measured by decoding each in a browser and reading the level second by
second across the end and the start. Mixed loud (about −16 dBFS), so the
music bus sits at 0.55.

## How it will work

- One audio module owning a Web Audio context, with a music bus, an
  ambience bus and an effects bus under a master.
- **Unlocked on the first key or click** — browsers refuse to play audio
  before a gesture, and the menu is where the first one happens.
- **M** mutes; the setting is remembered per browser, like the graphics
  switch.
- Positioned sounds are panned and attenuated from where the camera looks,
  so a breakdown to the left is heard on the left.
- The screen reads the sim's footfall and impact events that already drive
  the camera shake; nothing new enters `core/`.

## Order of work

1. Engine, unlock, mute, buses — and the robots' footfalls and impacts.
2. Motors, brakes, stairs, loads.
3. Ambience playback, and the per-era levels.
4. Breakdown cues, deadline tick, done chime.
5. Music playback and crossfades; stings; dialogue blip; shutter.

1 and 2 need no files, so they can start at once. 3 and 5 are silent until
their files land and need no change when they do.

**Verification is by ear.** The headless browser can check the audio graph
builds and nothing errors; only a person can say whether Biggy sounds like
430 kg.
