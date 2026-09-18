# Generative AI log

Worth **5 of the 100 points**, and the brief is specific about what is being
scored: *"How you directed the tools, documented in the repo — prompts,
iterations, and what you fixed by hand when the model got it wrong."*

The last clause is the valuable one. A log of prompts that all worked first
time is less convincing than an honest account of what failed. Keep this file
current as you go; reconstructing it on day twelve produces a worse document
and wastes a day.

## Format

Append an entry per meaningful piece of directed work.

```markdown
### <what was being made>
**Tool:** <model / product>
**Date:** <YYYY-MM-DD>

**Prompt:**
> the actual prompt, verbatim

**Iterations:** <n>

**What went wrong:**
what the model got wrong, and what that cost.

**Fixed by hand:**
what was corrected manually, and why the model could not.
```

---

## Design and architecture

### Concept, structure and technical direction
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-18

Extended design conversation covering: engine selection against the constraint
that judges try a live build before cloning; the anthology structure; chapter
ordering; and the decision to make the control scheme itself the through-line.

**Key redirections made by hand:**
- Initial recommendation was Godot; reversed to a web stack once the "live
  build" line in the submission form was read carefully. The hosted URL is the
  first impression and a large wasm payload risks it.
- The dystopian chapter was moved from last to **first** — an empty building is
  a better wordless tutorial than any text, it is the cheapest chapter to
  build, and ending on a dead venue plays badly on the keynote stage of the
  conference it eulogises.
- Tone was pulled from accusatory to melancholy. "AI killed the developer
  conference" is both the obvious take and the one that lands worst in the
  room.

### Project scaffold and specification
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-18

Generated the Phaser 4 + Vite + TypeScript scaffold, the isometric projection,
the mass-based physics integrator, the venue blockout, and `SPEC.md` /
`CLAUDE.md`.

**Fixed by hand:** the venue geometry is a *blockout*, not a survey. The
auditorium dimensions are plausible rather than measured and must be refined
against the official floor plans before the art pass.

### Movement feel — the 20 realism points
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-18

**Prompt:**
> Let's move on this project and develop the next phase

**Iterations:** one session, but with the important work done by measurement
rather than by prompting.

**What went wrong — and it was invisible:**
The scaffold's physics *looked* right. Force-based, fixed timestep, mass in
every division, comments explaining why Biggy brakes worse than it
accelerates. It was also completely broken in the one way that mattered:
**all three robots stopped within 0.2 m of each other.** Biggy needed 1.45 m,
Voxxy 1.23 m. The headline "10× mass difference" did not exist in the build.

The cause was one constant. Rolling resistance was set to 0.06 of weight — a
rubber-tyre-on-asphalt figure — and because resistance scales with mass it
produced the *same* deceleration for every robot, 0.59 m/s². That is half of
Biggy's entire braking budget. It also dragged Biggy to 67% of its top speed,
so its advertised 1462 kg·m/s of momentum was really 984. Nothing in the code
read as wrong, and no amount of re-reading it would have surfaced this.

Two further faults only appeared once the numbers were visible:

- **Reversing beat braking.** Holding the opposite direction shed Biggy's speed
  at 1.92 m/s² while its brakes managed 1.32. "Hard to stop" was defeated by a
  trick a player finds in thirty seconds. Fixed by capping drive force at brake
  force when it opposes travel — pushing backwards against your own momentum
  *is* braking. It binds only Biggy, which is exactly the robot the design
  intended it to bind.
- **Slip was measured against the wrong thing.** Sideways velocity was compared
  to the robot's facing, which chases velocity closely, so it read 0.00 during
  a hard turn. What matters is the gap between the direction the *player asked
  for* and the direction the robot is still travelling.

**Fixed by hand:**
Building `tools/physics.mjs` — the thing that found all three. It compiles
`src/core` with tsc, runs the real `Sim` at its real 120 Hz timestep, and
measures cruising speed, braking and coasting distance, reversal time and turn
radius, then fails if a robot leaves its envelope *or if the three stop being
distinguishable from each other*. That last class of assertion is the one worth
copying: it does not check that a number is correct, it checks that a design
intention still exists.

The judgement that cannot be automated was separated out rather than guessed
at. `npm run physics` proves the robots differ; it cannot say whether Biggy is
*satisfying*. So the movement lab (`L` at the menu) puts all three in one lit
hall with a key to swap between them mid-run, which turns "does this feel
heavy" into a four-second comparison for a human instead of a three-chapter
playthrough.

---

## Robots

### _(pending)_ 8-direction sprite sheets from the model sheets

Planned: generate per-robot turnarounds from the supplied model sheets
(Voxxy 2752×1536, Droid 1376×768, Biggy 2752×1536), then idle / walk / run
cycles at 8 facings.

**Constraint to respect:** the Robot Lab reference robot must not be shipped in
any form. The brief states an entry that is that robot repainted scores zero of
the 40 originality points. Robots are generated from the model sheets only.

---

## Venue

### The building, surveyed from the competition floor plans
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-18

**Prompt:**
> I've provided the files

**Iterations:** one pass. The plans did the arguing.

**What the model had got wrong, unprompted and unknowingly:**
The scaffold's venue was written from a verbal description of the Kinepolis
and it was confidently, specifically wrong. Reading the actual plans:

| | invented | on the plan |
|---|---|---|
| Exhibition hall | 70 × 50 m, 3500 m² | 2411.41 m², ≈49 × 49 m |
| Column grid | 11.5 m bays | ≈6 m bays |
| Staircases | one, central | **two**, side by side |
| BOF rooms | west side | south-east |
| Auditoriums | staggered down alternate sides | facing **pairs** |

The column grid being wrong by 2× is the one that actually mattered: SPEC calls
it "the single most recognisable feature of the hall", and at 11.5 m it was
scenery you drove past rather than a slalom you had to read ahead for. Biggy
needs 3.8 m to stop; that only becomes interesting at 6 m spacing.

**The useful technique — scaling a plan that says "no scale":**
Neither drawing carries a scale bar. Both carry *printed numbers*:

- `hollywood-area.png` labels the hall "Receptieruimte 'Hollywood' — opp:
  2411.41 m²". Measuring the hall's pixel extent on each of the two
  ground-floor plans independently and solving for scale gave 47 × 51 m and
  49 × 49 m — agreeing within 4%, which is what makes it trustworthy rather
  than a single guess.
- `cinema-venue-devoxx.png` prints a **seat count on every auditorium**. So
  room frontage is measured off the drawing and depth is *derived*: seats ×
  0.9 m²/seat ÷ frontage. Room 8 is the biggest room in the game because 746
  people really fit in it.

A structural fact fell out of the seat counts that no description would have
given: the rooms pair across the corridor and **every pair sums to 13** —
(1,12) (2,11) (3,10) (4,9) (5,8) (6,7) — with 13 and 14 extending north past
12 on the east side only. And ZAAL 8, at 746 seats, is the largest room in the
building, which independently justifies the keynote room the whole third
chapter aims at.

**Corrected after review — and this is the entry worth reading:**
The first pass passed every numeric check and was still visibly wrong. The
human looked at the game next to the map and said so: *"I think you forget to
modelize the reception part and I think you mis evaluate the sizes since
everything is bigger that what the maps shows."* Both correct.

The mistake was method, not arithmetic. Room frontage had been eyeballed off
the drawing and depth *derived* from seat counts, so two soft numbers
multiplied and the errors compounded in opposite directions: rooms came out
too wide and too shallow at once — Room 6 by 20% on one axis and 32% on the
other. Reception had been placed inside the hall's own rectangle, which
deleted the threshold between arriving and being inside.

The fix was to stop deriving and start measuring. Segment the shaded hall on
the annotated plan and solve the printed 2411.41 m² over its pixel count for a
ground-floor scale. Autocorrelate the drawn seat rows for a first-floor one —
Rooms 5, 7 and 8 all return a 10 px pitch, and a cinema row is ~1.0 m. Then
find party walls as rows and columns of near-solid ink and measure every room.
The seat counts became a *check* instead of a source: every room now lands
between 0.9 and 1.3 m² per seat, which is what a raked multiplex really is.

|  | derived | measured |
|---|---|---|
| Corridor | 16.0 m | 14.3 m |
| Room 6 | 21.5 × 17.1 m | 17.9 × 25.1 m |
| Room 5 | 23.7 × 26.0 m | 22.2 × 30.1 m |
| Column bay | 6.00 m | 6.4 m |
| Hall | 49 × 49 solid | 52.5 × 55.5 box, 83% filled |

**Fixed by hand:**
`tools/venue.mjs`. It checks the hall against its printed area, every room
against its printed seat count, Room 8 against being the largest room in the
building, and every spawn point against standing in a wall.

But the lesson of this entry is that none of those caught the real error,
because the geometry was self-consistently wrong. `npm run venue -- --svg`
draws both floors as a plan, and holding that next to the actual drawing is
what makes a mistake like this obvious in seconds. **A building cannot be
checked by driving around inside it.**

### The hall, third time — a drawing that scales itself
**Date:** 2026-09-18

**Prompt:**
> so just to give you an idea of the size of the biggest room is 694 sitting
> person. I feel that the exibition floot still feel too small it's maybe due
> to the pillar. I've add a booth map image to help you. The smaller booth are
> 6sq meter (2x3) the largest are 24sq meter

The stand plan turned out to be the best drawing of the three, because it
**scales itself**: the large stands are 24 m² and stack at a 175 px pitch, so
175 px is 6 m and their 118 px width is 4.05 m — 4 × 6, exactly 24 m². No
external figure needed. At that scale the building interior is 52.3 m across
and the hall's south wall — the line of doors into reception — carries 91% ink
coverage at 49.4 m, where nothing else on the drawing comes near 45%.

That settled a question the earlier pass had got badly wrong. 52.3 × 49.4 =
2584 m² of box against 2411.41 m² of printed floor, so only **172 m²** is not
hall. The previous pass had cut away **500 m²** — a 221 m² block out of the
north-east alone — and left an L-shaped room that drove far smaller than its
area. Correcting it removed 330 m² of solid obstruction from the middle of the
floor.

The pillars were the other half, and the diagnosis was right for the wrong
reason: the 6.3 m bay is correct, confirmed on two drawings. The fault was in
the RENDERER. Columns were drawn at their true 5.4 m clear height, which in an
isometric view turns a 52 × 49 m room into a thicket of poles that hides the
floor and the far wall. They are now capped at 2.7 m drawn. That is not a fudge
of the simulation — collision is two-dimensional and has never read `height` —
it is the same decision as not drawing the ceiling, and a column holding up a
floor we do not draw was the inconsistent part.

**Fixed by hand:** the human's seat count for Room 8 (694) disagreed with the
plan (746). Both are right: the drawing is dated 02-03-2012 and a cinema loses
seats every time it re-seats. Recorded as `KEYNOTE_SEATS_TODAY` so crowd counts
use the modern figure while geometry follows the plan.

### The building rendered 180° from its own plan
**Date:** 2026-09-18

**Prompt:**
> I think you flip the map for exposition hall. And I think you forgot the
> stairs between the reception and the exposition hall. and the stair from the
> reception to the first floor are missing

Three observations, three real faults, and the first one had been sitting in
the projection since the scaffold.

`project` computed `sy = (x + y) * PPM * ISO_SQUASH`. Screen y grows downward,
so +y — north — came out at the BOTTOM of the screen. The building rendered
180° from every drawing of it: stairs at the bottom, main entrance at the top.
Every numeric check passed, because the geometry was right; only a person
holding a plan up to the screen could see it. The fix is one negation, but it
has to propagate: `depthKey` has to negate too or far walls draw over near
robots, `drawBox` has to paint the south and west faces instead of the north
and east ones or every box turns inside out, and the keyboard basis has to be
re-derived or W walks you south.

The two missing staircases were worse than missing — the plan had been
misread. "∧ Rooms ∧" does not label a seminar suite, it labels the ~16 m grand
flight beneath it and means *this way up to the cinema rooms*. So the ground floor has **three**
ways up, not two, and one of them starts in the concourse rather than the hall
— which matters for Chapter III, where three robots and a full house cannot
share one staircase.

And the concourse is not flush with the hall: a ~23 m flight spans the
boundary, and the concourse is the higher of the two — you come in at street
level and go *down* into the hall. The proof the level change is real is the
label beside it: a plan does not write "wheelchair access" across a flat
opening.

*(Both of those took a second correction from the human. The first pass had the
steps climbing the wrong way, and invented a stair on the concourse's west wall
out of a hatched run that belongs to another part of the building.)*

**Worth keeping:** the column grid is square and the isometric screen axes sit
at 45° to it, so holding right or left tracks a line of columns and meets one
every 8.9 m. True to the building, and it made the screenshot harness useless
until it was taught to drive due east (W+D) between the rows instead.

**Follow-up, same session:**
> One thing missing from the exposion room is the the two stairs. There
> technically almost invisible expect for the bulk space they block

Correct, and the phrasing named the fix. A `Link` was pure data — nothing drew
it and nothing collided with it — so the two flights standing in the middle of
the exhibition hall were holes in the room rather than objects in it. From the
hall floor a staircase is mostly an obstruction, and that mass is what a player
meets long before anyone climbs anything.

Each flight now generates a run of nine treads whose height steps up along the
link's climb axis. That blocks correctly *and* draws as a staircase with no
change to the renderer at all, and the 2.7 m cutaway height slices the top off
a full-floor flight exactly as an architectural section would. Interim: when
floor traversal lands, robots climb the treads instead of stopping at them.

It also forced an honest addition to the `Link` type. The climb axis cannot be
inferred from the bounds — the grand staircase out of the concourse is 15.7 m
wide and 5.6 m deep, so its long axis is the one you walk *across*.

### Settling the stair rule
**Date:** 2026-09-18

**Prompt:**
> btw how the robot are supposed to climb the stairs ?

The best question of the session, because the answer was worth 10 points and
nobody had asked it. Four options were put up — everyone climbs at a
mass-scaled speed; nobody climbs and a lift is the only way up; only Voxxy
climbs; or climbing is decided by a dimension. The human picked the dimension.

`maxStepRise` per robot, measured against the building's 0.18 m risers. Voxxy
clears them at 0.20, Droid matches them exactly at 0.18 and can climb these
stairs and nothing steeper, Biggy is 0.00 and never climbs anything.

Why a dimension rather than a `canClimbStairs` flag: the same number decides
kerbs and the lip of a seat block, so the answer to "can this robot get over
that" falls out of the building instead of a list of exceptions. And it makes
Chapter III's `direct-order` mode have a real problem the first time it runs —
you cannot send all three up the nearest flight, so Biggy has to be routed the
long way while the others take the stairs.

A second number, `maxSlope`, covers ramps, and every robot clears the
wheelchair ramp including the one that can climb nothing at all. The accessible
route being the route that always works is a good note for this game to hit,
and it was an accident of the geometry before it was a decision.

**Fixed by hand:** the ramp was modelled climbing across its short side, which
made a 1.2 m rise into a 33% slope — a wall with a friendly label. It climbs
along its 10 m side at 12%, and even that is one rectangle standing in for what
must really be a switchback: a true 1:12 needs 14.4 m of run and the plan has
no straight line of it.

Two things stayed deliberately wrong. The real auditoriums are fan-shaped and
these are rectangles, because `Rect` is what the collision system speaks —
the fan lives in the seating instead, which tapers toward the screen and is
what a robot actually drives around. And ceiling heights are still invented:
a floor plan cannot give volume, which is why watching the drone footage is
still on the human's list.

### _(pending)_ Palette extraction from the venue photographs

---

## Audio

### _(pending)_ Footfall and ambience

Footsteps are the highest-value sound in the game — they are what sell mass,
and mass is 20 points.
