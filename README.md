# The Silence of Hall 8

**Three robots. One cinema. Three eras.**

An entry for [The Robot Games](https://game.devoxx.be/game.html), a Devoxx
Belgium competition. Voxxy, Droid and Biggy walk the Kinepolis Antwerp across
three chapters of the same building — and the way you control them changes with
each one.

> **▶ Play it now: _(Pages URL goes here once the first deploy runs)_**

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
| `F1` | Debug readout: mass, speed, momentum |
| `ESC` | Back to chapter select |

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
| Stopping distance from top speed | 1.5 m | 1.8 m | **4.8 m** |

Biggy's braking force is deliberately *lower* than its drive force — the brief
describes it as "slow to start and hard to stop once it is moving," and that
sentence is written directly into the physics.

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
src/core/      simulation: projection, mass, forces, fixed-timestep loop
src/venue/     the Kinepolis, once, in metres
src/chapters/  the three eras, as data
src/render/    isometric renderer
src/scenes/    boot, chapter select, and the one gameplay scene
```

`SPEC.md` is the design specification. `CLAUDE.md` is the build convention.
`docs/PROMPTS.md` documents the generative AI work.

## Built with

- **[Phaser 4](https://phaser.io/phaser4)** — 2D WebGL framework
- **TypeScript** (strict) and **Vite 6**
- A **custom fixed-timestep, mass-based physics simulation** rather than an
  off-the-shelf one. Arcade Physics has no concept of mass, and mass is the
  entire point of the cast.

Generative AI use is documented in [`docs/PROMPTS.md`](docs/PROMPTS.md).

## Status

Early. The game currently runs as a grey-box blockout: the venue, the
simulation and the chapter shell are in place, and the art pass has not
happened yet. Movement is tuned against coloured boxes deliberately — it is the
right order to work in.

See `SPEC.md` § 7 for the build order.

## Licence

[MIT](LICENSE) — as the competition requires, and so anyone can take this apart.

The robot model sheets, floor plans and venue photographs are supplied by
Devoxx Belgium for this competition and are not covered by this repository's
licence.
