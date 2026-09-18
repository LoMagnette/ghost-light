# Working conventions

Read `SPEC.md` first. It is the design authority; this file is the build
authority. Where they disagree, `SPEC.md` wins on *what* and this file wins on
*how*.

## Stack — pinned, do not substitute

| | |
|---|---|
| Engine | **Phaser 4** (`phaser@^4.2.1`) — 2D, WebGL |
| Language | TypeScript, strict |
| Bundler | Vite 6 |
| Runtime | Node 22+ |
| Deploy | GitHub Pages via `.github/workflows/deploy.yml` |
| Physics | **Ours** — `src/core/`. Not Arcade, not Matter |

Phaser 4 ships its own type definitions. Do **not** install `@types/phaser`.

Phaser 4's repo contains 28 agent skill files covering every subsystem. When
you need an API you are unsure of, check those rather than recalling Phaser 3
from memory — the v3 pipeline system is gone in v4 and filters replaced FX and
masks.

## Commands

```bash
npm install         # once
npm run dev         # vite dev server on http://localhost:8080
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build to dist/
npm run preview     # serve dist/ locally
npm run physics     # measure movement in the real sim, check the design envelope
npm run venue       # check the building against the plans and against itself
npm run traverse    # drive real robots at real stairs; assert who gets where
npm run venue -- --svg   # draw both floors as a plan, to hold against the real one
npm run shoot       # build, drive the game headless, screenshot, fail on console errors
npm run shoot -- --lab   # same, but the movement lab with telemetry on
```

`npm run physics` needs no browser and no native binaries — it compiles
`src/core` with tsc and runs it in node. That works because `core/` imports
nothing outside itself. Keep it that way.

`npm run build` runs the typechecker first and fails on any type error. Keep it
that way — a broken Pages deploy on the last day is an unforced loss.

## The five architectural rules

These are not style preferences. Each one is load-bearing for the schedule or
for a scoring criterion.

1. **One gameplay scene.** `ChapterScene` runs every chapter. There is no
   `ChapterOneScene` and there will never be one. A chapter is *data* in
   `src/chapters/registry.ts`. A scene per chapter triples the cost of every
   subsequent change, and there are twelve days.

2. **The venue is defined once**, in `src/venue/kinepolis.ts`, in metres.
   Chapters dress it — palette, light, crowd — and never redefine it. This is
   what earns the *sense of place* points: the same corridor recognised in
   three different lights.

3. **A chapter may change exactly four things**: palette + light level, crowd
   density, control mode, objective. See the `Chapter` interface. If you want
   a fifth, the thing you want belongs in `core/`.

4. **Metres in the simulation, pixels only in the renderer.** `src/core/`
   never imports from `src/render/`. The only code that calls `project()` is a
   renderer. Once gameplay reasons in pixels the physics stops being honest.

   The viewer stands **south-west** of the building: north runs up-left on
   screen, east up-right. Three things encode that and all three must agree —
   `Iso.project`, `Iso.depthKey` and which two faces `drawBox` paints. Flip one
   alone and the building turns inside out or renders 180° from every drawing
   of it, which is exactly the bug a floor plan next to the screen catches and
   nothing else does.

5. **Physics is fixed-timestep, 120 Hz.** Call `sim.advance(delta)` once per
   frame and let the accumulator do its job. Never call `body.step()` with a
   frame delta. Heavy bodies with force-limited braking change their stopping
   distance with framerate, and that is exactly the moment a judge is watching
   Biggy slide into something.

## Where to change what

| I want to… | Edit |
|---|---|
| Make a robot feel heavier/lighter | `src/core/RobotSpec.ts` — nothing else |
| Change how resistance or grip behaves | `src/core/Body.ts` — affects ALL robots |
| Change camera lead, shake, footfall weight | `src/config.ts` — presentation only |
| Change what an era looks like | `palette` / `lightLevel` in `registry.ts` |
| Change the building | `src/venue/kinepolis.ts` — then `npm run venue` |
| Add a control mode | `ControlMode` in `Chapter.ts`, handle in `ChapterScene` |
| Tune the camera | `CAMERA_LERP` in `config.ts` |
| Change collision response | `RESTITUTION` in `Sim.ts` |
| Change who can climb what | `maxStepRise` / `maxSlope` in `RobotSpec.ts` |
| Change how climbing behaves | `src/core/Traversal.ts` |

`src/config.ts` is for **build and presentation** constants — resolution, and
how the game is *shown* (camera lead, shake weights). Gameplay tuning does not
go there, and nothing in `config.ts` may ever be read by `src/core`: if a
constant can change where a robot ends up, it belongs in `core/`.

## Code conventions

- Named exports. No default exports except where Phaser demands it.
- `@/` maps to `src/`. Use it; no `../../..` chains.
- `strict` is on, plus `noUnusedLocals` and `noUnusedParameters`. Prefix a
  deliberately unused parameter with `_`.
- Comments explain **why**, not what. A comment restating the line below it is
  noise; a comment explaining why Biggy brakes worse than it accelerates is
  the most valuable line in the file.
- Numbers with physical meaning carry their unit in a comment or the name.
- No `any`. No non-null `!` except on Phaser lifecycle fields assigned in
  `create()` (already the established pattern in `ChapterScene`).

## Verification loop

You cannot see the game. Close that gap rather than guessing:

1. `npm run typecheck` after every change that touches types.
2. **`npm run traverse` after every change that touches stairs, ramps or
   levels.** The stair rule is decided in four places at once — the riser on a
   `Link`, `maxStepRise` on a `RobotSpec`, whether a tread collides, and
   whether the surface is reachable from where the robot stands — and any one
   of them can be right while the behaviour is wrong. The failure is never an
   exception; it is Biggy quietly gliding up a staircase.
3. **`npm run physics` after every change that touches movement.** It measures
   what a player experiences rather than what the spec table claims, and it
   fails the build when a robot leaves its design envelope or when the cast
   stops being three distinguishable machines. It caught the constant that had
   flattened all three robots into one, which no amount of reading the code
   would have.
4. `npm run dev`, then drive the page with the browser tools — screenshot the
   canvas and read the console. A screenshot of the running game is worth more
   than any amount of reasoning about whether the draw order is right.
   `npm run shoot -- --lab` does this unattended for all three robots.
5. Watch for console errors on scene transitions specifically. Menu → chapter
   → ESC → menu is the path most likely to leak objects.
6. When tuning movement, press `L` at the menu for the movement lab — all
   three robots, one lit hall, `1`/`2`/`3` to swap between them mid-run. Turn
   on the readout (`F1`) and read the actual numbers rather than judging by
   eye. The agent cannot feel the difference; the lab is what lets a human
   judge it in four seconds instead of playing three chapters.

## Things that will cost points — do not do them

- **Do not ship any part of the Robot Lab reference robot.** The brief is
  explicit: an entry that is that robot repainted scores **zero** of the 40
  originality points. Read its source for technique; generate our own from the
  model sheets.
- Do not add a third dimension for its own sake. Nothing in the rubric rewards
  it, and the brief says outright that a sharp 2D game beats a vague 3D one.
- Do not let the live build break. It is the judges' first impression.
- Do not make the three robots interchangeable. If two robots solve the same
  puzzle, the puzzle is wrong.
- Do not borrow a wordmark, title-card device, episode title or character from
  the anthology series that inspired the structure. The repo is public and MIT
  licensed; everything in it must be ours to license.
- Do not commit large binaries. Reference downloads live under `references/`
  and stay out of the bundle.

## Documenting the AI work

5 points, and they are free. Keep `docs/PROMPTS.md` current as you go rather
than reconstructing it on day twelve: what tool, what prompt, how many
iterations, and **what you fixed by hand when the model got it wrong**. That
last part is what is actually being scored.

## Commits

Conventional-ish, imperative, scoped to one thing:

```
feat(sim): grip-limited turning so heavy robots carve
fix(render): sort seat blocks behind robots on the same row
tune(robots): drop Biggy brake force to 516 N
docs(spec): settle chapter order
```
