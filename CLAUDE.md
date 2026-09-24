# Working conventions

Read `SPEC.md` first. It is the design authority; this file is the build
authority. Where they disagree, `SPEC.md` wins on *what* and this file wins on
*how*.

## Stack — pinned, do not substitute

| | |
|---|---|
| Renderer | **three.js** (`three@^0.186`) — WebGL |
| UI | **DOM**, over the canvas. Not drawn into the scene |
| Language | TypeScript, strict |
| Bundler | Vite 6 |
| Runtime | Node 22+ |
| Deploy | GitHub Pages via `.github/workflows/deploy.yml` |
| Physics | **Ours** — `src/core/`. No engine, not even three's |

three.js is a renderer and nothing else. There is no scene manager, no input
plugin, no loop and no text: `src/app/Game.ts` is all four, and it is about a
hundred lines. Resist growing it into a framework — everything a chapter needs
belongs in `ChapterScreen`, and everything the building needs belongs in the
renderer.

Two three.js facts that are not obvious and have already cost time:

- **Lights are physically scaled.** A Lambert surface reflects `intensity / π`,
  so an intensity of 1 is a face at a third of its own colour. See
  `LAMBERT_SCALE` in `BlockoutRenderer`.
- **`onBeforeCompile` does not change the program cache key.** Two materials
  of the same type with different injected code are handed the SAME compiled
  program unless you set `customProgramCacheKey`. That is how the cutaway's
  solid and ghost passes would silently become the same pass.
- **The scene is linear, the palette is sRGB.** Every colour in
  `chapters/registry.ts` was measured off a photograph and tuned against a
  renderer that multiplied sRGB bytes. Multiplying a light by `lightLevel`
  directly makes Chapter I about twice as bright as it was measured to be. See
  `SRGB_GAMMA`.

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
npm run objectives  # hold every chapter's activities against the building
npm run venue -- --svg   # draw both floors as a plan, to hold against the real one
npm run shoot       # build, drive the game headless, screenshot, fail on console errors
npm run shoot -- --lab   # same, but the movement lab with telemetry on
npm run peek -- '[["name","?chapter=silence&at=-21.8,-8",["KeyW"],1.6]]'
```

`npm run peek` is `shoot`'s opposite: one frame of anywhere, with any keys
held. `shoot` drives a fixed tour and is the regression check; almost every
visual question is instead about one particular square metre of a 126 m
building, and this answers those in a single build.

Four query parameters exist for looking at the game rather than playing it,
and none is reachable from inside it:

| | |
|---|---|
| `?lab` | straight into the movement rig |
| `?chapter=<id>` | straight into a chapter, no menu |
| `?at=x,y` or `?at=x,y,floor` | start the cast anywhere in the building |
| `?exit` | with `?chapter`, open that chapter's wormhole at once, if it has one |

`?at=` is worth knowing about. Photographing a particular doorway thirty metres
up a corridor by driving to it is several builds and a lot of guessed key
timings, and every guess is a chance to photograph the wrong place and draw a
confident conclusion from it. Coordinates are metres, as in `kinepolis.ts`.

`npm run physics` needs no browser and no native binaries — it compiles
`src/core` with tsc and runs it in node. That works because `core/` imports
nothing outside itself. Keep it that way.

`npm run build` runs the typechecker first and fails on any type error. Keep it
that way — a broken Pages deploy on the last day is an unforced loss.

## The five architectural rules

These are not style preferences. Each one is load-bearing for the schedule or
for a scoring criterion.

1. **One gameplay screen.** `ChapterScreen` runs every chapter. There is no
   `ChapterOneScreen` and there will never be one. A chapter is *data* in
   `src/chapters/registry.ts`. A screen per chapter triples the cost of every
   subsequent change, and there are twelve days.

2. **The venue is defined once**, in `src/venue/kinepolis.ts`, in metres.
   Chapters dress it — palette, light, crowd — and never redefine it. This is
   what earns the *sense of place* points: the same corridor recognised in
   three different lights.

3. **A chapter may change exactly four things**: palette + light level, crowd
   density, control mode, objective. See the `Chapter` interface. If you want
   a fifth, the thing you want belongs in `core/`.

4. **Metres everywhere. There are no pixels.** The scene is built at the
   venue's own surveyed coordinates and a camera is pointed at it, so the
   simulation and the picture can no longer disagree about where anything is.
   `src/core/` still never imports from `src/render/`.

   The viewer stands **south-west** of the building: north runs up-left on
   screen, east up-right. Three things encode that and all three must agree —
   `Iso.ISO_AZIMUTH`, the camera basis in `render/IsoCamera.ts`, and the
   rotation in `input/KeyboardController.ts`. Flip one alone and the building
   turns inside out or renders 180° from every drawing of it, which is exactly
   the bug a floor plan next to the screen catches and nothing else does.
   `assertMatchesProjection` checks the camera against `Iso.project` at boot in
   dev, which covers two of the three.

   **The world is z-up**, because the simulation is. three.js defaults to
   y-up; the camera is moved rather than the building, or sixteen hundred
   lines of surveyed geometry get silently transposed.

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
| Change the view angle or the zoom | `ISO_SQUASH` / `PPM` in `src/core/Iso.ts` — the camera is derived from them |
| Change how the building is lit | `AMBIENT`, `KEY`, `KEY_DIRECTION` in `BlockoutRenderer` |
| Change how much a wall fades to show a robot | `CUTAWAY_*` in `src/render/Cutaway.ts` |
| Change what an era looks like | `palette` / `lightLevel` in `registry.ts` |
| Change the building | `src/venue/kinepolis.ts` — then `npm run venue` |
| Put a piece of floor at another height | `elevation` on a `Room`. It may be negative |
| Join two levels | a `Link` — stepped if `riser > 0`, a ramp if 0 — then `npm run traverse` |
| Add something drawn but not collided | `decor` in `kinepolis.ts`, and a `Material` |
| Change what the furniture looks like | `seat` / `desk` / `sign` in a chapter palette |
| Add a control mode | `ControlMode` in `Chapter.ts`, handle in `ChapterScreen` |
| Change what a chapter asks of the player | `src/chapters/objectives.ts` — then `npm run objectives` |
| Add a new kind of thing to do | `src/core/Activity.ts`, then run it in `core/Objective.ts` |
| Change how heavy a load feels | nothing — it is `mass + payload` in `Body`, and that is the point |
| Change how full the building is | `crowdDensity` in `registry.ts`. It sets the population AND which rooms are in use |
| Change how the crowd behaves | `src/core/Crowd.ts`. Seeded — keep it deterministic |
| Change what a robot looks like | `robotParts` in `BlockoutRenderer`. State everything as a fraction of `radius`/`height` so the art cannot drift from the collision shape |
| Change a robot's livery | `tint` / `trim` in `RobotSpec.ts` — a fact about the machine, not the era |
| Change how much boxes vary in tone | `TONE_SPREAD` in `BlockoutRenderer`. Keyed off position, so it must stay deterministic |
| Change the band drawn along the cutaway | `CUT_BAND` / `CUT_BAND_LIFT` in `BlockoutRenderer` |
| Change how a robot climbs | `climbOf` in `BlockoutRenderer` — DRAWING only. The sim still walks a smooth ramp |
| Change what is outside the building | `forecourtFitOut` in `kinepolis.ts`, and `FORECOURT` for how far it reaches |
| Make something visible from outside | `exterior: true` on the obstacle or decor. Anything taller than 2.7 m needs it, or the cutaway eats it |
| Tune the camera | `CAMERA_LERP` in `config.ts` |
| Change collision response | `RESTITUTION` in `Sim.ts` |
| Change who can climb what | `maxStepRise` / `maxSlope` in `RobotSpec.ts` |
| Change how climbing behaves | `src/core/Traversal.ts` |

`src/config.ts` is for **build and presentation** constants — resolution, and
how the game is *shown* (camera lead, shake weights). Gameplay tuning does not
go there, and nothing in `config.ts` may ever be read by `src/core`: if a
constant can change where a robot ends up, it belongs in `core/`.

## Code conventions

- Named exports. No default exports.
- `@/` maps to `src/`. Use it; no `../../..` chains.
- `strict` is on, plus `noUnusedLocals` and `noUnusedParameters`. Prefix a
  deliberately unused parameter with `_`.
- Comments explain **why**, not what. A comment restating the line below it is
  noise; a comment explaining why Biggy brakes worse than it accelerates is
  the most valuable line in the file.
- Numbers with physical meaning carry their unit in a comment or the name.
- No `any`. No non-null `!` except on screen fields assigned in `mount()`
  (already the established pattern in `ChapterScreen`).

## Verification loop

You cannot see the game. Close that gap rather than guessing:

1. `npm run typecheck` after every change that touches types.
2. **`npm run traverse` after every change that touches stairs, ramps or
   levels.** The stair rule is decided in four places at once — the riser on a
   `Link`, `maxStepRise` on a `RobotSpec`, whether a tread collides, and
   whether the surface is reachable from where the robot stands — and any one
   of them can be right while the behaviour is wrong. The failure is never an
   exception; it is Biggy quietly gliding up a staircase, or reaching a stage
   it is supposed to be shut out of.
3. **`npm run objectives` after every change that touches a chapter's
   objective, the venue, or `RobotSpec`.** An activity is coordinates, and a
   zone two metres out is inside a seat bank: the symptom is a chapter no
   player can finish, and nothing else in the loop can see it. It also checks
   that somebody in the cast both passes the gates AND can reach the storey,
   which is where Biggy's `maxStepRise` of 0 keeps catching things.
4. **`npm run physics` after every change that touches movement.** It measures
   what a player experiences rather than what the spec table claims, and it
   fails the build when a robot leaves its design envelope or when the cast
   stops being three distinguishable machines. It caught the constant that had
   flattened all three robots into one, which no amount of reading the code
   would have.
5. `npm run dev`, then drive the page with the browser tools — screenshot the
   canvas and read the console. A screenshot of the running game is worth more
   than any amount of reasoning about whether the geometry is right.
   `npm run shoot -- --lab` does this unattended for all three robots.
6. Watch for console errors on screen transitions specifically. Menu → chapter
   → ESC → menu is the path most likely to leak objects — and a WebGL buffer
   has no garbage collector, so `Screen.dispose` has to give back every
   geometry and every material it made.
7. When tuning movement, press `L` at the menu for the movement lab — all
   three robots, one lit hall, `1`/`2`/`3` to swap between them mid-run. Turn
   on the readout (`F1`) and read the actual numbers rather than judging by
   eye. The agent cannot feel the difference; the lab is what lets a human
   judge it in four seconds instead of playing three chapters.

## Things that will cost points — do not do them

- **Do not ship any part of the Robot Lab reference robot.** The brief is
  explicit: an entry that is that robot repainted scores **zero** of the 40
  originality points. Read its source for technique; generate our own from the
  model sheets.
- Do not turn the fixed camera loose. The scene is genuinely three-dimensional
  now, which makes an orbit control about four lines away — and the venue was
  surveyed, drawn and cut away for one fixed angle. The brief says outright
  that a sharp 2D game beats a vague 3D one, and the sharp look is the fixed
  isometric one. 3D is here for the depth buffer and the lighting, not for the
  camera.
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

## Branches and commits

**A branch per feature, and push before cutting the next one.**

```bash
git push                       # whatever is outstanding on the current branch
git checkout -b <feature>      # then start
```

**Commit as the work lands, not at the end.** Each coherent step — a mechanic
wired up, a bug fixed, a tuning pass — is its own commit once it passes the
harnesses it touches. This is not bookkeeping: a commit that has been through
`npm run venue` / `traverse` / `objectives` / `physics` is a state you can get
back to, and a twelve-day schedule with no way back is a schedule with one
try in it. It is also the only thing that keeps the history readable, because
these changes interleave across files — `ChapterScreen`, `registry` and
`BlockoutRenderer` each end up carrying two or three unrelated features if a
session is committed in one go, and at that point the history cannot be split
after the fact without staging hunks.

Commit messages are conventional-ish, imperative, and scoped to one thing:

```
feat(sim): grip-limited turning so heavy robots carve
fix(render): sort seat blocks behind robots on the same row
tune(robots): drop Biggy brake force to 516 N
docs(spec): settle chapter order
```

The body is prose, not bullets, and it says WHY — what was wrong, what was
measured, and what was tried and rejected. `docs/PROMPTS.md` gets the same
story from the other end: the commit explains the code, the prompt log
explains the collaboration.

### Pushing from the sandbox

`origin` is SSH and SSH does not work in here — the proxy injects credentials
for HTTPS only. If `git push` fails with `could not read Username`, the GitHub
token has not been set as a sandbox secret; run this ON THE HOST:

```bash
sbx secret set github --sandbox devoxx-game -t "$(gh auth token)"
```

`devoxx-game` is `$SANDBOX_VM_ID`. Do not push from the host terminal instead
— pushing from in here is the supported path once the secret is set.
