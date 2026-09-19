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

---

## Audio

### _(pending)_ Footfall and ambience

Footsteps are the highest-value sound in the game — they are what sell mass,
and mass is 20 points.
