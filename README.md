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
| `TAB` | Switch robot *(chapter II)* |
| `1` `2` `3` | Take control of a robot, where more than one is present |
| `R` | Put the cast back where it started |
| `F1` | Debug readout: mass, speed, momentum, stopping distance |
| `ESC` | Back to chapter select |
| `L` *(menu)* | Movement lab — all three robots in one lit hall |

Movement is screen-relative: `W` moves the robot up the screen. Hold `SHIFT` to
brake — and notice that Biggy does not stop when you ask it to.

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
src/core/      simulation: mass, forces, fixed-timestep loop, the view angle
src/venue/     the Kinepolis, once, in metres
src/chapters/  the three eras, as data
src/render/    isometric camera and the grey-box scene builder
src/input/     keyboard
src/app/       the shell: canvas, loop, chapter select, the one gameplay screen
```

`SPEC.md` is the design specification. `CLAUDE.md` is the build convention.
`ROADMAP.md` is the dated plan and who owns what. `docs/PROMPTS.md` documents
the generative AI work.

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

## Status

Early. The game currently runs as a grey-box blockout: the venue, the
simulation, the chapter shell and the movement tuning are in place; objectives
and the art pass are not. Movement is tuned against coloured boxes
deliberately — it is the right order to work in.

See `SPEC.md` § 7 for the build order.

## Licence

[MIT](LICENSE) — as the competition requires, and so anyone can take this apart.

The robot model sheets, floor plans and venue photographs are supplied by
Devoxx Belgium for this competition and are not covered by this repository's
licence.
