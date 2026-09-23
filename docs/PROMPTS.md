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

### The mechanics of all three chapters — and four rejected pitches
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-21

**Prompt:**
> Can we brain storm on what game mechanic will be implemented for each level
> to them write a spec about it.

**Iterations:** five rounds on Chapter III, four of which were thrown away.
Chapters I and II were agreed in one.

**What went wrong, and it is the most useful entry in this file:**

The model was asked to design the mechanics and produced, in order:

1. **Three "flow operators"** — the crowd as a density field, Voxxy attracts,
   Droid blocks, Biggy clears. Rejected: *"they look not really convincing and
   a bit generic."* Correct. All three options in that round were the same
   RTS — select a unit, issue an order — with different order vocabularies.
2. **A ghost relay** — three passes over the same 90 seconds, earlier runs
   replaying exactly as ghosts, which the deterministic fixed-timestep sim
   makes nearly free. Technically elegant, thematically tidy (the game is
   called *Ghost Light*), and rejected flat. The model had optimised for what
   was cheap to build in this engine and for a pun on the title, which is not
   the same thing as what is fun.
3. **Five fresh premises** — play the building, lead a convoy, crowd as
   terrain, a relay of one object, a show-call clock. The human took *crowd as
   terrain* and added the actual requirement, which had never been stated:
   *"I want something with a wow effect."*
4. **One stick, three masses** — WASD driving all three robots simultaneously,
   identical input producing three trajectories because mass is the only
   difference. Rejected on the real objection: *"I'm not sure that the crowd
   control is original enough."*

Then the human supplied the idea, in one line: *"maybe play on the idea of
collectable or activities that could be done at a conference."*

**What the model had missed, four times running:** it kept varying the
*control abstraction* — how the player addresses the robots — because the spec
said the control scheme was the through-line, and it treated that sentence as
a constraint rather than as a hypothesis that could be wrong. Every pitch was
therefore a different way of *commanding*, when the problem was that the
finale had no reason to be enjoyable. Chapter I is melancholy and Chapter II
is stressed; ending on crowd logistics meant the game never got to be fun, and
a conference is fun. No amount of iterating on command syntax finds that.

**Fixed by hand:** the premise, and it came from knowing what a conference
feels like. From it the model could derive the rest — that the pickups should
have mass and feed the integrator, so greed costs handling; that reach is
`height` and fit is `radius`, both already on `RobotSpec`, so three of the
four capability gates needed no new code at all.

**What the model found that the human could not:**
With the premise fixed, it was asked to check whether a loaded Biggy could
still climb the building's only ramp. It cannot, and the arithmetic is exact:
the ramp is 1.2 m over 12 m, a 10% gradient, against a `maxSlope` of 0.11 —
cleared **empty by one percentage point**, and at `0.6 · 774 / (630 · 9.81)` =
0.075 with the 200 kg keg aboard, not at all. Biggy can take at most 43 kg up
that ramp. So anything heavy is confined to the exhibition hall, which is
where Devoxx actually holds the party. Nobody designed that; the surveyed
geometry and the measured motors had already agreed on it, and it is now the
constraint Chapter III is built around, with a `npm run traverse` assertion so
that nobody later "fixes" it.

That is the useful division of labour, stated plainly: the human supplied the
premise and rejected four competent, wrong answers; the model supplied the
consequences, the arithmetic, and the discovery that the building had been
carrying a better constraint than either of them had thought to ask for.

**Output:** `docs/MECHANICS.md`, plus `SPEC.md` §§1, 3, 4, 5, 7, 10 and the
`ROADMAP.md` decision table. `direct-order` was cut from the design.

### Building the objective system, and two harnesses earning their keep
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-21

**Prompt:**
> Document everything then move to implementation

**Iterations:** one pass, but with four corrections that came from harnesses
rather than from reading the code.

**What was built:** payload as real mass in `Body`, an activity vocabulary and
objective runner in `core/`, all three chapters authored as data, `switch`
mode, the card and the end card, markers, a lamp, and zone lighting.

**What went wrong — and none of it was visible in the code:**

1. **A laden Biggy walked up a ramp it cannot climb.** Payload reduces the
   gradient a robot can hold, so `canTraverse` correctly refused the ramp —
   and nothing physical refused it, because a ramp had never needed treads.
   The robot walked over the link and the concourse floor plate, 1.2 m up,
   simply picked it up. `npm run traverse` caught it on the first run of the
   new assertion. The fix is a threshold lip at the foot of the ramp carrying
   the link's id, exactly like every stair tread in the building: invisible
   to whoever may use it, a wall to whoever may not.

2. **Four of Chapter III's activities were unreachable**, found by a harness
   written specifically to look for it (`npm run objectives`). The keg was
   inside an exhibition stand, and the Room 5, Room 11 and keynote zones were
   all centred in the seating. The last three were one mistake repeated: the
   model wrote "be in the room" as the room's own rectangle, when the only
   floor of an auditorium a robot can occupy is the 2.5 m cross aisle behind
   the back row — the rest is seat banks and a four-metre rake.

   This is the failure this project is most exposed to: an objective is
   coordinates, a zone two metres out is inside a solid, and the only symptom
   is a chapter nobody can finish. It is invisible in a typecheck, in a
   screenshot of anywhere else, and in review. So it got a harness, and the
   harness now also checks that somebody in the cast both passes the gates
   and can physically reach that storey.

3. **The reveal lit nothing you could see.** Switching the hall on hung three
   point lights down the long axis of a 52 × 49 m room, so everything off
   that centre line — including the west wall, where the board that switches
   it on is — stayed exactly as dark. Caught by screenshotting the game
   before and after, which is the only way this one could have been caught.
   Now a grid, one light per 15 m in each direction.

4. **The spec's own `maxSlope` table had been wrong for days** — 0.45 / 0.38
   / 0.35 against the code's 0.55 / 0.27 / 0.11. Harmless while nothing read
   it; not harmless now that Biggy's 0.11 against the ramp's 0.10 gradient is
   the constraint Chapter III is designed around. Found by checking the
   number before writing it into a new document rather than copying it.

**Fixed by hand:** nothing, this time — which is the point of the entry. Every
one of the four was found by a harness or a screenshot and fixed from what it
reported. The human's contribution on 21 Sep was the design (see the entry
above); the verification loop caught the implementation's mistakes without
anyone having to read the diff.

### Numbering the rooms, and three renderer facts that each ate a design
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-21

**Prompt:**
> The room should have a visible number

**Iterations:** four designs, three of which were built, screenshotted and
thrown away.

**What went wrong:** the model reached for the obvious sign each time, and the
renderer refused it for a different reason each time. None of the three was
visible in the code, in a typecheck, or in any amount of reasoning — each took
one screenshot.

1. **A plate on the corridor wall.** The view is fixed to the south-west, so
   the faces you can see point south and west. The east wall's numbers read
   and the west wall's face away: half the building numbered, for the whole
   game. Caught before building it, by thinking about `ISO_AZIMUTH` — the one
   of the four that was caught for free.
2. **A blade projecting into the corridor**, which fixes the facing. Built it,
   shot it, and the digits came back as a stack of thin dashes. Cause:
   `MAX_DRAWN_HEIGHT` clips every piece of geometry 2.7 m above the storey
   datum, so a sign hung at head height was sliced to a five-centimetre
   sliver. The model had read that constant earlier in the session and still
   did not connect it.
3. **Thinning the characters so they showed their face rather than their
   top.** This made it worse, and the reason is the lighting: `KEY_DIRECTION`
   is almost straight down, so a south-facing surface reflects about a third
   of what an upward-facing one does. The bright bars in the failed shot were
   never the characters — they were the TOPS of the horizontal strokes, which
   is why every number read as a stack of lines with the uprights missing.
4. **A dark plate behind them** (a new `signPlate` palette entry) made the
   blade legible and still clipped. Only then did the three facts add up to
   the answer: paint the numbers on the FLOOR, which is never clipped, never
   occluded, and faces the one direction the light comes from.

**Fixed by hand:** nothing — but the human's one-line prompt was the whole
task, and the model's first three answers were all the answer a person would
give for a real building rather than for this camera.

**Worth keeping:** the geometry was verified numerically before being
believed. A probe dumped the decor pieces around Room 2 and printed a correct
seven-segment "2" and an "11" opposite, which proved the layout was right at
a point when the screenshot still looked wrong — and that is what localised
the bug to the lighting rather than to the glyph code.

**Follow-up prompt, next session:**
> the room number would better on the wall inside and outside the rooms

They are right, and the floor was a retreat rather than a design. The
mistake in the first attempt was fixing the three constraints one at a time:
each fix was tested against the failure it addressed and then abandoned when
a different one bit. Answered together — face south, stay under 2.7 m, light
characters on a dark plate — a wall sign works, and every room now has its
number on a pier beside the door and again across the wall at the back of
the room.

Facing south is what costs: a south face spans x and z while the corridor
runs along y, so a sign out in the corridor needs depth — it came out as a
pier beside each door with its digits stacked down it.

**Then, one prompt later:**
> Don't put the number outside the room

The piers came out again, and the answer was better for it. The number lives
only on the room's back wall now, and because the camera looks over a room's
south wall it is legible from the corridor anyway — so the corridor reads as
a corridor rather than as a row of fourteen pillars, and nothing was lost.
Worth recording as the pattern: the model added a second sign to solve a
problem the first one already solved, and only stopped when told to.

**Caught by a harness, again:** `npm run venue` failed with 76 problems the
moment the signs went up — it asserts stage letters stand within two metres
of the screen wall, which is how it catches #DEVOXX drifting into the
seating, and fourteen room numbers at the other end of their rooms are
letter-shaped things that trip it. The fix went in the DATA rather than the
test: a `signChar` material, the same ink as a stage letter and a different
object. Weakening the check to accommodate the new thing would have thrown
away the check.

**Output:** seven-segment digits added to the existing `#DEVOXX` glyph set,
`roomNumeral` in `kinepolis.ts`, a `signPlate` colour in all three palettes,
and `npm run peek` — an arbitrary-frame screenshot tool, promoted from a
scratch script to a real one because three of these four findings came out of
it.

### Populating the building
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-21

**Prompt:**
> it would be nice for the chapter 2 and 3 to have some roaming human and some
> speakers in the rooms

**Iterations:** one build, then two corrections from measurement.

**What this was really fixing:** `crowdDensity` had been in the spec since day
one, described as the parameter carrying the emotional arc of the whole game,
and it drove nothing whatsoever. Three chapters' worth of design rested on a
number nothing read.

**The decision that made it affordable**, and the model did get this one
right first time: split the crowd into people who are sitting down and people
who are not. The seated are thousands, never move, and are baked into their
storey's geometry at build time — a full Room 8 costs the same per frame as
an empty one. Only the few hundred on their feet are simulated, at 20 Hz
rather than the physics timestep, because nothing about the game's outcome
depends on exactly where a stranger is standing.

**What measurement caught afterwards:**

1. **The building held two conferences.** Filling every seat of all fourteen
   rooms is 5221 people, plus 454 more walking about. Devoxx sells roughly
   3200 tickets. The fix is a single cap that seated and roaming both draw
   from, which lands at 3197 and has the side effect of making every room
   about two thirds full — which is what a conference actually looks like,
   and better than the thing that was asked for.
2. **The first pass was too thin to read as capacity.** 260 roamers over a
   2500 m² hall and a 126 m corridor looked like a quiet Tuesday. Raised to
   440 after looking at a frame, which is a judgement no amount of arithmetic
   was going to make.

**Verified numerically as well as visually**, which is the habit this session
settled into: a probe instantiated the crowd for all three chapters and
printed the counts and the number of stages with a speaker on them (14 of
14). The screenshot that was supposed to show a speaker had the robot parked
on top of it, and without the count it would have looked like a bug.

**Follow-up prompt, same day:**
> Can you make them look like human and less like chocolate bar ?

Fair. Each person was one box, and one box at this scale is confectionery.
Three boxes fixed it — legs, torso, head — because what makes a shape read
as human at twenty pixels is silhouette and nothing else: a head narrower
than the shoulders and a break between them. All three share one centre
line, so the figure still rotates on a single heading and the extra parts
cost no extra maths.

The second half of the fix was colour. The first version gave the whole
crowd one flat palette entry, justified in the code comment as "a crowd is a
mass" — which is true and was still wrong, because a mass in exactly one
colour is a texture. Trousers, clothing and head are now all derived from
that same entry (darkened, varied per person, and lifted towards the era's
near-white), so the crowd is still the colour the chapter chose and no
palette entries were added.

Also caught here: people walked through each other and gathered in knots of
five, because they all navigate the same 1.5 m grid and kept choosing the
same cell. Separation resolved within a cell only — almost every cell holds
nought or one person, so it is free, and the case it misses is the case
nobody sees.

**A measurement worth recording as a warning:** the frame rate at capacity
read 24 fps, against 64 earlier — and it is not the crowd. Chapter I, which
has no people in it at all, reads 37 in the same harness. This sandbox has
no GPU and is rasterising in software, so every absolute number out of it is
meaningless and only the ratio means anything. Nearly threw away a working
design chasing it. Performance on real hardware is a human task.

**Deliberately not built:** any force from the crowd back onto the robots.
Movement is measured, tuned and worth 20 points, and `npm run physics`
measures in an empty world — so a drag term would silently change every
figure in the spec table while the harness went on reporting the old ones.
Written down in `docs/MECHANICS.md` §5.4 rather than left as an omission.

## Robots

### The cast, built from primitives instead of imported
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-21

**Prompt:**
> I'm worried that the game is now a bit too low poly to use actual model one
> the robots and I'm wondering if they size in the game reflect what they are
> supposed to be

Two questions, and the useful part is that the second one had already been
answered and the first one turned out to point the other way.

**Are the sizes right?** Yes. The model sheets were read and the front view
of each measured against `RobotSpec`:

| | Sheet, width per unit height | `RobotSpec` | Absolute |
|---|---|---|---|
| Voxxy | 0.61 | 0.59 | 0.68 × 1.15 m |
| Droid | 0.48 | 0.45 | 0.92 × 2.05 m |
| Biggy | 1.11 | 1.07 | 1.44 × 1.35 m |

All within 7%. Absolute scale is not in the sheets — no scale bar, no human
in frame — but it is now pinned from two directions: the masses are
plausible for machines that size, and the 1.72 m crowd added earlier the
same day puts Voxxy at chest height, Droid a head taller than a person and
Biggy low and twice as wide. **The scale was only checkable because the
building had people in it**, which it had not until that afternoon.

Worth recording: `height` stopped being art when the objective system
landed. Droid's 2.05 m is the reach gate that makes it the only machine
that can work a 2 m counter, so these numbers are now gameplay.

**Is the game too low-poly for real models?** It is the wrong way round. The
robots were single boxes, and the crowd — three primitives each — had more
shape than the cast did. The least detailed things on screen were the three
characters the entry is judged on.

So no model import. Each robot is now four to eleven primitives, positioned
in the machine's own frame as fractions of `radius` and `height`, so the
drawing scales off the collision shape and the two cannot drift. A textured
mesh in a scene of flat-shaded boxes would read as a sticker; what carries a
character at thirty pixels is silhouette, which is exactly what the crowd
had just demonstrated at twenty.

**Fell out of it:** the facing pip could go. A box is symmetrical and needed
a bead stuck to its front to show which way it pointed; a machine with a
head does not. And the contact shadow, at 2.1 x the body radius, had been
sized for a era when the shadow was most of what told you where a robot was
standing — under a shaped Biggy it read as a three-metre crater, so it came
down to 1.45.

**Fixed by hand:** nothing yet — but the numbers in the table above are the
kind of claim that should be checked by a human looking at the screen, and
whether Biggy is *satisfying* remains undelegable.

**Follow-up prompt:**
> that already better. Can you tweek the rest of the graphics to be on par
> with the robots

Four changes, all the same lesson the robots and the crowd had already
taught — shape and a second tone, rather than detail:

1. **A seat is a pan and a back, not a block.** Five thousand identical
   boxes read as corrugation; the rake of a full auditorium came out as a
   ribbed slab. Two pieces fix it, because what the eye is looking for is
   the gap. The pan is the piece the crowd counts itself by, so the seated
   population is unchanged — and it now sits ON the pan rather than at an
   assumed height above the tier, which is one fewer number to keep true.
2. **Every box is nudged in tone by where it stands.** A thirty-metre wall
   painted in exactly the value of the column in front of it is one dead
   slab; ±5.5%, keyed off position so it never shimmers, makes the same
   geometry read as MADE of things. Left off glass and off signage, where
   variation would read as a misprint.
3. **The cutaway plane is drawn as a band.** `MAX_DRAWN_HEIGHT` slices
   every wall and column at 2.7 m and they simply stopped. A pale 8 cm
   band along the cut turns the artefact into the device it should have
   been: the building reads as a sectioned architectural model, columns
   get a capital and walls get a cornice, all out of geometry that was
   already being clipped. The best-value change of the four, and it is
   eleven lines.
4. **Grouped objective markers shrank to studs.** Not strictly graphics —
   but twenty-seven sticker markers at full height had turned the
   exhibition hall into a pole farm, more marker than building. One thing
   you are doing keeps its post; a sweep of many gets studs.

**Follow-up prompt:**
> It's better but I think the human model could be improved and the way they
> sit in the seats is a bit strange

Right on both, and magnifying a row to look properly turned up a third
thing nobody had noticed.

**Sitting was a post, not a pose.** A standing torso had been dropped onto
the pan: no lap, no knees, and perched on the front edge because it was
centred on the seat rather than pushed back against the rest. Now it is an
L — thighs running forward, spine back, head and shoulders showing over the
seat back in front. Every seat faces along x, so the direction comes out of
the heading as a sign and the parts stay axis-aligned, which is what keeps
three thousand of them in one instanced mesh with no rotation.

**The walkers were rotated ninety degrees.** Found while renaming the
parameters: the box dimensions were passed as (width, depth) and used as
(x, y), so every person in the building was presenting a shoulder in the
direction they were walking. Invisible standing still and unmistakable once
named — `thick` for front-to-back and `wide` for side-to-side now, with the
reason written above the constants.

**Heads became ellipsoids and the torso got a shoulder line**, which is
what actually carries a human at this size.

**And arms were built and then deleted.** They were made, in a sleeve
shade, and measured: a real arm hangs inside the shoulder width, protrudes
about seven centimetres, and at this zoom that is two pixels. What would
make an arm read is the gap between it and the body, and there is no room
to draw one. They were costing two of five boxes per walker — forty per
cent of the crowd's per-frame work — to say nothing. Removing work that
does not register is as much a part of this pass as adding work that does.

**A real mistake, recorded because it nearly cost the session:** the edit
that introduced these constants was scripted as "replace everything between
this comment and that one", and the closing marker sat *after* the `Crowd`
class rather than before it. It deleted the class — 534 lines down to 160.
It was committed, so `git checkout HEAD --` cost nothing, and the redo used
narrow replacements anchored on both ends. Slicing a file between two
markers is only safe when you have checked what lies between them.

**Follow-up prompt, and a correction I had earned:**
> the human have no arms and square shoulder

Both true, and the arms were my own doing: I had built them, measured that
they protrude about seven centimetres past the body, worked out that this
is two pixels at this zoom, and deleted them as work that did not register.
The measurement was right and the question was wrong. An arm at this size
never was going to read as a silhouette — it reads as TONE, two darker
strips either side of a lighter torso in the same plane. Rebuilt that way
they are obvious. The shoulders were a flat slab across a narrow torso,
which is why they read as epaulettes; they are a rounded blob now.

The lesson is the one worth keeping: a measurement can be correct and still
license the wrong conclusion, and "I measured it" is not the same as "I
measured the thing that mattered". The user was looking at the screen,
which beat my arithmetic.

**And a performance finding that is honest rather than useful:** a packed
Chapter III runs its simulation at about a quarter of real time in the
headless harness, where an empty Chapter I keeps up. Halving the crowd's
triangle count — five hundred thousand down to two hundred and fifty —
moved it not at all, which rules out geometry and points at fill rate:
thousands of small overlapping objects shaded pixel by pixel on a CPU.
That is the one cost a GPU erases, so no number measured here means
anything, and it has been written onto the human task list rather than
guessed at. The frame-rate readout itself is unreliable in that harness for
a related reason — with few frames, one near-zero delta pins the smoothed
value at nonsense, which is why the `sim` clock is the figure to read.

**Follow-up prompt:**
> Can you animate the robot when they go over the stairs because it looks a
> bit strange

It was gliding, and the cause is a deliberate asymmetry nobody had looked
at since the stairs were built: the SIMULATION treats a flight as a smooth
ramp, because `surfaceHeight` interpolates the whole run and that is the
stable thing to stand a rigid body on. Drawn honestly, that is a machine
floating up an invisible slope with the steps passing underneath it.

Fixed in the renderer alone, which is where it belongs. The drawn height
is quantised to the tread the robot is over, with a small arc between one
tread and the next scaled by speed so a parked machine does not hover. On
ramps — where there are no treads and a dead-level machine is the thing
that looks wrong — it leans into the gradient instead, by the component of
the slope along its own facing, so crossing a slope sideways stays level.

**Measured rather than eyeballed**, because a still frame cannot show a
climb: a probe drove Voxxy up the west flight in the real sim and compared
the two heights frame by frame. 36 distinct drawn heights against 775
simulated ones — a staircase, not a ramp.

**And that first version was wrong, which the user saw and the probe did
not.**

> can you improve it a bit more so it looks more natural an not jumping
> from step to step

Snapping to the NEAREST tread puts the feet on a step at every instant and
pays for it with a 0.18 m teleport at the halfway point of every step. The
probe had reported "36 distinct heights, worst disagreement 0.092 m" and
called it a success, because it was measuring how close the drawing stayed
to the solver and never once asked how far it moved BETWEEN FRAMES. The
metric was right about the thing it measured and silent about the thing
that mattered — the second time in this session that has happened.

Rebuilt as dwell, rise, dwell: the height holds at the tread for the first
fifth of the going, eases onto the next over the middle, and settles. Plus
a rock backwards and a little extra lift, both hung off the rise rate, so
the effort peaks in the middle of the step and is nothing at rest.
Continuous everywhere, and it tracks the treads better than the snap did:

| | snap | eased |
|---|---|---|
| worst disagreement with the solver | 0.092 m | **0.041 m** |
| biggest jump between frames | **0.180 m** | **0.019 m** |

The probe grew a between-frames check, which is the measurement it should
have had first.

**And then, from watching it rather than measuring it:**
> So if I climb the stairs side way is looks really good but straigh on is
> strange

Straight on, the machine was rearing: pitched nose-UP, tipping away from
the direction it was travelling, which reads as falling over backwards.
Sideways it looked fine only because the same pitch is edge-on there and
nearly invisible.

Two mistakes behind one symptom. The rock was applied in the robot's own
frame regardless of where it was going, so a machine cutting across a
flight got the full pitch of one climbing it. And the direction was simply
wrong: a ramp tips a chassis nose-up because the wheels follow the
surface, but a staircase is WALKED, and a body walking up one leans
forward over its feet. Both now scale by how much of the travel is
actually up the flight — +1 straight up, 0 square across, -1 straight down
— so crossing stays square, climbing leans in, and descending leans back.

Worth noting what caught it: nothing could. The probe measured height
against the solver frame by frame and was perfectly happy, because the
pitch is not a height. It took a person driving up a staircase and saying
it looked odd. It also grew a guard for the storey change — arriving on
floor 1 re-bases z on the new datum, a 6.2 m step in the number and no
movement at all, which the new check dutifully reported as the worst jump
in the climb until it was told otherwise.

**What was deliberately not done:** any change to the lighting. `AMBIENT`,
`KEY` and the sRGB curve were tuned against photographs and every palette
in the game is calibrated to them, so a second fill light would have been
the cheapest-looking improvement here and the most expensive to unpick.

### _(pending)_ 8-direction sprite sheets from the model sheets

Planned: generate per-robot turnarounds from the supplied model sheets
(Voxxy 2752×1536, Droid 1376×768, Biggy 2752×1536), then idle / walk / run
cycles at 8 facings.

**Constraint to respect:** the Robot Lab reference robot must not be shipped in
any form. The brief states an entry that is that robot repainted scores zero of
the 40 originality points. Robots are generated from the model sheets only.

---

## Venue

### Stepping outside, and the building seen from its own forecourt
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-22

**Prompt:**
> Let move on create a new branch the goal is to be able to exit the movie
> theater and via the glass door and see the building. For the visual you can
> use this image 54842743975_b835884445_k.jpg

**Read the photograph first**, which is the whole reason this looks like
anywhere: asphalt at the doors, a line of bollards, a band of brick setts,
then the road and its markings. Two storeys of curtain wall in a mullion
grid between pale precast flanks, three banner poles in front of it, and a
neighbour's shed off to the east. All of that is in the venue now.

**Three problems, and only the first was the one that had been asked for.**

1. **There was nothing outside to walk onto.** Everything the simulation
   knows about standing anywhere comes from rooms, so the forecourt had to
   BE a room — at concourse level, because the concourse is street level:
   you come in at grade and go down into the hall. But a room outside the
   glass makes the reception's south elevation a party wall between two
   rooms, which is the one thing a curtain wall is not, so the wall builder
   now ignores rooms of kind `outside`. Outside is the absence of walls,
   not a room with different ones.

2. **The building was a knee-high stump.** `MAX_DRAWN_HEIGHT` cuts
   everything at 2.7 m so a player can see into rooms — correct from
   inside, and from the forecourt it leaves a ten-metre building as a kerb.
   The envelope is now drawn separately: the part above the cut on this
   storey, plus the whole of the storey above, which is otherwise not drawn
   at all because only one storey is ever visible. Shown only while the
   player is outside, so it never stands between the camera and a room.

3. **The camera framed the robot, so the building was off the top of the
   frame.** A 1.15 m machine centred in the view puts ten metres of
   elevation above the window. Outside, the look-at point lifts 5.5 m and
   the elevation drops into frame — eased by the existing camera lerp, so
   walking out is a pan rather than a cut.

**The bug worth recording** was mine and took a probe to find. The flag
that marks a wall as the building's envelope was computed one line too
late, AFTER the loop index had walked on to the next run of wall, so every
wall was classified by its neighbour's kind. The building came back with
exactly one exterior wall in it. Nothing about it looked wrong in the code;
counting the flagged pieces took a minute and pointed straight at it.

**A comment in the codebase called this shot exactly.** `glazeFacade` said
of the doors: *"there is nothing outside to open onto... They are doors
when there is a forecourt to walk into."* They are doors now.

**Then, from looking at it against the photograph:**
> it's missing some element of the front face of building at the moment

Four things, and the photograph names all of them. The curtain wall had
uprights and no TRANSOMS, so every bay was one tall sheet of glass and the
elevation read as a row of dark slots rather than a wall of windows. The
doorway was a nine-metre hole with nothing to say it was a door — it has
leaves, a head and a canopy now. And the building did not say its own name.

`KINEPOLIS` needed six letters the glyph set did not have — K, I, N, P, L,
S — which turned out to be an hour's work against the machinery already
there for `#DEVOXX` and the room numbers, rather than the font project it
had been written off as. It is `signAccent`, so it takes the era's light
like everything else: tungsten orange at Devoxx, and in Chapter I a crimson
sign still lit on a dead building, which is the one thing in the frame with
power in it while the player is out there looking for some.

**Three checks caught three different mistakes**, none of which was visible
in a screenshot:

- the entrance dressing sat ON the boundary, half in the reception and half
  on the forecourt — 58 complaints from the rule that a piece of furniture
  belongs to one room;
- the transoms had no material, so the harness read them as slabs of
  building hanging in mid-air. It was right: a glazing bar is held by the
  mullions either side, so it is dressing. Naming a material then brought
  the containment rule with it, and a bar centred on a wall line sits in
  two rooms — so which face it goes on is now asked of the building rather
  than assumed, because these two elevations happen to face south and the
  day one does not, guessing would be silently wrong;
- and the envelope was stretching every exterior piece from the cutaway
  plane to its top, which is right for a wall and wrong for anything that
  starts higher up. It had already pulled the banners down their poles, and
  would have smeared the sign into a bar.

**And then the two things that were actually wrong:**
> the second level is totally missing and you miss-spelled kine polis

Both real, and neither was a matter of taste.

**The second storey was being drawn at ground level.** Every storey in this
venue is modelled from its own datum and only one is ever visible, so a
piece on floor 1 states its height as though the first floor were the
ground — which is right everywhere except the envelope, the one place in
the renderer that draws two storeys at once. Without the offset the upper
floor was buried inside the lower one, and from the forecourt the building
simply had no second level.

**KINEPOLIS came out as `| | | | POLIS`,** and the cause had been sitting
in the venue since the stage letters were written. `diagonal()` walks a
stroke in steps and writes each band's ends into `v0` and `v1` in the order
it walks them — so a stroke that goes DOWN produced bands with their top in
`v0` and their bottom in `v1`. An inverted box, which every consumer turned
into a one-centimetre sliver at the wrong height.

Nobody had noticed because the only things using diagonals were the V and
the two Xs of `#DEVOXX`, thirty metres away across a dark auditorium, each
quietly missing one of its two strokes. Putting a K and an N on the front
of the building at eye level made it obvious. Fixing `diagonal()` at the
source fixed the stage letters too — `#DEVOXX` has complete Xs for the
first time.

The lesson is the one this project keeps relearning: a fault that is
invisible at the scale you first used something is still a fault, and the
day you use it somewhere legible it will be waiting.

**And once more, because it still was not right:**
> the glass part of the 1st floor is still missing

Three faults stacked on top of each other, which is why it took a
diagnostic rather than a guess.

1. **I had broken it in the previous fix.** Lifting each piece into world
   space BEFORE working out where the cutaway plane falls put that plane at
   8.9 m for the upper storey and left half a metre of glazing. The
   arithmetic has to happen in the storey's own space and be lifted after.

2. **There was a stripe of sky across the middle of the building.** The
   ground floor's glass tops out at its wall head and the first floor's
   starts at its own datum, leaving nearly two metres of nothing between
   them. Every curtain wall has a spandrel panel there hiding the floor
   slab; this one now does too.

3. **The glass was drawn and invisible.** A pane is translucent and writes
   no depth, and from outside there is nothing behind it — the storey it
   belongs to is not drawn at all. So it was glazing over the void, which
   is glazing over nothing. Each exterior pane now gets an opaque backing
   near its own tone, which is all a window needs to read as one from the
   street.

**The diagnostic is the part worth keeping.** After two wrong guesses I
tinted the first floor's backing bright red and counted red pixels in the
frame: 69, scattered. That said "drawn, and almost entirely hidden" — and
then looking at the tinted frame said something better, which was "drawn,
enormous, and I have been staring at it". The glass was never missing. It
was the same colour as the night behind it.

**Then, holding it against the photograph properly:**
> take another look at the picture and try to make the front of the
> building look like it

Reading the frame again rather than from memory turned up four things, and
the most important was a COMPOSITION error rather than a missing detail:
the glass had been run across the entire 36 m frontage, when the photograph
has solid precast over the west third and the glazed sweep starting about
where the doors do. That one change did more than anything else, because it
is the difference between this building and any glass box — and it made
room for the things that live on that precast.

On it now: the Kinepolis star, and the row of small square windows at
pavement level. The star is drawn as a raster of horizontal bars, the way a
star is drawn on a low-resolution screen, because a five-pointed star has
no axis-aligned edge anywhere on it and this renderer extrudes plan
rectangles. Fourteen rows, and at thirty pixels nobody can tell.

The banners got the panel at their head that every banner in the frame has
— a blank white flag reads as unfinished rather than as blockout.

Two placement errors worth recording, both the same mistake in different
clothes: the star was sitting ON the spandrel band so its legs read as part
of the wall, and the small windows were at a depth that put them INSIDE the
wall's own 0.3 m thickness, so they were drawn and buried. Neither is
visible in code; both took one frame each.

**Worth the detour:** Chapter I outside — one small robot with a lamp on an
empty forecourt, a dead building behind it, bollards and banner poles as
silhouettes — is the strongest image the game has. Nobody designed it; it
is what the existing light level does to a space that did not exist
yesterday.


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
made a 1.2 m rise into a 33% slope — a wall with a friendly label.

### Building the traversal, and what the harness caught
**Date:** 2026-09-18

**Prompt:**
> we still have an issue the stairs between the reception take the full
> opening. and btw at the moment the robot cannot climb them and we don't see
> visually the level difference

Three observations that are one feature: the steps sealed the only opening,
nothing could climb them, and the 1.2 m drop was invisible. So: room
elevations, links as walkable surfaces, and floor-to-floor movement.

`tools/traverse.mjs` was written before the feature was finished, and it earned
that twice over. The stair rule is decided in four places at once — the riser
on a `Link`, `maxStepRise` on a `RobotSpec`, whether a tread collides, and
whether the surface is reachable from where the robot stands — and any one can
be right while the behaviour is wrong. The failure mode is never an exception.

**What it caught that reading the code did not:**

1. **A teleport.** Walk into the *top* of a staircase from the floor below and
   the robot was lifted to the upper landing, because "can climb this flight"
   had been conflated with "can join it here". The fix is physical rather than
   a special case: you may step onto a surface within `maxStepRise` of your
   feet. From the bottom of a flight the top tread is a storey up, so it is a
   wall — and ramps get their behaviour from the same rule for free.

2. **A ramp that connected nothing.** Making the gradient realistic had turned
   it 90°, so it ran beautifully along a wall and crossed no boundary. The
   harness walked Biggy straight over it and out of the building.

3. **`maxSlope` was a lie.** It had been chosen by taste, and cleared Biggy for
   a 33% ramp it cannot climb: 774 N of motor loses to 1333 N of gravity every
   time. The values are now *derived* — `driveForce / (mass · g)` is the
   steepest a robot can hold at all, and the spec carries 60% of it.

4. **Droid could not climb stairs either**, once gravity was applied down them:
   a 12 m flight to a 6.2 m floor is a 51% gradient, taking 4.44 m/s² out of
   Droid's 4.5 m/s². That is the right answer to the wrong question — these
   robots *walk* up stairs rather than rolling, and a walking machine is
   limited by how fast it can place a foot. Ramps keep the honest gravity;
   stairs cap pace instead, and it is the only clamp in the simulation.

**Closed since:** the building now has walls, derived from the rooms. See
below.

### Walls, derived rather than listed
**Date:** 2026-09-18

**Prompt:**
> Can you add some boundary to the space and you should probably do that
> between rooms too

The traversal harness had been printing this as a warning for a while: rooms
were floor plates, not enclosures, so a robot at full throttle drove out of the
Kinepolis. It is an assertion now, and three of them.

**Derived, not listed.** This file has been re-measured three separate times,
and a hand-written wall list would have drifted out of step on the first
correction — walls are the kind of thing nobody re-checks. So each room's edges
are sampled at 0.25 m, every sample is classified, and the runs are merged back
into long rectangles. 93 wall obstacles, and they move whenever a room does.

A sample is an opening when a link crosses it — so no flight or ramp can be
walled shut — or when both sides are circulation **at the same level**.

That last qualification is the part worth keeping. The concourse stands 1.2 m
over the hall and both are circulation, so the obvious rule leaves them open —
and then a robot crossing anywhere except the steps gets snapped 1.2 m upward
by `groundAt`, which is a teleport dressed as a floor. Walls everywhere except
the links is not a restriction bolted on; it is the geometry finally saying
what the building already meant. The steps and the ramp are the only ways
between those levels.

Everything else gets a wall, with a 2.6 m door punched through any run
separating a room from circulation. Two auditoriums side by side get no door,
because cinemas do not open into each other.

**Fixed by hand:** `npm run venue` caught a spawn point that the new walls put
inside Room 8's front seat bank.

**Corrected after review:**
> The wall are kind are fucked up upstairs and some doors are missing. In this
> location the doors are usually like this room 1 on the right side, room 2 on
> the left side, room 3 on the right side, room 4 on the left side. And there
> no middle coridor in the room all goes through the side

Three faults, one of them a bug the "derived, not listed" principle had walked
straight into.

**Thirteen of the fourteen doors were missing.** Both sides of a shared edge
were emitting walls, so the corridor emitted its own — and the corridor's west
edge is a single unbroken run past six auditoriums. One continuous run gets one
door punched in it, in the middle of the building, and it sat on top of the six
doors the rooms had each opened for themselves. The room now owns the wall
between itself and circulation; circulation never emits one.

**The doors were centred, and they cannot be.** These rooms are fans: the
middle of the corridor wall is behind the seating. Doors go at one END of the
frontage and alternate room by room, which is what the building does and what
the review said. `Room.doorSide` carries it as data.

**There is no central aisle.** The seating was two blocks with a gangway up the
middle; it is one unbroken block with the aisles against the side walls. That
also changes how the room drives — no shortcut through the centre, so crossing
an auditorium means committing to one side of it.

`npm run venue` now checks every auditorium has at least 2 m of doorway onto the
corridor, which is precisely the failure that got through: the geometry was
self-consistent, the rooms were sealed, and nothing else noticed.

**Corrected again:**
> some walls are still kind missing part and the path in too the room should be
> on the same side than the entrance

**The missing walls were worse than gaps.** The rule "a link crossing an edge
is a way through" was letting the floor 0→1 staircases punch holes in floor 1,
wherever their footprint happened to overlap an upstairs wall. That opened the
party walls between Rooms 3 and 4 and between 9 and 10 — you could drive from
one cinema into the next. A flight between storeys arrives *vertically* and
never needs a hole in a wall on either floor, so only same-floor links punch
now, and only when their climb axis actually crosses that edge.

**The aisle was on the wrong side, and then on the right side for the wrong
reason.** The way in and the way through have to be the same side, or you walk
through the door into the back of a seat block. The fix is which edge of the
seating gets pinned: pin the FAR edge and every narrowing of the fan widens the
aisle by the doors; pin the door edge — which is what I wrote first — and the
taper opens the far aisle instead while the way in stays a slot.

**And then the real cause surfaced:**
> If the issue where the stair case. you can take a look at the map and see
> that the stair pops in the hallway next to the room

Correct, and it retired a rule. The hall staircases had been positioned from
the GROUND-floor plan, which put them at x -10.25..-6.70 and 5.78..9.02 —
inside Rooms 4 and 9. A staircase was standing in an auditorium, and every hole
that kept appearing in an upstairs wall was that, showing through. The rule
about which links may punch a wall was treating a symptom.

The auditorium plan shows them plainly once you look for them in the corridor
rather than in the rooms: two flights hugging the corridor's west and east
walls, about 2.3 m wide, arriving around y -15, leaving the middle 9.7 m of the
corridor clear. Which is how a corridor with stairs in it works, and what
Chapter III needs when three robots and a full house are trying to get past
each other.

The two drawings put these staircases in different places and cannot both be
right. Where a stair *lands* is what the level has to be built around, so the
arrival wins and the ground-floor position is the one that gives.

**Fixed by hand:** the relocated stairs stand in the middle of the hall, where
the cast used to spawn. The first run put Voxxy inside a staircase and the
collision solver threw it to x = -339994. `npm run venue` flagged the spawn;
`npm run traverse` showed the consequence.

That second one is the entry worth keeping, because it looked right in a
drawing. The two big rooms were off by 0.3 m of centroid, which no eye catches.
`npm run venue` now measures where each room's doorway is and where its seating
sits and fails if they are on the same side of centre — the door is decided in
the wall builder and the aisle in the seating builder, and nothing else would
ever notice the two disagreeing.

### The grid was generated, so everything on it was wrong
**Date:** 2026-09-18

**Prompt:**
> the stairs in the exposition hall are not correctly position relative to the
> pillar btw there's I think one row too much pilar

Both true, and they were the same fault. The column grid was being *stepped
out from a wall in a loop* — start one bay in, add 6.3 m until you run out of
hall — while everything else in this file is measured. A generated grid is
wrong in two ways at once: it puts one line too many on each axis (8 × 7 where
the plan has 7 × 6), and it puts every line slightly out of step, so anything
positioned against it by eye inherits the error. The staircases had been placed
that way and sat a whole bay west of where they belong, straddling a line of
columns.

Detecting the columns took three attempts. Connected-component filtering on the
stand plan caught text boxes; template matching caught booth-chip corners. What
worked was the annotated plan, where the marks are small dark squares on a pale
blue field and the hall is already masked — 53 of them, clustering into seven
lines across and six down.

The measurement then explained itself. Across, the outermost lines sit 6.68 m
and 6.63 m off their walls — symmetric, which is how you know the reading is
right. Down, they start 13.13 m from the north wall rather than one bay in,
because **the northern 13 m of the hall has no columns at all**: that is where
the staircases stand. A loop from the wall cannot know that, and invents a row
straight through the stair zone.

Both are now literal lists of measured offsets, and the staircases are placed
in the same frame — each inside a structural bay, the west one between the
13.04 and 19.70 m lines, the east between 26.15 and 32.63.

Two things stayed deliberately wrong. The real auditoriums are fan-shaped and
these are rectangles, because `Rect` is what the collision system speaks —
the fan lives in the seating instead, which tapers toward the screen and is
what a robot actually drives around. And ceiling heights are still invented:
a floor plan cannot give volume, which is why watching the drone footage is
still on the human's list.

### Palettes from the venue photographs
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-18

**Prompt:**
> Let's all ready do the palette

Fourteen photographs, read directly. Surfaces were sampled as material colours;
light sources by taking the brightest strongly-saturated pixels and splitting
them by hue family, so a red strip and a blue wash in the same frame do not
average into grey.

**What the measurement changed:**

- The red LED step strips are **`#f24471`**, a hot crimson. The invented value
  was `#b3402f`, a brick orange — wrong hue, wrong temperature, and it is the
  one image SPEC calls the strongest available to Chapter I.
- Chapter II's era now comes from a measured material rather than a mood: the
  slatted warm wood behind the registration desk, `#744724`, on every shaded
  face. One colour buys a timber era with no texture at all.
- Chapter III's "Devoxx orange" is `#c8895f` — the cove lighting as the
  building actually throws it, softer and peachier than a brand hex.

**The fix that mattered most was structural, not chromatic.** The palettes had
been pre-dimmed *and* multiplied by the chapter light level, so Chapter I at
0.18 rendered as a black rectangle. Palettes are now material colours and the
light level does the darkening alone — Chapter I is dim and playable instead
of dark and not.

**Fixed by hand:** the first pass left Chapters I and III as the same grey at
two brightnesses, which defeats the whole "one building, three lights" idea.
`lightLevel` is only a multiplier, so it cannot carry a hue — the palettes have
to. Chapter I is cooled to a dead blue-grey and Chapter III warmed to the peach
the cove throws, and they now read as two eras of one room.

**Still to come:** the accents are correct and almost invisible, because
nothing draws light sources yet. The red step strips exist as a number, not as
a thing glowing in a dark auditorium. That is the lighting pass, and it is
worth more than any texture.

### A stairwell printed on the floor of the room next door
**Tool:** Claude (Opus 5) via Claude Code
**Date:** 2026-09-19

**Prompt:**
> There's an issue with the rendering of the stairs on the 1st floor. The
> stairs kind clip throught the floor.

**Iterations:** 3 — two of them rolled back.

A flight upstairs hangs in a well below the floor, and below the floor means
lower on screen, so it paints down across whatever lies in front of the
opening. There is no depth buffer to stop it and there should not be one: the
scene is one Graphics object in painter's order.

Two mitigations were in place and both guessed at how far the spill could
reach — the well trimmed to a wedge along the stair's own axis, and the strip
of floor in front of the hole repainted afterwards. Both reason in ONE
direction. Screen-down is south *and* west at once, and both corridor flights
run flush against a corridor wall, so sideways there was no floor to trim
against and none to repair with. The flights were printing themselves on the
carpet of the auditorium next door.

**The fix is one rule:** a hole shows exactly what is visible THROUGH the hole,
so the contents of a well are clipped to its mouth — Sutherland–Hodgman against
the projected opening, four edges, a few vector operations a quad. The wedge,
the walls, the depth sort and the venue are all untouched; the flight is the
same shape it always was and simply cannot leave the opening any more. The rim
repaint goes, because it existed only to hide the spill — and with it goes a
strip of corridor floor it had been painting over the building's south wall.

**What went wrong — twice, and both were scope, not mechanism.**

1. The first attempt took the clip as licence to rebuild the well "honestly":
   treads as full-depth columns, an unlit shaft behind them, the wedge deleted.
   All of it defensible, none of it asked for, and it made the stairs read
   deeper and stranger than the ones being complained about.
2. The second went after a wall lying across a flight, which is a *different*
   fault — a thirty-metre party wall sorting by its far corner. Trying to fix
   it by sorting on the near corner and segmenting long runs is more correct
   and looks worse: with honest occlusion a 2.7 m wall hides almost all of a
   2.3 m stairwell hugging it, and both flights vanish. Cutting the walls out
   of the opening instead just moved the artefact into the walls.

Both were reverted on the word "worse than it was". The lesson is not about
isometric rendering: a report of one visible fault is not an invitation to
re-do the subsystem around it, and "more correct" is not the same as "better"
when the camera is fixed and the building is drawn as a cutaway.

**Fixed by hand:** the judgement, and it took a rollback to get. Also the
diagnosis, twice: reading the projection showed the well contained along the
stair's axis, which is true and irrelevant. Tinting the well geometry magenta
in a throwaway build and driving the real game to it took one screenshot to
show the spill going sideways. Worth knowing when reading the diff of the
harness: two runs of `npm run shoot` differ in ~53k pixels by themselves — the
camera lands on a sub-pixel — so a screenshot diff is only evidence where it is
solid, never at the hairlines.

**Neither check could see this.** `npm run venue` passes on a building whose
stairwells paint over the rooms next to them, and `npm run traverse` passes on
one where you cannot see the stairs at all. They hold geometry and behaviour;
nothing yet holds the picture.

### Seats in every room, and the letters on the two big stages

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> can you modelize the seats in the rooms as well as the devoxx letter in the
> two biggest room ?

**Iterations:** 4

Two things the building did not have. The seating existed only as three grey
collision slabs per room, and the one object that says *Devoxx* rather than
*a cinema* — the letters on the keynote stage — was not modelled at all.

**What was built.** A `Decor` list beside the obstacles: drawn, never collided.
The three slabs stay exactly where they were and are now `hidden`, because a
120 Hz solver has no business testing five thousand rectangles to answer a
question one rectangle already answers, and nothing 1.44 m wide gets between
two seats 0.52 m apart anyway. What the player sees is a tier and a seat box
per seat, 5192 of them, plus `#DEVOXX` in 1.5 m letters on the stages of Rooms
5 and 8. The venue names *materials* and never colours, so a chapter still
re-dresses the seating by changing its palette and nothing else.

**What went wrong.** The seating inherited a taper that halved the row width
between the back of the room and the screen, and nobody had ever checked it
against anything — with seats laid out row by row it cost 740 seats across the
building, 14% under the counts printed on the plan. Measuring the drawn rows
settled it: in Room 8 they hold 208 px of a 223 px frontage and barely shorten
at all. The fan is now the one number that makes the modelled seat count land
on the printed one, and `npm run venue` holds it there to within 3%.

Also mismeasured on the way: the plan shows a ~5 m strip between the corridor
and each auditorium — projection booths and exit lobbies — that the survey
folded into the room. The model stands in a 2.5 m cross-aisle for it. Worth
knowing before anyone re-measures floor 1; the rooms are about 6% deep as a
result, and every seat count still lands.

**Fixed by hand.** Two judgements the model had made honestly and wrongly.

1. Five thousand boxes a frame is a slideshow. The renderer now precomputes a
   screen-space box per solid and per piece of dressing and skips whatever the
   viewport cannot contain — the building is 150 m long and the view is 45 m
   wide. Measured after: 16.7 ms a frame on both floors, which is vsync.
2. The letters were laid out facing their own audiences, which is the only
   thing a real sign does — and which means the fixed south-west camera reads
   Room 5's word from behind, mirrored, in every frame of the game. It was
   modelled correctly and looked like a bug. Both signs now run the way the
   screen reads, written down next to `drawnRise` and the 2.7 m cutaway as one
   more place where the camera wins.

The screenshot harness is what caught both. Neither `npm run venue` nor
`npm run traverse` can see a mirrored word or a dropped frame.

### The presenter's desk, on every stage

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> Can you add the presenter desk

**Iterations:** 3

A draped trestle table and the branded lectern beside it, measured off the
same photograph as the letters — 1.9 × 0.8 × 0.75 m and 0.7 × 0.5 × 1.2 m. The
seats in the foreground of that frame give the scale: a thing's height against
its own width survives the perspective even where its absolute size does not.

In all fourteen rooms rather than the two with letters. Fourteen desks is what
makes this a conference centre instead of a multiplex — it is the object that
says a person stood here and talked, and Chapter I is about the fact that
nobody does any more.

Solid and drawn from the same rectangle, unlike the seats and the letters: a
table's shape and its collision shape are the same thing. That needed
`material` on `Obstacle` as well as on `Decor`, which is the better shape for
it anyway — furniture is not a wall and should not be wall-coloured.

**What went wrong.** The desk went where the photograph puts it, at the end of
the stage away from the doors, and in seven of the fourteen rooms it vanished.
Not subtly: the lectern was simply absent. Isometric from the south-west, a
room's south wall stands between its stage and the viewer, and the arithmetic
is unforgiving — a 1.2 m object needs three metres of clearance to show above a
2.7 m wall drawn in front of it, and it had one and a half. The doors alternate
room by room, so half the building put the desk against that wall.

**Fixed by hand.** The diagnosis, which took dumping the venue to JSON and
doing the projection by hand rather than squinting at a screenshot — the first
read was "the lectern is drawn too short", which it was not. And then the
call: the desk now stands at the NORTH end of every stage, where the wall is
the far one. The building has no opinion about which side a desk goes (the AV
crew decides, and the rooms mirror each other anyway), so this costs nothing
and buys a desk you can see in all fourteen.

Also caught here, and unrelated to the desk: `npm run shoot` was drawing 1217
boxes a frame on the auditorium level and dropping one frame in five. The cull
margin was 160 px, which sounds harmless and is an eighty percent increase in
area — and at that level area is seats. At 64 px, which is still six times the
camera shake, the frame holds sixty. Measure margins on the floor with the
most geometry, not the one you happen to be looking at.

### Levels, inclination and stairs — evaluated, then built

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> I think we need to evaluate on technical aspect. We need to be able to have
> floor in the same scene with different levels but also some floor
> inclination. and to connect different level we might use stares
>
> *(then, on the assessment)* do it

**Iterations:** 1 evaluation, then 3 changes

**The evaluation.** Two of the three already worked. Levels within a storey are
`Room.elevation`, and the reception concourse has stood 1.2 m over the hall
since the building got walls. Inclination is a `Link`: `surfaceHeight`
interpolates z along it, `downhill` returns a vector of length sin θ, and
`Body.step` adds `mass · G · slope` as a real force — the body has never known
or cared where that vector came from, so the physics was already general.
Stairs are the same primitive with `riser > 0`.

What did NOT work, in cost order: the storey type was `0 | 1` in six files;
inclination existed only inside a link rectangle, never as a floor; two
separate functions answered "how high is the floor here" and were stitched
together by hand; and two storeys are never drawn together, which is a renderer
rewrite and was left alone.

**What was built, in that order.**

1. `footingAt` — one question, one answer. Three places used to ask "is there a
   link under this robot and may it use it" with identical arguments: the slope
   force, the surface height and the stair speed cap. They can no longer
   disagree. `groundAt` changed with it: the SMALLEST plate containing a point
   wins rather than the highest, which is deterministic, lets a plate nest
   inside another, and — the reason it had to change — can answer with a
   NEGATIVE height. Taking the highest seeded the answer with zero, so no floor
   in this building could ever sit below its storey datum.
2. `Level` — a storey index rather than a pair. Sixty-four sites, all of them
   `!==` filters that carry on working and none of which would have carried on
   compiling. Cheap now, expensive the moment a third storey exists.
3. The rake, with no new engine concept at all. An auditorium floor is the
   concourse pattern one level down: a plate at the top, a plate at the bottom,
   and a flight of steps between them. So each of the fourteen rooms got a
   stage plate at `-rake`, and a `Link` covering the seating footprint with a
   0.18 m riser — one tread per row of seats, 25 of them in Room 8, dropping
   4.50 m from the doors to the stage.

**What it bought.** The stair rule now decides who reaches a stage. Voxxy and
Droid walk down; Biggy, which climbs nothing, reaches the back row of all
fourteen auditoriums and the front of none. That is a puzzle the building
generated rather than one anybody designed, and `npm run traverse` asserts it.

**What went wrong.** Three things, all caught by measuring rather than reading.

1. The rake used to be drawn at a third of its real rise, because 4.5 m of
   seating went straight through the 2.7 m cutaway. Modelling it as a DESCENT —
   which is what walking into a cinema is — deleted that problem rather than
   solving it: the cut only ever trims what stands above the floor. The squash
   constant is gone.
2. Treads are drawn as a solid mass standing on the floor, which is right for a
   flight rising out of one and wrong for a rake dropping below it: filled down
   to the stage, the nearest step of an east-side auditorium is a 4.5 m wall
   across the room and you never see the seating. They are slabs now, thicker
   than a riser so consecutive ones overlap.
3. The rake treads run the full frontage, because that is the cheapest
   rectangle that stops Biggy — and drawing 22 m of box per row cost 3 ms a
   frame on the auditorium level, taking the p95 to 33 ms. Now they collide and
   do not draw, and the seating draws the tread where it is actually visible,
   which is the aisles: between them every row is hidden by the seats in front
   of it. 17.5 ms mean, and a 16.7 ms median, which is vsync.

**Fixed by hand.** The order. Doing the surface query first looked like a
detour and was the only reason step 3 was small — a stage plate at a negative
elevation is unexpressible against a `groundAt` that maxes against zero, and
that would have been discovered somewhere much less pleasant. Also the
diagnosis in (3): the frame budget was measured on the hall, which is the wrong
floor to measure it on.

### Walls that stand on a floor which is no longer there

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> Those changes introduce a bunch of visual glitches. Like the wall between
> the room not really visible and at the right spot

**Iterations:** 3

Correct, and the cause was one line older than the rake. A wall was a single
rectangle whose drawn base came from `groundAt` **at its own centre** — fine
while every room was one flat plate, and wrong the moment an auditorium floor
started dropping 4.5 m from its doors to its stage. The two side walls of all
fourteen rooms hung at corridor level over a floor that had gone; against the
building's outer walls you could see under them into the void.

**The fix.** The collision rectangle stays whole — collision has never
consulted height and one rectangle is cheaper than twenty-five — and is marked
`hidden`. What is DRAWN is cut into the same bands the treads use, by literally
the same function (`treadsOf`), so a wall and the floor beside it cannot drift
apart. The ends that stick out past the flight carry no height of their own and
the renderer finds their plate as it always did, which is how they end up
standing correctly on the cross-aisle at the top and the stage at the bottom.

**What went wrong.** Following every tread exactly is 564 wall pieces and about
3 ms a frame on the auditorium level — the level that was already the expensive
one. Two treads to a drawn step halves it, for a bottom edge sitting at most
one riser (five pixels) below the floor it meets, under the aisle slabs where
nothing can see it. Four treads was cheaper again and started to show as a lip
along the aisle, which is how the constant got settled rather than guessed.

**Fixed by hand.** The instinct to just extend every wall down to the lowest
floor it touches, which is one field and no splitting. It is also wrong: floor
plates are painted before any solid, so a wall drawn 4.5 m lower paints over
the corridor lying in front of it. The cheap fix would have traded a hole under
the walls for a smear across the floor.

---

### Claude Opus — the front elevation, held against the photograph

**Prompt:**
> take a look at the picture at @references/venue/photos/54842743975_b835884445_k.jpg and try to make the front of the building look like it

**Iterations:** 3

The front had been built from that photograph once already, so this was a
re-read of the same frame rather than new ground — and the re-read found four
things, only one of which was a matter of taste.

**The forecourt was drawn 1.2 m in the air.** Every piece of it took its
height as `CONCOURSE_LEVEL + h`, and the renderer had already added
`CONCOURSE_LEVEL` for it: `datumFor` resolves a piece to the smallest room
containing it, and the forecourt IS a room, with an elevation. So the bollards
floated a metre over their own pavement, the door leaves hung clear of the
ground, and the setts band was a slab of paving in mid-air. Nothing could
catch it — `npm run venue` checks plan containment, not height, and a floating
object in a fixed isometric with no contact shadow looks exactly like one
standing on the ground until you go and look at it from a metre away. What
found it was reading the renderer to answer a different question and noticing
the double count in passing.

**The elevation had one storey and the sign hung off the end of it.** The
building is two storeys of curtain wall in the photograph. Here the ground
storey's glass stopped at 6.2 m and above it there was a room only over the
corridor — 15 m of a 36 m frontage — so the name, 5.2 m up, was mounted on
nothing at all for most of its length. It is drawn now as what it honestly is:
an `exterior` skin on storey 0, above the cutaway plane, so the envelope draws
it and no interior ever sees it. The corridor's real window sits 0.6 m behind
it and is simply hidden, which is what a facade in one plane does.

**"KINEPOLIS" was a third of the name.** The photograph says KINEPOLIS EVENT
CENTER across the whole glazed sweep. The missing two words needed a T, a C
and an R, and letters small enough to fit 22 characters in 24 m — which is
also the proportion the photograph has, and which the old 1.32 m letters never
could be.

**Fixed by hand:** the banner poles, twice. The first pass moved them back in
front of the glass where the photograph has them and lost the K and the O
behind two of them. The fix is not a nudge: at a fixed 45° azimuth `project`
gives `sx = (x - y) * PPM`, so a pole 2.86 m out in the forecourt screens at
the same column as a point 2.86 m further EAST on the facade. They are placed
by where they land now, with that offset written down — the previous pass had
hit the same rock and left a comment about "the E of KINEPOLIS" without
working out why.

Also by hand: the canopy, which was a 3.3 m slab and read as a porte-cochère
hiding the doors, the head and the bottom of the sign; and the plane of the
new upper storey, which was built off `doorY` and so overhung the storey below
by a quarter of a metre — a string course across the whole front that the
photograph has no trace of. Both were invisible in the code and obvious in one
frame of `npm run peek`.

---

### Claude Opus — the doors are at the west end, and there is no canopy

**Prompt:**
> just two things usually people enter on the left side of the building. There no small rooth over the entrance

**Iterations:** 1

Both right, and the second one was a cue the model invented.

**The entrance was placed by arithmetic.** `ENTRANCE_X` was
`RECEPTION.x + RECEPTION.w / 2 - ENTRANCE_WIDTH / 2` — the middle of the
frontage, which is a reasonable-looking line of code and is not where the
building's door is. The photograph has the precast flank with its row of
small windows running a third of the way along, the glass starting, and the
doors as the first thing in it: they begin under the K of the sign. So the
bank is measured off `GLAZING_START` now, the same number the sign and the
flank are measured off, and the constant moved up the file to sit with the
entrance because three things depend on it agreeing with itself.

It is the better arrival as well as the truer one. You come in at the west
end with the grand stair ahead of you and the length of the concourse opening
away east, instead of walking in at the middle with the building split either
side of you.

**The canopy was a cue, not a feature.** It had already been cut this round
from a 3.3 m porte-cochère to a 1.5 m hood, and the argument in the comment —
"it is what makes a hole in a glass wall read as somewhere you are meant to
walk in" — was the model reasoning about what an entrance needs rather than
looking at what this one has. The photograph runs glass from the pavement to
the head straight past the doors with nothing over them but two floodlights
on brackets. Cutting it removed the last thing sitting between the forecourt
and the elevation.

**Fixed by hand:** nothing in the geometry — but `GLAZING_START` was declared
1200 lines below the entrance it now feeds, which `const` in a module makes a
temporal-dead-zone crash at import rather than a type error. `npm run
typecheck` would have passed it. Moved with a note saying why it lives there.

---

### Claude Opus — the entrance goes to the west corner, and the rest is windows

**Prompt:**
> You failed you replace the some of glass doors with simple window and you didn't move the entrance to the left side allowing to directly go past the stairs on the right

**Iterations:** 1

Two corrections, and the second one was a correction of a correction: the
previous round had been told "people enter on the left side" and moved the
doors 1.6 m, from the middle of the frontage to the west end of the GLAZING.
That is a different sentence from the one that was said.

**The test is the route, not the elevation.** "Directly go past the stairs on
the right" is checkable and it failed: the grand flight runs x -5.65 to 5.65
and the doors were at -1.6 to 7.4, so you came in and met eight metres of
staircase across your nose. `exhibition-floor.jpg` has a clear 6.3 m aisle up
the west side of the concourse — west wall to the reception counter, the
flight starting east of it — running the whole depth of the building to the
hall. The doors are at the west corner now and that aisle is what they open
onto. Driven in `npm run peek` with the keys held: in through the leaves,
past the stair on the right, up the concourse.

**The whole frontage was doors.** `CURTAIN_WALLS` marked the ground storey
`kind: 'door'` on the reading that "windows that can be opened as a door" is
the building's own description of its front — so 26 m of curtain wall came
down to a 0.2 m kick rail. That is a shopfront. The photograph has a solid
base under the glass along the whole run, and the plan draws plain mullion
ticks over most of the frontage with door swings only where you go in. One
word, and it is the difference between a wall of windows and a wall of doors.

**What this cost the picture, stated rather than hidden.** The photograph has
the leaves where the glass begins; they are now a glazed bay punched into the
precast flank, with the star, the name and the sweep of glass left where they
were. That is more of the photograph than dragging the glazing west would
have left, and the comment on `ENTRANCE_X` says so.

**Fixed by hand:** everything that was measured off the old entrance and
silently went on pointing at it. The three banner poles landed squarely over
the new doors and had to be re-placed on the pier beside them — with the star
moved half a bay east to make room — because a flag over the one opening a
player has to find is worse than a flag in the wrong place. `SPAWNS.mainEntrance`
still said "east of the grand stair" at x 18, thirty metres from the
entrance; `npm run venue` then caught the replacement putting the third robot
of the cast line-up inside the stair balustrade, which is the check earning
its keep. The row of small windows was eight lights across a flank that is no
longer blank, and is now however many fit the pier.

---

## Engine

### Migrating the renderer from Phaser 4 to three.js

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> I realized that we kind of hit the wall the the phaser approach for this
> game. I would like to migrate all this to three.js that will give us more
> flexibility can you tackle that

**Iterations:** 1 for the port, 3 more to get the picture right

The wall was real and it had a name: the 2D renderer was a depth buffer written
by hand. `BlockoutRenderer` was 746 lines and roughly three hundred of them
were a painter's-order queue re-sorted every frame, a Sutherland–Hodgman
clipper so a staircase could not paint out of its own stairwell, precomputed
screen-space bounds so five thousand seats could be culled before they were
projected, and a per-face shading table that had to be kept in step with the
projection. Three of the last four commits before this one were bug fixes in
that machinery, and each fix made the next one harder.

**What made it cheap.** `src/core/` had never imported a line of rendering
code — rule 4, enforced since day one, and `npm run physics` only works because
of it. So the simulation, the venue, the chapters and all three verification
harnesses came across untouched. What changed was the renderer, the input, and
the Phaser scene shell, which became about 250 lines of `src/app/`.

**Decision: keep the look, change what is underneath.** The alternative — a
free orbiting camera — was refused on the brief's own terms: the venue was
surveyed, drawn and cut away for one fixed angle, and "a sharp 2D game beats a
vague 3D one". So the camera is orthographic at a fixed 30° from the
south-west, derived from the same `PPM` and `ISO_SQUASH` the projection
function used, and `assertMatchesProjection` checks at boot that it still
agrees with `Iso.project` to within a millionth of a pixel.

**What went wrong.**

1. *2:1 isometric is not a projection of anything.* The 2D renderer squashed
   the floor by 0.5 and drew heights unsquashed. No camera does that — it is
   dimetric, not isometric. A real camera at the angle that reproduces the
   floor grid draws heights 1.22× taller. Both facts had to be found before the
   camera could be written, and the choice (keep the floor plan exact, let the
   heights be honest) is the reason every surveyed coordinate still lands on
   the same pixel it used to.

2. *Everything came out about half as bright as it should be.* Two causes
   stacked. three.js lights are physically scaled, so a Lambert surface
   reflects `intensity / π` and an intensity of 1 is a face at a third of its
   own colour. And the scene is lit in linear space while every palette colour
   was measured off a photograph and tuned against a renderer that multiplied
   sRGB bytes — so multiplying a light by `lightLevel` directly makes Chapter I
   roughly twice as bright as it was measured to be, in the one chapter whose
   entire mood is how dark it is. `LAMBERT_SCALE` and `SRGB_GAMMA` are those
   two facts written down.

3. *The building had renderer workarounds baked into the venue data.* A
   staircase was squashed from its true 6.2 m to 2.4 so it fell under the
   drawing cutaway, and a stairwell seen from the floor above was cut back to a
   wedge of what a painter's algorithm could show into a hole. Both are wrong
   with a depth buffer — the squash puts a climbing robot inside its own steps
   — so `drawnRise` and `WELL_SIGHT` are gone and the flights are simply built
   at the height they are. `npm run traverse` passing unchanged afterwards is
   what says the stair rule survived it.

**Fixed by hand.**

- The face-shading constants. The model's first pass ported the hand-tuned
  `0.66` / `0.82` face multipliers as literal light intensities, which is not a
  thing a light can be. They were re-solved as the one ambient, one key
  intensity and one direction that reproduce the old picture — and deliberately
  landed a little softer than the original, because matching the 0.63 south
  face exactly needs a light so near vertical that every unlit surface goes to
  pure black.
- The camera-follow height. The old camera tracked the floor plane and let the
  robot ride up the screen on a staircase, because the staircase was squashed
  and the drift was small. At true height it is 6.2 m of drift, so the camera
  now follows z — and has to be SNAPPED rather than eased when the storey
  changes, since both storeys are modelled from their own datum and the world
  moves 6.2 m under the robot at that instant.
- The contact shadow on stairs. A 1.4 m disc on 0.62 m treads buries itself in
  the riser above and reads as a smear beside the robot. Hidden while a robot
  is on a flight.

**What it bought, concretely.** `BlockoutRenderer` is 666 lines against 746,
and the part that went is all of the sorting and clipping — what replaced it is
geometry and documentation. The building is now built ONCE per storey into two
draw calls instead of being re-queued and re-sorted sixty times a second; a
frame does nothing but move the robots. The Phaser scene shell became 260 lines
of `src/app/`. The production bundle is 564 kB, 145 kB gzipped. And
`lightLevel` drives an actual light, which is what the art pass needs it to
be.

### Fading a wall that is hiding a robot

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> That's way better. Could be possible to make a the wall partially
> transparent when the robot his hidden by one ?

**Iterations:** 3

The bill for the depth buffer, and it came due immediately. The 2D renderer
drew robots over everything — "the building gives way to the machine", a
comment in the old `BlockoutRenderer` — which a painter's algorithm allows
because it has no depth to argue with. With real depth the wall wins, which is
correct and which loses the player their robot behind the concourse parapet.

**The shape of the fix.** Not the whole wall: a wall in this building is 125 m
long and fading one dissolves half the floor to show one machine. A soft disc
around each robot, in which anything BETWEEN the camera and the robot drops to
22% opacity. Every robot on the storey gets one, because in Chapter III you are
directing three and the one you need to see is the one you are not holding.

It has to be a shader. Working out on the CPU which of six thousand boxes
occlude which robot is the screen-space bookkeeping the migration just deleted,
and the answer would be unusable anyway: the building is one InstancedMesh, and
an InstancedMesh has one material and therefore one opacity. So the storey is
drawn twice — a solid pass that discards the disc and writes depth as usual,
and a ghost pass that draws only the disc, translucent, without writing depth,
after the robots. At the rim the ghost is fully opaque, which is exactly where
the solid pass stopped, so the two meet with no seam.

**What went wrong.**

1. *It cut a hole in the floor.* The camera looks DOWN at thirty degrees, so
   the carpet between the viewer and a robot is in front of it in precisely the
   sense the test asks about — and the first version dissolved a disc of floor
   ahead of every machine, which looked like the building had a hole in it.
   Floor plates are now built into their own mesh and are the one thing exempt.
   Nothing else is: a kerb or a seat tier lower than a robot's feet can still
   stand in front of them.

2. *The disc was too generous.* At a radius scaled to comfortably clear the
   robot plus a margin, a column a metre and a half to one SIDE of Voxxy — not
   occluding anything — lost its top and read as a rendering bug. Tightened to
   a little over the robot's own silhouette. The effect is at its best when the
   player does not notice it is there.

3. *`onBeforeCompile` does not change the program cache key.* Two
   `MeshLambertMaterial`s with different injected GLSL are handed the same
   compiled program, so the solid and ghost passes would have been the same
   pass. `customProgramCacheKey` is the fix and there is nothing in the symptom
   that points at it.

**Fixed by hand.** The verification. Driving a robot at a wall and looking at
the screenshot proves nothing when the frame is timing-dependent — the first
attempt at an A/B diff reported the whole screen changing, which was the robot
having travelled a different distance in the two runs. Parking it hard against
the concourse wall first makes the frame deterministic, and the diff then says
what it should: one 102 x 108 pixel region differs and the rest of the frame is
identical to the bit. Without the cutaway the robot is not merely dim in that
frame, it is entirely absent.

### Steps and walls a storey out of place

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> Can you the fade circle a bit larger. There's issue with the step not render
> on the right level and a few wall that are not correctly positioned

**Iterations:** 2

Two faults, one cause, and it had been latent since before the renderer moved.

A storey is not one flat plane in this building — the reception concourse
stands 1.2 m over the exhibition hall, an auditorium's stage 4.5 m under its
own doors — so the renderer looked up the plate under each solid and drew from
there. Right for a wall or a column. Wrong for a staircase: `Link.base` already
states how far up the storey a flight begins, and it is the number
`Traversal.surfaceHeight` puts a robot's feet at. Adding the plate as well
counts the same metre twice.

The grand staircase begins in the concourse, so all eighteen of its treads were
drawn 1.2 m into the ceiling, as were the seven concourse steps. Sixteen wall
bands beside the auditorium rakes — cut to the same treads by the same function
— hung two to four metres below the floor they belong to: one was drawn from
-7.56 m where the flight beside it is at -3.96.

**Why it surfaced now.** The 2D renderer squashed every full-storey flight to
2.4 m so it would fit under the drawing cutaway, and clamped the drawn height
of everything else to 2.7 m. Both clamps are gone, because with a depth buffer
they are no longer needed — and both had been quietly swallowing the error.

**The fix.** One rule, in one place: a piece that is part of a flight measures
its heights from the STOREY datum; everything else stands on the plate under
it. `Obstacle` already carried a `linkId`; `Decor` gained one, meaning only
that — the banded part of a wall gets it, the ends that stick out past the
flight do not, because those genuinely do stand on a plate.

**Fixed by hand.** The instinct to key the rule off "does this piece state its
own base", which is one line and needs no new field. Measuring it first showed
it would move 152 innocent pieces of stage dressing as well as the 41 broken
ones, because furniture standing on a stage states a base AND wants the plate.
The narrow rule moves exactly the 41.

**What it cost, and what it bought.** `npm run venue` now compares, for every
flight, the height the renderer draws a tread at against the height
`Traversal.surfaceHeight` puts a robot's feet at — the two live in different
files and are computed from different fields, which is the arrangement that
drifted in the first place. Reinstating the old rule makes it report all 41
faults with their coordinates; this is the third bug in this family and the
first one a machine will catch.

### A staircase nobody could have climbed

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> So one thing is not correct is that when you enter one of the room you enter
> via a flat surface but ended being in the middle of the room and stairs to go
> up and down. So this corridor guide you in the middle of the room

**Iterations:** 4, three of them spent measuring rather than changing anything

Reported as a level fault, so the first job was to find out whether the levels
were actually wrong — and for the auditoriums they were not. Walking the line a
robot takes from the corridor into Room 7 and printing both the height it
stands at and the height of whatever is DRAWN under it gives a clean single
descent: flat at 0 for the three metres of cross-aisle, then twenty rows down
to the stage at -3.60, the drawn floor tracking the walked one within 0.15 m
the whole way, which is the difference between a flat tread and a continuous
ramp and cannot be removed. Nothing anywhere on that storey goes up.

What IS wrong is in the room you enter the BUILDING through. The grand flight
out of the reception concourse was typed in at 5.6 m deep for a 5.0 m rise:
28 steps of 20 cm tread at an 89% gradient. That is not a staircase, and once
the 2D renderer's squash stopped hiding it, it drew as a cliff standing in the
middle of the concourse — with the hall steps going DOWN off the same plate.
A flat surface, in the middle, with stairs up and down.

**Why nothing caught it.** The simulation asks a link what its riser is, and
the link said 0.18, so every robot that should climb it did and `npm run
traverse` was green. It was only ever wrong in metres.

**The fix.** A flight's depth is not a free choice — it is the rise divided by
the riser, times the tread — so the run is now derived rather than measured off
a drawing that has no scale bar accurate enough to argue with arithmetic. 8.4 m
for 28 steps of 0.30 m. The chapter II spawn moved with it: it had been 1.5 m
inside where the deeper stairwell now is, which would have dropped the whole
cast down the stairs before the player touched a key.

**Fixed by hand.** Two things found on the way and both worth more than the
bug. `?at=x,y,floor` puts the cast anywhere in the building, because driving
blind to one doorway cost four builds and produced one screenshot of the wrong
room. And spawning anywhere now seeds the robot's HEIGHT from the surface
under it — a spawn is a coordinate, not a height, and collision is resolved
before the surface pass, so the first use of `?at=` inside an auditorium put
Voxxy inside a rake tread and the solver threw it 340 kilometres out of the
building.

### A wall over a stage, and footprints at the wrong height

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> if you look at the file @visual/issue-1.png I've circled in red two issues.
> 1st the foot step are not at the right spot. the second the wall is floating

**Iterations:** 2

A screenshot with two rings drawn on it, which is a better bug report than any
amount of prose — but neither fault could be found by looking at that
screenshot, because both are metres in a file.

**The footprints.** A skid mark was recorded as an x and a y and nothing else,
and drawn at the storey datum. That is correct in the corridor and correct
nowhere else in a building whose surfaces run from the stage of Room 8 at
-4.50 m to the top of the reception concourse at +1.20. Halfway down a rake
the marks hung two metres over the robot that left them, which is the ring the
report drew. The mark now carries the height of the floor it was scuffed into.
The proof is the reception concourse, which stands 1.20 m up: before the fix a
mark there is drawn INSIDE the plate and cannot be seen at all, and the same
scripted drive either side of the change shows nothing, then marks.

**The wall.** Three of them, and a checkable fault rather than a visible one, so
the way to find it was to ask every drawn piece whether anything was drawn
under it. Three walls had nothing: 7 m of party wall between Rooms 7 and 8
drawn at the flat floor of the room while the stage it belongs over is four
and a half metres down, and its mirror in Room 5, and one in Room 13.

Two independent causes, either of which alone was enough:

1. A wall is cut to the bands of the flight it runs along, and a party wall
   sits exactly on the line between two auditoriums — so it grazes the
   neighbour's rake by the half-thickness of the wall, and `find` returned
   whichever of the two came first in the list. Room 8's south wall was cut to
   Room 7's rake, which ends eight metres short of it. A room's own flight is
   the one INSIDE it; nothing else is.
2. Whatever stuck out past the end of a flight was given no height and left to
   `groundAt`, which is asked at the piece's CENTRE — and the centre of a 7 m
   wall on a room boundary lands on neither room's stage, so it read the flat
   floor. Past the foot of a rake is the stage, at exactly the rake's lowest
   surface; past its head is the cross-aisle, at exactly its highest. So an end
   now carries the height of the end it left, which agrees with the plate
   everywhere the plate was right.

**Fixed by hand.** The verification, twice. The first attempt to prove the
skid-mark fix diffed two screenshots of a moving robot and reported the whole
frame changed, which was the camera following it to a slightly different place
— the same trap as two sessions ago, and the fix is the same: compare
something at rest, or compare by looking. The first attempt to prove the wall
check was not vacuous reverted one cause and saw it pass, which is the correct
answer to the wrong question: the two causes are independently sufficient, and
only reverting BOTH makes the check report all three walls.

### The staircases were two column bays out

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> if my memory serve me correctly the stairs on the exposition floor are two
> pillars back from their current position

**Iterations:** 1

Checkable, so it was checked rather than taken on trust — `booth-map.png` is on
disk and is the drawing the hall was surveyed from. It puts the two flights
either side of "Conference entrance", between Areas #1 and #2 at the back of
the hall, 6.7 to 19.5 m off the north wall. The venue had them at 21.8 to 33.0,
which is two column bays south, in the middle of the floor. The recollection
was right to the bay.

The evidence was already in the file, too, and disagreeing with itself:
`COLUMN_Y` carries a comment saying the northern stretch of the hall has no
columns "because that is where the two staircases stand" — and the staircases
were nowhere near it.

**The fix.** `STAIR_FOOT_Y` is derived from `COLUMN_Y` rather than typed in.
Both numbers were read off the same drawing, and the columns are the thing in
the hall you can actually see the stairs standing between, so tying one to the
other is what stops them drifting apart again. The flights now stand in the bay
immediately behind the second row of columns and neither one has a column
inside its footprint.

**Fixed by hand.** `npm run traverse` broke, and correctly: it hard-coded the
two y values the flights used to be at, so its start points were now inside
solid geometry and it reported a robot at y -340073 — the collision solver
ejecting something that began inside a wall. A test of the stair rule has no
business restating the building's coordinates, so it asks the venue where the
flight is and stands off each end of it. Moving a staircase is now a change to
one file.

### Auditoriums that read as funnels

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> the bottom of the room are too narrow can you widden them evenif it means no
> being 100% faithful to reality

**Iterations:** 2

A real auditorium IS a fan, and this one was modelled as one: the seating
tapered 26% from the back row to the screen. At this zoom that reads as a
funnel, and the bottom of every room looked pinched. Worse, every millimetre
the fan narrowed came out of ONE aisle, because each row was pinned to its far
edge — so Room 8's front row was 13.2 m of seating in a 22.2 m room with 7.8 m
of empty floor down one side and 1.2 m down the other. A room with all its
space on one side reads as a mistake rather than as a shape.

**The obvious fix is wrong.** Simply reducing the taper inflates the building
from 5171 seats to 5968 against the 5183 printed on the plan, and two rooms
blow through the 25% per-room band. The permission to be unfaithful was real,
but spending it before checking whether it was needed would have been lazy.

It was not needed. The taper was doing two jobs with one number: the MEAN width
sets how many seats a room holds, and the SPREAD about it sets how fan-shaped
it looks. Splitting them lets the second move while the first does not — narrow
the back by as much as the front gains and the count is untouched. Spread 0.26
to 0.09, and each row centred in the seatable width instead of pinned:

| Room 8 | back row | front row | front aisles |
|---|---|---|---|
| before | 17.8 m | 13.2 m | 7.8 / 1.2 m |
| now | 16.3 m | 14.7 m | 4.8 / 2.8 m |

5170 seats against 5171, every check green, and the per-room drift came out
tighter than it was. The rooms are still visibly fanned; they are no longer
funnels.

**Fixed by hand.** The instinct to take the offer. "Even if it means not being
faithful" is worth spending, and it was not worth spending here — the fidelity
that was actually costing anything was the fan's DEPTH, not the seat count, and
those turned out to be separable. `SEAT_FAN_MEAN` is the dial that does cost
fidelity, and it is still at its measured value in case the rooms want to be
fuller still.

### A stage a person could stand on

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-19

**Prompt:**
> I don't mean the space between the seats. I meant the space where the
> presenter is. it's not wide enough. You could almost double the depth

**Iterations:** 3

The previous round had read "the bottom of the room is too narrow" as the
seating fan and fixed that instead, so the first job was a correction rather
than a change. The stage — the plate in front of the first row, with the screen
behind it — was 2 m. That is a gangway: the presenter's desk nearly filled it.

Doubling it is one constant, and every consequence is the interesting part.

**Where the depth comes from.** The seating, which is what happens in a real
building: a room with a proper stage in it seats fewer people. The cross aisle
you walk in on is untouched, which matters because it is 3.2 m and Biggy is
1.44 m wide — take the stage out of that and the heaviest robot is sealed out
of every auditorium.

**Why a flat 4 m was wrong.** It took two rows out of the 30 m keynote hall and
two out of a 16 m screening room, which cost the small room a fifth of its
seats for a stage it would never have been built with. Five rooms blew through
the 25% band. The stage is a FRACTION of the room now — 13%, floored at 2.4 and
capped at 4.0 — so Room 8 gets 3.93 m and Room 2 gets 2.40, and the big rooms
lose two rows while the small ones lose one.

**Paying for it.** Even scaled, the stages cost the building 365 seats. This is
where the permission to be unfaithful finally got spent: `SEAT_FAN_MEAN`, the
dial held back last round precisely because it was the one with a price, went
from 0.87 to 0.94. Wider rows put the seats back — 5221 against the 5183
printed — so the building holds the right number of people in a slightly
different shape. That is the trade the plan cannot arbitrate.

**Fixed by hand.** Two things, and both were tests restating the building
instead of asserting behaviour. `npm run traverse` asserted a robot ends up
below -4.3 m at the bottom of Room 8's rake, which was true of a 25-row room
and false of a 23-row one — so it failed for a change that was correct, which
is the most expensive kind of test there is. It reads the stage plate's own
elevation now. And a sweep over candidate values for the fan mean left the
constant at the last value it tried rather than the one that was chosen, which
the harness caught and a screenshot would not have.

### The room with the logo, and an aisle that had vanished

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> there's on room with the door on the wrong side. it's the room with the
> devoxx logo on the right

**Iterations:** 1

Two rooms carry the letters, 5 and 8, and the one on the right is Room 8. Its
door follows the alternation the venue intends — odd rooms one end, even rooms
the other — so on the face of it there was nothing to find.

There was. Room 8's seating was 0.35 m from one side wall and 4.75 m from the
other, so the room was lopsided the wrong way and the door read as being at the
wrong end of it. Five rooms were like that, and all five were rooms whose door
is at the LOW end of their frontage.

**Mine, from two commits earlier.** Centring each row in the seatable width
means offsetting it by the aisle on the low side — and that aisle is the door's
in half the rooms and the far one in the other half. The offset added both, so
the seating was pushed a whole far aisle up the room and the far side of every
low-door auditorium lost its aisle: 0.12 m of gap in Room 12 against the 1.2 m
it is supposed to have.

**Why the existing check missed it.** There is already a check that the way in
and the way through are on the same side, and every affected room passed it —
because the seating leaned the right way. It just leaned far too much. Asking
which side something leans is not the same as asking whether it left room to
walk, so there is now a check on the gap itself, measured off the seats rather
than off the constants. The constants were never wrong; where they got applied
was.

**Fixed by hand.** Nothing, and that is the point worth recording: the report
named one room, the fault was in five, and the difference between those two
numbers is the whole argument for going and measuring instead of going and
looking. Reinstating the bad line makes the new check name all five with their
gaps.

### Room 8's door, read off the drawing

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> in room 8 the door is still not on the wrong side

**Iterations:** 1, after a wrong one the round before

The round before had found a genuine fault in Room 8 — its seating was jammed
against one wall — fixed it, and reported it as the answer. It was not the
answer. The door really was on the wrong side, and the only way to know was to
go and look at the drawing.

`cinema-venue-devoxx.png` is the auditorium plan and it is on disk, so the
question was answerable rather than arguable. Cropped and enlarged four times
around Room 8's corridor wall, it draws the entrance as a PAIR of doors a fifth
of the way down the frontage from the north end. The venue had it at the south.
Room 9's is at ITS south end, so 8 and 9 share a lobby; Room 7's is at its
north, so 7 and 8 do not alternate at all.

**Kept as an exception, not folded into the rule.** Thirteen rooms alternate
and one does not. A cleverer formula that happened to produce this would be a
curve fitted to a single point, and the next person would trust it.

**Fixed by hand.** `npm run traverse` broke for the third time in two days on a
hard-coded coordinate: its keynote-rake test started at y -40.5, which was
Room 8's wide aisle while the door was at the south end and is 5 cm inside the
seat bank now. It finds the wide aisle by measuring both of them.

And finding it that way immediately exposed a second thing. "Hidden, and under
1.2 m tall" was the idiom both the harness and `npm run venue` used to mean "a
bank of seats" — but a rake's treads are hidden too and their height is
NEGATIVE, so they pass a `< 1.2` test and they run the full frontage. The
harness put its start point inside a wall; the venue check had been computing
every room's seating centroid with the whole floor mixed in, which is a
centroid dragged toward the middle and a check quietly weakened. Both now ask
for a height above zero and no linkId, which is what actually means seats.

### Balustrades on the two hall flights

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> the two stairs that goes to the exposition floor have guardrails that are
> about 1,2 m high

**Iterations:** 1

A fact about the building, from someone who has been in it, and the only two
flights it applies to are the two that stand FREE — every other flight in here
runs against a wall, which is why those two are the ones with a handrail you
can see. At 1.2 m it is a real object: chest height on Droid and taller than
Voxxy.

It is also the only thing that had ever stopped a robot walking off the side of
a staircase six metres in the air. Nothing did before, and nobody had noticed,
because a flight with a wall down one side and a stairwell down the other
happens to be enclosed by accident.

**One detail worth the comment it got.** The collision rectangle carries NO
`linkId`. In this venue `linkId` means "solid to whoever cannot climb this
flight" — it is the whole stair rule in one field — and being able to climb a
flight has never entitled anyone to step off the edge of it. A rail tagged that
way would have been solid to Biggy, which cannot reach it, and transparent to
Voxxy, which can.

Drawn and collided as two different shapes, the way a wall alongside a rake
already is: one rectangle the full length for the solver, which does not read
heights anyway, and eighteen bands per side for the eye, cut to the flight's
own treads so the rail steps down with it. The check that a flight-banded piece
sits within half a riser of the surface beside it covered the new geometry with
no change, which is the second time that check has paid for itself.

### Carrying the balustrade round the stairwell

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> the guard rails are incomplete the should go all the a way around and just
> keep the entrance not blocked

**Iterations:** 2

The rails added the round before were the FLIGHT's own, and they rake down with
it — so by the far end of the opening they are six metres below the corridor
and the hole in the floor has nothing around it at all. What a stairwell
actually has is a second balustrade, level, following the edge of the opening.
Two different objects, which is why it is not the same loop.

Every side but the one the flight lands on. That one is the way in and stays
clear.

**What made it interesting.** As solids, the new rails sealed the bottom of
both staircases, and `npm run traverse` said so on the first run: a robot
walked the flight down to 5.98 m of its 6.2 and stopped. Collision in this
building is two-dimensional — `resolveCircleRect` has never read a height —
so a balustrade a robot physically passes UNDER, six metres below it at the
foot of the flight, stops it dead instead.

So the well balustrade is DRAWN, never collided. Nothing is lost by that: a
robot cannot get into the well anyway, because the treads cover the whole
opening and a tread six metres under your feet is not one you can step onto.
The collision was always the flight's, and the rail was only ever the picture
of it.

That is the second rail in two rounds where the interesting question was not
where to put it but what it should be solid TO — the flight's own rails are
solid to everybody and carry no linkId, and this one is solid to nobody.

### Fourteen projection screens

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> Can you add the projection screen on the different rooms

**Iterations:** 2

A screen per auditorium, on the end wall, standing on the stage — drawn and
never collided, because the room's own screen wall is right behind it and a
robot cannot reach a screen without driving through that first. `Material`
gained `screen` and the four palettes gained a colour for it, which is the
documented way to add dressing and the reason it takes one line per chapter.

Sized from the room rather than set: `min(3.6, rake)` tall and the frontage
less a margin wide, so Room 8 gets 19.0 x 3.6 m and Room 2 gets 9.1 x 1.6.
That is not a formula chosen for tidiness — the stage is a rake below the
corridor, so the depth of a room decides how far its floor drops and therefore
how much end wall there is to fill. A cinema has exactly that relationship and
it came out of the geometry rather than being imposed on it.

**The cutaway had to be fixed first.** Every screen came out a third of its
proper size, because `MAX_DRAWN_HEIGHT` was being applied 2.7 m above each
piece's OWN plate. A cutaway is a PLANE through the building. Measured per
object it is not one: an auditorium's stage is four metres under the corridor,
so a wall down there was stopped 2.7 m above the stage, which is a metre and a
half BELOW the cut it was supposed to be respecting.

Now it is `max(plate, 0) + 2.7` — the plane, or the plate, whichever is higher,
the second clause being the reception concourse, where the raised plate IS the
floor you are standing on. Checked before changing it: fourteen pieces move,
all of them walls on a stage, every one of them getting 0.5 m TALLER and none
shorter. A latent fault, found by needing something else.

### Twice the screen

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> the screen should be the double the current height

**Iterations:** 1

Sized right, reasoned wrong. The screen filled exactly the SUNKEN part of the
end wall — its top level with the corridor and the back row — which is a screen
sized by the floor rather than by the room. A cinema screen carries on well
above the back row; it is the tallest thing in the auditorium.

So the multiple became the constant: a screen rises twice the room's own drop.
`rake` stays the unit because it is still the only dimension that knows how big
a house is, so every room keeps the proportion it had and gets twice as much of
it — Room 8 goes 3.60 to 7.20 m, Room 2 goes 1.63 to 3.26.

The nine biggest now reach the cutaway plane and stop there, which is where
every wall in the building stops, so they read as filling the end wall rather
than growing out of a roofless building. Nothing else had to move: the plane
was made a plane in the round before, for this.

### Narrowing the concourse steps, and finding them buried

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> the stairs going from the hallway to the reception is a bit too large it
> should be center with about 1,5m of guardrail on each side.

**Iterations:** 2

The steps ran the full 23.2 m of the opening, wall to wall, which is not what a
broad flight looks like: it is centred in its opening with something along the
edge either side, because the concourse is 1.2 m over the hall and every metre
of that edge which is not a step is a drop. Now 20.2 m of flight with 1.5 m of
1.2 m balustrade at each end.

**The opening and the flight had to become two things.** They were one
rectangle, and the wall builder punches its hole wherever a same-storey link
crosses an edge — so narrowing the link simply grew a 3.2 m WALL at each end,
which is a smaller opening rather than a balustrade. `WALL_OPENINGS` is the
gap; `HALL_STEPS` is what stands in it.

**And the steps turned out never to have been visible.** A flight descends from
the plate it starts on, so drawn inside a solid plate it is a flight inside a
slab: all seven treads were buried in the concourse and the only thing showing
of the level change was the 1.2 m face along its edge. The corridor upstairs
has followed the rule since the stairwells landed — a floor with a flight
coming through it does not have floor there — and the concourse never had. It
has a `voids` entry now.

Only under the flight. The 1.5 m either side IS concourse, and the wheelchair
ramp beside it is cut from nothing at all, because no code draws a ramp: a hole
there would be a hole.

### The grand flight, and a corridor that stopped

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> you miss understood me I meant the big stair case comming from the room floor
> to the reception

**Iterations:** 1

The round before had applied the same instruction to the concourse steps. This
is the grand flight — auditorium level down to reception — and the correction
made the instruction make more sense than my first reading did.

It was 14.3 m wide, which is the full width of the corridor it delivers you to.
A flight that wide is not a staircase in a corridor, it IS the corridor: its
stairwell crossed wall to wall and the south end of the auditorium level simply
stopped there. Narrowed to 11.3 m, centred, which leaves 1.5 m of landing down
each side — a way past, and something to stand a balustrade on, which is the
other half of why it narrows.

Everything else followed from two lines. The corridor's stairwell void is
derived from the link's own bounds, so it shrank with the flight and the
landings are floor. `RAILED` gained `grand-stair`, so the flight got the side
rails and the opening got the level balustrade that the two hall flights
already had.

**Measured rather than asserted.** The comment first claimed Biggy would not
fit past; that is the sort of thing worth checking before writing it down. The
gap is 1.5 m of corridor less a straddling rail and half a wall, which comes
out at 1.35 m clear: Voxxy 0.68 and Droid 0.92 pass, Biggy 1.44 does not. True,
and now true with a number attached — and the right answer anyway for a machine
that could not have used the stairs it would be squeezing past.

### A stair hall, not a slot

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> the shouldn't have wall next to that staire just guarrails

**Iterations:** 1, after asking

Three things could have been meant and I had misread the previous instruction
already, so this one was put back as a question with the three candidates drawn
out: the corridor's own side walls, the flight's solid side seen from the
concourse, or the wall across the head of it. The answer was the first.

The grand flight arrives between Rooms 6 and 7, so the corridor's party walls
run the whole length of its well, and at 3.2 m they made the head of the
staircase a slot between two blank faces. They are 1.2 m along that stretch
now, and full height everywhere else — the wall is SPLIT at the well's ends
rather than replaced, so Room 6's doorway and the runs north of the stair are
untouched.

**Still solid, and that is the point of lowering rather than deleting.** A
balustrade is something you see over, not something you walk through: the
auditorium behind it is still entered by its own door, and `npm run traverse`
says so. Collision here has never read a height, so this change is invisible to
the simulation and entirely about what is in the way of looking at the stairs.

**Fixed by hand.** The instinct to apply it to all three wells. The two flights
into the hall are pressed against the corridor walls with no landing beside
them, so lowering those opens an auditorium onto a stairwell nobody can stand
in. `RAILED_WELLS` has one entry and says why.

### A ledge of upper floor with nothing on it

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> Almost there the floor should stop at the starting point of the stairs

**Iterations:** 1

Found by printing the floor-1 plate around the grand stairwell rather than by
looking for it. The corridor's plate is cut to the flight's own rectangle, so
whatever the flight does not reach stays as floor — and the flight started at
y -59.5 while the corridor starts at -60. Half a metre times the full 14.3 m
width: a ledge of the upper storey hanging past the foot of the staircase, over
the reception, with nothing under it and nothing on it.

The flight is flush with `SOUTH_END` now rather than half a metre short of a
number typed next to it.

**The check caught what that broke, immediately.** The well's balustrade has a
piece across its foot, and that piece had been standing on the half metre. With
the flight moved it straddled the building's own outer edge — half over the
opening and half over nothing — and `npm run venue` reported it floating on the
first run after the change.

It should not be there at all: that edge is the south wall, and a wall guards it
already. So a well edge is only railed where there is floor beyond it to stand
on, sampled half a metre OUTBOARD of the rail rather than at the rail — a
balustrade straddles the lip of the opening, so its own centre is on the line
and answers yes to everything. The two flights into the hall are unaffected;
the grand flight goes from three railed edges to two.

### The stair hall, drawn as a diagram

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> You didn't understand properly the bit staire case and it junction should
> look something like this:
> ```
> |                           |
> |                           |
> ------|--------------|------|
> |     |--------------|      |
> |     |--------------|      |
> ```

**Iterations:** 1

Four rounds of prose on this junction and an ASCII plan settled it in one. The
1.5 m either side of the flight is NOT a landing: the corridor's floor stops
dead at the head of the stairs, right across, and what carries on south is the
staircase alone with a balustrade down each side. The strips are the well, open
to the reception five metres below. I had read "1.5 m of guardrail on each
side" as floor with a rail on it; the drawing shows the third row closing right
across and rows four onward empty at the edges, which is a hole.

So the WELL and the FLIGHT are two rectangles now — the same split the concourse
opening already needed. The corridor's plate is cut to the well, 14.3 m wide;
the flight is the 11.3 m standing in it.

**Two things fell out, and both were caught rather than noticed.**

`voids` is render-only, so cutting the plate wider does not stop anybody: a
robot walking south down the side of the corridor would find the floor still
there in the simulation and stroll out over the drop. The balustrade across the
head of each strip is what the drawing's third row is, and it is solid.

And taking the well right to `SOUTH_END` left the building's own end wall with
no plate under it — 14.3 m of wall hanging over the reception. `npm run venue`
reported it on the first run. The well starts at the wall's INNER FACE now,
which leaves it half a wall's thickness of floor to stand on, entirely hidden
under the wall itself.

The level balustrade round the well went from three edges to none, because
there is no floor beside it any more to guard. The flight's own raking rails
were always the right object for that.

### A staircase with no floor at the end of it

**Tool:** Claude Opus 5 (Claude Code)
**Date:** 2026-09-20

**Prompt:**
> you introduce a bug with your change because now I cannot go down anymore

**Iterations:** 1

Correct, and the interesting part is why nobody but a human could have found it.

`npm run traverse` has fifteen scenarios and not one of them touched the grand
flight. It is one of the three routes to the auditorium level and the only one
a visitor meets first, and it had been narrowed, moved flush with the south
wall, railed, and had its well widened past the flight — four rounds — with
nothing watching. The first thing this round did was write the scenario, and it
failed immediately: Voxxy walked to the bottom of the stairs, stopped 0.35 m
short of the foot, and stood there on floor 1 for ever.

**What was wrong.** Moving the flight flush with `SOUTH_END` put its foot at the
inner face of the building's own end wall — and the point a robot must reach to
arrive on floor 0 is the very bottom of the climb, which is now inside that
wall. Voxxy's centre stops 0.34 m short of it and Droid's 0.46 m. It is not a
tuning problem. It is a staircase with no floor at the end of it.

The well reaches the wall and the flight stops 1.2 m short of it now, and what
shows through the gap is the concourse the stairs land on.

**The bug was older than the change.** With the foot back at its previous
position, Voxxy gets down by four centimetres of clearance and DROID STILL DOES
NOT — it was already unable to use the grand staircase, and had been for as
long as the flight has been there. The change did not introduce the fault, it
widened it from one robot to two, which is what made it visible. Every version
of it would have been caught on the first run by a scenario that did not exist.

---

### Claude Opus — the hall threshold as a terrace

**Prompt:**
> so the transition between the reception and the exposition hall should look
> more like that with a couple of steps: *(a plan diagram: nested, downward-
> opening brackets in the wall opening, each one inset from the last)*

**Iterations:** 1

The diagram is three nested contours whose legs all run down to the wall —
which is not a staircase narrowing, it is a **terrace**: each step a frame
around the one above it, so you walk up it from the front or off either flank.
The old flight was a 20 m × 2 m slot cut into the concourse plate with a stub
of balustrade at each end, and it read as a fire exit.

**Which side it fans into decided the whole design.** Fanning back into the
concourse looks identical in plan and is a worse building: the steps beside the
doorway then sit within a robot's step of the plate they are cut out of, so a
machine standing on the concourse half a metre from the edge reads the flight
under it and sinks into the floor it is standing on. Fanned DOWNWARDS into the
hall, every one of those points is a metre above the hall floor beside it, far
out of reach, and the question never arises. The terrace stands in the hall;
the reception no longer needs a hole in its plate at all.

**One new idea in `core`.** `Link.wrap` — metres of a flight's width given over
to climbing it sideways. `climbFraction` takes the LOWER of the along-axis and
across-axis fractions, which is exactly the nested-rectangle terrace; take the
higher and the corners rise to the top step and the thing grows two ramps up
its own diagonals. Nine lines, one optional field, and every other flight in
the building is untouched because they do not set it.

Three things the change broke that the harness caught:

- The hall's west and east walls started being cut to the terrace's treads and
  hung a metre in the air for 49 m. The wall builder's test for "a wall running
  along a flight" was *the flight is inside this room*, which is true of an
  auditorium rake by construction and false of a 3 m terrace in a 49 m hall.
  Now: a wall is cut to a flight only where the flight runs at least half the
  length of it.
- A tapered flight cannot be trusted to punch its own hole in a wall: it meets
  the wall across its whole 23 m and is only at door height for the middle 18.
  It says where the opening is instead.
- `npm run traverse` still asserted `r.y < -39` for the climb, a number that
  had stopped describing the building three metres ago and was still passing.
  It reads the flight now. Three scenarios were added: down as well as up, and
  one that drives at the flank and asserts the robot gets up — which fails flat
  at zero if `wrap` is removed.

**What I could not fix, and it is worth knowing.** From this fixed camera the
treads cannot be seen. The viewer stands south-west, the concourse is south and
high, so the flight descends AWAY from the viewer and every riser is a
back-face: what is left is tread tops, all horizontal, all the same colour.
The finished terrace at 4× contrast is one unbroken white strip. It is not a bug in this change; it is why the grand staircase is the
only flight in the building that reads as a staircase (it is the only one that
rises away from the viewer). What does read here is the splayed flanks, whose
risers face west, and the steps show properly under the cutaway when a robot is
standing on them. Making the treads themselves read is a renderer change — a
depth-discontinuity edge pass — not a building one.

---

### Claude Opus — the reception, and the space under the stairs

**Prompt:**
> the reception part should look more like this with a part being under the
> stairs. the simple like | and - just be only max 1,4m high. *(a plan diagram
> of the concourse: a stepped enclosure north-west of the grand flight drawn in
> `|`/`-`, two blocks to the east, and the stair block hatched only across its
> southern half)*

**Iterations:** 1

The diagram is the real plan. `references/venue/maps/exhibition-floor.jpg` has
a "< Reception" counter and its office standing north-west of the grand flight,
"Toilets >" off the south-east corner above the BOF rooms, and — the part worth
reading twice — **the stair hatched only as far as the cut, with open floor
north of it**. That is the "part being under the stairs": a staircase is cut at
about 1.2 m in plan, so what is drawn beyond the cut is what you would see
standing under the upper half of the flight.

**The flight had none of that.** `stairMass` draws every tread as a box from
the floor to the tread, which makes any staircase a solid wedge. Right for the
two flights into the hall, because the plan draws those as enclosed stair cores
with walls all the way round. Wrong for the grand flight, which stands in the
open with five metres of rise: above the headroom line it is now a soffit — a
slab following the pitch, drawn, never collided, with the concourse running on
underneath it. A robot walks 4.3 m in under the stairs and stops where the mass
comes back down to meet the floor.

**The 1.4 m instruction is the whole design of the desk.** The enclosure is
walled at 3.2 m on the two sides away from the concourse and countered at 1.1 m
on the two sides the public stands at. A counter drawn at wall height is a
room, and this is not a room — it is a desk you walk up to and can see over
from anywhere in the concourse.

Also added: the toilets north of the BOF rooms, with cubicle partitions at head
height rather than wall height, because a partition you can see over the top of
is what tells you what the room is.

**Two things caught rather than reasoned.**

- `npm run traverse` failed instantly on `Biggy is stopped at the head of the
  grand flight`: Biggy drove four metres into the stairwell from the corridor
  above. The soffit branch had an early `continue`, and the same loop iteration
  also emits the tread seen from the floor the flight ARRIVES on — which is the
  only thing stopping a robot walking into the well from up there. One keyword,
  a hole in the first floor, and no type error.
- `npm run venue` failed on "expected a lectern and a table in each of 14
  rooms, found 30 pieces". `desk` is a MATERIAL, not a role: the reception
  counter is made of the same stuff and is not a lectern. The check is scoped
  to the auditorium level now.

I also ran `npx prettier` on `kinepolis.ts` out of habit. The project has no
prettier config, so it reformatted 384 lines to double quotes and 80 columns
against the file's own style. Reverted with `git checkout` and re-applied the
edit by hand — the commit before it was clean, which is the only reason that
was cheap.

---

### Claude Opus — the missing party wall

**Prompt:**
> For now just keep the toilet zone as empty rectangle with a coridor. there's
> a missing wall next to the stair between the exposition wall and the
> reception.

**Iterations:** 1

Both true. The toilets are an empty rectangle off a corridor now, which is
what the plan draws anyway — two blocks served off a passage down their south
side — and the cubicles are gone until there is a reason for them.

The wall is the interesting one. Listing every wall along the hall/reception
boundary:

```
x -23.50 .. -9.80    x -13.60 .. -9.62
x   8.03 .. 11.51    x   8.13 .. 11.62
x  21.46 .. 22.70    x  21.58 .. 28.80
```

**Eleven metres of it, from x 11.5 to 21.5, was simply not there** — starting
a metre east of the concourse steps, which is exactly where it was noticed
from. That is the wheelchair ramp's footprint, and the wall builder lets any
same-storey flight cut its own way through a wall it crosses. Right for a
staircase, which is a made thing as wide as the way through it. Wrong twice
over here: the ramp is a 10 m drivable wedge standing in for a ramp a fraction
that wide, and the terrace added last round meets the wall across its whole
23 m while only being at door height for the middle 18.

So only a *stepped* flight punches its own hole now. The ramp and the terrace
say where their openings are, and the ramp's is 4 m.

A traversal scenario stands where the wall was and drives at it. With the old
rule Voxxy goes straight through the gap, up the ramp and twenty-two metres
across the concourse to the far wall; with the new one it stops at the wall,
on the hall floor, half a metre short.

---

### Claude Opus — the glass front

**Prompt:**
> Btw the front part of the kinepolis so the reception entrance is made of
> windows it should be reflected in the game

**Iterations:** 1

The whole south elevation of the concourse was one unbroken 36 m slab of
concrete, which is the back of a warehouse and the opposite of what that
building does to you when you walk up to it.

It is a curtain wall now: a 0.45 m sill, mullions at 1.8 m centres, and one
pane of glass the length of the run. The wall itself stays — a window is not a
door, and the robot that could not drive out of the south wall still cannot —
but it is `hidden`, and what you see is the three pieces in front of it.

**The one thing in the building that is not opaque.** An `InstancedMesh` has
one material, so glazing gets a mesh of its own: a plain translucent Lambert
at 0.42, no cutaway shader — a pane you can already see through has nothing to
get out of the way of — and no depth write, so what stands behind it draws
normally and the glass tints it.

**The palette does the era, as always.** The first pass gave each chapter a
colour picked in the abstract, and Chapter II's glass vanished: warm tungsten
glazing at 30% over the warm tan floor behind it is the same colour as the
floor, so the façade came out as a row of posts standing on nothing. The cue
that a thing is glass is that it reads DARKER than the frame it sits in,
whatever the light — so all three are now well under their era's wall colour,
and Chapter III's is cool grey against warm white rather than another warm.

Two harness notes:

- `npm run venue` caught the first attempt: "a piece of glazing at -13.6,
  -60.4 is inside no room". Its test for *is this furniture or is it the
  building* was "does it name a material", and glazing is the first piece of
  building that needs a colour of its own. Wall faces are centred on a room's
  edge by construction, so half of them is legitimately outside.
- A 0.4 m stub of the BOF rooms' west wall — the return at the corner where
  the entrance elevation stops — came out as a lone pane of glass. A curtain
  wall glazes the runs lying ALONG it, not the ones crossing it.

---

### Claude Opus — two storeys of it, and doors

**Prompt:**
> it should still be windows in front of the stairs on the 1st floor. The
> glass on the reception level are windows but can be opened as door

**Iterations:** 1

A curtain wall does not stop at the first floor slab. The corridor's south
end is a 14.3 m run at exactly the same elevation as the entrance below it,
and it is the one piece of the glass front you meet from INSIDE: you come up
the grand flight and the thing at the top of it is a window the height of the
wall. Glazed now, as windows.

And the two elevations are not the same thing, so they are not drawn the
same. `CURTAIN_WALLS` entries carry a kind:

| | spandrel | mullions |
|---|---|---|
| window | 0.45 m solid base | 1.8 m |
| door | 0.2 m bottom rail | 1.1 m — one per leaf |

Glass down to the floor and a rhythm two-thirds tighter is what makes a bank
of doors read as a way in rather than a window, and both cues survive being
three hundred pixels wide on screen.

**The doors do not open, and that is not about doors.** South of that line
the building's extents run out — no plate, no floor. A robot that got through
would step off the concourse into 1.2 m of nothing and keep falling, which is
exactly the fault `Voxxy cannot drive out of the south wall` exists to catch.
They become doors when there is a forecourt to walk into.

**The float check was right and I was wrong.** The first attempt put a push
rail across the whole bank at hand height, and `npm run venue` called it: *a
wall at -13.6, -60.5 (35.8 x 0.3 m) is drawn from 2.25 m with nothing under
it above 1.20 m*. A 36 m bar held up by nothing but mullions is a wall
hanging in the air as far as that check can tell, and the honest answer was
not to loosen the check — it was that a 0.12 m rail is three pixels at this
zoom and was never going to earn its place.

---

### Claude Opus — the bays, from the photograph

**Prompt:**
> I think the windows should be a bit widder look at the image
> 54842743975_b835884445_k.jpg

**Iterations:** 1

The photograph is the front of the building from the car park, and it
corrects two things at once.

The bays are wide — wide enough that you read panes of glass with frames
round them rather than the other way round. And the ground floor is **the
same grid as the storey above it**, coming down to the pavement. I had built
the entrance at a door leaf's 1.1 m on the theory that a bank of doors is
framed leaf by leaf, which across 36 m is thirty-three posts: a picket fence,
and nothing like the building.

So: one pitch for both storeys, 2.6 m, because that is what a curtain wall
is — a grid that runs up the whole elevation and lines up floor to floor.
Fourteen bays across the front instead of thirty-three, six across the
first-floor window. The only thing left telling the two levels apart is the
one the photograph shows: upstairs the glass stands on a spandrel, downstairs
it reaches the floor.

Which also settles what "windows that can be opened as a door" meant, and I
had read it too literally the round before. A door here is a panel of the
curtain wall on hinges, not a doorway cut in a wall — so it is not framed
like a door, it is framed like the window it is.

---

### Claude Opus — the exhibition stands

**Prompt:**
> Can you adapt the exibition area to add some booth based on the image:
> booth-map.png

**Iterations:** 1

Twenty-seven stands, laid out as the map lays them: two ranks of small ones
against the west wall, two ranks of large ones either side of a 9.8 m central
aisle, one rank of small ones east of it, and two in the south-west corner by
the curve.

**Placed off the column grid, not traced off the image.** That is what a stand
fitter does — nothing gets built around a column — and it is the one thing
about the layout that is not a matter of taste. It also turns out to be what
makes the plan work: the two narrow gaps between back-to-back ranks each have
a column standing in them, which is what makes them service gaps rather than
1.6 m dead ends a robot can wedge itself into.

`npm run venue` now holds the floor to it, and the check earns its keep
immediately — laying these out broke it twice, both times by under half a
metre, and both times invisibly. A column inside a booth draws as a booth and
collides as a booth; the only thing wrong with it is that it could not exist.

**Three things the harness caught that I did not:**

- The spawn-safety check failed on three cast positions at once — `hallEntrance`,
  `hallCentre` and `stairFoot` were all under a stand. The chapters line their
  cast up EASTWARD from a spawn, so a point that looks clear is not: the third
  robot lands 4 m away, which is exactly where the east rank begins.
- `stairFoot` also showed that the west rank was a stand too long: it left
  0.8 m between the back of a booth and the foot of the west flight. The plan
  puts a small stand on the end of that rank; here it goes on the east one.
- And the first colour for Chapter III was picked at the canopy's own warm
  white, which made twenty-seven stands read as twenty-seven lumps of the
  building — the hall looked demolished rather than fitted out. They are
  deliberately cooler than the building they stand in now.

They are solid, and that is as much the point as the look: an empty 2400 m²
hall is a car park, and Biggy needs 3.8 m to stop. `npm run traverse` drives
Biggy — widest robot, worst at changing its mind — the full length of the main
aisle.

Not done, and worth a look later: `Obstacle.movable` already exists, and a
trade-show stand is the most shoveable thing in the building.

---

### Claude Opus — 6 m² and 24 m²

**Prompt:**
> I think the exposition floot is a bit too small since it's not possible to
> circulate between some booth as a reminder the small one are suposed to be
> 2*3m (6 sqm) et le largest are 24sqm

**Iterations:** 1

The floor was not too small; the stands were too big. They went in at 7.2 m²
and 22.7 m² — near enough to look right off the map, and wrong enough to
matter, because every extra centimetre of stand comes straight out of the
aisle beside it. Two of the gaps came out at 1.6 m: wide enough to see
through, not wide enough for Biggy at 1.44 m across.

At the sizes the plan actually lets, the layout can be set against the column
grid properly. The columns sit 6.4 m apart, so a rank and a usable aisle do
NOT fit between two of them — which is the fact the first pass kept losing
to. So the ranks are paired instead: two of them back onto the same column
line from either side with nothing but the column between, and the aisles get
the whole of the next bay. **5.6 m down the west side and 10.7 m down the
middle**, each with one line of columns standing in it, instead of a 1.6 m
slot.

Two checks came out of it, and both fired straight away:

- `npm run venue` now holds every stand to 6 m² or 24 m². It caught the two
  small stands capping the east-central rank: a small stand in a 4 m deep
  rank is 8 m², which is not a size that exists. That rank is three large
  ones now, and the two it lost went to the east rank.
- `npm run traverse` drives **Biggy** — widest robot, worst at changing its
  mind — the full length of both aisles. It is the only honest test of "can
  you circulate", because the two small robots fit down gaps that are not
  aisles at all.

The plan's two stands turned into the south-west corner are gone: they stood
in the west aisle, and square-on-the-grid beats the irregularity. Still 27.

---

### Claude Opus — a stand is a floor and some panels

**Prompt:**
> So the booth should'nt be some boxeds, they should be a flat surface with a
> different colors with a back wall and for the bigest one or too side walls
> depending on the fact if they have a neighbout on that side.

**Iterations:** 1

Right, and a solid box was not a simplification of a stand — it was the
opposite of one. You walk INTO a stand off the aisle; what stops you is the
back of it. A box makes the inside of every stand somewhere nobody can be.

Each one is now a coloured platform you can drive onto, a back panel on the
side away from the aisle, and — on the large ones — a side panel wherever it
has a neighbour to share one with. **One panel per boundary, not one per
side**, which is the rule stated the short way: the end stands get one side
and everything between them gets two, and it falls out of emitting a wall
only where a next stand exists.

That also decides something the box was hiding. A side panel is only
meaningful if there is a neighbour close enough to share it, so the large
stands run TOGETHER in their ranks and the small ones keep their metre
between them. Which is what the map draws: the blue stands almost touch and
the yellow ones plainly do not.

`back` is the same statement twice — a stand faces the aisle, so its back is
whatever it is pressed against, and the ranks were already paired against the
column lines.

**What it buys, beyond looking right.** Voxxy is 0.68 m across and the gaps
between small stands are a metre; Biggy is 1.44 m and has to go round. Same
geometry, different answer per robot, which is the rule the whole cast is
built on — and it was impossible while a stand was a solid block.

`npm run traverse` drives Voxxy off the aisle into a stand and asserts it
ends up INSIDE the platform and not through the back of it. Re-emitting the
platform as a solid box fails it at the front edge, 2.9 m short.

---

### Claude Opus — a counter on every stand

**Prompt:**
> most booth should have some kind of small desk

**Iterations:** 1

All twenty-seven have one. The interesting part is where it goes.

The obvious place is across the frontage, and it is wrong: a counter on the
aisle edge walls a 6 m² stand off completely, and the whole reason these
stopped being solid blocks last round is that you can drive into one. So the
counter sits **against the back panel**, which is also what a stand with an
info desk actually looks like, and the frontage stays open.

`DESK_SHARE` of the frontage and capped, so a small stand gets a metre of
counter and a large one two and a half rather than four — a desk, not a
partition. Which end it sits at alternates up the rank, because a floor where
every stand is the same object twenty-seven times reads as wallpaper rather
than as a trade floor.

They are `material: 'desk'`, the same as the lecterns upstairs, which is the
honest answer — it is the same kind of object and the chapters should dress
it the same way. That only works because the presenter's-desk count was
scoped to the auditorium level two rounds ago, when the reception counter
tripped it.

`npm run venue` holds every stand to exactly one counter, wholly inside it.
The traversal scenario from last round still passes and now stops Voxxy 60 cm
earlier — on the stand, against the counter, rather than against the back
panel — so it got a name that says what it is testing: that you get ONTO a
stand at all.

---

### Claude Opus — the counter belongs at the front

**Prompt:**
> the desk should be more in front of the booth then in the back

**Iterations:** 1

Correct, and my reasoning for putting it at the back was backwards. I argued
that a counter on the aisle edge walls a small stand off — but it only takes
`DESK_SHARE` of the frontage, so the rest of it is still the way in, and a
counter tucked against the backdrop is a stand nobody is manning. You are
talked to across a counter from the aisle. It sits 0.3 m in from the front
edge now, so there is a lip of platform in front of it rather than the
counter being the edge.

**The traversal scenario broke, which is the useful part.** It drove Voxxy at
the middle of the westmost stand and asserted it ended up inside the
platform; with the counter moved it stopped dead ON the platform edge, 0 cm
inside. That is the test telling me it had been passing for the wrong reason
— it never knew where the counter was, so it happened to be aiming at open
floor.

Rewritten so it reads the stand instead of guessing at it. It now takes the
largest stand, finds the counter inside it, and works out both **which side
the aisle is on** (the side the counter sits nearer, because the counter is
at the front by construction) and **where the way in is** (the frontage the
counter does not cover). It drives at that.

One number in it is a test detail rather than a building one, and is
commented as such: the approach is a metre off the front edge and not the far
side of the aisle, because the main aisle has a line of columns down the
middle and a long straight run at the stand lands on one. Driving the aisles
is what the two scenarios above it are for.

---

### Claude Opus — the reception, measured off the marked plan

**Prompt:**
> Can you adapt the reception area to look more like this image
> references/venue/maps/hollywood-area-marked.png the part marked in blue are
> 1,40m high counter

**Iterations:** 1 (plus two problems the checks found, below)

An annotated `hollywood-area.png`: four blue strokes over the concourse
fit-out. The previous pass at this room was done from a *diagram* of the
plan; this is the plan itself, so the geometry could be measured rather than
sketched.

**Establishing the scale was most of the work, and it is the part worth
keeping.** The drawing says "no scale". I found the transform by detecting
ink: the hall's own walls as long runs of near-solid pixels, the reception
band between the line of doors at py 1569 and the entrance elevation at
py 2133, and the grand flight as 22 evenly spaced tread lines. 23.0 m of
concourse over 564 px gives **0.0408 m/px**, and that scale reproduces the
"15.7 m wide, 5.6 m deep" flight recorded in `kinepolis.ts` from an earlier
pass — the same drawing, the same number, arrived at independently. Held
against three venue anchors it lands the hall's south wall at -36.9 against
-37.4, the entrance at -59.9 against -60.4, and the concourse's west wall at
-14.7 against -13.6.

What the drawing actually has, which no description of it would have given:
the reception is **two objects, not one**. A square 5.6 × 5.5 m information
island — the circled "i" is inside it — counter-fronted on north, west and
the northern half of east, with a walled office in its south-east and a metre
of staff space behind the counter. And a separate **6.3 m counter standing
free** beside it. All four blue strokes are those counter runs, so
`COUNTER_HEIGHT` went from a guessed 1.1 m to a measured **1.4 m**.

Two deliberate moves off the drawing, both commented in the source:

- **In x**, the whole fit-out is anchored to the grand well's west edge
  rather than to its own surveyed position, which moves it 1.6 m east. The
  drawing's flight is 15.9 m wide against this building's 14.3 m well, and
  the 6.3 m aisle up the west side is what `ENTRANCE_X` reads as the route a
  player walks. Losing the aisle to gain 1.6 m of fidelity is a bad trade.
- **In y**, the free counter stands 3.4 m off the head of the flight instead
  of the 1.6 m drawn. The drawing's stair is 6.0 m deep with a landing
  halfway; this one is 8.4 m and lands in a well Chapter III drives three
  robots through.

**`npm run traverse` caught the second one, and I had not seen it.** "Voxxy
walks in under the grand stair" spawns at the well head + 2.2 m on the centre
line — which is exactly where the plan puts that counter. The robot spawned
inside it and the solver threw it 5 × 10¹¹ m. A counter dead across the mouth
of a 14 m stairwell is a real building fault and not a test artefact, which is
why the counter moved rather than the test.

**What I fixed by hand, and the lesson in it: `npm run peek` serves `dist/`.**
I screenshotted the concourse six times, concluded the free-standing counter
was not rendering, and went looking through `BlockoutRenderer` and `groundAt`
for the cull that was eating it. There was none. Every one of those shots was
a build from before the edit. The tell was there and I walked past it — the
island in the shots was the OLD desk, an L of counters that looks much like
the new U. What finally settled it was removing the counter and diffing the
two frames pixel for pixel: identical, which no rendering bug produces. Run
`npm run build` before `npm run peek`, every time.

**One thing the reshaping stranded.** Chapter III's badge marker sat at
-5.0, -45.0 — the middle of the old 9.8 m enclosure. The island is 5.6 m
across with a metre of staff space, so that point is now wedged between the
counter and the office: the marker read as standing on the wrong side of the
desk, and at 1.44 m across Biggy could not have reached it. Moved into the
west aisle in front of the counter, where a badge queue actually forms and
where all three robots can stand. `npm run objectives` passes either way —
it tests that a robot fits, not that the spot makes sense — so this was
caught by looking at the screenshot.

---

### Claude Opus — the walls in red, and a flight that was too short

**Prompt:**
> the wall marked in red are not well represented. By the way the stair case
> is too short

**Iterations:** 1, plus two questions put back to the user

Same drawing, re-marked: four blue strokes unchanged and seven new red ones.
Diffing the marked file against `hollywood-area.png` and splitting the result
by hue separates the annotation from the plan's own pink door swings, which a
plain colour threshold does not.

The red traces three things, and the first of them was simply missing:

**The stair hall.** The grand flight had been standing in open concourse with
a balustrade down each side. The plan puts it in a SLOT — a wall the full
length of the flight on each side, treads hatched up to both — and the two
sides are not the same length: west stops 0.5 m past the head where the
information island takes the line over, east runs 5.7 m past it and returns
3.6 m west. They sit on the well's own long sides, which is the honest anchor:
the well is this building's stand-in for that slot.

**The island's back wall**, which the previous pass drew straight and called a
detail too small to see. It is stepped, and the user marking it is the answer
to that. Drawn stepped now, stub and all.

**The concourse's east end**, which turned out to be a conflict rather than an
omission — see below.

**"Too short" was ambiguous and I asked rather than guessed.** The flight is
11.3 m wide, 8.4 m deep, 5.0 m rise; the plan's is 15.7 × 6.0. So "short"
could mean the width (the plan hatches wall to wall and this leaves 1.5 m of
dead well each side), the run, or the number of drawn steps. Those are three
different jobs. The answer was the run, and the fix is that the grand flight
stops using the building's stair: `RISER`/`GOING` is 0.18 over 0.30, a 31°
fire stair that appears fourteen times in here, and at that pitch 5.0 m takes
8.4 m of run — a wide fire stair, not a grand flight. It now has a ceremonial
0.15 over 0.36, 23°, 33 risers, 11.9 m of run. Shallower is safe both ways:
Droid's `maxStepRise` is 0.18 and this is under it, Biggy's is 0 and still is.

**The east end was the interesting one, because two drawings disagree.**
`exhibition-floor.jpg` — the annotated Devoxx plan — writes "Toilets >" out in
the eastern service strip with the BOF rooms, on a 19.8 m frontage, which is
where they were. `hollywood-area.png` draws them INSIDE the concourse's
north-east corner on 9.3 m. An annotation says a room is *somewhere*; a drawn
wall says *where*. I put that to the user rather than picking, and the drawn
wall won. The strip the toilets vacated became BOF 3 — 7.6, 7.7 and 7.8 m on
one frontage, which is what that side of the building always was — and that is
also the right answer to the conflict, because a BOF room is a partition
Devoxx puts up for a week and a toilet block is building.

Anchored WEST to its measured x rather than east, for two reasons: the west
side is the wall the mark actually points at, and it leaves the wheelchair
ramp its ground. The ramp is a 12 m straight run standing in for a switchback
— invented — and an invented object does not get to sit on a drawn one, so
the ramp gave up half its width instead.

**Three literals went stale in one change, and the harness caught all three.**
This is the pattern worth naming: every time the venue moves, something that
typed a coordinate instead of deriving one is left behind, and it never fails
loudly.

- `SPAWNS.corridorSouth` was 3.5 m inside the enlarged stairwell. `npm run
  venue` caught it. It had been moved north once before for exactly this.
- `tools/traverse.mjs` held the ramp's centre as `x: 16.5`. When the ramp
  narrowed, the scenario drove beside it rather than up it — and `BESIDE_RAMP`,
  which stood "1.5 m inside the ramp's east edge" to find wall, stood in the
  doorway instead, because that derivation only worked while the ramp was 10 m
  wide and its opening 4. Both read off the link now.
- Chapter III's badge marker, which I had moved by hand in the previous pass,
  drifted again when the island went 3.5 m north. `npm run objectives` passed
  both times, because it asks whether a robot FITS somewhere and not whether
  anybody would queue there. Fixed properly this time: `kinepolis.ts` exports
  `RECEPTION_DESK`, derived from the island, and the objective reads it.

**Still open, and NOT fixed here.** The drawn tread count is capped —
`MAX_TREADS` 18, `MIN_TREAD` 0.62 — so the deeper flight is drawn as 19 steps
of 0.63 m going and 0.26 m riser rather than its real 33 of 0.36/0.15. It was
already like this (18 against 28) and deepening the run makes each drawn step
bigger, not smaller. Worse, `climbOf` in the renderer places a robot's feet on
`rise / link.riser` treads — 33 — while the flight has 19 of them drawn, so a
climbing robot bobs over steps that are not there. That is a building-wide
renderer question, not a reception one, and it wants its own pass.

---

### Claude Opus — Chapter I, which was the same map in a colder palette

**Prompt:**
> I don't see anything in the first chapter that really shows it has been
> abandonned for decades it looks like the other map just with different color

*(after two rounds of brainstorming, and a reference: the abandoned-city
episode of the anthology series — three robots touring an empty city)*

**Iterations:** 1 build, then 2 tuning passes against screenshots

**The prompt was correct and the diagnosis was cheap to make.** Chapter I was
`lightLevel: 0.18` and a bluer palette, and that is all it was. The exposure
curve is `0.35 + lightLevel * 0.65`, so Chapter I renders at 23% of Chapter
III's light — genuinely darker, and still the same rooms. **Darkness is not
abandonment.** Dust is, and grass through the floor is, and neither of those
can be a palette entry.

**The useful thing about that reference is what it is NOT.** Nothing in that
episode is smashed: the buildings are intact, the cars are parked, the shelves
are stocked. What happened is dust, plants and sun — time, not violence. Which
means it does not fight `SPEC.md` §9 (*"the building is empty, not wrecked"*)
at all. Settled IS the tone rule, and I would have got this wrong if I had
taken "post-apocalyptic" at face value two messages earlier.

**`src/core/Decay.ts` — built as `Crowd`'s mirror image, deliberately.** Same
shape: one density number, one seeded generator, everything static and
instanced so a few thousand pieces cost one draw call. Crowd fills the venue
with the people in it; this fills it with the length of their absence.

That shape is what keeps the two architectural rules intact:

- **Rule 2** (the venue is defined once): grass in `kinepolis.ts` is grass in
  Chapter III. So the decay is GENERATED from the venue's geometry rather than
  drawn into it — the same move the crowd makes, for the same reason.
- **Rule 3** (four fields): not a fifth one. `abandoned(chapter)` is
  `crowdDensity <= 0 && lightLevel < 0.4`, stated once in `Chapter.ts`, on
  exactly the principle `ChapterScreen` already used to hang the robot's lamp
  off `lightLevel < 0.4`.

**The second half of that predicate is there because of the movement lab.**
The lab is `crowdDensity: 0` — one hall, three robots — and keying decay off
emptiness alone silted up the one screen in the game that exists to be legible
while tuning. Caught by reading `lab.ts` while adding the palette entries it
now needs, which is the kind of thing a typechecker finds for you if you put
the colours on the shared `Palette` rather than bolting them on the side.

**Three things wrong with the first version, all found by looking at it:**

1. **A real bug.** The daylight falloff that thins growth as it goes north
   read `south` off EVERY room — including the forecourt, whose far kerb is
   thirty metres beyond the front door. Every gradient in the file was
   therefore measured from outside the building, the whole venue sat at the
   floor value, and the exhibition hall grew nothing at all.
2. **Growth on a grid reads as litter.** One tuft every 2.3 m is not how a
   floor goes back to ground; the eye sorted them as small boxes somebody had
   left about. Ground comes back in PATCHES — a seam lets water in and what
   grows spreads from there — so a clump is now 6-20 tufts inside a couple of
   metres, thickest and tallest in the middle, and the clumps are what get
   scattered.
3. **The biggest miss: there was no dust on the open floor.** The first pass
   put silt only where the floor meets something else, so the middle of every
   room was as swept as Chapter III — and the middle of the room is what you
   are looking at. A floor nobody has walked on is COVERED, not edged.

**What made the covering finally read was overlap and spread.** Sheets at one
per 22 m² were pale rectangles lying about on a dark floor; at one per 11 m²
they overlap into an irregular continuous surface with dark floor showing
through the gaps. And they need roughly twice the tone spread of anything else
in the building, because forty overlapping rectangles of the SAME value read
as one rectangle with a strange outline.

Columns turned out to matter more than walls. A skirting of silt 25 m away at
the hall wall is not what the player is looking at; the ninety columns on a
9 m grid are, because they drive between them all chapter. Two faces each,
south and west — the two the camera can see — on the same argument
`SHAFT_SKIN` already makes in the venue.

**The free win.** `tint` lives in `RobotSpec.ts` and is a fact about the
machine, not the era, so Voxxy's orange survives any palette change. Against a
near-monochrome dust-and-scrub floor it is the only saturated thing in frame —
which is that episode's shot composition, arrived at without drawing anything.

**Noted, not fixed:** `?at=x,y` explodes if the coordinate lands inside solid
furniture — the cast spawns in a wall and the solver throws it out of the
building, giving a black frame. It did it on the reception island in every
chapter, so it is the query parameter and not this change. Debug-only, but it
cost a few minutes of suspecting the new code.

---

### Claude Opus — the floor was boiling

**Prompt:**
> it's flickering a lot

**Iterations:** 1

Z-fighting, and I had built it in on purpose one message earlier.

The dust sheets are deliberately dense enough to OVERLAP — that is the whole
difference between pale rectangles lying about on a dark floor and a covering
— and `SHEET_HIGH` was a single constant, 0.035. So every overlapping pair had
its top face at exactly the same height. Two coplanar surfaces are a
depth-buffer coin toss, resolved per pixel and re-tossed the moment the camera
moves a centimetre. There were 582 of them.

A second one underneath it: a stain was 12 mm tall, lifted off the plate by
`DECAL_LIFT`'s 25 mm, which put its top at 37 mm — two millimetres from every
sheet in the building.

**The fix is a range, not a nudge.** Offsetting the constant would have moved
the fight rather than ended it, because the sheets fight EACH OTHER. Once the
height is a continuous draw, the chance that two independent values land
within the depth buffer's resolution of each other is nil in any practical
sense, and it stays nil however many sheets there are. The floor of the range
clears `DECAL_LIFT` so the floor's own seam grid stays buried under the dust
instead of poking through it.

The stain moved on top of the sheets rather than under them while I was there,
and it should have been there all along: a damp patch drawn under the dust
that settled on it afterwards is the wrong way round. The roof is still
leaking. The water is the newest thing in the room.

**Measured rather than eyeballed, because "does it still flicker" is exactly
the question a screenshot cannot answer.** Two frames 6 cm apart, differenced:

| | pixels changed >30 | >90 |
|---|---|---|
| before | 8.3% | 3.0% |
| after | 6.5% | 2.0% |
| Chapter III, no decay at all | 4.8% | 2.7% |

Chapter I now moves LESS at high magnitude than a chapter with no decay in it,
so what is left is parallax rather than instability. The residual gap at the
low threshold is the dust's own edges, which is a thing that is really there.

**Worth stating as a rule, because this will happen again:** anything
generated in quantity that lies flat on a floor needs its height drawn from a
range, not set from a constant. `Decay` now has four such kinds and the three
that were already jittered — drifts, skirts, growth — never flickered once.
The only one that did was the only one with a fixed number in it.

---

### Claude Opus — a text box, like the old handheld RPGs

**Prompt:**
> Ok that's a good start but I was thinking a to have a short chat like
> interaction bit like in the old pokemon games

*(after I had scoped four tiers of NPC work and recommended the cheapest two)*

**Iterations:** 1 build, then three fixes found by looking at it

Walk up, press a key, a box at the bottom, page through it. Built as the
**seventh activity kind** rather than as a dialogue system off to one side,
which `core/Activity.ts` asks for in as many words at the top of the file: *"if
a chapter needs a seventh kind, it belongs here where all three can reach it,
not in a screen."* Putting it there means a conversation inherits gates,
windows, prerequisites, the card, the world marker and `npm run objectives`
for nothing — the steward outside Room 8 is `gates: { reach: 1.0 }`, so Biggy
cannot be spoken to at eye level, and the fact that Biggy also cannot get
upstairs at all is the joke in the line he is refused with.

**`ObjectiveRun` owns which line is showing, not the screen.** `progress` is
the fraction of lines SHOWN, so `ChapterScreen` asks
`round(progress * lines.length)` and holds no cursor of its own. A screen that
counted its own lines would disagree with the thing that decides when the
conversation is over the first time a robot was driven out of the zone
mid-sentence — and driving out resets it to the top, which is what lets the
second robot hear the whole thing.

**The details that make a text box feel like one**, all of which are the same
ones those games settled on and none of which are free:

- Two lines, fixed height, so a long conversation never makes the screen jump.
- Typed out at 58 characters a second, because a box that appears fully
  written is a label and one that types itself is somebody speaking.
- A press while the line is still arriving **finishes that line** rather than
  paging past it. Every game that has ever done this does it, and a player's
  hands expect it without being told.
- `▼` only once the line has finished arriving. A prompt to continue shown
  while text is still coming is a prompt to skip.
- Offered, never opened. In range you get `E    Talk to Stand 11`; the box
  opens on the press. A box that opens because you drove past interrupts you.

**Three things wrong, all found by looking at a screenshot:**

1. **A robot parked INSIDE the attendant.** Nothing in this game collides with
   people — "people get out of the way of robots" — so a person who cannot be
   displaced is a person you stand in. Posted people now take the same `avoid`
   push as anybody else and walk back to their mark at 0.55 m/s afterwards,
   which also stops the first machine to arrive shoving them out of their own
   conversation.
2. **A two-metre marker post through the middle of them.** The marker is drawn
   at the zone centre and so is the person. A `talk` activity gets a STUD now,
   the form a sticker sweep already used: the person is the marker and the
   stud is the floor lit under them.
3. **Invisible in a full house.** An attendant in the crowd's own colour is a
   figure among five hundred figures; a marker can say an activity is HERE but
   not which of the four people under it you are meant to speak to. Posted
   people are mixed a third of the way to the accent — enough to find, not so
   far that they read as a prop. It is the one place the crowd's "everybody is
   one colour" rule is deliberately broken, and `Person.posted` exists on the
   core type rather than on `Mover` only because the renderer is handed
   `Person`.

**Two small things the change dragged in**, both worth noting because neither
is the feature and both would have shipped wrong:

- Chapter III's brief said "twelve things worth doing" and there are fifteen
  now. Fixed in `registry.ts`, `objectives.ts` and `MECHANICS.md`.
- The control line advertised `TAB robot`, `SPACE drop` and `E talk` in every
  chapter. All three are true of the engine and none of them is true of
  Chapter I, which is one robot in an empty building — and a control list with
  three dead keys on it is how a player decides the game is broken. It is
  built from what the chapter actually has now.

---

### Claude Opus — a room you can see going out

**Prompt:**
> commit the change. then tackle the dimming zone

**Iterations:** 1

`docs/MECHANICS.md` §5.2 has said this since the mechanics spec was written:
*"Read the building, not the HUD: a draining room visibly dims from the
corridor. The meter is a fallback, not the primary signal."* Nothing
implemented it, so the meter WAS the primary signal and the building was the
fallback — exactly backwards, in the one chapter whose whole idea is that you
are reading five rooms at once.

**The machinery already existed and was the wrong shape twice over.**
`revealZone` builds a grid of point lights over a rectangle, which is what
Chapter I's three distribution boards use. It appends, so calling it once a
frame hangs nine more lights on the storey every frame; and it is a verb
— *switch this on* — where a tend room needs a state: *this room is as lit as
its session has left in it*. It is keyed and idempotent now, so the first
call builds the rig and every call after it re-aims the same one. Chapter I's
reveals carry the id of the activity that fired them for the same reason.

**The real problem was headroom, and it is a thing worth remembering about
additive light: you cannot subtract with it.** Chapter II was at
`lightLevel: 0.62`, which lit every room to most of its final brightness
before its own rig contributed anything, so a room losing ALL of its house
lights barely changed. The fix is not a stronger rig, it is a darker base:
0.45, which sits between Chapter I's 0.18 and Chapter III's 0.85 and means
the corridor is the building with nothing running in it. Each session then
adds its own light on top. Measured off the screenshots, on Room 5's seating
against the corridor it is read from:

| | Room 5 seating | corridor |
|---|---|---|
| full session | 78.3 | 63.7 |
| 13 s of 45 left | 65.5 | 60.6 |
| dark | 43.3 | 55.8 |

A 45% swing on the room against 12% on the corridor — so the room goes out
and the building does not, which is the whole trick. A dead room ends up
DARKER than the corridor it is seen from, which is what makes "Room 5 is
gone" legible at a glance from sixty metres away.

**The easing is the design decision.** Light is `sqrt(meter)`, not `meter`.
Linear, a room looks fine for most of its life and then falls off a cliff in
the last few seconds — by which time it is too late to drive there, and the
signal has told you nothing you could act on. Square-rooted it starts losing
light early and slowly, so *that one is dimmer than the others* is a thing
you notice while there is still something to be done about it.

Reusing `Reveal` rather than adding a field: it is the same data — a floor, a
rectangle, a level — and the only difference is that Chapter I fires it once
on completion and Chapter II drives it every frame off a meter. `to` stops
meaning "the level to arrive at" and starts meaning "what a running room is
worth", which the comment on `tendRoom` says out loud.

**Confirmed the other two chapters through the refactor**, because a keyed
light rig is exactly the kind of change that silently breaks the thing it was
refactored out of: Chapter I's hall board still lights the hall and leaves
the concourse dark, and Chapter III is untouched.

**Still not done in Chapter II**, and named here so it is not mistaken for
finished: a dark room keeps its audience. §5.2 says *"its attendees leave"*.
The seated crowd is baked into the storey as static instances at load, which
is what makes five thousand people cost one draw call and also what makes
them unremovable. And nobody has played the chapter — the meter economy needs
the cast to sustain about 7.1 s/s for four minutes against a ceiling of
roughly 6 to 9, so whether it is winnable at all is still an open question
and not one reading the code can answer.

---

### Claude Opus — the audience of a dead room

**Prompt:**
> make the attendee leave the room

**Iterations:** 2 commits, and one wrong assumption found by measuring

`docs/MECHANICS.md` §5.2: a room at zero *"goes dark, its attendees leave,
and it never comes back."* The light going out shipped last pass; this is the
rest. A dark room with two hundred and fifty people still sitting in it is a
power cut, not a session that ended.

**The obstacle was the thing that makes the crowd cheap.** The audience is
baked into each storey as instanced meshes — one draw call for five thousand
people — and it was baked as one `flatMap` over everybody on the floor, so
Room 5's people were interleaved with everyone else's in whatever order
`fillSeats` happened to walk the seats. There is no way to take a hole out of
the middle of an `InstancedMesh`. Baking room by room, each a contiguous run
with its range recorded, costs nothing at build time and is the whole of what
makes emptying possible.

**They get up in a scattered order**, from a fixed-seed shuffle. In seat
order it is a wipe travelling across the seating, which reads as the room
being deleted; scattered, it reads as a room thinning out. A prefix of that
shuffle is "who has gone", so emptying costs only the people who have just
stood up rather than a pass over the room.

**The leavers are spawned at the DOOR, not in their seats**, and that is the
cheap trick that made the second half affordable. Standing them up in the
seating would mean matching each mover to the seated instance being hidden,
in the renderer's own departure order, across a boundary `src/core` is not
allowed to see. Out of the doorway they have already stood up — and nobody
can count them against a room that is dark by then. Three dozen of them, not
all two hundred and fifty: the mover budget is 400 for the whole building and
five rooms emptying in full would be six hundred people nobody asked for.

**The wrong assumption, caught by measuring rather than by looking.** The
first version put the emptying inside `consumeObjective`, which is gated on
the round still being live. The last thing that happens in this chapter is
three rooms going dark within two seconds of each other and ending the day,
so the losing room got two seconds of an eight-second walk-out and then froze
half gone behind the end card. Two screenshots either side of it read 12.36
and 12.22 — no change — and I nearly concluded the whole mechanism was
broken. It was not: the room was simply dimmed to nothing by the end card and
the emptying had stopped. Proving it needed the window shortened to 1.2 s
temporarily, which showed the seats going bare cleanly, and then putting it
back.

**Two harness limits worth writing down**, because both cost time here:

- `npm run peek` holds its keys from the first frame, so it cannot press `R`
  after a room has died. The restart path is therefore asserted in node
  instead — `Crowd` is pure core, so 159 movers, evacuate five rooms to 339
  with no speaker left on a stage, `reseat` back to 159 with all five
  returned, and no creep over four round trips. That test found nothing, but
  only because `reseat` had already been written to answer the question the
  test asks.
- The default no-input run is a bad rig for anything that happens after the
  first room dies, because with nobody playing all five die within seconds of
  each other. Chapter II's real timings will not look like that.

**The leak this closed.** `R` restarts the round and rebuilds `ObjectiveRun`,
but not the crowd — so without `reseat` every restart left the last round's
leavers wandering a corridor they are no longer at a conference in, and five
rooms times a few restarts is the mover budget gone. The renderer had the
same shape of problem in reverse: emptying overwrites instance matrices in
place, so `refillSeats` rewrites them from the same people in the same order
through the same builders. That is why `writeInstances` exists rather than
the matrix arithmetic being inline in two places that can drift.

---

### Claude Opus — a cat, a dog, and forty-five seconds

**Prompt:**
> I would like to add two npc in the first chapter one cat and one dog. The
> dog should look like a bouvier des flandres. When you interact with the cat
> it threat the robot to explode and reference the game exploding kitten. One
> it's done you've 45second to find the dog to disarm the threat.

**Iterations:** 2 commits, and three things the first attempt got wrong

**Almost none of this was new machinery, and that is the point.** The `talk`
kind built two passes ago already carried a post, a marker, a box of dialogue
and a gate. An animal uses every bit of it and differs in exactly one field:
`shape`, which is what the renderer draws when you get there. The only thing
`placePart` needed was an `along` offset — a person is one column of boxes
and needs `across` for two arms beside a torso, where an animal is that
column laid on its side with a head at one end and a tail at the other.

**Drawing a Bouvier out of boxes.** It is a lucky breed to be asked for: at
twenty pixels tall no coat texture survives, so all of it has to live in the
outline — square, as long as it is tall, short thick legs, and a pale muzzle
stuck out in front of a dark head, which is the one thing about a Bouvier
that reads at any size. Its coat is drawn well off the black it really is,
because Chapter I renders at 23% of Chapter III's light and a true Bouvier in
there is a dog-shaped hole.

**On the reference.** Asked for a nod to a specific commercial card game. The
repo is public and MIT and `CLAUDE.md` is strict about borrowed marks, so
what is in here is the MECHANIC — the one card in the deck that ends the
game, and the thing that defuses it — with no art, no text and no wordmark,
and the joke it lands on is ours: the counter to a cat is a dog. Flagged to
the user rather than decided silently; the explicit name can go in if they
want it.

**Three things wrong on the first attempt, all found by looking:**

1. **The cat was invisible, buried by its own marker.** A marker post is
   0.8 m even at its short setting and a cat is half a metre, so a creature
   standing on its own zone centre cannot be seen. Posted creatures now stand
   0.62 m south-west — towards the camera — so they are in FRONT of their
   post.
2. **A cat drawn to life is four pixels across.** Indistinguishable from a
   scrap of the decay it was sitting in, and this one has lines to say. It is
   half again bigger than a cat now, and its tail is up and is the tallest
   thing on it, because at this size the tail IS the cat. The dog needed no
   such help — a Bouvier is already big.
3. **I tested from outside the zone.** The first screenshots showed no
   dialogue box and I briefly thought the whole thing was broken; the camera
   was at y -46.6 and the cat's zone ends at -46.0.

**The vocabulary needed one genuinely new thing.** `window` is absolute — in
chapter seconds — which is right for a conference day and cannot express this
at all, because forty-five seconds *from what* depends on when the player
found the cat. Hence `within`: a deadline counted from the last of `after` to
finish. `npm run objectives` now refuses a `within` with no `after`, because
a deadline counted from nothing silently never fires, which is the worst way
for a rule to be wrong.

**Deliberately not a clock on the chapter.** `SPEC.md` §4 has Chapter I with
no clock and no failure. The three boards are still untimed and still cannot
be lost; running the forty-five seconds out costs you the dog and nothing
else. A cat that says forty-five seconds and then does not mean it is a worse
joke than a cat that does.

**Tested in node, not by screenshot, and it had to be.** `peek` holds its
keys from the first frame, and `keyboard.on` fires on keydown — so a
four-line conversation needing five separate presses cannot be driven by the
harness at all. `ObjectiveRun` is pure core, so the whole chain runs there:
dog locked before the cat, cat done after five presses with `doneAt`
recorded, deadline at doneAt + 45, dog reached at 30 s completes, at 47 s it
is missed, stays missed when you turn up anyway, and the chapter is still
running. That is the second time this week the screenshot harness could not
answer a question and core could.

---

### Claude Opus — the speakers

**Prompt:**
> In chapter two can you add Stephan Janssen, James Golsing, Rob Johnson,
> Brian Goetz, Gavin King as npc with who you can chat. The goal would be
> that you go chat with Stephan and recommend you to go chat with those
> awesome speakers as an extra quest.

**Iterations:** 1, plus a latent HUD bug the change exposed

Two names corrected before writing anything, and flagged rather than done
quietly, because a real person's name spelled wrong in a shipped game is
worse than a question: **James Gosling** and **Rod Johnson**.

**Real people, so: cameo rules.** All five genuinely spoke at JavaPolis, and
Chapter II *is* JavaPolis, which is the only reason they are in here. Every
line is about the room and the moment rather than about them, and nothing is
put in anybody's mouth that is not plainly true of their public work. Warm,
short, and nothing anyone would mind being quoted saying.

**The chain is one conversation that opens four**, which the vocabulary
already did: `after` for the gate, `group` so four rows do not land on a card
that already carries five. The placement is the design. The corridor is 126 m
and the four of them are spread up its west side outside the rooms they are
on in, so the side quest is a round trip of a hundred and twenty metres while
five session meters drain without you. The chapter's own sentence is "keep
every room running" and this is the first thing in it that asks you not to.

**`optional` is the one new thing.** `ObjectiveRun` ends a round when
everything finishable is settled — which is how Chapter I knows it is over —
so without it, saying hello to five people would have ended Chapter II on the
spot, with all five rooms still running and three minutes on the clock.

**And that flag exposed a latent bug, which is the part worth keeping.** The
HUD chose between "5/5 running" and a done/total score by asking whether the
chapter had anything FINISHABLE. That was true of Chapter II only for as long
as Chapter II contained nothing but rooms — one optional conversation flipped
the header to "0/2" and took away the count the entire chapter is read from.
The denominator was wrong in the same way: it counted every state, so this
change would have made it "11/11 running". Both now ask whether there are
tend rooms, which is the question that was always meant, and the end card had
the same fault and now says "2 of 5 still running" instead of "0 of 2".

That is the third time in two days that adding something has been most
valuable for what it revealed about code that was already there, and all
three were the same shape: a condition that was a correct *description* of
the data at the time it was written, standing in for the *question* it meant
to ask.

**Tested in node again.** Gosling stood on and pressed before meeting
Stephan: locked, progress 0. After Stephan: open. All four completable, and
the round still running with 5 of 5 rooms alive once every conversation is
done.

---

### Claude Opus — telling five people apart at twenty pixels

**Prompt:**
> so it's good but i would like for the npc to be visually unique each of
> them and maybe that the dialog look more like them

**Iterations:** 1

"The dialog look more like them" reads two ways — the writing sounding like
the person, or the box itself looking like them. Both are cheap, so both got
done rather than asking.

**The constraint is the whole design.** A figure is twenty pixels tall. A
face is under a pixel, glasses are under a pixel, a logo on a shirt is under
a pixel. So `Look` carries four things and refuses the rest: a shirt colour,
a hair colour, a beard, and a height. Attempting more would be a claim the
renderer cannot make — and with real people in the frame, a bad likeness is
worse than an honest abstraction.

**The heights are the lever I nearly left out and shouldn't have.** People
differ by a head, which is 8% and about four pixels. Without it, five
distinct shirts still read as one figure repainted five times; with it they
read as five people. It costs one multiplier threaded through every z in the
figure — and it has to be *every* z, or you get a normal person with a
floating head.

**Hair and beard are boxes, not blobs, and that is a budget decision rather
than a shortcut.** The blob budget is two a head and every one of the three
thousand people in Chapter III pays for it; the box budget already had room
for an animal's thirteen. A cap on a rounded head reads as hair either way at
this size.

**The box takes the speaker's colour**, which is the other reading of the
prompt. A name in the chapter accent is a label; a name in the shirt of the
person in front of you is the same person twice. Lifting the colour for text
needed its own function: `shade` multiplies, and a very dark navy multiplied
by three is a slightly less dark navy. Mixing toward white instead lands
every shirt at the same legibility and keeps its hue.

**On writing real people.** The lines now have five distinct registers rather
than one voice split five ways, but the cameo rules did not move: about the
room and the moment, nothing in anybody's mouth that is not plainly true of
their public work, and each one ends by sending the player back to the rooms
they are supposed to be keeping alive — so the side quest argues for itself
and then argues against itself, which is what a good aside does.

**Two harness mistakes, the same one twice.** I put the test camera outside
the activity zone and got no dialogue box — exactly the error I made with the
cat two features ago, and did not recognise until I had shot it twice more.
Worth a note for next time: `spot(floor, x, y, size)` is a square of side
`size` centred on the point, so a camera 2 m south of a 3.2 m zone is outside
it. And a conversation gated behind another one cannot be screenshotted at
all, because `peek` holds its keys from the first frame and `keyboard.on`
fires once on keydown.

---

### Claude Opus — the same five people, off photographs

**Prompt:**
> Can you actually google those person and make the personna look like them.
> I would like that the side quest tell more a story about the conference and
> the oppotunity and the unique conversation you can have with those speakers
> more then the current objective

**Iterations:** 5 — four of them on beard geometry.

**The research is the cheap half and it still needed a correction.** Web
search returns prose about people, not their faces, so the useful move was to
go and fetch photographs and actually look at them: Wikimedia Commons for
Gosling, and the Devoxx CFP's own public speaker API — `dvbe24.cfp.dev`,
`?size=1000`, the 20-row default is not documented anywhere — for the
official headshots of Goetz, King, Janssen and Johnson. Commons also has a
"Gavin King.jpg" which is a different Gavin King entirely, and I nearly built
a dark-haired man with a goatee out of it. Photographs of the right person
are the only defensible source for this; a confident memory of a public
figure's face is exactly the thing that is wrong in a way nobody catches.

**The twenty pixels were wrong, and three features were cut because of it.**
The previous pass asserted a figure was twenty pixels tall and refused
glasses, hairlines and beard shapes on that basis. Nobody measured it. The
camera fits 32 m across 1280 px, so a person is 60 px and a head is 9 by 8,
and a spectacle frame is 1.2 px — which is a thin dark line across a head,
and thin dark lines across heads read as glasses because there is nothing
else they can be. Janssen's amber frames are now the single most recognisable
thing in the corridor. **The lesson is not "be bolder"; it is that a number
in a comment justifying a cut is worth the thirty seconds it takes to check,
because it goes on being true long after it stopped being right.**

**Four passes on where a beard goes.** The first was twice too big and read
as a scarf. Halved, it read as a shadow under the jaw — because `chin` in
that code is the NECK joint and the head is a BLOB, so a beard hung off the
bottom of it hangs off the narrowest part of a sphere and lands on the
shirt. The fix was to stop measuring from the box and start measuring from a
face: mouth a fifth of the way up, eyes at just under half, beard the bottom
third. Every one of those passes was one build and one crop, and none of them
would have been visible in the code.

**Two colours that were right and read wrong.** Gavin King's hair is fair,
and fair hair rendered at its own value under Chapter II's tungsten light
came out the exact tone of a lit forehead — the one man in the corridor with
a full head of hair read as bald. It is two shades darker than the
photograph now, deliberately. And Brian Goetz's beard is greyer than his
hair, which is not a detail: rendered in hair colour he is a different man.

**The dialogue box broke in a way the honest colours caused.** It tints the
speaker's name with their shirt, which worked while the shirts were invented
and fell over the moment they came off photographs — three of these five wear
black, so three names came up the same washed grey. It now takes whichever of
their colours is furthest from grey: amber glasses, ochre hair, blue-grey
shirt. Five people, five inks. Where everything about somebody IS grey, grey
is the right answer and it stays.

**Attendants had to stop turning their backs on the camera.** A face is on
the front of a head and this game has exactly one viewpoint, so an attendant
tracking the player exactly presented the back of their skull half the time.
That cost nothing when a named person was a shirt and a haircut and costs
everything now the likeness is on one side of the head. They face the viewer
and turn up to 75 degrees off it — still turning towards whoever comes over,
but the way an actor does, without playing the scene upstage.

**On the writing, which is the half the prompt cared about.** The previous
version had five of the most interesting people in the Java world each take a
turn telling the player to get back to work. That is a waste of the only five
people in the game worth stopping for, and it is also a strange thing for the
chapter to argue: the player is in a building full of talks and the game kept
insisting the talks were the point.

They are a story now, and the story is what a conference actually is: the
talks are recorded and the corridor is not. Stephan opens by saying so — all
of it goes online, so if the talk were the reason to fly to Antwerp in
December nobody would fly to Antwerp in December. The four of them are each
one thing a recording cannot give you: an author saying "I have no idea" out
loud, an argument that ends in a bar instead of a thread, a book's worth of
conversation had in one morning, a question answered by the person the answer
belongs to. And it has an ENDING — Stephan is still standing there, and once
you have met all four he has something to say about what you just chose.

**Everything is era-locked, which the first draft got wrong.** Chapter II is
JavaPolis, so the corridor is about 2006 and the talk is Spring against EJB,
Hibernate two years into being the thing everyone uses and complains about,
Java 5's memory model still new. Where these four went NEXT is public and
interesting and belongs to a chapter this is not. The one hard number in
there — 2,800 people, the biggest independent Java conference in the world —
is real and is 2006.

**Two pieces of harness fell out of it.** A second conversation with somebody
you have already met needs `alreadyHere`, or the rule that every `talk` puts
a person at its zone puts a second, identical host inside the first. And an
optional activity that is still locked is now hidden from the card: listing
"Back to Stephan" before the player has met Stephan hands them the end of a
thread they have not been given the start of.

---

## Audio

### _(pending)_ Footfall and ambience

Footsteps are the highest-value sound in the game — they are what sell mass,
and mass is 20 points.
