# Ghost Light

**Three robots. One cinema. Three eras.**

> A *ghost light* is the single bulb a theatre leaves burning on an empty
> stage overnight, so the place is never completely dark. Part superstition,
> part practicality, and entirely a kindness to whoever comes in next.

An entry for [The Robot Games](https://game.devoxx.be/game.html), a Devoxx
Belgium competition. Voxxy, Droid and Biggy walk the Kinepolis Antwerp across
three chapters of the same building — and the way you control them changes with
each one.

> **▶ Play it now: <https://lomagnette.github.io/ghost-light/>**

---

## Run it locally

Requires **Node 22 or newer**.

```bash
git clone <this-repo>
cd devoxx-game
npm install
npm run dev
```

Open <http://localhost:8080>. That is the whole setup — no engine to install,
no account, no build step to run by hand.

## Controls

| Key | Action |
|---|---|
| `W` `A` `S` `D` / arrows | Move (screen-relative) |
| `SHIFT` | Brake — a real brake, not just letting go |
| `E` | Talk to whoever the prompt names, and page through what is said (`SPACE` and `ENTER` page too) |
| `TAB` | Switch robot *(chapters II and III)* |
| `SPACE` | Put down what you are carrying *(chapters II and III)* |
| `1` `2` `3` | Take control of a robot, where more than one is present |
| `ESC` | Pause: Resume, Album, Restart, or Leave run (the last two lose the run) |
| `R` | Restart the chapter (asks first) |
| `M` | Sound on or off |
| `F1` | Debug readout: mass, speed, momentum, stopping distance |

On the menu, and on the card at the end of a chapter:

| Key | Action |
|---|---|
| `←` `→`, `ENTER` | Choose a chapter, and begin. Start with Chapter I |
| `P` | The album: prints, the who's who and stickers, one tab each (`1` `2` `3` turn the tab) |
| `C` | The album, open on the who's who |
| `I` | Replay the title sequence |
| `G` | Graphics: high (shadows, mood) or low (flat, fastest) |
| `L` | Movement lab: all three robots in one lit hall |

**On a phone**, held sideways: drag anywhere on the left to move (a
"Drag here to move" ghost shows where, until the first time). On the right,
the buttons sit where a controller's face buttons do: TALK at the bottom,
BRAKE on the right, and in chapters II and III DROP on the left and ROBOT on
top. SOUND and PAUSE are at the top. Tap a dialogue box to page it. Turning
the phone upright pauses the game.

Movement is screen-relative: `W` moves the robot up the screen. Hold `SHIFT` to
brake — and notice that Biggy does not stop when you ask it to.

## What's in it

**Three chapters**, one building:

- **I. The Silence** (*later*). The Kinepolis, empty and dark. Voxxy alone,
  switching the power back on board by board, with a cat that ends the game
  unless you find the dog, and every other cat in the building following you.
- **II. JavaPolis** (*the early years*). The conference's first home, half the
  building and more people than expected. Voxxy and Droid keep six rooms
  running through a day of breakdowns, each one a job for a particular shape
  of robot; `TAB` swaps between them.
- **III. At Capacity** (*the full house*). Devoxx now. All three robots, nine
  things worth doing and a day too short for them, plus side quests: a
  photographer's shot list, a keynote, a keg for the party stage.

Each chapter changes four things only: the light, how full the building is,
how you control the robots, and what you are there to do. The rest is the
same building to the centimetre.

**The way the screen helps.** The card at the top right lists the jobs, and
each open one has a number that its marker in the building wears too. One is
the NEXT: bigger, filled and named, and always the one that can least wait.
The card starts with that one job and opens out once you act. A finished job
says what it did ("✓ Concourse power restored"); anybody you can talk to
offers it ("[E] Talk to Stephan Janssen") once you are in range.

**The album**, kept in the browser between visits, in three tabs: **prints**,
one for every photograph earned; the **who's who**, a card for each of the 23
people in the building, a silhouette until you have met them, and then their
portrait, who they are, and the year you met them; and **stickers**, one from
each stand on Chapter III's sticker round. Each chapter opens on its
year: 2126, December 2006, October 2026.

## What to look at

**The weight.** The robots are not three speeds of the same character. They
differ by mass, and every acceleration in the game is `force ÷ mass`:

| | Voxxy | Droid | Biggy |
|---|---|---|---|
| Mass | 45 kg | 190 kg | 430 kg |
| Acceleration | 9.0 m/s² | 4.5 m/s² | 1.8 m/s² |
| Braking | 12.0 m/s² | 5.0 m/s² | **1.2 m/s²** |
| Momentum at cruise | 266 | 777 | **1366** kg·m/s |
| Braking distance | 1.42 m | 1.62 m | **3.82 m** |
| Coasting distance | 4.7 m | 5.2 m | **10.6 m** |
| Turn radius | 1.80 m | 2.46 m | **4.05 m** |

Biggy's braking force is deliberately *lower* than its drive force — the brief
describes it as "slow to start and hard to stop once it is moving," and that
sentence is written directly into the physics. Driving the opposite way does
not rescue you either: pushing backwards against your own momentum *is*
braking, so it is capped at the brakes.

The lower half of that table is **measured, not calculated** — `npm run physics`
runs the real simulation at its real timestep and fails if any robot drifts out
of its design envelope, or if the three stop being three distinguishable
machines. Press `L` at the menu to feel it: all three robots in one lit hall,
`1`/`2`/`3` to swap between them, and the ring on the floor showing where the
robot you are driving would stop if you hit the brake right now.

**The building.** The exhibition hall, the corridor with auditoriums either
side, the foyer and the grand staircase are one geometry defined once, in
metres, and dressed three times. The corridor you walk in the dark in Chapter I
is the same corridor, to the centimetre, that is packed in Chapter III.

**The control scheme.** It evolves: drive one robot by hand, then coordinate
two, then stop driving altogether and direct three that move under their own
momentum. That arc is the Devoxx 2026 theme — *From Developer to Builder* — as
a verb rather than a subtitle.

## Project layout

```
src/core/       simulation: mass, forces, fixed-timestep loop, objectives, crowd
src/venue/      the Kinepolis, once, in metres
src/chapters/   the three eras, and everything to do in them, as data
src/render/     isometric camera, the building, the robots and the people
src/input/      keyboard and touch
src/app/        the shell: chapter select, the one gameplay screen, album, who's who
src/portraits/  dialogue portraits, found by file name
public/photos/  the shot-list prints
tools/          checks and screenshot harnesses, run with Node
```

**Checks**, none of them needing a browser except the last two:

| Command | What it holds the game to |
|---|---|
| `npm run typecheck` | TypeScript, strict |
| `npm run physics` | Each robot inside its design envelope, and the three still distinct |
| `npm run venue` | The building's geometry is consistent |
| `npm run traverse` | Every room can be walked into |
| `npm run objectives` | Every job is somewhere a robot in its chapter can stand, and reach |
| `npm run crowd` | The crowd spreads out instead of bunching |
| `npm run shoot` | Builds, tours the menu and each chapter, fails on any console error |
| `npm run peek` | One frame anywhere, for looking at a square metre of the building |

`SPEC.md` is the design specification. `CLAUDE.md` is the build convention.
`ROADMAP.md` is the dated plan and who owns what; `STATUS.md` is where it
stands today. `docs/PROMPTS.md` documents the generative AI work.

## Built with

- **[three.js](https://threejs.org)** — WebGL renderer. The building is real
  geometry in metres and the isometric look comes from an orthographic camera
  at a fixed 30° angle, rather than from a projection function. It is the same
  view it always was; what changed is that the depth buffer now does the
  sorting, so a staircase can hang in its own stairwell without being clipped
  to it by hand. When the building gets between the camera and a robot, the
  wall fades in a soft disc rather than the robot being drawn over the top of
  it — a shader pass, because "which of six thousand boxes is in the way" is
  not a question worth asking on the CPU sixty times a second.
- **TypeScript** (strict) and **Vite 6**
- A **custom fixed-timestep, mass-based physics simulation** rather than an
  off-the-shelf one. No physics engine of any kind is involved: mass is the
  entire point of the cast, and the simulation is renderer-agnostic — nothing
  in `src/core/` has ever imported a line of rendering code.

Generative AI use is documented in [`docs/PROMPTS.md`](docs/PROMPTS.md).

## People in the game

Chapter II and III are a conference, and a conference is its people. The
people who built Devoxx and JavaPolis, and some who speak at it, stand in the
building as themselves, as a tribute. Photographs of real people go in only
with their agreement. What they say is only what is plainly true of their
public work, researched and sourced in `docs/PROMPTS.md`: in Chapter II as
of JavaPolis in December 2006, in Chapter III as of Devoxx in October 2026.
The crowd around them is nobody in particular.

## Status

Playable end to end: three chapters, the story between them, objectives,
markers, dialogue, the album and the who's who, music and sound, on a desktop
or a phone. Two rounds of notes from a test player are in. See
[`STATUS.md`](STATUS.md) for what is done and what is left before the
deadline, Wed 30 Sep 2026.

## Licence

[MIT](LICENSE) — as the competition requires, and so anyone can take this apart.

The robot model sheets, floor plans and venue photographs are supplied by
Devoxx Belgium for this competition and are not covered by this repository's
licence.
