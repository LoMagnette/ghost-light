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

### Claude Opus — an intro, and some lore

**Prompt:**
> All the branch you mentionned are merged now. I was thinking it would be a good thinking to give an intro to the game and communicate some lore.

Two choices put to the author: a title sequence before the menu, and lore
that hints rather than explains. The second keeps SPEC's rule for Chapter I,
that the game never says why the building is empty; an intro that told you
would spend the game's one mystery before a robot had moved.

**The words** (`src/chapters/intro.ts`), in the order they appear: what a
ghost light is; that theatres keep one against the dark, and some say for
the ghosts; that this cinema held a conference every year for more than
twenty years; that it is empty now and the power is off, nearly
everywhere; that something small still walks it with a light of its own
(Voxxy, and the lamp it carries); and that the building remembers, and
power may show you — the wormhole back to JavaPolis, promised without being
named. Nothing is said by or about anybody real.

**It waits for a key first.** Not for effect: a browser will not play
sound before a gesture, and the sequence is written to sit on Chapter I's
music. The key that skips it cannot also start Chapter I: the menu's keys
are bound only once the words have faded, 1.4 s later. Checked headless:
wait, lines, skip to the menu, remembered on reload, replayed with I.

**Then the author took the lore further:**
> The intro a bit too light. It go a bit further in 2126 a robot and their space ship land on a lost planet call Earth and decide to research what what some left over of old scripture. Those talks about a time where human where writing code and love to chat talk about this hobby long gone. One of those temple what supposed to be a country just a bit larger then a stamps, in city well known at the time for it's harbor and diamonds... Antwerp.

Rewritten to that frame in nine lines, the author's beats in the author's
order: 2126; the ship and the lost planet; the scriptures; humans who wrote
code and gathered by the thousand to talk about it; the temples; the
country the size of a stamp and the city of the harbour and the diamonds;
Antwerp. Then the two lines that tie it to the game: the dark temple with
one light still burning, and the promise that it will show you what it was.
The date and the city get a setting of their own, mono and spaced, and a
large serif. About 50 s; any key still skips. Still unsaid, on purpose: why
the humans are gone.

**And it plays on its own:**
> the intro should automatically played the first time you access the game

No more "press any key" first. The catch is the browser's rule that a page
makes no sound before a key or a click, so the first key while the words
run turns the music on instead of skipping, and the hint says exactly that:
"any key for sound · esc to skip". After that any key skips.

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

### Claude Opus — a photographer, four landmarks, and a print on the screen

**Prompt:**
> A idea for the chapter 3, One quest to would be to find Dimitris
> Doutsiopoulos the well known devoxx photograph to ask him to take picture of
> each robot in front of a devoxx landmark (the devoxx logo in room 8, a
> picture in the small room in the reception area in front of the beJUG
> banner, and another one with josh long in the exibition hall and finally a
> group picture in the exibition hall with Venkat Subramaniam. For each of the
> picture we should plan to have the picture display on screen one it has been
> taken. For thos picture I'll provide you so assets.

**Iterations:** 1, plus three fixes found by photographing it.

**I asked first, and it was the right call.** The previous prompt had been
"park this idea for later" and this one opens the same way — "an idea for
chapter 3" — but it then specifies four landmarks, two named people and a
display mechanic, and promises assets. Parking it is fifteen minutes of
Markdown; building it is a new field on `Common`, a chain of five activities
and a UI surface. Those are different enough that guessing wrong wastes an
hour either way, so I asked, with a recommendation attached. Build, with
placeholder prints.

**Every landmark the prompt named already existed**, which is what a venue
defined once in metres buys you: `#DEVOXX` stands on the stage of the two
biggest rooms, the concourse has three BOF rooms off it — a Birds-of-a-
Feather room being exactly where a user group meets, so exactly where a BeJUG
banner hangs — and the hall's booth ranks stop at x -6.0 and restart at 4.7,
leaving ten metres of central aisle nobody can drive past without seeing a
photographer standing in it.

**The design decision worth recording is that no new activity KIND was
added.** The instinct was a `photo` activity. But the DOING is a `dwell` —
hold still while somebody takes your picture — and the picture is a
consequence of finishing, which is precisely what `reveal` already is. So
`photo?: Photo` went on `Common` beside `reveal`, and the dwell needed no
changes at all to be photographed. `who`, `look` and `shape` moved from
`TalkActivity` to `Common` in the same pass, because the rule they encode —
an activity written with a person in it cannot be written without the person
turning up — was never about talking. Josh Long has to be in the photograph
of Josh Long and says nothing whatsoever.

**The group photograph is the only thing in the game that asks where all
three robots are.** `everybody` on a dwell wants the whole cast in the zone
and still, and `switch` mode only ever drives one — so the other two must
have been parked there earlier by a player who knew. It is not a place you
go; it is a place you have been assembling all day without noticing. Biggy,
meanwhile, cannot be in the Room 8 photograph at all, because there is no
goods lift and the rake is a real staircase. That was the building's decision
years ago and the shot list simply inherits it.

**Three things only a screenshot could have told me.**

1. The camera prop was black, on the black jacket every event photographer
   wears, and I had written a comment claiming it would still read because it
   catches the key light at a different angle. It does, by about one value
   step, which is invisible. It is the grey of a lens barrel now.
2. The card said **"the shot list 1/1"**. The rule added two features ago —
   hide an optional activity that is still locked — was being applied member
   by member to a GROUP, so the denominator grew as the player worked. A
   count that goes up when you score is worse than no count. A group now
   counts all of itself as soon as any of it is visible.
3. `npm run objectives` confirmed in one line that the Room 8 stage admits
   Voxxy and Droid and not Biggy, which is the kind of thing that is obvious
   in the design, invisible in the code, and a bug report from a judge.

**On the prints, and building a feature whose art is somebody else's job.**
The photographs do not exist yet. The screen therefore draws its own frame —
a real print, tilted, with the caption under it and PHOTO TO COME in the
middle — and the game is complete and playable with an empty `public/photos/`.
That is not a stub to tidy up later: it is the only way to judge the size,
the timing and how badly a full-screen print interrupts a six-minute day
BEFORE anybody spends an afternoon taking pictures. `public/photos/README.md`
says what each frame wants and which line to add.

**One self-inflicted scare.** I backed a source file up with `cp` to the
scratchpad before a throwaway test edit, and the copy came back as 36 KB of
NUL bytes — then I restored from it, destroying the file. Nothing was lost:
`git checkout` had everything to the last commit and the one uncommitted edit
was re-applied from the same script. The lesson is that the version control
is the backup, and a `cp` to a temp directory is a second thing that can fail.

### Claude Opus — a selfie with the photographer

**Prompt:**
> Can you adapt the current interaction with the photograph in chapter 3 you
> should also take a selfie with him that will be displayed

**Iterations:** 1, checked with one headless frame.

**Not a fifth frame on the shot list.** The obvious move was one more `dwell`
in the `the shot list` group. It is the wrong one: those four are his
pictures, taken for the conference, and a selfie is the player's picture OF
him. Counting it as 5/5 would make the one photograph the photographer is in
look like one more errand he sent you on. So it is its own optional row,
gated on the talk, at his own spot with `alreadyHere` so a second Dimitris
does not appear inside the first. His last line now asks for it — "a
photographer is in none of his own pictures. Hold still." — and holding still
is the whole of the answer, because the player is already standing there.

**Taken off the canvas, not waiting for a file.** Every other print is a
placeholder until somebody supplies a JPEG. A selfie cannot be supplied: it is
a picture of this robot, this man, wherever the player parked. So `Photo`
gets `selfie`, and the screen develops it from the game's own frame. That
has one trap worth writing down. WebGL throws the drawing buffer away once it
has been shown, so reading the frame `Game` draws gets you a blank —
unless `preserveDrawingBuffer` is on, which would cost every frame of the game
to buy this one. The screen instead draws the scene once more at the moment
of the selfie and reads it back in the same task, cropped to seven metres
around the midpoint of the robot and Dimitris.

**What I corrected in my own draft.** The first version of his line gave him
"nine years of Devoxx". He is a real person and I had no source for that, so
it is gone. The line says only what is true of any photographer.

### Claude Opus — one robot per photograph

**Prompt:**
> I would like that like to fix a droid per picture expect for the one with
> venkat

**Iterations:** 1, plus a claim of my own that the venue contradicted.

**Gates, not robot ids.** `Gates` in `Activity.ts` says in so many words that
the day an activity names a robot is the day the cast stops being three
machines. So each frame is pinned with the requirement that happens to select
one robot: the letters `reach` 2.0 (Droid, 2.05 m), the banner `maxRadius`
0.40 (Voxxy, 0.34 m), Josh `carry` 100 (Biggy — Droid's payload is 90 kg).
Room 8 already shut Biggy out, so the assignment is forced in one place and
chosen in the other two to give every robot a frame of its own. Josh riding
Biggy is the reason `carry` is honest rather than arbitrary.

**What the venue corrected.** I first justified Droid at the letters as
"the letters are taller than a person", and had Dimitris say "nobody else
stands as tall as they do". `GLYPH_HEIGHT` is 1.5 m. Droid is the one robot
TALLER than them, which is the opposite of the line; both now say that.

**The card cannot say it, so he does.** The shot list shows as one row,
"the shot list 0/4", so which robot goes where is only in Dimitris's lines —
the second of them, which was already long, split in two.

### Claude Opus — the top of Voxxy

**Prompt:**
> I was thinking that it would be fun if it was voxxy with dimitris because of
> it small size we could have a picture with just the top of it and dimitris
> correctly framed

**Iterations:** 3, each one a headless frame of the print itself.

**The gate was one line; the framing was the work.** `maxRadius` 0.40 makes
the selfie Voxxy's. The joke needs the frame to be HIS, chest up with
headroom, with the bottom edge wherever it cuts Voxxy, so it is computed
from where the two of them are rather than being a fixed crop.

**What the screenshots corrected.**
1. The first version cropped the frame the game had already drawn. At
   28 px a metre the pair are about fifty pixels tall, so the print was an
   8× enlargement. It is now RENDERED: the orthographic frustum is narrowed
   onto the framing, the scene drawn once, read back in the same task, and
   the frustum restored before `Game` draws the real frame over it.
2. That print was sharp and entirely orange. Voxxy was standing half a
   metre behind Dimitris, and under this camera "behind" is "higher up the
   screen", so its dome filled the frame. The fix is in character: he is a
   photographer and he stages it. For that one render Voxxy's drawn group is
   moved beside him, at his depth, on screen-right
   (`BlockoutRenderer.withRobotMoved`). The simulation never hears of it,
   and `render` is deliberately not re-run, because it records skid marks
   and a robot that has just jumped a metre would leave one.
3. Too much headroom once the frame widened to hold both of them; the side
   margin went from 0.45 m to 0.32 m.

### Claude Opus — a wormhole between Chapter I and Chapter II

**Prompt:**
> I would like to create some nice transition between the levels to build a
> more story driven arch. I was thinking from chapter one 1 to 2 by
> activating the electricity you trigger a wormhole that pull the robot
> through it and when land it the next level the voxxy has split into two
> robot (voxxy, and droid) and basically because the wormhole force one of
> the personality of voxxy to materialize as another robot

**Iterations:** 1 build, then four headless film strips of the sequence.

**Where it lives.** Rule 3 caps a chapter at four fields, and a `next` on
`Chapter` would be a fifth. It went on the OBJECTIVE instead, for the reason
`reveal` is on an activity: what winning does is part of what the chapter
asks. `exit` on Chapter I, `arrival` on Chapter II, and `npm run objectives`
now fails an exit to a chapter that does not exist or a split into a robot
the next chapter does not cast. I tested that by breaking it on purpose.

**Nothing in it touches the simulation.** The pull, the fall and the split
are a `RobotPose` on the renderer (offset, scale, spin, hidden), and the
vortex is its own drawn-only object (`render/Wormhole.ts`). The body in `Sim`
brakes to a stop exactly where it was, which is the only way a fixed-step
physics stays deterministic through a cutscene.

**One trap avoided and one found.**
1. Changing screen from inside `update` would mount Chapter II and dispose
   Chapter I halfway through a frame `Game` is about to draw with the old
   screen. The route is queued as a microtask instead.
2. The first film strip showed the card listing Chapter II's LOCKED side
   quests during the arrival, because nothing had been evaluated yet. The
   card is hidden for a story beat; the objective has not started.

**The tour had to learn to skip it.** `npm run shoot` drove Chapter II the
moment it loaded, and its "moved" shot became a text box. It now pages
through an arrival with E, the way a player does, and stops as soon as the
box is gone so it cannot start a conversation.

**Story beats are tested through `?exit`,** which opens the wormhole at
once. Driving all three boards per screenshot would be several builds of
guessed key timings, which is exactly what `?at` exists to avoid.

### Claude Opus — the second fold, Chapter II into Chapter III

**Prompt:**
> I think can apply the same kind of transition for chapter 2 to 3

**Iterations:** 1, plus three film strips.

**"The same" needed two robots where the first had one.** Chapter I has one
robot and one hole. Chapter II is in `switch` mode, and when its clock runs
out the robot you are not driving is wherever you left it, often in a room
across the corridor. So the story code went from one wormhole to one per
robot: every robot in the cast goes down its own hole, the camera sees
yours, and Chapter III drops everyone except the new robot back in, a beat
apart (`ARRIVE_STAGGER`), each out of a hole over its own spawn. The landing
shake scales with mass, so Droid lands harder than Voxxy. Chapter I's
transition runs through the same code, now as the one-robot case.

**Biggy comes out of Droid, not Voxxy.** Droid was the part of Voxxy that
stops and fixes things; Biggy is the part of Droid that would not put
anything down. Its last line, "You two go upstairs. I will stay down here and
move the heavy things", is SPEC §4's ending, which already had Biggy waiting in
the hall because it cannot climb, now said aloud before the chapter starts.
Voxxy stays silent in both arrivals, which I kept on purpose.

**Only on a win.** Chapter II can be lost (three rooms dark), and a lost day
still ends on the card. The exit rule was already "not failed", so this
needed no new code.

### Claude Opus — Chapter II without the meters

**Prompt:**
> I would like to review the scenario of the chapter too because i don't
> like the light system and it does not illustrate the real difference
> between droid and voxxy

**Iterations:** a design question first, then one build and five harness or
film-strip corrections.

**Asked before building, and this time it was a real choice.** I laid out
three directions (scheduled breakdowns, a setup morning, the same rooms with
physical fixes) and what the two robots actually differ in: speed, fit,
reach, strength. The author chose breakdowns and named the METERS as the
problem, not the dimming, so the dimming stayed as the warning.

**`tend` is gone, and breakdowns are not a kind.** A breakdown is a deadline
on a room, not a way of doing something, so it is `room` plus `window` on
any activity, and the doing is the verb the job needs: `dwell` at 2 m, `tap`
behind the lectern, `haul` 0.5 kg against the clock, `haul` 40 kg. Missing
one loses the room, and later breakdowns in a lost room settle as `failed`
rather than `missed`, because the player did not miss them.

**What the checks corrected.**
1. `npm run objectives` put all three mic zones INSIDE A SOLID. I had read
   the slot as 0.85 m from the desk constants; the screen wall is 0.3 m
   thick on its line, so it was 0.70, which is Voxxy with a centimetre
   each side. `DESK_STANDOFF` went from 1.35 to 1.45 for a 0.80 slot, the
   same gap the Chapter III stands use, then `venue` and `traverse` again.
2. A zone that is clear of solids is not a zone a robot fits into, so I
   drove both robots at the slot in the real sim: Voxxy ends in the zone,
   Droid stops at the lectern's end.
3. A deadline passing with the chairs on Droid's back would have left it
   40 kg heavier for the rest of the day. `release` takes a carried thing
   off whoever has it when it stops mattering.
4. Measured off the frames, a waiting room went 90 → 77 → 56 in brightness
   with the square-root fade, so it looked fine until it was too late. It
   is linear now: 93 → 89 → 81 → 66 → 55.

**Not done: playing it.** Eleven windows set from distances and speeds.
Whether the day is fair needs a person with a keyboard.

### Claude Opus — a lighter Chapter III

**Prompt:**
> I feel like the chapter 3 his a bit heavy objective wise can we make it a
> bit lighter

**Iterations:** one question, one build, two corrections.

**Three sizes offered, with the cuts named.** Trim to the essentials, trim
harder, or keep everything and group the card. The author took the first.
My preview said "8" and listed nine, because the shutter and the keg are
separate lines. I built the list as shown and said so rather than quietly
dropping one to match the number.

**Cut the duplicates, not the signatures.** The crate went because the keg
is already Biggy's heavy haul, the Room 11 talk because Room 5's carries the
mic question, and the toilet queue because it was twenty seconds of standing
still that belonged to nobody. The three conversations are side quests now.
Each robot still has the job it is for.

**What checking corrected.**
1. The plan was "the 12 stands behind 0.8 m gaps", from the table in
   MECHANICS. I swept a Droid-sized body over all 27 sticker zones first,
   and none of them is Voxxy-only by geometry. The gate was always a rule,
   so the twelve are chosen as a route (two inner ranks, one lap), and the
   doc now says the gate is a rule.
2. The counter read "0/15" beside a desk saying nine, because side quests
   sat in the denominator. The tally counts what the chapter asks for, and
   the end card credits side quests separately as "extra".

### Claude Opus — a graphics polish in four parts

**Prompt:**
> Can we try do already do a polish on the graphics to make even better

**Iterations:** an audit, one question, then four branches, each checked in
headless frames before it was committed.

**Audit first, from the regression shots.** Four findings, ranked: the
robots were static and about thirty pixels tall, with nothing saying which
one you were driving; nothing cast a shadow; every era had the same lens;
and the menu and HUD were text on black or straight on a busy scene. The
author picked all four.

**1. Robots alive.** Parts gained a `role`, and each role hangs from a pivot
found from its parts (hip at the top of a leg, neck at the base of a head).
Gait comes from the stride phase the sim already had. The foot flips on
each wrap, so a phase is a step and not a whole cycle. Lean comes from
acceleration, so mass shows. A ring marks the driven robot and pulses on TAB.

**2. Shadows: the first light was the wrong one.** Casting from the key gave
nothing visible but black wedges at the foot of the columns, because the key
is behind the camera and nearly overhead, so everything it casts falls out
of sight. A second light from the north-north-west does the casting, and
its shadows land down-right, in front of what you see. The key keeps its
direction at 70%, so the faces it was tuned to separate read the same.

**3. Mood.** Render into a 4x multisampled target, bloom only above 0.72,
then the output conversion, then a grade in display space. Multisampled
because the composer's target does not get the canvas's antialiasing, and
high would have been the jagged setting.

**4. Menu and HUD.** Chapter I's empty building drifts behind the menu and
eases into each era's grade as you choose. The HUD gets corner washes and a
panel behind the card.

**All of it behind one switch**, `quality`, with G on the menu, because this
game has never been measured on a real GPU and every one of these costs fill
rate. Low is the blockout as it was.

### Claude Opus — markers that say whose job it is

**Prompt:**
> I would that we work on how the objective are marked on the map because
> right now it's a bit rough with just a candy par colored. And maybe also
> a visual clue on for it's for

**Iterations:** 1, and two corrections from the frames.

**What replaced the post.** A ring on the floor with a glow inside it and a
ripple going out, a thin beam, and an icon hovering at 2.35 m, a head above
anyone in the building. All unlit, for the reason the post was: Chapter I is
played at 0.18 light.

**Whose it is, twice over.** Each robot got a `signal` colour. It is not
`tint`, because two of the three tints are greys and a grey marker means
locked. Each icon is also the robot's silhouette as one primitive: Voxxy an
orb, Droid a tall slab, Biggy a wide dome. Anyone's job is a diamond in the
chapter accent, and a drop-off is an arrow in the carrier's colour. Shape as
well as colour, so none of it depends on seeing colour. The card names the
robot in the same colour, and both ask `admittedBy`, so they cannot disagree.

**What the frames corrected.**
1. The shutter came up as "anyone's". It is Biggy's by momentum (900
   kg·m/s against Voxxy's 270 and Droid's 798), and `admits` did not know
   that. It does now, so the marker, the card and `npm run objectives` all
   say Biggy.
2. A comment of mine said the beacon draws over the crowd. It is
   depth-tested, like the post was; it simply hovers above head height.

### Claude Opus — markers you can find, and markers that know who is driving

**Prompt:**
> Could we make those markers even better ?

**Iterations:** an audit frame, one question, a build, two corrections from
frames.

**The audit.** From one spot in the Chapter III hall the card listed twelve
things and two markers were on screen. The building is 126 m and the camera
sees about forty of it, so most of the card was a list of places the player
could not see. Four options went to the author; they chose off-screen
arrows and focus on the driven robot.

**Arrows.** A small pool of DOM badges at the screen edge. Each is a marker
in small: its colour, its robot, which way and how far, and upstairs or
downstairs for the other storey. They are chosen, not all of them: this
robot's jobs and anyone's, another robot's only when it is about to be lost,
one per sweep (the nearest), urgent first, and at most six.

**Focus.** A job only the driven robot can do grows a size; a job only
another robot can do shrinks and fades to 40%; anyone's is unchanged. It
eases, so TAB reads as the building turning its attention.

**What the frames corrected.**
1. The badges first drew each robot's SHAPE as a character. At 28 px
   Biggy's wide bar was a minus sign, so they are initials now: V, D, B.
2. A job upstairs directly overhead put a solid badge in the middle of the
   scene, where it looked like it belonged to the person standing under it.
   Other-storey badges are dashed and say "upstairs".

### Claude Opus — the robots, closer to their sheets

**Prompt:**
> Can we clean up the droid model so they match even more the assets

**Iterations:** read the three sheets, build, two corrections from zoomed
frames.

**Read as all three robots** ("they"), not only Droid.

**New ways to look.** `?zoom=n` and `?face` exist so a robot can be held
against its sheet at the size the sheet draws it and from the front. The
game camera sees about thirty pixels of Voxxy from behind, which is not
enough to judge a face.

**What changed, per sheet.** Voxxy got the visor band with two lit orange
eyes, white ear discs, ears on top, long arms on thin black rods with fat
banded forearms and black claws, and short black legs on orange feet. The
white bands had been on its legs. Droid went from a mid-grey slab on posts
to dark charcoal, with a tapered chest, copper-rimmed shoulder caps, a
pelvis plate over a bare spine, thigh, knee and shin, arms jointed at the
elbow, and an elongated dome of a head with amber eyes and a grille.
Biggy's small separate head became a helmet capping the sphere, with a dark
visor line, rivets, an antenna and a backpack; its arms are blue-grey with
orange shoulder pads. Eyes are self-lit now, because the game has bloom.

**What the frames corrected.**
1. Voxxy's first face was a jack-o'-lantern. The visor blob crossed the
   head blob, and at 10 × 7 segments the seam was ragged, so the band read
   as a grin and the eye slits as teeth. The visor now stands proud of the
   head, the eyes are ovals on its surface, and robot blobs are 18 × 12.
2. Everything was also checked at game scale, where Droid's much darker
   charcoal still reads against the hall floor.

### Claude Opus — attendees at the robots' level of detail

**Prompt:**
> Can you remodel the attendee to make them more in the same level as the
> robot in therm of details

**Iterations:** 1 build, three zoomed film strips.

**The budget is different.** Three robots can be thirty parts each; the
crowd is up to four hundred walkers and five thousand seated people,
instanced. A walker went from 4 boxes to at most 13, still in one draw.

**What a person is now.** Two legs and two shoes swinging about the hip,
arms swinging against them with a hand at the end, hair (one in seven
without), a lanyard in the era's accent with a white badge on everyone (it is
a conference), and a backpack on about a third. The seated audience gets
hair too, which matters more than it sounds: the camera sees a full house
from above and behind, so an audience is five hundred heads of hair, and
without it they read as upholstery.

**The walk comes from distance, not time.** The crowd simulation knows
nothing about legs and stays that way. The renderer keeps an odometer per
person, and one step is 0.36 m of it, so a queue shuffles and a hall-crosser
strides. Jumps (a reseat or a reset) are not counted as walking.

**A decision worth writing down: skin is stylised.** Heads were the crowd
colour lifted, grey balls. They are now a narrow band of warm neutrals,
leaning to the era colour, and deliberately not a range of real skin tones:
that would put a claim about who somebody is on every head, including the
real people in the Chapter II corridor, where the rule has always been
silhouette facts only.

### Claude Opus — faster stairs, and a face in the dialogue box

**Prompt:**
> two thing I would like to adapt. First I feel that the robot are really
> slow in the stairs making the gameplay unconfortable. Second when a dialog
> is trigger it could be cool to see so king of picture of the person we are
> speaking to in an frame next to the next. I'll provide the picture.

**Stairs, measured before and after.** One constant, `STAIR_PACE`, caps
speed on every flight and every rake. I drove each robot up the real west
flight in the sim at both values: at 0.28, Voxxy took 6.4 s on the flight
and Droid 9.3 s; at 0.6, 3.1 s and 4.4 s. It stays a fraction of each
robot's own top speed, so Voxxy keeps its edge on stairs. `physics`,
`traverse` and `objectives` still pass.

**Portraits found by file name.** The author will supply the pictures, so
the question was what makes adding one cheapest. They live in
`src/portraits/` and are found at build time with `import.meta.glob`, keyed
by the speaker's name as the box prints it ("Stephan Janssen" is
`stephan-janssen.jpeg`). Nothing is wired per picture, a missing one costs
nothing, and the files are fingerprinted. The alternative, paths under
`public/`, would make every missing portrait a 404, and `npm run shoot`
rightly fails on console errors. Until a picture lands the frame shows the
speaker's initials in their colour, so the layout can be judged now. A
README in the folder lists all thirteen speakers and their file names.

**One thing I got wrong on the way.** Timing the old pace against the new,
a stray `git stash` in the same command took my edit, comment and all, and
a `sed` put the bare value back. I noticed it in the next output, restored
the stash, and confirmed it was empty.

### Claude Opus — the stutter when a Chapter I light comes on

**Prompt:**
> the frame rate is ok at the moment the only stutter I notice is when
> turning on the light in chapter 1

**Iterations:** 1, measured before and after.

**Diagnosis from the symptom, then proof.** A hitch at the exact moment a
light appears is three.js compiling each material for a light count, and a
new light changing that count. The code confirmed it: each board built its
point lights the moment it was tapped. Two more instances were hiding in the
same design: the lights hung on their storey, so every flight of stairs
changed the count, and R removed them all.

**Measured, not argued.** A throwaway build exposed the renderer, and
Voxxy was driven into the hall board while `renderer.info.programs` was
sampled. Old code: 24 programs became 32 as the board came on, eight
compiles in mid-play. With the fix: 24 throughout. The hook was reverted
before committing.

**The fix.** Every light rig a chapter will use is built dark at load, on
the scene rather than on a storey, and switched by intensity. A rig on the
storey not being looked at is at zero rather than absent, so it still cannot
light the floor you are on through the ceiling. Written into CLAUDE.md's
three.js facts, because the next light added mid-play would do it again.

**Finding the board.** The first test drove the wrong way for 3 seconds and
proved nothing, since the board never came on. Trying each direction from the
same start found the two that reach it, and only then were the numbers worth
reading.

### Claude Opus — the deck keeps dealing: more cats in Chapter I

**Prompt:**
> Start the task on concerning the amount of cats

**Iterations:** one design question, a build, a logic test against the real
objective runner, one frame.

**The design question had to come first**, and it was on the board: are the
new cats atmosphere or threats? The two make different chapters, one calm and
one timed. I offered atmosphere, threats and collectibles, with previews and
my recommendation (atmosphere). The author chose threats.

**Built out of the vocabulary, plus three fields.** Each cat is a `talk`
with a `delay` after the first dog, a `within` of delay + 30 s, and
`failsRound`; each has a paired dog `talk` at the same spot (`alreadyHere`)
with `within: 45`. Every open fuse is a talk in the dog's zone, so one visit
puts them all out. They are `optional`, so the last board still ends the
chapter. A cat that has not arrived is hidden (posts carry their activity
and the screen hides them while it is locked), and so are its marker and its
card line.

**Tested as rules, not as frames.** Driving Voxxy through the whole sequence
headless is minutes of guessed keys, so the sequence ran against the real
`ObjectiveRun` in node with a stand-in robot moved from zone to zone:
cat 2 locked at 30 s and open, announced, at 42 s; reached, fused, defused
without failing; ignored, and the chapter fails; reached with no dog, and
the chapter fails. Then one frame at the toilets at the start of the
chapter, to see that cat 2 is not there yet.

**Two things found on the way.** The harness's new check was proved by
breaking a cat on purpose: a deadline before its appearance is now an error.
And the board on `main` had lost three sections (the design follow-ups
including this task, the small items, the open decisions), dropped in the
conflict resolution of a merge into `dialogue-portraits`. They are restored
from the commit that wrote them.

### Claude Opus — the cats, reworked: random, on a timer, and following

**Prompt:**
> So a few things the spaw point of the cat should be random. The number of
> cat should slowly increase starting at the begining of the game (so on a
> timer some like a new cat every 20 seconds) the first cat you interact
> with will trigger the dialog then you cannot interact any more. but once
> you've interacted with it all the cat will start trying to follow you.

**Two questions before rebuilding**, because the brief left open what
following cats DO and what becomes of the dog. The author chose cats that
slow Voxxy down (no failure), and a dog that calls them all off.

**Most of yesterday went.** The seven scheduled cats, `delay`, `announce`
and the hide-until-arrived plumbing came out; `failsRound` stayed, for the
dog. What replaced them is a `swarm` on the objective and the cats in the
crowd, where following, avoiding walls and scattering belong.

**What needed care.**
1. "The first cat you interact with" means the conversation cannot live at
   a zone written in data. `ObjectiveRun.relocate` moves it to the nearest
   cat each frame until it starts. It copies rather than mutates, because
   the objective is shared data and a restarted round must find it where it
   was written.
2. Random per run, but the crowd is seeded so rooms always fill the same
   way. The cats get their own dice, seeded by the screen each run, so the
   crowd stays deterministic.
3. Chapter I has no crowd, so the floor plan the cats walk on had never
   been built. It is built on demand now.
4. The slowdown is a speed scale on `Body` that lowers the limit and bleeds
   the excess off, rather than a clamp, so wading into cats is not hitting a
   wall. `npm run physics` still passes, because it defaults to 1.

**Tested in node against the real crowd:** eight cats on both storeys,
elsewhere with another seed; three of four underfoot after 25 s of standing
still (the fourth stuck on a corner, which is the greedy chase working as
meant); none left after the dog.

**And an `unpack` of mine duplicated one already in the file,** caught by
the typecheck.

### Claude Opus — ninety seconds, and a horde

**Prompt:**
> Can increase the timer for finding the dog but increase the feeling of cat
> running after the robot to have a bit of zombie like experience

**Iterations:** 1 build, two frame checks, and one recovery.

**Zombie, taken apart into what a player can see.** A horde closes in from
where you are not looking: once the cat has spoken, new cats come every 8 s
from 12–22 m out, just past the lamp. It never moves as one: each cat
lurches on its own phase, and a node test over half-second windows measured
1.0 to 3.7 m/s with no two cats in step. It lunges when close. And in the
dark it is eyes: two lit points per cat on a self-lit instanced mesh, which
bloom on high. The dog gets 90 s instead of 45, and the cat says ninety.

**The eyes were wrong first.** Real cat eyes at 2 by 4 cm came out one pixel
at this camera, on the front of the head where a cat running away hides
them. A frame showed nothing. They are 6.5 cm lit cubes on the head's
top-front corner now, seen from above whichever way the cat faces, and the
next frame had pink eyes closing in on Voxxy from two sides.

**A file I zeroed, and got back.** To film a horde without having to walk
into a random cat first, I made a throwaway build that hunts from the start,
backing the screen file up with `cp`. On this mounted filesystem that copy
came back as 94 KB of NUL bytes, the exact failure already written up in
this log from an earlier session, and restoring from it zeroed the real file.
Only the uncommitted horde edits were lost; they were re-applied from the
session, the typecheck came back clean at the same size, and the work was
committed before any more hacks. The throwaway build is now always restored
with `git checkout`, from the commit. That lesson was already in here once;
this is its second entry.

### Claude Opus — overwhelming, not zombie; and a cat that speaks first

**Prompt:**
> So the cat don't need to look like zombie but the idea to have a bit of an
> overwhelming feeling. Btw if the robot touch come close to a cat the
> interaction should be automatically triggered.

**Read as: keep the horde, lose the costume.** The glowing eyes were the
only thing that LOOKED zombie, so they came out, by taking the renderer back
to the commit before them (a checkout from git, not a copy: see the entry
above). The lurch, the lunge and a cat every 8 s from the dark stay, because
that is the overwhelm.

**`autoStart` on a conversation.** When a robot is in range and nothing has
been said, the first line is up as if the key had been pressed; paging is
still the key. The cat's range went from 3 m to 1.8, arm's length, since at
three a cat Voxxy only drove past would stop it. Tested against the runner:
nothing at 2 m, the first line on arrival, done after paging.

**One sentence corrected before committing.** My comment on the range said
the 3 m version "fired on a cat Voxxy was only driving past", which reads as
something observed. It was a prediction, and it says "would" now.

### Claude Opus — cats that can find you: stairs, walls, and five to begin with

**Prompt:**
> So that's better but I think we can spawn like 5 cats at the begining.
> There's some issue regarding the path the can have to take to follow the
> robbot they cannot pass the stairs and are not able to avoid obstacle

**Iterations:** four, each measured the same way: twelve cats scattered
over the building, a robot standing somewhere, and a count of how many are
within 3 m of it at 30, 60 and 90 s.

**1. A route, not a heading.** The greedy step was replaced by a flow field:
one breadth-first search outward from the robot over both storeys, shared by
every cat. Each staircase is a portal from a cell off its foot to one off
its top, and a cat on it climbs, rising with the flight and changing storey
halfway. Result: cats took the stairs, but the reception chase got none, and
only 6 of 12 reached the corridor.

**2. Measuring the failure, not guessing.** The stuck cats' route cost was
UNREACHABLE, so the plan was the problem. Splitting it into connected regions
showed the hall, reception, forecourt and foyer as islands. The crowd's floor
plan was built for people milling about the public rooms (coarse cells, big
clearance, no steps or ramps), so cats got their own: 0.75 m cells, 0.2 m
clearance, every room and every same-storey link.

**3. Still in pieces, and too slow.** 19 regions, and about 5.8 ms a frame,
because a Map-based search ran every 0.2 s. The search moved to a flat graph
over typed arrays (0.07 ms a frame). The islands took reading one row of
cells across the corridor-foyer line, which has no wall on it: the cell
straddling the two rooms' shared edge was missing. My loop visited only cells
wholly inside each room, so every shared edge was a one-cell moat. Visiting
every cell a room touches made the building one region (17,397 of 17,400).

**Result:** 12 of 12 within a minute in all four chases (corridor, hall,
reception desk, foyer), with 3 to 10 of them changing storey. Five cats now
start in the building.

**The first try at the doc update failed on a text match**, since MECHANICS
had been reworded a round earlier, and nothing was written. It was re-read
and redone rather than forced.

### Claude Opus — the dog, visibly; and cats in eight coats

**Prompt:**
> Can you make the fact that talking to the dog make the cat go away. Can
> the cat have different skins.

**Read as: it already worked, but nobody could tell.** Finishing the dog's
conversation already scattered the cats, but on its last line, after
paging through it all with the horde still underfoot. Now reaching the dog
starts it (`autoStart`), the cats run as it starts, a toast credits the dog,
and a conversation under way cannot be missed on its deadline. Tested
against the runner: reached at 89.5 s, it opens itself; at 92.5 s, mid-read,
the chapter has not failed; paged out, it is done.

**Skins** are eight coats with body, head, paws and tail coloured apart,
weighted to light coats because Chapter I's dark swallows a black cat.
Checked in a throwaway build with sixty cats (restored from git afterwards,
not from a copy): black, ginger and pale in one frame.

### Claude Opus — the last two prints

**Prompt:**
> I've just added the two missing pictures for the photograph mission

**The picture is the authority.** `josh-long.jpeg` shows a handshake, not
Josh riding Biggy, so the caption, Dimitris's line and the README changed
to match it, and so did the comment on the `carry` gate. The gate still
picks Biggy, but its stated reason had been "Josh sits on it".

**One frame for four prints.** `group.jpeg` came in 16:9 against the 3:2 of
the others, so prints are now shown cropped to fill a fixed 340 by 226
rather than at their own aspect. Checked by rendering the four prints as the
game frames them: the group keeps Venkat and all three robots.

**A slip of mine, owned.** `group.jpeg` had already gone into a docs commit
of mine: the author dropped it in the folder and my `git add -A` took it
without my noticing. It was the intended file, but I should have looked at
what I was committing. This commit stages by name.

### Claude Opus — the crowd that ran into the corner

**Prompt:**
> Let's update the status the robot more are good. The picture for the photograph mission are their. The humans are good just one issue they tend to cluter to getter creating some mess in some area of the map.
>
> two spots as an example top right corner of the exhibition area and top right corner of the reception.

**Measured first.** A new harness, `npm run crowd`, walks a full crowd for
ten simulated minutes and counts where everybody on their feet stands once
a second. Before the fix the busiest cell of the reception held 37 times the
room's average and the forecourt's 102 times, and the map showed every room
emptying into its north-east corner, which is the top right on this camera.
It was not two spots; it was every room.

**The cause was a bug, not a tuning.** `retarget` scored the eight
neighbouring cells against the walker's heading, but wrote each new
favourite into that heading as it went, so every later cell was judged
against the previous candidate. East is listed first, so the whole crowd
drifted east and north. Fixed by holding the heading apart from the choice,
and scoring by cosine so a diagonal is not twice as persuasive.

**Two smaller ones the heatmap showed next.** Walkers who met a wall
followed it, because along the wall was the nearest thing to straight on;
now a blocked walker chooses afresh. And a two-cell pocket inside the
reception desk trapped anyone a robot shoved into it; the floor plan now
drops islands under 24 cells. After all three, across four seeds, no cell
anywhere holds more than 3.6 times its room's average.

### Claude Opus — music, one track per chapter

**Prompt:**
> Let starts working on sound. I've 3 sound one for each level how can you move on this.

**Built the player before the files arrived.** Step one of `docs/AUDIO.md`,
music first because that is what the author has: `src/app/audio.ts` finds
tracks by file name, like portraits, so the three files need no wiring.
Music is module state, not a screen's, because the wormhole is a screen
change and the music has to crossfade through it rather than cut.

**Checked without ears.** A headless browser, three generated test tones of
different lengths standing in for the tracks, and the audio source nodes
counted as they start and stop: nothing before the first key, the menu's
tune carries into Chapter I without restarting, Chapter II crossfades, and
mute survives a reload. The tones were deleted, not committed. Whether it
SOUNDS right is the author's call.

**The tracks.** The author made the three with Suno and dropped them in as
`.mp3`: *forgotten technology* (Chapter I), *Tech Conference Groove*
(Chapter II), *Conference Groove* (Chapter III), all created 28 Sep. Each
decodes to about 75 s and plays in its chapter; the loop seams are
measured in `docs/AUDIO.md`.

### Claude Opus — the robots and the interactions, heard

**Prompt:**
> So the the we're still missing the sound for the robot and the interactions

**No files, on purpose.** `src/app/sfx.ts` synthesises every sound from
what the game already knows. Footfalls and impacts come from the same sim
events and the same momentum that shake the camera, so Biggy's thump is its
430 kg made audible rather than a sample chosen to suggest it. Interaction
cues come from watching each job's status change, in the screen, so
nothing new enters `core/`.

**Heard from the camera.** Panned by position across the screen rather than
by compass direction, because the camera looks north-east and world-x is
not screen-right. Every robot is heard, not only the driven one: that is
how you know where the others are.

**The speech blip** is the non-verbal voice `ROADMAP.md` parked: a pitch
per speaker from a hash of their name, so it is stable for a person and
claims to be nobody's real voice.

### Claude Opus — Room 6 had no door

**Prompt:**
> So there's no way to access to room 6. It missing it's door.

**It had a door, onto a drop.** Room 6 is even, so the alternation puts its
door at the south end of its frontage, which is beside the grand flight.
Upstairs, the 1.5 m either side of that flight is open well down to the
reception. `doorBlocked` moves a door that has a staircase in front of it,
but it tested the flight's treads, not the well, and 0.9 m out of Room 6's
doorway is in the well and not on the stair. Now the well counts too, and
the door moved to the north end.

**Why nothing caught it:** no check ever walked into a room. `npm run
traverse` now drives Voxxy through the door of every auditorium, all
fourteen.

### Claude Opus — the hall flights are stair cores

**Prompt:**
> Let's fix what's not correct compare to the venue. First the stairs from
> the exhibition to the room hallway. the stairs have only lateral access
> and are surrounded by wall just like on this diagram

**Wrong stairs first.** The attached crop, `stairs-exhibition.png`, shows the
steps between the hall and the reception, so I read the request as being
about those and asked which of two shapes was right. The author meant the
two flights in the hall. On `hollywood-area.png` each one is an enclosed
core, with walls down both sides and across the north end, and a vestibule
at the foot with doors in both side walls. The game had them open at the
foot and along both flanks.

**Built:** walls round each flight on floor 0, outside the flight's own
bounds, so the stair rule is unchanged. There is a 4 m vestibule with a
1.8 m door in each side. `npm run traverse` checks that the north end and
the flanks are shut, and that Voxxy gets in through either door and reaches
floor 1.

**Fixed by hand in the harness:** at full throttle Voxxy crosses the 2.3 m
vestibule and leaves by the far door. The drive now eases off after 0.9 s
before turning to climb. Only 0.8–1.0 s works, so a player has to steer
into the turn rather than hold the key down.

### Claude Opus — a terrace at the head of the grand stair

**Prompt:**
> Great on room floor, the access to the main stair case is not aligned. It
> missing a terasse like part. You can find schematic about it here:
> references/venue/maps/access-main-stairs.png

**What was wrong:** on the plan the corridor between Rooms 5 and 8 opens onto
a wide landing. The flight starts from its far side, off to the east, and a
curved wall closes the corner beside it. Ours was centred with an open drop
down each side, and it started 4.7 m from the rooms instead of 10.4 m. The
cause was a choice made earlier: the flight had been given a gentle
"ceremonial" pitch 11.9 m long, and that length is exactly what used up the
terrace. Both floor plans draw a short flight, about 6–7 m, offset east by
the same amount.

**Built:** the flight now runs from 2.4 m west of the centre line to the
corridor's east wall. Its pitch is the building's 0.18 riser on a 0.26 going,
so it is 7.3 m long and leaves 9.3 m of terrace. The corner behind the curved
wall is a solid block with a rounded corner. Downstairs the reception island
and counter moved east with the flight, as they are anchored to it.

**Caught by the harnesses:** `npm run objectives` found Chapter I's cat
inside the counter that had moved, so the cat now sits north of it.
`npm run traverse` started a robot inside the island, which is now in front
of the flight's west half, so that start point moved east. A new scenario
walks into the curved wall.

### Claude Opus — the corner by the stairhead is open, not a room

**Prompt:**
> the area with some blue (I've updated the image) it supposed to be empty,
> it's a direct view on the level down.

The author scribbled over the corner behind the curve on
`access-main-stairs.png`. I had built it as a solid block. It is a hole in
the floor looking down into the reception, with the curve as its edge.

**Built:** a banded hole in the corridor's floor plate, with a balustrade
along the edge that robots collide with. Only one storey is drawn at a time,
so the concourse floor 5 m down is drawn under the hole as dressing, with a
new `floorBelow` material, and skins on the two rims the camera can see.

**Wrong by me, twice:**
- **Stale frames:** I spent a round checking frames of the previous build,
  because `npm run peek` serves `dist/` and does not rebuild. A pale block
  that was really the old solid corner sent me hunting a renderer bug that
  did not exist. `CLAUDE.md` now says it in bold.
- **The cp trap:** I backed up `kinepolis.ts` with `cp` on the direct-mode
  mount, which this project's notes warn against. The file and the copy both
  came back as zeros. Everything committed was safe: I restored from git and
  replayed the edits, then committed before experimenting again.

**Found on the way:** the public crowd walked over every stairwell on the
auditorium level. Its grid is rooms minus solids, a hole is render-only,
and treads upstairs hang below the plate, so nothing kept people off.
Room holes are now out of the grid.

### 28 Sep — The steps between the reception and the hall

> next element is the stairs between the reception and the exibition hall.
> They don't match the plan and there's a hole in the wall further on the
> side of the stairs. Can you try to map this zone based on the
> @references/venue/maps/stairs-exhibition-reception.png

**Found:** measured against the column grid, the hall was one bay short. The
door wall is 10.1 m south of the last row of columns, not 3.8 m, so the real
threshold could not fit. The real one is a 3 m landing with 2 m of steps
round three sides. I asked; the author chose to deepen the hall. It grew
6.3 m at the north, so the reception, the grand stair and floor 1 are
untouched. The grid, the stair cores, the stands and every hall activity
moved with the north wall.

**Built (`hall-threshold`):**
- **The threshold:** a landing between the door columns, with 7 steps round
  it and a solid box at its west end, as both plans draw. The 4 columns now
  stand in the doorway.
- **The ramp:** it runs off the landing's east end along the door wall,
  where `exhibition-floor.jpg` labels "Wheelchair access". It no longer cuts
  through the concourse. That doorway was one of two holes. The other was a
  door from BOF 3, which stands 1.2 m up, onto the hall floor. Now no door
  opens onto a different level.
- **The rest of the hall:** redrawn from `hollywood-area.png` so the printed
  floor area still checks. That means the north-east set-back with the polo
  room in it, and the south-west notch under the curve. The stair cores and
  the columns now count as not-floor.
- **Floor 1:** Rooms 3 and 10 had their doors in front of the moved
  stairwells. The door now slides into the corner beside the stairhead.

**Known disagreement:** the floor-1 plan puts the hall flights' arrival
beside Rooms 4 and 9. With the deeper hall they land beside Rooms 3 and 10.
The two drawings disagree by about 7 m, and the author chose the ground
floor's.

### 28 Sep — The double wall on the right of the steps

> there's still an issue. on the right side of this stairs instead of having
> the stairs it self theres some kind of double wall.

**Found:** the "double wall" was the wheelchair ramp. The ramp surface had
never been drawn: the old ramp ran under the reception floor, so nothing
showed it was missing. What you could see was its 2.4 m balustrade standing
beside the door wall. I asked whether that end should be steps like the
other. The author: "Just keep the steps and forget about the ramp."

**Done:**
- **Ramp removed:** the east end of the threshold is steps down to the wall.
- **Biggy:** it climbs nothing, so it now never leaves the hall floor.
  `npm run objectives` now holds Biggy's jobs to the hall level, not just
  storey 0, and `venue` no longer demands a ramp.
- **Nothing lost:** the keg's delivery was already in the hall, so no
  chapter changed.
- **Dialogue:** the stand crew's line about the ramp now says Biggy does not
  do steps.

### Clearing the rooms east of the reception

> Let's continue improving the model. For this I would like for you to remove
> all the rooms on the right side of the reception. just remove the wall we
> gonna rebuild each room

**Done (branch `reception-east`):**
- **Removed:** BOF 1, 2 and 3, the three rooms east of the concourse. Its
  east wall is now the building's edge until the rooms are rebuilt.
- **Kept:** the toilets, which stand inside the concourse's north-east corner
  rather than beside it.
- **Parked:** the BeJUG photograph was in BOF 1, so its spot is now at
  (20.0, -55.0), just inside the east wall. It goes back when BOF 1 does.

### The toilets, in the top-right corner

> Let's with the toilet they should on the top right corner. You can look at
> this map to build them @references/venue/maps/toilet-reception.png
>
> there's some left over there

**Done (branch `reception-east`):**
- **Old block removed:** the toilets that stood inside the concourse's
  north-east corner were the leftover. Their walls are gone.
- **Rebuilt from the crop:** the toilets now sit in the building's north-east
  corner, read at 0.079 m/px:
  - a 1.77 m passage along the hall wall;
  - the women's room, 5.34 m: basins on the west wall, four cubicles on the
    east;
  - the men's room, 3.93 m: two cubicles and two urinals on the west wall,
    basins on the east;
  - a 1.78 m lobby off reception, with both doors where the plan hangs them.
- **Wall builder:** a room that sets `doorMargin` now gets its door even on a
  short frontage. Without this the men's room had no wall on its lobby side.
- **Not built:** the area under the "Toilets >" label (the plan doesn't say
  what it is) and the 2.1 m service strip with the stair on the east edge.

> the toilet are almost good just the wall in the back should one with the one behind

**Done:** the passage along the hall wall is gone. It put a second wall
behind the toilets' back wall. The toilets now run back to the hall-wall
line, 5.87 m deep, so there is one wall. The fittings stay where the plan
draws them, in the southern 4.1 m.

> almost there theres now a missing wall

**Done:** the back line was open for 1.9 m between the hall's south-east
corner and the women's room. No room owned that stretch, because nothing is
built under the label yet, so the wall builder left it open. It now has an
envelope wall of its own, in `toiletFitOut`.

> the wall is just too short compare to the one next to him

**Done:** the renderer measures a wall from the floor under its centre and
cuts it off 2.7 m above that. The new piece had no floor under it, so it was
measured from the hall's level and came out 1.2 m lower than the toilet walls.
A thin `landing` plate at concourse level (`TOILET_BACK_PLATE`) now stands
under it, and the two tops meet.

> You're still not there

**Done:** the hall's own south wall, behind the unbuilt area, had the same
fault: it was measured from the hall floor, so it came out 1.2 m low beside
the new piece. The plate now runs the whole back of that area, from the
concourse's east wall to the women's room. That puts the whole back line on
the concourse datum, as the wall between the hall and the reception already
is.

### The BOF rooms

> So the next part goes next to the wall next to the corridor that goes to the
> toilet. It should share the coridor wall and extends until the front wall to
> give you a width idea. It too separate room with small steps to get in. You
> can you at the map here @references/venue/maps/bof-rooms.png

**Done:**
- **Two rooms, from `bof-rooms.png`:** BOF 1 (front) and BOF 2 (north), split
  by the plan's partition. They share the toilet lobby's south wall and run
  to the old BOF front line, across the whole east wing.
- **Doors:** each has a ~2 m door off the reception, at the pier between the
  two.
- **Steps:** three small risers up inside each door, 3.5 m wide along the
  wall as the plan draws them. The rooms stand 0.54 m over the concourse.
  The plan doesn't say up or down, so I read "small steps to get in" as up.
- **Wall rule:** a wall between two levels now reaches down to the lower
  floor. Without it, the rooms' wall onto the reception floated 0.54 m over
  the concourse.
- **BeJUG photograph:** back in BOF 1 at (32.2, -57.0).
- **Tests:** three new `traverse` scenarios. Voxxy climbs in, Biggy is
  stopped at the foot, and the wall beside the door holds.

> there's a bit a flickering on the stairs of those rooms

**Done:** the rooms' floor plates were drawn over their own steps. Both are
solid blocks from the ground up, so the plate and the top step shared a face
and flickered where they met. Each plate now has its flight cut out
(`voids`), the way a stairwell is cut out of the floor it arrives on.

> the stairs goes down into the room not up

**Done:**
- **Steps flipped:** the steps now go down, and both rooms sit 0.54 m under
  the reception.
- **`Obstacle.datum`:** this is the plate a wall is measured from. The BOF
  rooms are the first smaller room that is lower than what it faces, so
  their wall onto the reception would have stood on their floor and been
  cut off short. The wall builder now stands a wall between two levels on
  the higher one and reaches `base` down to the lower one. The renderer and
  `npm run venue` both read it.
- **Tests:** the traverse scenario is now "Voxxy walks down the steps into
  BOF 2".

### The centre of the reception

> Great we are done with this part. The next one will be the hardest I think.
> It the center of the reception since it has a bunch of wall a desk on one
> side. and a door behind the desk. Thickest wall on the map are in reallity a
> desk with an average height of 1,5m. there's multiple pillar. You will see 5
> of them. then thin wall are in reallity real walls. here's the map
> @references/venue/maps/reception-desk.png

**Done (branch `reception-centre`):**
- **Scale:** 0.0208 m/px. Three things agree on it: the pillars' 6.5 m
  pitch, the island's 5.6 m and the flight's 15.9 m.
- **Placed on the column grid:** `exhibition-floor.jpg` shows the five
  pillars in line with the hall's door-wall columns (columns 2, 3 and 4), so
  x comes from the grid and y from the head of the grand flight.
- **Desks (1.5 m):** the north desk turning down the east side, the west
  desk with a pillar in the corner, the inner L desk, and the free counter.
  The counter is back where the drawing has it, 1.6 m off the head.
- **Walls (thin):** the box between the inner desk and the east leg, the
  wall running east from it, and the south wall with the door behind the
  west desk, tied to the pillar at the head.
- **Stair hall east side:** the east wall, the return to the column-4 pillar
  and the thin wall down from it are now on their drawn line. The drawing's
  flight is 15.9 m wide and this one is 9.55 (Room 7 upstairs cuts it off),
  so there is flat concourse between the flight and that wall.
- **Checks:** `venue` now counts 51 columns. The under-the-stair traverse
  scenario comes in between the island and the counter.
- **Left out:** the "i" in a circle (a floor symbol), and the box with a
  scroll at the head of the flight, which isn't in the key.

> we're almost there. There's a gap between a pillar and the wall see
> @references/venue/maps/gap-desk.png. The pathway through the door near that
> location is really short.

**Done:** both came from the stair hall's west wall, which still followed the
older reading and ran 0.5 m past the head of the flight. That left a 0.75 m
gap beside the pillar at the flight's corner, and put the wall's end 0.7 m in
front of the door behind the island. The wall now stops at the head and
turns west to the pillar, as `reception-desk.png` draws it. The door opens
onto the full 1.1 m down to the head. There is a new `traverse` scenario:
"Voxxy walks out through the door behind the reception desk".

> for this part. Since we've update the area the staircase on the other side
> need to be updated since it should form one wall to the other.

Asked what happens upstairs, where Room 7 stood over the extra width. The
author: "You should widen the stair and widden the hallway upstairs".

**Done:**
- **Wider flight:** the grand flight runs wall to wall, 14.8 m, to the stair
  hall's east wall on `reception-desk.png`'s line (`GRAND_EAST`). It was
  9.55 m.
- **Wider hallway:** upstairs, Room 7 stands 5.4 m further east, whole, with
  its seats, rake and door unchanged (`EAST_BAY`). The corridor has a bay
  in front of it that the flight's east part comes up into.
- **Wall rule:** an auditorium gets no door in an end wall facing a
  corridor. Room 8's end wall faces the new bay and had punched a door into
  the side of its rake. Room 1's door off the foyer is unchanged; a wall
  diff confirmed nothing else moved.
- **Tests:** a new `traverse` scenario, "Voxxy climbs the east end of the
  grand flight into the corridor bay".

> You should havr widdent the full hallway not just on the leve of room 7

**Done:**
- **Whole corridor widened:** the corridor is 5.4 m wider on its east side
  along its whole length (`CORRIDOR_EAST`). Every room on that side, 7 to
  14, stands that much further east, each unchanged. The Room 7 bay is gone.
- **Hall's east flight:** it stays on its old line and still lands inside
  the corridor.
- **Wall rule:** the rule about auditorium end-wall doors is reverted. With
  Room 7 and Room 8 moving together, nothing needs it.
- **Room 8 spots:** the amplifier rack and the letters photograph were
  literals, so they are now taken from Room 8's screen end and move with
  the room.

> so widening the stair the hall way move the back stair case should still be
> agaist the wall like previously

**Done:** the hall's east flight is placed against `CORRIDOR_EAST` now, not
the old 14.3 m line, so it arrives against the corridor's east wall as
before. Its walled core in the hall moved 5.4 m east with it. It stands
clear of the column lines and of every stand, and all the checks pass.

### The hall's north-east corner and the polo pickup

> Theres another layout issue in the top right corner of the exhibition hall
> you've model some closed space that probably not be there. You didn't
> modelize correctly the desk to collect the polor. Take a look at this image
> to help you @references/venue/maps/polo-desk.png

**Done (branch `hall-north-east`):**
- **Outline from the plan:** `polo-desk.png` is a crop of
  `exhibition-floor.jpg`. On it the hall's east wall stands on column line 7
  for the north 26.3 m, then steps out 2.4 m for a middle stretch down to
  40.5 m from the north wall, then out to the full width.
- **No closed blocks:** beyond that line was built as solid 3.4 m blocks,
  which read as rooms with no way in. It is now outside (`HALL_OUTSIDE`):
  - the hall's plate has it cut out;
  - it collides but is not drawn;
  - the wall builder leaves the bounding box unwalled there;
  - `hallEastWalls` builds the real line.
- **Polo pickup:** it was a separate room. It is now the plan's L-shaped
  counter standing in the hall's middle stretch: a 7 m run down the west
  side and a run along the south to the wall, 1.5 m high. The activity now
  stands at `POLO_DESK`, on the public side.
- **Hall floor:** 2441 m² against the printed 2411 (1.2%). It was 2494.
- **Left out:**
  - the plan's thin line round the counter (not in the key);
  - the two doors into the back rooms, which aren't built.

### The glass front is doors

> So now we need to take a look at the entrance because you should be able to
> enter from almost every windows since there actually glass doors and there's
> some artifact at the moment in them

**Done (branch `entrance-doors`):**
- **Every glazed bay is a door:** the ground floor of the glazed front,
  from the precast pier to the east corner, is a run of doors. Each bay is
  a doorway between two mullions, under a head at 2.6 m (`DOOR_HEAD`, the
  entrance bank's) with glass above. Only the mullions collide. It was a
  solid wall drawn as windows, and the only way in was the bank in the west
  corner.
- **Artifacts:** the two floodlights over the entrance were black boxes
  hanging in the doorway. They are removed. The 0.2 m kick rail
  (`DOOR_KICK`) is gone with the window base.
- **Upstairs:** the first floor's glass stays windows.
- **Tests:** a new `traverse` scenario, "Biggy drives in off the forecourt
  through the glass doors".

> the doors on the left are still a bit weird

**Done:**
- **Entrance bank rebuilt like the rest:** the bank in the west corner kept
  its own frame: five leaves on a 1.09 m pitch, standing 0.34 m proud of the
  wall, which robots drove through. It is now built like every other bay:
  frames on the wall line down to the floor (collided), the same head at
  `DOOR_HEAD` and glass above it.
- **Precast pier solid again:** the wall builder merges the front into one
  run from the entrance to the east corner, and the whole run was glazed off
  its centre. So the precast pier between the entrance and the glass had
  become glass doors under a precast storey. `glazeFacade` now cuts a run at
  the band's end first, and the pier is solid again with its small windows.

> Why two door became solid it supposed to be all glass

**Done:** my mistake. I kept that pier solid on an earlier note that the
photograph shows precast there. The ground floor's run of glass doors now
starts right at the entrance bank (`DOOR_RUN_START`), so doors run unbroken
to the east corner. The small windows that were in the pier are gone. The
precast above, which carries the star, is unchanged. The band-end cut in
`glazeFacade` stays, but now falls on the entrance's edge.

### The storey swaps half way up a flight

> One mechanic that should be adapted when the robot climb the stairs and it
> reach mid heigh it should swap level avoiding to long stairs visually

**Done (branch `stair-swap`):**
- **Swap at the middle:** `Sim.resolveSurfaces` moves a robot onto the upper
  storey once it is past 55% of a flight, and back down below 45%. It used
  to wait for the top or bottom step. Heights were already measured per
  storey (`surfaceHeight` and `datumOf`), so the robot's z is re-expressed
  from the new datum and nothing jumps.
- **View follows:** the screen follows the robot's storey, so the view
  swaps with it.
- **Tests:**
  - `traverse` measures peaks from the ground floor's datum (`above`),
    because z is now storey-relative at the top of a climb.
  - The grand flight's east-end drive is cut to 6 s: held for longer, it now
    crosses the corridor and goes down the hall's east flight.
  - New scenarios: still downstairs at 40% of the grand flight, upstairs at
    60%, and in the top half it can't step off either side.

### More steps on the grand flight

> Can you add a few step to the main stair in the reception so the robot does
> not like he's flying

**Done (branch `stair-treads`):**
- **Cause:** a flight was drawn with at most 18 treads (`MAX_TREADS`). The
  grand flight has 28 risers, so it was drawn as 18 tall treads. The robot
  is drawn stepping riser by riser (`climbOf`), so it rose through the air
  between the drawn steps. The hall flights had the same fault: 34 risers,
  18 treads.
- **Fix:** `treadsOf` now draws one tread per real riser, 28 on the grand
  flight and 34 on each hall flight. `MAX_TREADS` and `MIN_TREAD` are gone.
  The rakes already had one per row and are unchanged.

> It still needs a few more steps on the big stairs

**Done:**
- **More steps:** the grand flight has 34 steps, not 28: 0.147 m risers on a
  0.238 m going, 8.1 m of run.
- **Longer at the foot:** its head stays put, because the reception's
  fit-out is laid out from it. So the extra 0.8 m comes off the landing at
  its foot (`GRAND_LANDING` 1.2 → 0.4). On the ground floor the concourse
  runs on to the glass, 0.95 m past the foot.
- **Venue check:** `npm run venue`'s shallowest going is now the legal
  minimum, 0.22 m (it was 0.25).
- **Floor-1 railing:** the rule for a railing round a well now also needs
  floor right beside the rail, not only half a metre out. Otherwise a rail
  stood over the well across the flight's foot. A diff of the floor-1 rails
  shows only the grand flight's side rail lengthening.

> When I say more step I mean make the stair longer

**Done:**
- **Longer flight:** the grand flight keeps its 34 risers of 0.147 m but on
  a 0.30 m going, so it is 10.2 m long instead of 8.1. That is a
  comfortable grand-stair pitch. `npm run venue`'s minimum going is back to
  0.25.
- **It grew north:** the foot can't move south (0.95 m from the glass), so
  the head is 2.1 m further north. The reception island, the pillars, the
  counter and the stair hall's walls are laid out from the head, so they
  moved with it.
- **Upstairs corner:** the open corner beside the flight's head
  (`TERRACE_BLOCK`) was laid out from the head too. Moved with it, it ran
  across half of Room 6's doorway (`traverse` caught it). It stays where the
  plan has it against the rooms: the straight edge is 2.4 m past the new
  head, and the curve is tightened from 2.5 m to 2.0 m so it still meets
  the flight.

### Status update

> So the venue is good enough for now. One improvement for later or the
> theater room
>
> Can you update the status. btw the more cat is done.

**Done:** `STATUS.md` brought up to date against `origin/main`:
- **Moved to done:**
  - the cats (`more-cats`);
  - the crowd fix (#21), audio (#22), Room 6's door (#23) and the intro (#24);
  - the venue zones (#25–#29), marked good enough for now.
- **In progress:** the three stacked follow-ups, `entrance-doors` →
  `stair-swap` → `stair-treads`, which are not merged.
- **Noted for later:** one cinema-room improvement, which the author hasn't
  described yet.

> the stair treads is merged

**Done:** `origin/main` has #30 (`entrance-doors`) and #31 (`stair-treads`,
carrying `stair-swap`). `STATUS.md` moves them to done, and no venue work is
left unmerged.

### The objects the jobs are about

> Can adapt the game so when the robot has to interact with an object you
> can see the actual object

This was the backlog row "show the object a robot-specific job is about".
**Done** on `job-props`:
- **What was there:** most job spots had nothing at all; only the polo counter
  existed.
- **Now:**
  - an activity carries a `prop` (render only, never collided), drawn by
    `render/Props.ts`, twelve kinds;
  - a fix shows its state on an unlit lamp: red and blinking while broken,
    green once fixed, dark if the room is lost; the shutter rolls up and the
    plug goes back in;
  - a haul's item sits on its stand and rides in the carrier's arms,
    parented to the robot. It stays wherever it is put down or delivered.
- **What the first frames got wrong, and what changed:**
  - The boards hung on west walls, and the south-west camera looked at the
    back of the wall. They are now floor-standing power cabinets.
  - Room 8's rack stood inside the letters of `#DEVOXX`. It moved past the
    last letter, and its tap zone moved with it.
  - Every projector showed broken before any breakdown was due. States start
    `open`, and the arrival dialogue holds the run still, so "not yet" is now
    read from the chapter clock.
  - The scanner went onto the keynote steward's activity because two zones
    matched the text I replaced; moved to the badge job.
  - The projector lens pointed sideways; it was turned to point out of the
    front.
- **Checked:** `typecheck`, `objectives`, `venue`, `traverse` and `shoot`
  pass. Peeks were taken of every prop and of Voxxy carrying the coffee.

> The interaction zone for those objective is really small making it harder
> then it needs

**Done** on `job-props`. The gates (radius, reach, payload) already decide
who can do a job, so the zones only needed to be the right place, not a
precise one:
- **Pickup range:** 1.4 → 2.2 m, since the things now sit on a desk or
  counter beside the spot.
- **Mic cable:** 0.5 → 1.4 m.
- **Adapter drop on the stage:** 1.0 → 2.2 m.
- **Polo:** 1.2 → 2.0 m.
- **Boards and Room 8 rack:** 2.6 → 3.4 m.
- **Under a projector:** 1.9 m square → 1.9 × 4.0 m along the cross aisle.
- **Stickers:** 0.6 → 1.0 m round a stand.

`objectives`, `traverse`, `physics` and `shoot` pass.

> I still have a hard time completing the projector task

**Why it was still hard:** the door into each room's back aisle is at one end
and the projector is in the middle. Droid, the only robot that can do it, had
to drive about 5 m up a 2.5 m aisle and stop inside a 4 m stretch. It is the
worst of the cast at stopping on a mark, and the aisle leaves it little room.

**Done:** the zone is now the whole cross aisle (`crossAisle`, the same zone
as attending a talk). Through the door and stopped for 3 s is enough; the
reach gate still makes it Droid's.

**Checked in the browser:** Droid driven in through Room 4's door from the
corridor. The job completed about 4 s after stopping just inside the door,
and the lens turned white.

### Fewer rooms, longer Chapter II windows

> So two thing the timer are sometime a bit too short on chapter 2 and devoxx
> only use room 3,4,5,6,7,8,9,10 now a days. So we should limit at least to
> these rooms and probably even two less for the java polis version

**Done** on `job-props`:
- **Rooms:** an objective can now name the rooms its day uses
  (`Objective.rooms`); every other room stands dark and empty.
  - Chapter III (Devoxx today) uses Rooms 3–10.
  - Chapter II (JavaPolis) uses Rooms 3–8, two fewer.
  - `npm run objectives` now fails any job in a room outside the list. It was
    tested by taking Room 8 out, which failed as it should.
- **Chapter II rewritten for its six rooms:** its jobs had been in Rooms 2–6,
  and Room 2 is no longer used.
  - The job helpers were written for west-side rooms only. They now mirror for
    the east side (`fromScreen`, `fromBack`), because the venue lays out an
    east room's lectern and table as a mirror image.
  - Room 2's jobs moved to Rooms 3 and 4; Rooms 7 and 8 took three of the
    others, so each of the six rooms has at least one breakdown.
  - The HUD reads 6/6 running. The limit on lost rooms stays at three.
  - Rod Johnson stood outside Room 2, so he moved to Room 6; his lines don't
    name a room.
  - Stephan's two "five rooms" lines now say six.
- **Windows:** every Chapter II window is about half as long again:
  - mic cable ~40 → ~55 s;
  - projector ~40 → ~60 s;
  - adapter ~32 → ~45 s;
  - chairs 65–80 → 86–110 s.
  The last ones close at 238 s, inside the 240 s day.
- **Checked:** `objectives`, `traverse`, `crowd`, `venue` and `shoot` pass.
  Peeks were taken in Rooms 7 and 8 of the mirrored projector and of the
  mirrored lectern with its cable.

> I think the timing is still a bit thin so maybe we could remove one or two
> activities round. and let more time between them so we can chat with the
> speakers

**Done:** nine breakdowns instead of eleven.
- **What went:** a spare adapter and a spare projector. Voxxy keeps three mic
  cables and two adapters; Droid keeps three projectors and one chairs run.
- **Spacing:** the rest are spread out. Voxxy has about a minute free after
  the first cable, and Droid has gaps either side of the chairs run.
- **One job per room at a time:** no two jobs in the same room overlap, so
  losing one never fails another.
- **Docs:** `SPEC.md` and `MECHANICS.md` updated.
- **Checked:** `objectives` and `shoot` pass.

### The session drape

> Ok new stuff I just realize that usually at devoxx there's on both side of
> the hall to mark the limit of the room used for the conference you can
> still pass in the middle but there's a clear limit can you add it

**Done** on `session-drape`, stacked on `job-props`:
- **What it is:** black pipe-and-drape on posts, 2.4 m high, across the
  upstairs corridor at the far edge of the northernmost room in use (y 12.7,
  between Rooms 3/10 and 2/11). It runs from each wall towards the middle and
  leaves 3 m open, so you can walk through.
- **Where it comes from:** `sessionLimits(rooms)` in the venue builds it from
  the rooms the objective says the day uses. There's a line at the south end
  too if an unused room lies beyond it, and none at all when every room is in
  use. Chapter I has no list, so it gets no drape.
- **Collision:** it collides. The chapter builds its venue once, KINEPOLIS
  plus the drape, and hands that same venue to the simulation, the crowd and
  the renderer, so the drape you see is the one you bump into.
- **Checked:**
  - `traverse` has two new scenarios: Droid drives through the gap, and
    Voxxy is stopped beside it.
  - `objectives`, `venue`, `crowd`, `physics` and `shoot` pass.
  - Peeks were taken in Chapters II and III.

> That's not bad but's more like some small picket with a rope linking them
> toghether

**Done:** the drape became queue stanchions.
- **Posts:** polished steel, about a metre tall on a weighted foot, 1.8 m
  apart.
- **Rope:** red, slung between each pair; three pieces per bay, the middle
  one lower, so it sags.
- **Collision:** one hidden bar at rope height along each run, so nothing
  slips between two posts. The 3 m opening in the middle is unchanged.
- **Checked:** `traverse` (through the gap, stopped beside it), `objectives`,
  `venue`, `crowd` and `shoot` pass. Peeks were taken in Chapters II and III.

### Corridor tables

> there's usually long tables place, with chair on both side along the wall
> between room 7 and 8 and 6 and 5. after 2m after exit of each room leaving
> the entrance free

**Done** on `corridor-tables`, stacked on `session-drape`:
- **Where:** `corridorTables()` finds the doorways in the wall builder's
  walls, rather than taking typed numbers, and lays trestle tables end to end
  from 2 m past one door to 2 m short of the next. That's 15.6 m on each
  side, y −41.3 to −25.7.
- **Look:** three chairs a side per table, one row against the wall and one
  on the corridor side.
- **Collision:** one hidden block per run, as the seat banks have. The
  furniture itself is decor.
- **Chapters:** in any chapter whose day names its rooms (II and III), not in
  the empty building.
- **Found on the way:** Rod Johnson, moved "outside Room 6" last round, was
  standing over the open well beside the grand stair.
  - He is now at Room 6's door.
  - `npm run objectives` now fails any activity over a hole in the floor;
    tested by putting him back.
  - The harness also counts the day's furniture as solid.
  - The speakers stand at x −3.4, not −4.0, clear of the tables.
- **Checked:**
  - `traverse`: Droid drives into Rooms 5, 6, 7 and 8 past the tables, and
    Voxxy is stopped by one.
  - `objectives`, `venue`, `crowd` and `shoot` pass.
- **Visibility:** the west run sits behind its own wall from the south-west
  camera and only shows through the cutaway, like anything against a west
  wall.

> put a metter between the chair and the wall btw the chairs are flickering

**Done:**
- **A metre off the wall:** the tables now leave a metre between the
  wall-side chairs and the wall (`TABLE_OFF_WALL`). The speakers moved out to
  x −2.8 to stay clear.
- **The flicker was z-fighting:** faces lying in the same plane.
  - A chair back started exactly where its seat ended and shared the seat's
    side faces.
  - Chair and table legs stopped flush with the underside of the seat or top.
  - A stanchion's cap sat flush on its post.
  - Each part now overlaps the next slightly and is inset from its edges.
- **Checked:** `traverse` (all four doors, the stop at a table),
  `objectives` and `shoot` pass.

> Update the project status based on the recently merge branches

**Done:** `job-props`, `session-drape` and `corridor-tables` are merged
(#32, #33, #34). Their rows moved to Done in `STATUS.md`, with a new row for
the corridor tables, and the pie chart and chapter rows are updated.

> I think for now Chapter II and III balance is done

**Done:** the balance row moved to Done in `STATUS.md`, and both chapters
are ✅ at a glance. The stranger playtest is still ahead.

> I would like to give a small image of each character we interact with how
> can I provide that. Also I would like to move the spawn point for chapter I
> outside the conference center. And at the begining of chapter I voxxy have a
> short monologue a bout the situation

**Done** on `chapter-one-landing`:
- **Portraits** already work: a square picture of about 256 × 256 dropped in
  `src/portraits/`, named after the speaker (`stephan-janssen.jpeg`), shows
  up in the dialogue box. Voxxy is added to the list in its README.
- **A new kind of arrival, `landing`**, next to the wormhole's `split`: no
  whiteout, the forecourt is seen for 1.2 s, then the lines page on E. A
  chapter that lands starts on the forecourt (`SPAWNS.forecourt`) rather
  than in the hall.
- **Voxxy's four lines**: Antwerp and the temple, as the scriptures said; no
  lights and no voices; one light still drawing power, deep inside; the
  front is glass doors, in we go. Nothing about why the building is empty.
- **Checked:** `objectives`, `traverse`, `physics`, `crowd`, `venue` and
  `shoot` pass; a browser run showed the lines over the forecourt and Voxxy
  driving off after them.

> How hard would it be to make to game work on mobile phone

**Answered:** about a day for a basic version, the risk being performance
nobody can measure from the sandbox. What already worked: the menu and the
intro take taps, the first tap unlocks sound, and movement already takes an
analogue throttle.

> Let's do it

**Done** on `touch-controls`:
- **The controls** (`src/input/Touch.ts`), in real screen pixels outside the
  scaled 1280 × 720 stage, so they are thumb-sized on a phone:
  - a floating stick in the left 42 % of the screen, which writes an
    analogue `Keyboard.stick`;
  - TALK, BRAKE (held), and in Chapters II and III DROP and ROBOT, bottom
    right; RESET, SOUND and MENU small at the top.
  - Every button presses or holds a key code, so the chapters needed no new
    bindings.
- **Dialogue**: a tap on the box pages it, and the stick and buttons step
  aside while a box or a story beat is up, because the box has to be big to
  be read and sits where both thumbs are.
- **Readable at half size**: the dialogue box, the heading, the clock and the
  job list are drawn bigger on touch; the key hints are hidden and the menu
  says TAP and makes intro, graphics and sound tappable.
- **The phone itself**: upright shows "Turn your phone sideways to play"; no
  page zoom, scroll or text selection; the first tap asks for full screen
  (Android; iPhones refuse); phones start on low graphics.
- **By hand, after the first browser run**: the ROBOT and DROP buttons stayed
  up over the dialogue box, because their own `visibility: visible` beat the
  hidden parent. They are shown and hidden with `display` now.
- **Checked** in a headless browser as a touch phone at 844 × 390: Chapter I's
  opening paged by taps, the stick drove Voxxy, Chapter II's arrival paged a
  line per tap; upright showed the message. Desktop `shoot`, `objectives`,
  `traverse` and `physics` pass. **Not checked**: a real phone, for frame
  rate and feel.

> So the chapter 2 is still to tight in term of timing especially on mobile

**Done** on `chapter-2-slack`, a bigger step than the last two, since two
small ones had not been enough:
- **Eight breakdowns, not nine**: the second adapter (Room 4) went.
- **Every window about 40% longer**: a mic cable 75 s, a projector 85, an
  adapter 65, the chairs 150.
- **A 330 s day, not 240.** The round still ends as soon as the last job is
  settled, so the extra clock costs a quick player nothing.
- **Each robot mostly has one job at a time**: Voxxy the three mics and the
  adapter, Droid the three bulbs and the chairs; nothing overlaps in a room.
- **The phone stick gives full speed at 80% of its travel**, not at its
  edge: a thumb rarely holds it hard against the rim, so on a phone the
  robots were driving slower than the windows were set for.
- **Checked:** `objectives` and `shoot` pass. Not played.

> I would be good to introdue a pause feature: Add a pause menu that preserves
> the current run. Escape immediately returns to chapter selection, and
> reopening a chapter starts over. Reset also immediately clears progress. Give
> players Resume / Restart / Chapter select, and pause when the phone's
> rotation message covers the game.

**Done** on `pause-menu`:
- **ESC pauses** instead of leaving. Paused, nothing advances (the sim, the
  clock, the crowd, a story beat, a line being typed) and the motors go
  quiet; the frame is still drawn behind the menu.
- **Resume / Restart / Chapter select**, by click or tap, or ↑ ↓ and ENTER,
  and ESC resumes.
- **R asks first**: mid-run it opens the menu on Restart, and R again (or
  ENTER) restarts. On the end card, with nothing to lose, R restarts at once
  and ESC goes to the chapters; both are tappable there now.
- **It pauses by itself** when a phone is turned upright (the rotate message
  covers the game), when the tab or app is switched away, and if a chapter
  is opened upright.
- **Touch**: the top row is SOUND and PAUSE; RESET is gone, since restart is
  in the menu. The stick and buttons step aside while paused.
- `npm run shoot` goes back to the chapters through the menu now, and R's
  reset in the lab is pressed twice.
- **Checked** in the browser: a 4 s pause in Chapter II moved the clock by
  none of those 4 s; R opened the menu on Restart; turning a touch phone
  upright during Voxxy's opening paused it mid-line. `shoot`, `shoot --lab`,
  `objectives` and `traverse` pass.

> Let players enjoy dialogue and photographs without losing time. Ordinary
> conversations keep the objective clock running. Photographs cover the
> centre of the screen for several seconds while gameplay continues. […]
> Consider freezing gameplay during these moments, or offering a relaxed mode
> that does so. Keep travel and task execution timed.

**Done** on `hold-for-story`: frozen by default, not a mode, since a player
reading has no reason to want the clock running.
- **The day holds while reading**: while a conversation box or a photograph
  is up and the controlled robot has no throttle, the sim, the crowd, the
  cats and the objective clock all take a zero step. A press still pages a
  conversation, since that is a key and not time.
- **Driving lets time go**, so walking away from a conversation still works
  and nobody can park in one to stop the clock while moving.
- **The clock dims** while it is held.
- **Checked** in the browser, starting beside Stephan with `?at=`: the clock
  stayed on 5:30 through 5 s of his lines and ran again once Voxxy drove.
  `shoot`, `objectives` and `physics` pass. The photograph case uses the same
  rule (`printFor > 0`) and was not photographed.

> Turn photographs into a lasting reward. Photos currently appear temporarily;
> there is no saved collection. Add a small album accessible from the menu and
> end screen, remembering unlocked pictures across visits.

**Done** on `photo-album`:
- **`src/app/album.ts`**: the pages are read off the chapters (every activity
  with a `photo`), so a new print on the shot list is a new page. Kept in
  `localStorage` under `ghost-light:album`; a print from a file by its id,
  the selfie as a 360 × 240 JPEG, since it exists nowhere else. Storage that
  refuses leaves an album that lasts the visit.
- **Open from the menu** (P, or tap "album: 2 of 5 prints") **and from the
  end card** (P, or ALBUM). Taken prints are shown leaning, as on screen, and
  a click holds one up large; the ones still to find are dashed blanks that
  say where: "III. At Capacity — Pose with Josh Long".
- **It takes every key while open**, so ENTER behind it cannot start a
  chapter. ESC goes back from a large print, then closes.
- P rather than A, since A drives.
- **Checked** in the browser: the empty album, then two prints seeded in
  storage and the page reloaded, the large view, and ESC back to the menu.
  **Not checked**: earning a print in play and finding it in the album, and
  the selfie's JPEG.

> Make the ending explain and celebrate the player's choices. The end card
> mainly reports totals and "R again / ESC menu." Show completed experiences,
> collected photos, and one specific retry suggestion. Add visible Retry and
> Menu buttons. Chapter III deliberately asks players to choose what they
> miss; its ending should make those choices feel meaningful.

**Done** on `ending-card`:
- **What you did / what you let go**, side by side and the same size, so the
  second column reads as a choice. In Chapter II it is "what got away". A
  group is one row ("Stickers, 3 of 8"), counted as done once any of it is.
  Jobs whose window had not opened when a day ended early are left out.
- **The prints from this run** on the table under it, and the album count
  with the side quests still out there.
- **One suggestion**, worked out rather than written: the first thing the
  day took, by when its window closed, who passes its gates, and when it
  opens. Chapter II, from the card: "Next time: Room 6: mic cable. It cost
  you the room. Only Voxxy can do it, so have Voxxy there by 0:10 into the
  day." With nothing missed, the side quest still waiting; with nothing left,
  "All of it, in one day."
- **Real buttons**: Retry (the accent one), Album and Chapter select, each
  with its key beside it on a keyboard.
- **"A full day"** for a day with nothing let go.
- **`?late=n`**, a new look-only parameter: the day starts n seconds in. Six
  real minutes in the headless browser got Chapter III's clock only to 0:50
  left, since software rendering runs slower than real time.
- **By hand, after the first look**: the eight stickers were eight rows
  under "what you let go", beside a header counting them as one. Grouped.
- **Checked** with `?late`: Chapter III run out with nothing done, and
  Chapter II lost with three rooms dark. **Not seen**: a card with the "did"
  column and the prints filled in, which needs a real playthrough.

> Improve album readability on phones. The album uses a fixed three-column
> layout with 11px captions […] Use larger text and a scrollable layout on
> phones. The desktop preview also shows the menu behind the album; an opaque
> background would make the collection easier to read.

**Done** on `album-phone`:
- **Opaque** on every screen, and so is the print held up large.
- **On a phone**: two columns of bigger prints (300 × 200 design px), captions
  and hints at 17 px rather than 11, a bigger title and count, and a CLOSE
  button with a border. The page scrolls vertically: it is the one panel
  allowed `touch-action: pan-y` on a page that is otherwise `none`.
- **Checked** in the phone-sized browser, top and scrolled to the bottom,
  and on the desktop. **Not checked**: scrolling with a real thumb.

> Explain when reading pauses time. […] Show "Time paused while reading," and
> "Release movement to pause" when appropriate.

**Done** on `reading-hint`: a line under the clock while a conversation or a
photograph is up, in a chapter with a clock running. "Time paused while
reading" while it holds; "Release movement to pause the clock" while the
player is still driving ("Let go of the stick…" on a phone). Checked beside
Stephan in Chapter II, both states.

> Clarify that "Chapter select" abandons the run. […] Label the action "Leave
> run" or explicitly state that progress will be lost.

**Done** on `leave-run`: both. The pause menu's last item is **Leave run**,
and it and **Restart** carry a line under their names, always shown rather
than on focus (a phone has no focus before the tap): "Back to chapter
select. Progress is lost", "Start this chapter over. Progress is lost". The
key hint under the menu had lost its spacing (no `white-space: pre`), fixed
by hand after the screenshot. The end card keeps "Chapter select", since the
run is over there.

> the text should only appear when the user is over the option

**Done**: the note shows only on the item the pointer is over or the arrow
keys have chosen, and is hidden, not removed, so the menu does not jump.

> Make the album fully usable with a keyboard. […] Add arrow-key selection and
> Enter to open; use focusable buttons for photos and menu actions.

**Done** on `album-keys`: every page and CLOSE is a `<button>`, blanks
included, so the arrows walk the grid as drawn (down from the last row is
CLOSE) and a blank can be read for where its print is. ENTER or SPACE opens
a print; in the large view LEFT and RIGHT turn to the next print taken, and
ESC, ENTER or SPACE put it down with focus back on it. TAB and SHIFT+TAB
cycle. It opens on the first print taken, or on CLOSE. A red outline marks
the choice, from the keyboard only (`:focus-visible`). Driven key by key in
the browser, from P on the menu to ENTER on CLOSE.

> Normaly the bof room should have row of table and chair for lab with a
> passage in the middle

**Done** on `bof-labs`: both BOF rooms were empty. Each now has seven rows,
a table either side of a 1.4 m passage running from the door end to the
front, chairs behind every table facing the east wall, a presenter's table
at the end of the passage and a screen on the wall. 2.2 m clear inside the
door past the steps, 2.6 m before the front. One hidden block per half-row
collides, as the seat banks do. The constants are the lab's own, because
the corridor's `CHAIR` is declared below the line that builds the venue and
would not exist yet when this runs. `venue`, `objectives` (Voxxy still
stands on the BeJUG spot, in the passage), `traverse`, `crowd` and `shoot`
pass; photographed in Chapter III.

> What kind of design style should I use for the portrait in the game ?

**Answered**, no code: one treatment for all fourteen, "lit by the ghost
light" — a face out of near-black, one warm key light from the side, a rim
in the speaker's own colour. Head and shoulders, big shapes, no fine detail
at 92 px. Photos for the real people (with their agreement), drawn for the
robots, animals and roles, the same ground and light for both.

> Feedback from a test user, five rows:
> High — Opening dialogue stopped movement. I tried Space; E continued it, but
> the dialogue only displayed a small arrow. → Show "E — Continue" directly
> inside the dialogue box.
> High — Several identical pink markers showed distances, but I couldn't
> easily match them to the task list. → Label markers and highlight one
> recommended first destination.
> High — Dark scenery establishes mood, but the bottom control hints are
> difficult to read—even in brighter chapters. → Increase text contrast and
> give controls a solid background.
> Medium — The first objective expands into several tasks before I understand
> their relationship. → Introduce one nearby interaction first, then reveal
> the broader checklist.
> Medium — The menu lets me enter later chapters, whose dialogue assumes
> earlier events. → Mark chapter one as the recommended starting point or add
> a brief recap.

**Row 1, done** on `dialogue-continue`: the lone ▼ is now a keycap and a
word — `[E] Continue ▼`, `[E] Close ■` on the last page, `[TAP]` on a phone
— in the speaker's colour, once the line has finished typing. SPACE and
ENTER turn the page too while a box is up (SPACE still drops otherwise),
since they are what the tester pressed first.

**Row 3, done** on `hint-contrast`: the control line is on a solid dark
strip (90%, a hairline border), keys in near-white bold and words in the
card's grey, where it was #4c5357 type straight on the scene. Checked in
Chapter I's dark forecourt and Chapter III's lit hall.

**Row 2, done** on `marker-numbers`: every open row of the card has a
number, given the first time it is listed and never changed, in a chip at
the row's end (a column, since the card is right-aligned). The badge over
its marker, or at the screen edge pointing at it, wears the same number in
the same colour — badges now go over markers on screen too, where there
was only the beacon. One job is the NEXT: bigger, filled, named ("NEXT ·
Concourse board · 23 m"), its row lit on the card. Sticky: it stays until
done or out of reach, and gives way only to something about to be lost;
otherwise the nearest of this robot's jobs and anybody's, the other storey
counted 30 m further. Numbering waits for the objective's first update, or
gated jobs that only look open take numbers and leave gaps.

**Row 4, done** on `first-job`: a chapter's card starts folded to the NEXT
job alone and "+ 4 more on the list after this", and only the NEXT's badge
is up. It opens out for good as soon as the player has done anything —
finished or begun a job, picked something up, let one go — or after 45 s.
Anything on a clock (a breakdown, a deadline) is never folded away. Numbers
are given as rows are shown, so the first job is 1. Edge badges now stop
above the control strip.

**Row 5, done** on `menu-start-here`: Chapter I's card wears START HERE in
its accent (and is the one selected on arrival, as before). II and III
keep open, for a judge who wants the busy one, and each card says in a
line what came before it — "After I: Voxxy switched on the last rack, and
the building folded back to its first years." / "After II: Voxxy and Droid
kept JavaPolis running, and the building folded again." Nothing about why
the building is empty. A `recap` field on `Chapter`, words on a card like
the tagline.

> A second round from the test player, five rows:
> High — JavaPolis introduced timed repair jobs while "Say hello to Stephan"
> remained the highlighted next task. Two rooms emptied before I started that
> conversation. → Give the first conversation a protected tutorial phase, or
> make urgent repairs override the recommended task.
> Medium — Completing a board displayed its name, changed its light, and
> replaced its checklist arrow with a dot. The result was easy to under-read.
> → Display "Concourse power restored" and a clear checkmark.
> Medium — Objective markers sometimes overlapped the task panel or approached
> the screen edge. → Keep markers inside a safe screen area and prevent
> overlap with the HUD.
> Medium — In chapter three, "0/9" appeared alongside a first task and "11
> more" tasks. I couldn't tell what the nine counted. → Label the score
> explicitly and distinguish scored activities from supporting tasks.
> Medium — Pressing E near a character sometimes produced no visible response
> until I moved closer. → Show "E — Talk to Stephan" when in range, so
> interaction distance is predictable.

**Row 1, done** on `next-on-clock`, the second of the two suggestions: the
NEXT is now chosen by what can wait least — something about to be lost,
then anything due within 120 s (every breakdown, from the moment it
happens), then the day's work, then side quests. Sticky within a tier. So
Stephan is the NEXT only until the first breakdown. No protected phase: it
would change Chapter II's difficulty, and the clock already stops while
the robot stands still.

**Row 2, done** on `done-banner`: a finished job puts a banner at the top of
the scene — a green tick and what it did — for 2.8 s, and its card row gets
a green ✓ in place of the dot. Activities gained an optional `done` line:
"Hall power restored", "Concourse power restored", "Room 8 amplifier on",
and "Room 6 running again" for every breakdown. Without one, the label.

**Row 3, done** on `marker-safe-area`: each badge, label included, goes at
the nearest spot clear of the HUD's panels (measured from the page, so the
card's height and a phone's zoom count), of the badges already placed, and
16 px in from the edge. The side inset is 56 px. An arrow pointing down
puts its label above it, where it had been drawn over its own label.

**Row 4, done** on `score-label`: the line under the objective reads "0 of 9
jobs done"; the card lists the day's work first and the side quests under a
SIDE QUESTS · NOT COUNTED heading; the folded card says "+ 8 more jobs, 3
side quests after this".

**Row 5, done** on `talk-range`: the talk prompt was dim accent text in the
bottom-left corner, where the notices go. It is now a chip centred over the
control strip, `[E] Talk to Stephan Janssen` in range (`[TALK]` on a
phone), and within 2.5 m of the range, dimmer, "Closer to talk to Stephan
Janssen", so where the range starts can be seen.

> I would like to add to the game a pokedex like experience where every npc
> you meet gets it's card.

**Done** on `whos-who`: a **Who's who**, thirteen cards in play order, read
off the chapters (anything in an objective with a `who` is a card; a person
in two jobs is one). Met means spoken to, from the first line, or for the
two who only pose (Josh Long, Venkat Subramaniam) photographed with. Unmet
cards are the collection's pull: a number, a silhouette, "Somewhere in II.
JavaPolis". A met card is a conference badge on a lanyard, in the chapter's
colour, with the portrait from `src/portraits/` or initials in the
speaker's own colour; ENTER holds it up with the job that finds them and
their first line. A NEW CARD chip shows the first time. Open with C on the
menu and the end card, and from the pause menu mid-run. `localStorage`, as
the album.

Nothing new is said about anybody: for the real people a card carries only
their name, the chapter, and a line the game already gives them. No bio,
no role, no dates.

> I would like to add some other npc in chapter 2 and 3. They will not be
> marked as quest item but you can interact with them. for chapter 2, add
> Bruno Souza, Guillaume Laforge and Antonio Goncalves. For chapter 3, put
> Tom Cools, Brian Vermeer, alexander chatzizacharias, Alina Yurenko,
> Ana-Maria Mihalceanu, Holly Cummins and Kevin Dubois.

**Done** on `corridor-people`, from `main`. A `passerby` helper makes each
one a `talk` activity flagged `aside` — no marker, no card row, outside
every count, no banner and no chime — so they are found by walking past,
the talk prompt offers them in range, and meeting one adds their card to
the who's who (13 → 23). Chapter II: the corridor's east side, across from
the speakers. Chapter III: the hall (Tom Cools, Brian Vermeer, Kevin
Dubois), reception (Alexander Chatzizacharias) and the upstairs corridor
(Alina Yurenko, Ana-Maria Mihalceanu, Holly Cummins). `npm run objectives`
places all ten.

Nobody has written or agreed words for them, so they are given none: one
line of narration, "You stop to say hello to Tom Cools.", in italics and
without a voice (`narrated`), and their card carries no quote. Their look is
a distinct shirt colour and nothing else, to be set from photographs like
the five speakers'. Not checked here: whether the three in Chapter II were
at JavaPolis.

> Can you at least make sure that alina, ana-maria, and holly look like
> girls. And maybe take the opportuninty to had a bit of mixity in the crowd.

**Done** on `crowd-mix`, on `corridor-people`. Alina Yurenko, Ana-Maria
Mihalceanu and Holly Cummins have `long` hair, a little shorter figure,
and their own shirt; the hair colours are placeholders until checked
against a photograph. `long` now also draws hair down the back, since this
camera is behind half the people it sees. The crowd: 34% of the people who
are nobody in particular wear their hair long — standing, walking or seated
— and 45% of those a skirt or dress, a flared box over the top of the legs a
shade darker than their clothes. It stays in the era's one colour, so a
full room still photographs as one mass.

> the main menu is a bit fuzzy not really clean compare to the rest can we
> clean it up a bit.

**Done** on `menu-clean`, on `crowd-mix`. What made it soft: frosted,
translucent cards over a blurred building with film grain and bloom, a
glow around the title, and five stacked lines of grey monospace. Now: solid
cards with a flex layout and a hairline over the recap, lit in place (accent
border, numeral, a bar along the top) instead of lifted 4 px out of the row;
a darker wash over the backdrop and no grain, less bloom on the menu's grade;
a tight shadow on the title; one row of keycap buttons for Who's who, Album,
Intro, Graphics and Sound; one hint line. The dev line is gone (L still
works). Checked on desktop and phone size.

> Can you update the status and the readme

**Done** on `docs-refresh`, on `menu-clean`. `STATUS.md`: everything that was
in progress is merged (#35–#61) and moved to Done with its PR numbers; the
glance table gains HUD and dialogue, people, collections, phone, and pause
and endings; in progress is only `menu-clean` and this; the to-do list is
the last day (the author's cold play of II, the real people's cards, the
final submission), with three follow-ups on real people's words, looks and
portraits; the fixed arrow-overlap item is gone; the pie and the timeline
are redrawn. `README.md`: the controls now cover the talk prompt, the pause
menu and the menu keys (C, P, I, G, L); a "What's in it" section describes
the three chapters, the card and markers, and the two collections; the
project layout and the checks are current; "People in the game" says how
real people appear; the "Early, grey-box" status is replaced.

> So we need still to figure out the picture for the npc. I wondering what
> style we should go for based on the game (pixel art, cartoony,
> realistic,...) and what resolution

Answered, no code: treated photographs (duotone into the chapter's light),
512 × 512.

> When I said real I mean the actual picture of the person. I want the person
> to be actually recognizable

Revised: the actual photograph in full colour, untreated, since colour and
expression are most of what makes a face known; only the framing is made
the same (square, head and shoulders, eyes a third down, face ~60% of the
frame), from each person's own front-lit headshot, 512 × 512 JPEG. A soft
dark vignette drawn over the frame in the game was offered, not built.

> update the picture list required

**Done** on `portrait-list`, from `main`: `src/portraits/README.md` lists
all eighteen real people who need a photograph (the ten added in II and III
included, and Josh Long and Venkat Subramaniam, who were missing), each with
where they are and the exact file name, and an "Agreed" box to tick. The spec
is now the one above, 512 not 256, since the who's who card is drawn larger
than the dialogue box. The robots, animals and roles are listed apart, as
optional.

> Feedback from a playtest: mobile text is too small. At 844×390, objective
> labels and chapter descriptions are difficult to read, while touch buttons
> are appropriately large. Scale HUD text independently of the game view.
> The touch movement control needs an introduction. No joystick is visible
> initially. Dragging the left side works, but a brief "drag here to move"
> cue would improve discoverability.

**Done** on `mobile-text`, on `portrait-list`. Text: the touch zoom is
worked out from the stage's real scale (`touchZoom` in `Game.ts`) so a 12 px
line comes out at 10.5 real pixels, between 1.3 and 1.8; at 844 × 390 that
is 1.62 where it was a flat 1.3. The chapter heading and the words under
badges are zoomed too. What the bigger text crowded is moved: the pause
menu and end card get their own smaller zoom and fit; the card's lines are
tighter on a phone; the four action buttons are one row along the bottom,
not a block standing into the card; the buttons are ground a badge will
not sit on; the controls hide for the end card. The menu's chapter cards
are 372 × 318 with larger type on a phone. Movement: a dashed ghost stick
under the left thumb with its knob drifting, "Drag here to move", until the
first drag, remembered in the browser. Checked in a headless 844 × 390
browser; not yet on a real phone.

> While we are touching the control can the action side be similar in term of
> positioning to a controller

**Done** on `pad-diamond`, on `mobile-text`. The four action buttons are a
controller's face-button diamond: TALK at the bottom (A, confirm), BRAKE on
the right (B), DROP on the left (X) and ROBOT on top (Y). Each is placed by
its centre, so in Chapter I, which has no DROP or ROBOT, TALK and BRAKE are
where they will be in II and III. A diamond stands taller than the row did,
so on a phone the card steps left of the buttons whenever it would reach down
into them (a full Chapter III list), and keeps its corner otherwise. The
"Drag here to move" cue joins the ground badges avoid. README's phone
paragraph rewritten to match.

> Failure advice identifies the wrong problem. My dog deadline expired, but
> the results recommended reaching the hall board earlier. Explain the
> deadline that actually ended the run and give advice specific to it.

**Done** on `failure-advice`, on `pad-diamond`. The tip was built only from
the jobs left undone, earliest first, so a Chapter I run lost to the dog
advised the hall board. The objective now records which `failsRound` job
ended the round (`endedBy`), and the end card: titles it "Out of time"; says
what ran out ("The cat gave you ninety seconds to find the dog, and they ran
out."); puts that job first under what got away; and gives its tip ("the
moment the cat stops talking, head north into the exhibition hall and follow
the dog's marker. It is asleep on the west side of the hall, down the terrace
steps. Leave the boards until after."). Both lines are the dog's own
`whyFailed`; an activity without one gets both built from its label and
deadline. Checked by running the objective in Node (the round ends at 92 s,
`endedBy` the dog) and by photographing the card with the ending forced, on
desktop and phone.

> the pull request have been merged

`STATUS.md` brought level on `status-after-66`: #64–#66 (with
`portrait-list`) moved to Done, nothing left in progress, the phone and
playtest rows updated, and "try it on a real phone" added to the last day.

> Can you do some research for each npc, to adapt their dialog and bio based
> on that.

**Done** on `npc-research`, on `status-after-66`. Three research agents searched
the web for the eighteen real people (29 Sep 2026), each fact with its URL,
under the rule already in force: nothing put in anyone's mouth that is not
plainly true of their public work, and Chapter II true as of JavaPolis,
December 2006.

What changed:

- A `bio` on every real person, shown on their card in the who's who.
- The four Chapter II speakers and Stephan now say only sourced things, as of
  December 2006. Gosling: Sun put the compiler and HotSpot under the GPL the
  month before (13 Nov 2006), he wrote the first compiler, NetBeans "less
  geeky" (his 2004 words). Goetz: *Java Concurrency in Practice* (May 2006),
  joined Sun in September 2006, his JavaPolis 2006 talk on performance myths.
  King: Hibernate, Seam 1.0 (2006), the EJB 3.0 expert group. Johnson: Spring
  2.0 (5 Oct 2006, 10,000 downloads the first day), the 2002 and 2004 books,
  Interface21's name (his 2006 post). Stephan: started with BeJUG in 2002 as
  an affordable European JavaOne; 2,800+ in 2006; talks online on Parleys.
  The invented "room above a pub, forty of us" is gone.
- The ten people to meet keep one narrated line, with no words of their own,
  but it now says who they are, from their public work.

Two things the research could not support, left for the author:

- **Gavin King**: no evidence of a JavaPolis talk (his Devoxx talks start in
  2017). He stays, with a comment in the code saying so.
- **Guillaume Laforge**: JavaPolis evidence is for 2007 only, not 2006.

Sources, by person:

- Stephan Janssen: https://java.developpez.com/interview/javapolis/sjanssen/english/ · https://www.parisjug.org/speakers/stephan-janssen/ · https://en.wikipedia.org/wiki/Devoxx
- James Gosling: https://en.wikipedia.org/wiki/James_Gosling · https://www.computerworld.com/article/1707302/q-a-sun-s-james-gosling-on-java-tools-woes.html · https://en.wikipedia.org/wiki/Java_(programming_language) · https://blog.lunatech.com/posts/2005-12-21-javapolis-2005/
- Brian Goetz: https://nofluffjuststuff.com/conference/speaker/brian_goetz · https://www.developerfusion.com/media/10546/brian-goetz-interview/ · https://www.serry.org/blog/2005/2005-12-26-javapolis-first-day-of-conference-35/
- Gavin King: https://www.redhat.com/en/about/press-releases/jboss-seam · https://qconlondon.com/london-2007/speakers/show_speaker8a8d.html?oid=115
- Rod Johnson: https://spring.io/blog/2006/10/05/spring-2-0-final-with-over-10-000-downloads-in-the-first-day/ · https://spring.io/blog/2006/12/16/why-the-name-interface21/ · https://en.wikipedia.org/wiki/Rod_Johnson_(programmer) · https://antoniogoncalves.org/2006/12/17/javapolis-2006-back-home/
- Bruno Souza: https://en.wikipedia.org/wiki/SouJava · https://www.developerfusion.com/media/58608/inside-the-worldwide-netbeans-community-with-bruno-ferreira-de-souza-part-2/
- Guillaume Laforge: https://www.infoq.com/news/2007/03/groovy-pres · https://en.wikipedia.org/wiki/Apache_Groovy
- Antonio Goncalves: https://antoniogoncalves.org/2017/07/03/talks-i-gave-at-conferences-and-meetups/ · https://antoniogoncalves.org/2006/12/17/javapolis-2006-back-home/
- Dimitris Doutsiopoulos: https://www.ddphotography.gr/ · https://www.flickr.com/photos/bejug/albums/72177720329485456/ · https://dev.to/stephan007/face-recognition-in-action-devoxx-4c67
- Josh Long: https://2026.springio.net/speakers/josh-long/ · https://m.devoxx.com/events/dvbe26/speaker/14654/josh-long
- Venkat Subramaniam: https://dev.java/community/javaone-2026/speakers/venkat-subramaniam/ · https://agiledeveloper.com/aboutus.html · https://www.devoxx.com/speaker/venkat-subramaniam
- Tom Cools: https://tomcools.be/ · https://inside.java/2023/12/21/seasons-thanks/ · https://m.devoxx.com/events/dvbe25/talks/20670/java-and-jvm-lovers-in-belgium-let-s-unite
- Brian Vermeer: https://snyk.io/contributors/brian-vermeer/
- Alexander Chatzizacharias: https://dvbe26.cfp.dev/api/public/speakers/10163 · https://glycin.github.io/
- Alina Yurenko: https://dvbe26.cfp.dev/api/public/speakers/19772 · https://github.com/alina-yur
- Ana-Maria Mihalceanu: https://dvbe26.cfp.dev/api/public/speakers/5830 · https://dev.java/community/javaone-2026/speakers/ana-maria-mihalceanu/
- Holly Cummins: https://dvbe26.cfp.dev/api/public/speakers/14657 · https://qconlondon.com/speakers/hollycummins
- Kevin Dubois: https://dvbe26.cfp.dev/api/public/speakers/5843 · https://www.kevindubois.com/about/

> the portait will be png not jpeg

`src/portraits/README.md` now names every file `.png`, with a note that a
512 × 512 photo as PNG is large and should go through an optimiser, and that
each person should have one file only. The loader already accepted `.png`;
nothing in the code changed but the examples in the `portraits.ts` comment.

> Let's replace gavin by Chet Haase

**Done** on `npc-research`. Gavin King's corridor spot, conversation and
card go to Chet Haase (`met-haase`; `chet-haase.png` in the portrait list;
Stephan's "all four" now waits on him). His lines are his public work as of
late 2006: Sun Java client group architect on Swing and Java 2D; Java SE 6,
"a rock-solid release of Java for Vista" (his words to The Register, Oct
2006); the Filthy Rich Clients session with Romain Guy at JavaOne 2006,
which became the book (2007). No JavaPolis talk of his was found, and a
2008 interview says he was at Adobe by then. His look is a placeholder
(a shirt, dark hair) until it is set from a photograph.

Sources: https://www.theregister.com/off-prem/2006/10/11/java-for-vista-is-rock-solid-says-sun/1184101 ·
https://www.amazon.com/Filthy-Rich-Clients-Developing-Applications/dp/0132413930 ·
https://www.informit.com/articles/article.aspx?p=1353606 ·
https://www.pushing-pixels.org/2007/08/09/filthy-rich-clients-interview-with-chet-haase.html

> I've added the picture for the for all the main npc

Nineteen portraits arrived at 1254 × 1254, 1.3–1.9 MB each (about 30 MB, all
of it in the download), plus two misspelled earlier drafts
(`james-golsing.png`, `rob-johnson.png`). On `npc-research`: the originals
moved, not deleted, to `portrait-sources/` (git-ignored), the drafts to
`portrait-sources/superseded/`; `tools/portraits.py` writes 512 × 512,
256-colour copies into `src/portraits/` (144–201 KB each, 3.2 MB in all;
dithered 256 colours is indistinguishable in this painted style). With faces
to go by, the in-game looks of Chet Haase, Dimitris and the ten people to
meet are set from the portraits (shirt, hair, beard, glasses). Checked in the
dialogue box, the NEW CARD notice and the who's who. `the-dog.png`, added
after, went the same way.

The full-size originals had been staged as they were added, and three of the
branch's commits had taken them in with everything else (about 25 MB). The
branch was not yet on GitHub, so it was rebuilt from `status-after-66` as two
commits, with only the 512 px copies in history.

> you can update the status

`STATUS.md` dated the last day (first on `status-portraits`, which was
never pushed; redone on `status-after-68` once #68 was merged, with
`npc-research` moved to Done and nothing left in flight);
portraits a row of their own (all twenty in, agreement to tick); people and
collections note the research, Chet Haase and the portraits; in progress is
`npc-research` (pushed, #67 under it merged) and this; the to-do asks for
the real people's lines to be read; the timeline is today's.

> Can you adapt the human npc so they can look more like their picture

**Done** on `npc-looks`, on `status-after-68`. Each figure checked against
the author's portrait. Two new things a `Look` can have: `print`, a patch of
colour on the chest under the lanyard (Duke for Gosling, the Spring leaf for
Josh Long, the Rebel emblem for Tom Cools, Red Hat for Kevin Dubois, Quarkus
for Holly Cummins), and `collar`, a polo's trim (Stephan's light tipped
collar, Guillaume Laforge's blue). Updated: Stephan (dark brown polo, dark
rectangular frames, salt-and-pepper hair), Goetz (light blue shirt, bald on
top, thin frames, white-grey goatee), Johnson (grey t-shirt), Venkat (black
hair and moustache), Josh (white t-shirt), Chet (lighter grey), Tom (stubble,
not a full beard). Skin is left as the stylised band: that is still an open
decision. At this camera a head is about nine pixels, so what carries is
the silhouette (hair, beard, glasses, shirt), and a print shows only when
the person faces the camera.

> Based on the data you collected on those npc can you enrich the chat

**Done** on `richer-talk`, on `npc-looks`, from the research of 29 Sep only
(sources listed under that entry). The ten people to meet each get a second
narrated line, still never quoted: Souza (SouJava 1999, Apache Harmony),
Laforge (co-writing *Groovy in Action*, started Grails), Goncalves (a first
book, on Java EE 5, in French), Cools (Timefold, Java Champion 2023),
Vermeer (DevSecCon, NLJUG), Chatzizacharias (Game Studies; his Devoxx talks,
Unity agents to a game in Git), Yurenko (Ukrainian, Zurich, open source),
Mihalceanu (*DevOps Tools for Java Developers*, Inside.java), Cummins (JVM
performance engineer; counting fish, a blind ultra-runner), Dubois (Belgium,
Italy, Montana, Utah; four languages). The Chapter II speakers each say one
more thing true as of December 2006: Gosling (small devices first; Sun
since 1984), Goetz (the JSR 166 expert group), Haase (graphics, Java 2D),
Johnson (Interface21 is the company behind open-source Spring). Dimitris:
four thousand pictures an edition and Stephan's face finder (Stephan's own
2019 post). Checked line by line against the research; three drafts were
corrected before commit (SouJava's year, a contributor not a co-author,
Interface21's work).

> When chatting with those npc I expect a real chat not a description of the
> person. btw in the person card it would be good to see the year of the
> meeting. and maybe at the start of the chapter show the year the robot
> dropped in

**Done** on `real-chat`, on `richer-talk`.

- The ten people to meet now talk, in the first person, three lines each,
  not narration. Every line is from the research of 29 Sep and true of its
  chapter's date; two are close to their own public words (Holly Cummins,
  "Efficiency is ruining our happiness, and weirdly, it's also ruining our
  efficiency", 2025; Kevin Dubois, LangChain4j and Quarkus "in my opinion
  the easiest tools to work with in this space", 2025). One draft line that
  was an opinion of mine (Ana-Maria's "most people never open the box") was
  replaced with a fact before commit. `narrated` is no longer used by anyone.
- Each chapter has a `when`: I is 2126 (the title sequence's frame), II
  December 2006 (JavaPolis), III October 2026 (Devoxx Belgium, 5–9 Oct).
  A card reads "II. JavaPolis · 2006" in the grid and "Met in December 2006"
  held up.
- A chapter opens on its year, big, with "KINEPOLIS, ANTWERP · DECEMBER"
  under it, on a dark band above the arrival, for about five seconds; above
  the white a wormhole arrives in.
- README: how real people speak, and the years.

> Can the speaker be more friendly and less straight to hey my name is and
> I speak about that

**Done** on `friendlier`, on `real-chat`. The ten people to meet now open
on the robots or the moment ("Robots at JavaPolis! Nobody back in Brazil
is going to believe me." / "Hi! Oh, you are fast. Do you start up fast
too?" / "Hey! Welcome to Antwerp, robots. First Devoxx?") and their work
comes up the way it would in a conversation, as an answer or an aside. Gosling,
Chet Haase and Rod Johnson get a friendlier first line too. The facts are
the same sourced ones as before; what is new is only the framing around
them. Alina's "There will be snacks" is a nod to her own speaker bio
("Ambassador of snacks").

> Could we group the picture and the who's who into one souvenir album with
> multiple tab. And maybe then we can use it to collect stickers too.

**Done** on `souvenir-album`, from `main` (#72). One **Album** with three
tabs, Prints, Who's who and Stickers, each showing its count; `1` `2` `3` or
a click turn the tab. The menu, the pause menu and the end card each have
one Album button (P; C still opens it on the who's who). The menu button
shows the total ("Album 0/36"). **Stickers** are new: each of the eight
stands on Chapter III's sticker round now gives a sticker that is kept in the
browser, with a NEW STICKER notice when taken and a dashed blank for the
rest. The stands are nobody in particular, so the stickers are generic
conference designs drawn in CSS (λ, JVM, { }, ☕, GC, </>, @Test, 2026) and
no company's mark. Each page now opens at the top, which on a phone it did
not when there was nothing collected yet.

> How can I provide the stickers and in what format? / I was thinking to use
> some stickers I've created

**Done** on `sticker-files`, on `souvenir-album`. The author's own sticker
art drops in like the portraits: `src/stickers/stand-1.png` … `stand-8.png`,
found by name at build time, a stand without a file keeping its drawn
placeholder. PNG with a transparent background, the die-cut shape and white
edge in the picture, square with a little margin; the game adds the tilt
and shadow. Originals go in the git-ignored `sticker-sources/`;
`tools/stickers.py` fits each onto a transparent square and writes a
384 × 384 copy. Checked with a throwaway test sticker, then removed.

> Can you add a description for each stickers. You can rephrase the
> description I provide here after: (eight notes, stand-1 … stand-8)

**Done** on `sticker-files`: the author's eight stickers (added to
`src/stickers/`, 384 × 384 transparent PNG) are committed, each with a line
from the author's notes, lightly rephrased and shown under it once
collected: a speaker's dog sticker; a 2023 company sticker; the original
BeJUG logo, a coffee grinder; an unreleased black sheep with a nod to The
Terminator; a 2024 stand giveaway; the BeJUG logo today; a 2025 nod to The
Matrix and its agents; the brand-new 2023 BeJUG logo. Blanks still say only
where to find them.

> what was the ideal resolution for the picture taken by the photograph ?

Answered: 3:2, 1500 × 1000 (the album holds a print up at 600 × 400, well
over 1000 real pixels on a high-density screen).

> I've update the picture you should now use the png version and drop the
> jpeg

**Done** on `sticker-files`: the four prints are the author's new
1500 × 1000 PNGs and the JPEGs are removed. Kept full colour: a 256-colour
copy, as the portraits are, banded visibly on Biggy, and lossless
optimisation saved only 3%, so the files are as the author made them (about
6 MB for the four). `public/photos/README.md` says 1500 × 1000 PNG.

---

## Audio

### _(pending)_ Footfall and ambience

Footsteps are the highest-value sound in the game — they are what sell mass,
and mass is 20 points.
