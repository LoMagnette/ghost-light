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

What you are deciding with your hands evolves across the three chapters: you
drive one machine, then you react to a building that is falling behind with
two, and finally you spend a day you do not have enough of with three, each
locked out of things the others can do. Driving is the only verb throughout —
what changes is what it is *for*. That arc is the Devoxx 2026 theme — *From
Developer to Builder* — expressed as a verb rather than a subtitle.

And in the last chapter what you carry is why you cannot stop. Payload is real
mass in the integrator, so a collectathon becomes a physics game. See
`docs/MECHANICS.md`, which is the authority on what the player does; this
section stays the authority on what each chapter is.

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
| 1 | **Originality** | 40 | Anthology structure; the same building read three ways; a conference finale where everything you pick up is added to your mass, so greed costs you handling |
| 2 | **Realism** | 20 | Force-based, mass-aware, fixed-timestep simulation. Momentum is the gameplay, not a layer under it |
| 3 | **Playability** | 15 | Empty first chapter doubles as a wordless tutorial; one objective line on screen; chapters are short |
| 4 | **All three robots** | 10 | Mass differs by 10×; each chapter is unsolvable without the right robot |
| 5 | **Sense of place** | 10 | One geometry dressed three ways; palettes taken from the reference photographs |
| 6 | **GenAI craft** | 5 | `docs/PROMPTS.md` — prompts, iterations, and what was fixed by hand |

Originality is 40 of 100 and it is the **idea**, not the technology. The stack
exists to buy time to spend on the idea. Never trade idea time for engine time.

The renderer moved from Phaser 4 to three.js on 19 Sep. The look is unchanged
— the same isometric view, now from an orthographic camera at 30° rather than
from a projection function — and so is every line of `src/core/`, which never
knew what was drawing it. What it bought is a depth buffer, which deleted three
hundred lines of hand-written sorting, stairwell clipping and per-face shading,
and real lights, which is what `lightLevel` now drives.

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
- **Mechanic:** three distribution boards, each raising the light in one zone.
  The building assembles itself around the player. No clock, no failure. See
  `docs/MECHANICS.md` §5.1

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
- **Mechanic:** five rooms with draining session meters. Voxxy taps the rack
  and buys seconds; only Droid reaches the projector at 2 m and resets one.
  Lose three rooms and the day ends early. See `docs/MECHANICS.md` §5.2

A community event that outgrew its room. Half the floor in use, a conference
held together by hand. Droid's reach and patience solve what Voxxy's speed
cannot.

### Chapter III — At Capacity
*The full house.*

- **Cast:** Voxxy, Droid, Biggy
- **Control:** `switch` — three robots, and the clock never stops for any of them
- **Crowd density:** 1.0
- **Light:** 0.85 — Devoxx orange
- **Starts on:** the exhibition floor
- **Objective:** do Devoxx. You cannot do all of it
- **Mechanic:** twelve conference activities, some open and some on a
  timetable, against a six-minute day. Everything you pick up is added to your
  mass. See `docs/MECHANICS.md` §5.3

Every room is full, everything is running, and the robots are *attending*. The
crowd is spectacle and obstacle, never something you manage. Settled 21 Sep,
replacing an earlier `direct-order` mode: every version of "issue intent, the
robots execute" turned out to be an RTS order queue wearing a hat, and a
conference is a better thing to end on than a logistics problem.

The tone lands better too. Chapter I is melancholy and Chapter II is stressed;
without this the game never gets to be fun, and a conference is fun.

Biggy cannot climb a staircase, so **Biggy cannot attend the keynote.** The
game ends with two robots going up into a full room and the heavy one waiting
in the hall it worked all day.

### Why crowd density still carries the arc

`crowdDensity` is one number: `0 → 0.35 → 1.0`. Empty → sparse → packed is
the entire emotional arc of the game expressed as a single parameter, which
is very cheap to build and very hard to misread.

**Built 21 Sep.** It drives the population — nobody, 904 people, 3197 people
— and it also decides how much of the building is in use, because 0.35 of
fourteen auditoriums is five and that is exactly the five Chapter II tends.
Thousands of seated figures are baked into their storey and cost nothing per
frame; a few hundred walk, and get out of the way of anything heavy. See
`docs/MECHANICS.md` §5.4. It does not yet drive the ambient audio bed, which
does not exist.

### Between the chapters — the wormhole

**Built 24 Sep.** The chapters were an anthology you picked from a menu; the
first seam is now a story. Chapter I's last board powers Room 8, and the
power opens a wormhole under Voxxy. It is pulled down through the floor, the
screen goes white, and Chapter II opens on the same white, with Voxxy falling
out of the air over the corridor. It lands, shivers, and **comes apart into
two**: Droid grows out of it, the part of Voxxy that stops and reads the
manual, forced into a body of its own by the trip. Droid says so, four
lines, and the rooms start draining only when it has finished.

It runs backwards on purpose. Chapter I is the building *later* and Chapter
II is its early years, so the way out of the silence is the way back to when
the place was new, and the answer to "what was this place?" is to go there.
The robot count and the story are the same sentence: the cast grows by a
robot a chapter, and now the new robot is a consequence rather than a casting
decision.

Declared on the objectives as `exit` and `arrival` (`core/Objective.ts`), so
it costs no fifth chapter field and no second screen, and everything the
player sees is a render-only pose: the simulation never hears of it.
Chapter II → III is the obvious next seam and is not built.

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

Capability is four gates, and three of them are dimensions the robots already
had: `maxStepRise` (who climbs), `height` (who reaches 2 m), `radius` (who
fits a 0.8 m gap) and `payload` (who can lift the thing at all). Only the last
is new. `docs/MECHANICS.md` §2 has the table.

The `maxSlope` row above was wrong until 21 Sep — it carried 0.45 / 0.38 /
0.35, which was a design intention from before the figures were derived from
`driveForce / (mass · g)`. The real numbers are an order of magnitude apart
at the bottom end, and Biggy's 0.11 against the ramp's 0.10 is now load-
bearing, so the drift mattered. `npm run physics` prints the derived figures.

**Payload is real mass.** `Body.payload` is added to the robot's own and
divides every force in the integrator, so what a robot is carrying changes
how it accelerates, brakes, turns and climbs, by arithmetic rather than by a
rule. It is the mechanic Chapter III is built on and it is about thirty lines.

### Stairs — settled 18 Sep 2026

Climbing is decided by `maxStepRise`, a dimension rather than a flag, measured
against the building's 0.18 m risers:

| | Voxxy | Droid | Biggy |
|---|---|---|---|
| `maxStepRise` | 0.20 m | 0.18 m | **0.00 m** |
| Stairs | yes | exactly these, nothing steeper | **never** |
| Ramps (`maxSlope`) | 0.55 | 0.27 | **0.11** |

**Biggy cannot use a staircase.** 430 kg on a flight of stairs is an accident,
not a route. It gets between levels by ramp or not at all, and that single
constraint does most of the work of the 10 points for "unsolvable without the
right robot":

- **Chapter I** — Voxxy alone, so "find a way up" is about finding *which*
  stair in the dark, not about being able to climb one.
- **Chapter III** — Biggy simply never goes up. Half the card is on storey 1
  and it is locked out of all of it, so the day has to be planned around a
  robot that works one floor. It cannot even attend the keynote.

The same number governs kerbs and the lip of a seat block, so it keeps paying
out beyond the staircases.

**Settled 21 Sep: Biggy never reaches the auditorium level.** No goods lift
goes in. All three routes to floor 1 are stairs, the only ramp links the
concourse to the hall, and a heavy hauler belongs on the exhibition floor
anyway. This is now load-bearing rather than an omission — it is why Biggy
cannot attend the keynote.

The ramp pays out once more. It is 1.2 m over 12 m, a 10% gradient, against
Biggy's `maxSlope` of 0.11: it clears it **empty, by one percentage point**,
and carrying the 200 kg keg its limit falls to 0.075 and it cannot. Anything
heavy therefore stays in the hall, which is where the party is anyway. Nobody
designed that; the surveyed geometry and the measured motors did. See
`docs/MECHANICS.md` §5.3.

Note the levels: the concourse is the HIGHER of the two ground-floor spaces.
You come in at street level and go down into the hall.

If a puzzle can be solved by two different robots, it is not pulling its
weight. Fix the puzzle, not the robots.

## 6. Architecture

**One engine, three rulesets.** This is the rule that makes a twelve-day
schedule survivable.

```
src/
  main.ts                  bootstrap and routing
  config.ts                build constants (NOT gameplay tuning)
  core/
    Iso.ts                 the view angle and the zoom
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
    IsoCamera.ts           orthographic camera, fixed 30° from the south-west
    BlockoutRenderer.ts    the building and the robots as three.js geometry
  input/
    Keyboard.ts            DOM key state
    KeyboardController.ts  keys → DriveInput
  app/
    Game.ts                canvas, renderer, loop, screen lifecycle
    MenuScreen.ts          chapter select
    ChapterScreen.ts       the ONE gameplay screen
```

### Rules that hold the whole thing together

1. **There is one gameplay screen.** There is no `ChapterOneScreen`. A chapter
   is data. Adding a screen per chapter triples the cost of every later change.
2. **The venue is described once.** Chapters dress it; they never redefine it.
   This is also what earns the *sense of place* points — a judge who
   recognises the same corridor in three lights believes the building exists.
3. **A chapter may change exactly four things:** palette + light, crowd
   density, control mode, objective. Wanting a fifth means the thing belongs
   in `core/`.
4. **Everything is in metres.** The building is modelled at the coordinates it
   was surveyed at and an orthographic camera is pointed at it, so there is no
   projection in the middle for the simulation and the picture to disagree
   about. The venue is to scale because it is not scaled.
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
| 6–7 | Chapter III, the conference day | The differentiator is proven, not hoped for |
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

**Changed by the move to three.js, 19 Sep.** The plan was 8-direction sprite
sheets per robot — 24 sheets, the standard answer for a 2D isometric game.
A three.js scene rotates a mesh for free, so there are no facings to draw: one
model per robot replaces eight views of it, and the ability animations become
animations rather than eight copies of each.

**Changed again, 21 Sep, and in the cheaper direction.** The robots are now
built in code from a handful of primitives each — ellipsoids and boxes,
flat-shaded in their own livery — with the proportions measured off the
front views of the model sheets: Voxxy 0.61 wide per unit tall, Droid 0.48,
Biggy 1.11, all within 7% of what `RobotSpec` already said.

That is not a compromise on the way to a real mesh; it is the right answer
for this renderer. Everything else on screen is untextured boxes lit by one
ambient and one directional light, and a detailed model dropped into that
reads as a sticker on a blockout. At thirty pixels a character is its
silhouette — the same lesson the crowd taught at twenty.

What remains is animation: idle, walk, run and one ability each. A group of
primitives animates by moving its parts, which is cheaper than it would have
been with a rigged mesh.

This is a real saving, and it is the largest single piece of remaining art
work. It is also the one place where the renderer change alters the deliverable
rather than only the code.

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
- Room numbers: across the wall at the back of each auditorium, because two
  chapters give objectives in room numbers. Facing south, which is the only
  direction this camera can read, and why that is so is three separate facts
  about the renderer. See `docs/MECHANICS.md` §5.3
- Registration: slatted warm wood, grey carpet, curved cast concrete
- Outside: the forecourt, from photo 54842743975 — asphalt at the doors, a
  line of bollards, a band of brick setts, the road. The elevation is read
  off that frame: solid precast across the west third with a row of small
  windows and the Kinepolis star high on it, the two-storey curtain wall in
  its grid to the east, KINEPOLIS over the glass, a canopy on the doors and
  three banner poles in front. You can drive out and look back at it

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
- [x] Chapter I: what is "the power"? **Three distribution boards, each
      lighting one zone. The third is the stage rack in Room 8: the ghost
      light comes up and the projector starts running Chapter II.** 21 Sep.
- [x] Chapter III: what does issuing intent look like? **It does not. Intent
      was cut on 21 Sep — the chapter is the conference itself, twelve
      activities against a six-minute day, with payload as real mass.**
- [x] Chapter II: what is the failure state? **A room drains, goes dark and
      never returns. Three dark rooms end the day early.** 21 Sep.
- [ ] Audio: generated, or library? Footsteps are the highest-value sound —
      and a loaded footfall should be heavier, which payload mass gives free.
- [x] Does the player ever control Biggy directly? **Yes, in Chapter III, and
      only there. Directing was cut with `direct-order`; Biggy is driven, and
      confined to storey 0 for the whole chapter.** 21 Sep.
- [ ] Where exactly, in metres, do Chapter III's twelve activities sit? The
      rooms all exist; the coordinates do not.
