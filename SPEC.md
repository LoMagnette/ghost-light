# Game specification

Title: **Ghost Light**

A ghost light is the one bulb left burning on an empty stage overnight — a
theatre superstition and a safety practice at the same time. It is the right
title because it is the tone: the building is empty, not wrecked, and somebody
left a light on. Chapter I's accent colour is already that light.
Entry for the Devoxx Belgium Robot Games — <https://game.devoxx.be/game.html>
Deadline: **Wed 30 September 2026, 23:59 CEST**

---

## 1. The pitch

Three robots walk the Kinepolis Antwerp across three eras of the same building.
You begin alone in the dark, in a venue you do not recognise, and each chapter
you unlock fills it with more people — until the last thing you do is move
through the building at absolute capacity.

The control scheme itself evolves across the three chapters: you go from
driving one machine by hand, to coordinating two, to directing three that act
on their own mass while you watch and correct. That arc is the Devoxx 2026
theme — *From Developer to Builder* — expressed as a verb rather than a
subtitle.

## 2. Non-negotiables from the brief

These are pass/fail. Check them before every submission.

| Requirement | Where it is satisfied |
|---|---|
| All three robots appear and **matter** | Ch.1 Voxxy, Ch.2 +Droid, Ch.3 all three with distinct roles |
| Venue is recognisably the Kinepolis | One shared geometry, `src/venue/kinepolis.ts`, **surveyed from the competition plans** |
| Exhibition hall, auditoriums, corridors, staircase | All modelled; both levels used |
| Playable start-to-finish by a stranger | Chapter select → 3–6 min chapter → end card |
| Runnable from the repo | `README.md`, clone → `npm i` → `npm run dev` |
| MIT `LICENSE` file | Present at repo root |
| Public GitHub repository | <https://github.com/LoMagnette/ghost-light> |
| Live playable build | <https://lomagnette.github.io/ghost-light/> — live since 18 Sep |

> **Judges will try a live build before cloning.** The hosted URL is not a
> nice-to-have. It is the first impression, and it must load in seconds.

## 3. Scoring map

100 points. Every design decision below is traceable to a line in this table.

| # | Criterion | Pts | How this entry attacks it |
|---|---|---|---|
| 1 | **Originality** | 40 | Anthology structure; control scheme that changes per chapter; the same building read three ways; directing rather than driving |
| 2 | **Realism** | 20 | Force-based, mass-aware, fixed-timestep simulation. Momentum is the gameplay, not a layer under it |
| 3 | **Playability** | 15 | Empty first chapter doubles as a wordless tutorial; one objective line on screen; chapters are short |
| 4 | **All three robots** | 10 | Mass differs by 10×; each chapter is unsolvable without the right robot |
| 5 | **Sense of place** | 10 | One geometry dressed three ways; palettes taken from the reference photographs |
| 6 | **GenAI craft** | 5 | `docs/PROMPTS.md` — prompts, iterations, and what was fixed by hand |

Originality is 40 of 100 and it is the **idea**, not the technology. The stack
exists to buy time to spend on the idea. Never trade idea time for engine time.

## 4. The three chapters

Same building. Same engine. Three rulesets.

### Chapter I — The Silence
*Later. No year given.*

- **Cast:** Voxxy alone
- **Control:** `direct` — WASD, one robot
- **Crowd density:** 0.0
- **Light:** 0.18 — the red LED step lighting in the auditoriums is still running
- **Starts on:** the exhibition floor
- **Objective:** find the power

The building is **empty, not wrecked**. The game never explains why, and it is
not interested in blame.

This chapter is first for four reasons, and all four matter:

1. An empty building is the best tutorial available — nothing competes for
   attention, so the controls teach themselves without a line of text.
2. It is the cheapest chapter to build, so the first playable milestone is
   also the engine test.
3. The reveal runs the right way round: the player does not know what this
   place was, and the later chapters answer it.
4. Ending on a dead building would be a strange note to hit on the opening
   keynote stage of the conference being eulogised.

### Chapter II — JavaPolis
*The early years.*

- **Cast:** Voxxy, Droid
- **Control:** `switch` — WASD, `TAB` to take over the other robot
- **Crowd density:** 0.35
- **Light:** 0.62 — warm, tungsten, slightly dated
- **Starts on:** the auditorium level
- **Objective:** keep every room running

A community event that outgrew its room. Half the floor in use, a conference
held together by hand. Droid's reach and patience solve what Voxxy's speed
cannot.

### Chapter III — At Capacity
*The full house.*

- **Cast:** Voxxy, Droid, Biggy
- **Control:** `direct-order` — you issue intent; the robots execute
- **Crowd density:** 1.0
- **Light:** 0.85 — Devoxx orange
- **Starts on:** the exhibition floor
- **Objective:** get everyone to the keynote

Every room is full. **You cannot hand-drive three robots through this many
people, so you stop trying.** The shift to directing is motivated by crowd
density rather than imposed as a theme — the mechanic and the story are the
same thing.

### Why crowd density carries the arc

`crowdDensity` is one number: `0 → 0.35 → 1.0`. It drives NPC count, the
ambient audio bed, and how hard the space pushes back. Empty → sparse →
packed is the entire emotional arc of the game expressed as a single
parameter, which is very cheap to build and very hard to misread.

## 5. The robots

Mass is the design. See `src/core/RobotSpec.ts` for the authoritative numbers.

| | Voxxy | Droid | Biggy |
|---|---|---|---|
| Mass | 45 kg | 190 kg | 430 kg |
| Acceleration | 9.0 m/s² | 4.5 m/s² | **1.8 m/s²** |
| Braking | 12.0 m/s² | 5.0 m/s² | **1.2 m/s²** |
| Nominal top speed | 6.0 m/s | 4.2 m/s | 3.4 m/s |

Biggy's braking force is *lower* than its drive force. That is not a bug: the
brief describes Biggy as "slow to start and hard to stop once it is moving,"
and this is that sentence written as physics.

### What the player actually experiences

The figures above are inputs. These are outputs, measured by running the real
simulation at its real timestep — `npm run physics`. **Tune against these**,
because they are what a judge feels; the table above only describes what was
asked for.

| | Voxxy | Droid | Biggy |
|---|---|---|---|
| Cruising speed | 5.92 m/s | 4.09 m/s | 3.18 m/s |
| Momentum at cruise | 266 | 777 | **1366** kg·m/s |
| Braking distance | 1.42 m | 1.62 m | **3.82 m** |
| Coasting distance, throttle released | 4.7 m | 5.2 m | **10.6 m** |
| Seconds to reverse direction | 0.66 | 0.90 | **2.42** |
| Turn radius at cruise | 1.80 m | 2.46 m | **4.05 m** |

The two tables disagree, and they always will, because the simulation includes
rolling resistance and tapers the drive force to zero near top speed — so a
robot approaches `maxSpeed` without ever arriving. Anything derived from
`maxSpeed` with a textbook formula is therefore a design intention, not a
prediction. The gap is only safe while it is measured.

That measurement is not optional bookkeeping. The first run of the harness
found that all three robots stopped within 0.2 m of each other: the rolling
resistance term was proportional to mass, so it subtracted the *same*
deceleration from every robot and quietly erased the difference the whole cast
is built on. Nothing about the code looked wrong. See `docs/PROMPTS.md`.

**Each robot must do something only it can do** (10 points). The current
division of labour:

- **Voxxy** — reaches what is high or far; the only robot that can cross a
  gap or change direction inside a crowd
- **Droid** — reach and height; operates things at 2 m; sees over a crowd;
  the only robot that can hold a door or a position under pressure
- **Biggy** — momentum as a tool. The only robot that can move something
  heavy, force a jammed route, or hold a line. It cannot be precise, ever

### Stairs — settled 18 Sep 2026

Climbing is decided by `maxStepRise`, a dimension rather than a flag, measured
against the building's 0.18 m risers:

| | Voxxy | Droid | Biggy |
|---|---|---|---|
| `maxStepRise` | 0.20 m | 0.18 m | **0.00 m** |
| Stairs | yes | exactly these, nothing steeper | **never** |
| Ramps (`maxSlope`) | 0.45 | 0.38 | 0.35 |

**Biggy cannot use a staircase.** 430 kg on a flight of stairs is an accident,
not a route. It gets between levels by ramp or not at all, and that single
constraint does most of the work of the 10 points for "unsolvable without the
right robot":

- **Chapter I** — Voxxy alone, so "find a way up" is about finding *which*
  stair in the dark, not about being able to climb one.
- **Chapter III** — you cannot send all three up the nearest flight. Biggy has
  to be routed the long way round while the others take the stairs, which is
  the first problem `direct-order` mode has that is worth solving.

The same number governs kerbs and the lip of a seat block, so it keeps paying
out beyond the staircases.

**Still open:** whether Biggy ever reaches the auditorium level at all. The
only ramp links the reception concourse down to the hall, 1.2 m. All three
routes to floor 1 are stairs, so as it stands Biggy is confined to the ground
floor. Either a goods lift goes in — every cinema has one, though none is
drawn — or Biggy stays on the exhibition floor, which is where a heavy hauler
belongs anyway.

Note the levels: the concourse is the HIGHER of the two ground-floor spaces.
You come in at street level and go down into the hall.

If a puzzle can be solved by two different robots, it is not pulling its
weight. Fix the puzzle, not the robots.

## 6. Architecture

**One engine, three rulesets.** This is the rule that makes a twelve-day
schedule survivable.

```
src/
  main.ts                  Phaser bootstrap
  config.ts                build constants (NOT gameplay tuning)
  core/
    Iso.ts                 2:1 isometric projection, depth sort
    RobotSpec.ts           mass/force/speed per robot  ← main tuning surface
    Body.ts                force-based integrator for one body
    Sim.ts                 fixed 120 Hz loop, collision, impacts
    Venue.ts               venue data types
  venue/
    kinepolis.ts           THE building, once, in metres
  chapters/
    Chapter.ts             what a chapter is allowed to change
    registry.ts            the three chapters, as data
  render/
    BlockoutRenderer.ts    grey-box iso renderer
  input/
    KeyboardController.ts  keys → DriveInput
  scenes/
    BootScene.ts
    MenuScene.ts
    ChapterScene.ts        the ONE gameplay scene
```

### Rules that hold the whole thing together

1. **There is one gameplay scene.** There is no `ChapterOneScene`. A chapter is
   data. Adding a scene per chapter triples the cost of every later change.
2. **The venue is described once.** Chapters dress it; they never redefine it.
   This is also what earns the *sense of place* points — a judge who
   recognises the same corridor in three lights believes the building exists.
3. **A chapter may change exactly four things:** palette + light, crowd
   density, control mode, objective. Wanting a fifth means the thing belongs
   in `core/`.
4. **The simulation thinks in metres, the renderer thinks in pixels.** The
   moment gameplay code reasons in pixels, the physics stops being honest and
   the venue stops being to scale.
5. **Physics runs at a fixed 120 Hz.** Never step bodies with a variable frame
   delta — heavy bodies with force-limited braking change stopping distance
   with framerate, which is exactly when a judge is watching Biggy slide.

## 7. Build order

Twelve days. Build the risky thing early and the pretty thing late.

This is the milestone view — what "done" means at each stage. `ROADMAP.md`
carries the same plan against real dates, plus which tasks need a human and
which the agent can take unattended.

| Day | Milestone | Done when |
|---|---|---|
| 1 | Scaffold + deploy pipeline + **live URL** | An empty canvas is on the public URL |
| 2–3 | **Movement feel**, grey boxes only | Biggy feels heavy with no art whatsoever |
| 4–5 | Chapter I playable end to end | A stranger finishes it without being told anything |
| 6–7 | Chapter III's `direct-order` mode | The differentiator is proven, not hoped for |
| 7 | **First submission** | Judged on most recent entry — early costs nothing |
| 8 | Chapter II | The middle chapter; shrinkable if time runs short |
| 9–10 | Art pass: sprites, lighting, audio | Robots generated from the model sheets |
| 11 | Playability pass | Watch someone play in silence. Fix what they fumble |
| 12 | README, `PROMPTS.md`, buffer | Submit again |

Deliberate ordering notes:

- The deploy pipeline is **day one**, not day twelve. It is the single biggest
  end-of-sprint risk and it costs twenty minutes now.
- Chapter III before Chapter II. Chapter III is the differentiator, so its risk
  must be resolved while there are still days left. Chapter II is the most
  shrinkable — worst case it becomes a 60-second set piece and the arc
  survives.
- Art is late and grey boxes are fine until then. Movement tuned against
  coloured boxes is how this is done professionally, and it is worth more
  points than early art.

## 8. Assets

### Provided by the competition

- Robot model sheets: Voxxy 2752×1536, Droid 1376×768, Biggy 2752×1536 (PNG)
- Floor plans: exhibition hall + auditorium level, raw and annotated
- 14 venue photographs, copyleft — the palette source
- Four drone flights through the venue — scale, ceiling heights, sightlines

Put downloads under `references/`, which is git-ignored — those are Devoxx's
files and this repository is public and MIT, so they are not ours to
relicense. See `docs/ASSETS.md`.

**The plans are on disk and the venue is built from them.** None carries a
scale bar, so each is scaled from something physical printed on it:

| Drawing | Anchor |
|---|---|
| `booth-map.png` | Devoxx stands: 24 m² large, 6 m² small — 175 px pitch = 6 m |
| `hollywood-area.png` | "Receptieruimte 'Hollywood' — opp: 2411.41 m²" |
| `cinema-venue-devoxx.png` | drawn seat rows, 10 px pitch ≈ 1.0 m |

The booth map is the best of the three, because it scales itself and it is the
only drawing that shows the hall's south wall unambiguously. `npm run venue`
holds the geometry against all of it, and `npm run venue -- --svg` draws the
result as a plan to put beside the originals.

Room 8 is printed as **746 seats** on a 2012 drawing; Devoxx sells **694**
today. Geometry follows the plan, crowd counts should follow the modern
number.

### To generate

8-direction sprite sheets per robot: idle, walk, run, plus one ability
animation each. The model sheets are multi-angle orthographic turnarounds,
which is exactly the right input for this.

### Hard rule

> The orange robot on the Robot Lab site is **a reference only**. "An entry
> that is this robot with a new coat of paint scores nothing on the 40 points
> for originality."

Read its source for technique. Ship none of it. Generate the robots from the
model sheets.

### Colour, from the photographs

- Exhibition hall: white canopy, warm cove lighting, regular column grid
- Corridors: dark carpet, pendant disc lights, exposed concrete ceiling
- Auditoriums: raked seating, blue and red wall wash, **red LED step strips**
- Registration: slatted warm wood, grey carpet, curved cast concrete

The red step lighting in a dark auditorium is the single strongest image
available for Chapter I, and it costs nothing to draw.

## 9. Tone

Melancholy, never accusatory.

Devoxx's own 2026 framing is optimistic — the future is about giving builders
superpowers, not replacing developers. A dystopia that reads as *AI killed the
developer conference* will land badly in that room and is the more obvious take
anyway.

The building is empty, not wrecked. We never say why. The game is about a place
and what happened in it.

**Anthology structure only.** The format inspiration — short chapters, genre
variety, a three-part motif — is not protectable and we use it freely. No
borrowed wordmark, title-card device, episode titles or characters. The
repository is public and MIT licensed, so everything in it must be ours to
license.

Keynote-stage rating throughout. Tense and strange plays well to several
thousand people. Nothing else does.

## 10. Open questions

- [x] Final title. **Ghost Light** — settled 18 Sep 2026.
- [ ] Chapter I: what is "the power", concretely, and what does finding it do?
- [ ] Chapter III: what does issuing intent look like — click a destination,
      draw a route, or assign a standing role?
- [ ] Chapter II: what is the failure state for "keep every room running"?
- [ ] Audio: generated, or library? Footsteps are the highest-value sound.
- [ ] Does the player ever control Biggy directly, or is it always directed?
