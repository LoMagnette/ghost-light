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

**Fixed by hand:**
`tools/venue.mjs`, for the same reason as the physics harness: these numbers
are *derived*, and derived numbers drift silently when someone edits a
constant. It fails on a hall that stops matching the printed area, an
auditorium overlapping the corridor, a spawn point inside a wall, or Room 8
no longer being the largest room in the building.

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
