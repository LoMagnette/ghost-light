# Mechanics

Settled 21 Sep 2026, and **built the same day** — §§1–4 and Chapter I are
running; Chapters II and III are authored as data against the same vocabulary
and verified for placement, but have not been played through. `SPEC.md` says
what each chapter *is*; this says what the player *does* in it, and what has
to exist in `core/` for that to be true.

Until now the three chapters differed in palette, cast and a sentence of
objective text. None of them could be finished, because no objective logic
existed at all. This is that logic, specified once and configured three times.

---

## 1. The rule this obeys

A chapter may change four things and one of them is *the objective*
(`Chapter.ts`). So the objective stops being a string and becomes data: a set
of activities, a clock, and an end rule. Everything mechanical below is ONE
system in `core/`, composed three ways. There is still no `ChapterOneScreen`,
and the three chapters remain thin.

If a chapter needs a mechanic this vocabulary cannot express, the vocabulary
is wrong. Widen it here rather than special-casing a chapter.

---

## 2. Capability: what makes a robot irreplaceable

Four gates decide who can do what. **Three of them already exist** and have
been load-bearing since the venue was surveyed — this design mostly stops
wasting them.

| Gate | Field | Voxxy | Droid | Biggy | What it decides |
|---|---|---|---|---|---|
| Climb | `maxStepRise` | 0.20 m | 0.18 m | **0.00 m** | Biggy never leaves storey 0 |
| Reach | `height` | 1.15 m | **2.05 m** | 1.35 m | counters, mics, anything at 2 m |
| Fit | `radius` | **0.34 m** | 0.46 m | 0.72 m | a 0.8 m gap admits Voxxy alone |
| Carry | `payload` *(new)* | 10 kg | 90 kg | **400 kg** | who can lift the thing at all |

Reach is `height` and fit is `radius`. Neither is a new field and neither is a
flag: an activity states the metres it needs and the robots answer from
dimensions they already had. Same discipline as the stair rule, and for the
same reason — the answer falls out of the building rather than out of a list
of exceptions.

`payload` is the one addition, and it is a design choice rather than a derived
figure, like `maxStepRise`.

### Payload is real mass

`Body` gains `payload` in kilograms, and **every force in the integrator
divides by `mass + payload`**. Nothing else changes. What the player gets:

| Loaded with | Effective mass | Accel | Brake | Braking distance | Gradient limit |
|---|---|---|---|---|---|
| Voxxy, empty | 45 kg | 9.0 | 12.0 m/s² | 1.42 m | 0.550 |
| Voxxy + 10 kg | 55 kg | 7.4 | 9.8 m/s² | 1.73 m | 0.450 |
| Droid, empty | 190 kg | 4.5 | 5.0 m/s² | 1.62 m | 0.270 |
| Droid + 60 kg | 250 kg | 3.4 | 3.8 m/s² | 2.08 m | 0.209 |
| Droid + 90 kg | 280 kg | 3.1 | 3.4 m/s² | 2.31 m | 0.187 |
| Biggy, empty | 430 kg | 1.8 | 1.2 m/s² | 3.82 m | 0.110 |
| Biggy + 200 kg | 630 kg | 1.2 | **0.8 m/s²** | **5.03 m** | **0.075** |
| Biggy + 400 kg | 830 kg | 0.9 | **0.6 m/s²** | 5.95 m | 0.057 |

Measured by `npm run physics`, not calculated here. The harness fails the
build if a load stops being something you can feel, so this table cannot
quietly stop being true.

This one rule is the whole design's spine. A collectathon where pickups are
numbers is a shopping list; a collectathon where **what you are carrying is
why you cannot stop** is a physics game, and it is only buildable in an engine
that took mass seriously from day one. It is 20 realism points being *played*
rather than described, and it costs about thirty lines.

`maxSlope` is derived from `driveForce / (mass · g)`, so payload also decides
what a robot can climb. See §5.3 — that arithmetic turns out to be the best
constraint in the game.

### Handling it

Contact picks a thing up. `SPACE` puts it down. That is the entire interface,
and it keeps driving as the only verb in all three chapters.

---

## 3. Activity: the six things a robot can do to the world

An activity is a located thing with a completion rule and capability
requirements. Five kinds cover all three chapters:

| Kind | Completes when | Naturally belongs to |
|---|---|---|
| `tap` | any contact | Voxxy — fast, repeatable, many of them |
| `dwell` | inside the zone at under 0.2 m/s for *n* seconds | Droid — the only robot whose value is standing still |
| `haul` | item of mass *m* picked up at A, released inside zone B | Biggy, or Droid for the middleweights |
| `attend` | inside room R for a whole time window | anything that can get there — which excludes Biggy from storey 1 |
| `shove` | contact at momentum ≥ *p* kg·m/s | Biggy alone; see below |
| `tend` | a room that is running, and stops if left alone | Chapter II, and only it |

`tend` was not in the first draft of this document, which claimed five kinds
and then described Chapter II in terms none of them could express. A room
with a meter that drains is not a task that completes — it can only be kept
or lost — so it is its own kind rather than a `dwell` with a lie told about
it.

Each declares what it needs: `reach` (metres), `maxRadius` (metres), `mass`
(kilograms), and a location whose storey implies the climb gate.

`shove` finally implements `Obstacle.movable` and `Obstacle.mass`, which have
been in `Venue.ts` since the beginning with nothing reading them. A threshold
of **900 kg·m/s** is the useful one: measured cruise momentum is Voxxy 266,
Droid 777, Biggy 1366, so 900 is Biggy-only *and* demands it be doing at least
2.1 m/s — two thirds of cruise. It has to have taken a run-up, which is the
only way to make a heavy machine's momentum feel earned.

## 4. Objective: activities, a clock, an end rule

```
Objective = {
  activities: Activity[]
  clock?:     seconds          // absent in Chapter I
  ends:       'all-done' | 'clock-expires' | 'losses-exceed-n'
}
```

The HUD shows one objective line, the clock if there is one, and — in
Chapter III only — the card. All DOM over the canvas, as everything UI already
is.

---

## 5. The three chapters

### 5.1 Chapter I — The Silence · *learn the building in the dark*

**Objective: find the power. Three boards. The light spreads.**

Voxxy carries a weak lamp — roughly 8 m of useful light — and the only other
thing running in the building is the red LED step strips in the auditoriums,
which is exactly the image `SPEC.md` §8 calls the strongest one available.
They are not decoration here: they are the breadcrumb trail.

Three `tap` activities, each raising the light in one zone:

| # | Board | Where | Lights |
|---|---|---|---|
| 1 | Hall distribution board | west wall of the exhibition hall, storey 0 | the hall |
| 2 | Concourse board | behind the registration desk, +1.2 m | concourse, and the grand stair |
| 3 | Stage amplifier rack | Room 8 stage, storey 1, foot of the 4.5 m rake | the auditorium level |

The building assembles itself around the player as they play. There is no score and no
clock. The only thing in here that can be lost is the cat's threat, below. The reveal is the reward and it does not need
another one.

**The route is a wordless tutorial, and every beat uses geometry that already
exists:**

1. The hall, near-black — drive.
2. The 23 m threshold terrace up to the concourse — climb; then come back down
   the wheelchair ramp, which **accelerates you**, because `Body` has applied
   slope force since the first week. Braking, taught by the building.
3. Find *which* staircase goes up, in the dark — the venue's vertical.
4. Down the Room 8 rake: 4.5 m of terracing, downhill, with a stage at the
   bottom. Braking now has a consequence.

**The two things still living here.** A cat in the concourse and a
Bouvier des Flandres asleep in the exhibition hall — which is the chapter's
own tagline, *something is still walking the building*, finally kept by
something. They are `talk` activities with a `shape`, so they cost a post, a
marker and a box of dialogue and nothing else.

The cat threatens to go off, in a nod to a certain card game about the one
kitten in the deck that ends it — the mechanic, not the wordmark, and no art
or text is borrowed. It gives you **45 seconds to find the dog**, because a
dog is the only thing that defuses a cat.

That is the one deadline in a chapter that otherwise has no clock, and it is
deliberately not a clock on the CHAPTER: the three boards are still untimed
and still cannot be lost, and running the 45 seconds out costs you the dog
and nothing else. The card shows the count down beside "Find the dog". A cat
that says forty-five seconds and does not mean it is a worse joke than a cat
that does.

**The ending.** Board three brings up the ghost light on the keynote stage,
and the projector starts running a recording — **and the recording is
Chapter II.** Chapter select is the archive. The title stops being a nice
phrase and becomes the plot.

Optional and near-free: a second light moving somewhere far off that the
player can never reach. *Something is still walking the building.*

### 5.2 Chapter II — JavaPolis · *two hands, five rooms*

**Objective: keep every room running. Lose three and the day ends.**

Five rooms in use — 2, 3, 4, 5 and 6, the west side of the corridor, with
Room 5 (684 seats) as the main hall. Half the floor, which is what
`crowdDensity` 0.35 already says.

Each room holds a session meter that drains, faster as the day goes on. Two
activities keep a room alive, and the split is the entire chapter:

| | Voxxy | Droid |
|---|---|---|
| The AV rack, 0.9 m | `tap` → buys ~12 seconds | can do it, too slowly to matter |
| The projector, 2.0 m | **cannot reach it** | `dwell` 3 s → full reset |

So Voxxy is triage and Droid is repair. Voxxy buys time it cannot spend;
Droid spends time it cannot buy. **The robot you are not driving is the one
that matters** — which is the honest middle step between driving one machine
and running three.

A room at zero goes dark, its attendees leave, and it never comes back. Three
dark rooms ends the day early. The day is four minutes.

The meter holds 70 seconds, which is a number set by the SIDE QUEST rather
than by the rooms. Chapter II's four speakers are about 3,050 characters of
dialogue, and dialogue is time spent standing still: sixty-five seconds of a
two-hundred-and-forty second day, minimum. At the 45 it held before, Room 5
emptied from full in thirty-three seconds and one conversation cost more than
a room's entire life — the chapter asked the player to choose and then made
one of the choices impossible. At 70 the longest conversation plus the drive
back always fits, and two in a row late in the day do not.

Read the building, not the HUD: a draining room visibly dims from the
corridor. The meter is a fallback, not the primary signal.

### 5.3 Chapter III — At Capacity · *the conference*

**Objective: do Devoxx. You cannot do all of it.**

The building is full, everything is running, and the three robots are
attending the conference. The crowd is spectacle and obstacle — slow bodies
that narrow every route — and it is never *managed*. The packed hall against
Chapter I's empty one, same corner and same camera, is the screenshot the
README opens with.

Control is `switch`, and **the clock never stops**. Wherever you are, the
other two are idling somewhere expensive.

#### The card — seventeen things, and no day is long enough for seventeen

Open activities can be done whenever. Windowed ones are gone forever when
their window closes. That is a conference, and it is the mix of a checklist
and a timetable.

| # | Activity | Where | Kind | Who can | Window |
|---|---|---|---|---|---|
| 1 | Badge scan | Reception | `dwell` 2 s | any | open |
| 2 | Sticker sweep, 27 stands | Hall | `tap` ×27 | 12 stands sit behind 0.8 m gaps — **Voxxy alone** | open |
| 3 | Pick up your polo | Polo Pickup | `dwell` 3 s, reach 2.0 m | **Droid** | open |
| 4 | Coffee run | The Foyer, storey 1 | `haul` 2 kg, **spills over 2.5 m/s²** | Voxxy or Droid | open |
| 5 | Crate of shirts to the pickup room | Hall → Polo | `haul` 60 kg | Droid or Biggy | open |
| 6 | The keg to the party stage | loading bay → hall floor | `haul` 200 kg | **Biggy** | before T+4:30 |
| 7 | Catch the talk in Room 5 | storey 1 | `attend` | not Biggy | T+1:00 → T+1:40 |
| 8 | Catch the talk in Room 11 | storey 1 | `attend` | not Biggy | T+2:20 → T+3:00 |
| 9 | Ask a question at the mic | a stage, storey 1 | `dwell` 2 s, reach 2.0 m | **Droid**, and it must get down a rake on a 0.18 m riser it clears by nothing | inside a talk |
| 10 | Free the jammed shutter | Hall, loading bay | `shove` ≥ 900 kg·m/s | **Biggy** | open, and it gates #6 |
| 11 | The queue for the toilets | Concourse | `dwell` 20 s | any | open |
| 12 | The keynote | Room 8, storey 1 | `attend`, seated before T+5:20 | not Biggy | T+5:20 → end |
| 13 | Three conversations — the desk, a stand, the steward | Concourse, hall, storey 1 | `talk` | the steward is reach-gated: **not Biggy** | open |
| 14 | Find the photographer | Hall, central aisle | `talk` | any | open |
| 14b | A selfie with him | Hall, central aisle | `dwell` 2 s, the print taken off the live frame | any | open, after #14 |
| 15 | The shot list — four photographs | Room 8, BOF 1, hall ×2 | `dwell`, and the last needs **all three robots at once** | one robot per frame: the letters **Droid** (`reach` 2.0), the banner **Voxxy** (`maxRadius` 0.40), Josh **Biggy** (`carry` 100, he sits on it); then everybody | open, chained |

Six minutes. Seventeen rows. Three robots, each locked out of several.

**#10 gates #6**, so Biggy's day is a run-up, a shutter and a keg, which is
exactly what a 430 kg hauler should spend a conference doing.

**#15 is the one that is not about time.** Four photographs, and the last of
them wants every robot in the same five metres of floor — but `switch` only
ever drives one, so the other two have to have been left there earlier by a
player who knew they would be wanted. It is the only thing in the game that
asks where all three machines are at once, and it is the only errand that
ends with something to keep rather than something ticked: each photograph
puts a print on the screen. A chapter whose whole sentence is *you cannot do
all of it* should have one thing in it worth losing the rest for.

#### The building has to name the rooms

Two of the three chapters address the player in room numbers — "keep Room 5
running", "catch the talk in Room 11" — and until 21 Sep the building did not
say which of fourteen identical doors was which. An objective that names a
room the venue does not name cannot be attempted, only guessed at.

Every auditorium has its number on the wall at the back of the room, facing
south, in characters a metre tall on a dark plate. Nothing is signed out in
the corridor — the number belongs to the room, and because this camera looks
over a room's south wall it is legible from the corridor anyway, which is
where it is needed.

Facing south is the whole design, and three separate facts about the
renderer force it. They have to be answered at once, which is why a pass
that fixed them one at a time ended up painting the numbers on the floor
instead:

| Fact | What it kills | The answer |
|---|---|---|
| The view is fixed to the south-west, so only south and west faces are visible | A number on a north-south wall is readable or hidden behind the wall it is bolted to, depending only on which side of the corridor its room is. Half a numbering system | The back wall of a room runs east-west and faces south, so it reads in every room |
| `MAX_DRAWN_HEIGHT` clips geometry 2.7 m above the storey datum | A sign hung where a real one hangs comes back as a five-centimetre sliver | The characters top out at 2.15 m |
| The key light is nearly overhead — a south face reflects about a third of what an upward one does | Light characters on a light wall, legible in the geometry and invisible on screen | Light characters on a **dark plate** |

Two supporting pieces came out of it. `signPlate` is a palette entry, dark in
all three eras, and the only thing in the game whose job is to supply
contrast the lighting will not. `signChar` is a material — the same ink as a
stage letter, distinguished from it because `npm run venue` asserts that
stage letters stand within two metres of the screen wall, and fourteen room
numbers at the other end of their rooms tripped that check fourteen times
over the first time they existed.

#### The constraint the building handed us

The wheelchair ramp is the only route between the hall and the concourse that
Biggy can use: 1.2 m of rise over 12 m of run, a 10% gradient, against a
`maxSlope` of 0.11. It clears it **empty, by one percentage point.**

Carrying the keg, Biggy's limit is `0.6 · 774 / (630 · 9.81)` = **0.075**, and
it cannot get up. Run the arithmetic the other way and Biggy can take at most
**43 kg** up that ramp.

Be precise about where the 0.6 comes from, because it is doing real work
here: it is `SLOPE_SAFETY`, the margin every `maxSlope` in `RobotSpec` is
already spec'd at, leaving a robot enough force to make progress rather than
to balance. Without it the raw force balance says a laden Biggy would crawl
up at 0.13 m/s² — about ninety seconds for twelve metres, a quarter of the
chapter, which is not a route either. The rule and the physics agree on the
answer; the rule is just the one that states it definitely.

So: *anything heavy stays on the exhibition floor.* The hall is the loading
floor and the party is in the hall, which is where Devoxx actually holds it.
This was not designed, it was discovered — it is what the surveyed geometry
and the measured motors already said to each other — and it is the single most
convincing thing in the design.

Two consequences, both binding:

- No objective may ever require a loaded Biggy to change level.
- **`npm run traverse` asserts both halves** — that Biggy climbs the ramp
  empty, and that it cannot with the keg — so that neither can be lost. The
  first assertion matters as much as the second: make Biggy weaker and it is
  stranded on one level with no way back.
- The ramp needed a **threshold lip** at its foot before any of this was
  true. `canTraverse` said no and no geometry said anything, so a laden Biggy
  walked up a ramp it cannot climb and the concourse plate lifted it 1.2 m
  for free. It now carries one solid marked with the link's id, exactly as
  every stair tread in the building does: invisible to whoever may use the
  ramp, a wall to whoever may not. The harness found this within a minute of
  the assertion existing.

#### The ending

Biggy cannot climb a staircase, so **Biggy cannot attend the keynote**. The
last thing the chapter does is send two robots upstairs into a full room while
the heavy one waits in the hall it spent all day working. The end card counts
what you did and what you missed, over Room 8 filling with 694 people — the
same seats the player drove past alone in the dark in Chapter I.

---

## 5.4 The people

Built 21 Sep. `crowdDensity` carried the emotional arc of the game on paper
from the first spec — 0.0 empty, 0.35 sparse, 1.0 at capacity — and drove
nothing at all. It now drives the population, and nothing else had to be
added to a chapter to make that work: density was already one of the four
things a chapter may change.

**Two populations, and the split is why it is affordable.**

| | What it is | Cost |
|---|---|---|
| **Seated** | Thousands. Read off the venue's own surveyed seating, one candidate per seat, thinned to the era's occupancy | Baked into the storey at build. One draw call, nothing per frame |
| **Movers** | A few hundred roamers, plus one speaker on each stage in use | Simulated at 20 Hz, drawn as one instanced mesh |

Chapter I has neither, which is Chapter I.

| | Seated | On foot | Rooms in use |
|---|---|---|---|
| **I — The Silence** | 0 | 0 | none |
| **II — JavaPolis** | 745 | 159 | 5 of 14 |
| **III — At Capacity** | 2743 | 454 | 14 of 14 |

**Which rooms are in use is derived, not declared** — a chapter may not gain a
fifth field for it. Every room the objective actually names comes first
(Chapter II tends five, Chapter III sends you to three), then the list is
filled out to `crowdDensity` of the building's fourteen. The arithmetic lands
where the design already said it should: 0.35 × 14 is five, which is exactly
the five Chapter II tends and exactly the "half the floor in use" the spec
describes.

**The population is capped at 3200**, which is roughly what Devoxx sells.
Filling every seat of all fourteen rooms is 5221 people before anyone stands
up — most of a second conference. Seated and roaming come out of one ticket
budget, so at capacity every room is about two thirds full and the building
holds the right number of people. Same rule `SPEC.md` §8 already applies to
the seat counts: the geometry follows the plan, the crowd follows the modern
number.

**A person is three boxes and a blob.** Legs, torso, a shoulder line, and a
rounded head — all sharing one centre line, so a heading rotates the whole
figure with one number. At twenty-odd pixels what reads is silhouette: the
head narrower than the shoulders and the shoulders wider than the waist.

Arms read as **tone, not silhouette**, and that took two goes to get right.
The first attempt built them sticking out, measured the seven centimetres a
real arm protrudes past the body, found it came to two pixels, and deleted
them — the right measurement answering the wrong question. An arm at this
size is two darker strips either side of a lighter torso, in the same plane
as it. The shoulders are a rounded blob rather than a flat cap, because a
slab across the top of a narrow torso reads as epaulettes.

**Sitting is an L, not a post.** The first version stood a torso on the pan
and it read as a pillar planted in front of the chair: no lap, no knees, and
perched on the front edge because it was centred on the seat. Sitting is the
horizontal run of the thighs forward of a torso pushed back against the
rest, with head and shoulders over the seat back in front. Every seat faces
along x, so "forward" comes out of the heading as a sign and the parts stay
axis-aligned — which is what lets three thousand of them bake into one
instanced mesh with no rotation at all.

Colour comes from the chapter's one `crowd` entry and is derived from there,
the way the skid marks derive from the floor: trousers are it darkened,
clothing is it varied per person, and the head is it lifted towards this
era's near-white. So the crowd is still exactly the colour the chapter chose
and still has a head you can pick out. A mass in one flat colour is a
texture; the per-person variation is what stops three thousand identical
figures reading as packaging.

People also keep out of each other — resolved within a grid cell only, which
at a couple of hundred people over a thousand cells costs nothing and breaks
up the knots that form when several of them pick the same cell to walk to.

**Performance is unmeasured and needs a human.** A packed Chapter III runs
its simulation at about a quarter of real time under the headless software
renderer this project is developed against — against an empty Chapter I,
which keeps up. Halving the crowd's triangle count moved that not at all,
so the cost is fill rate: thousands of small overlapping objects shaded
pixel by pixel on a CPU, which is precisely what a GPU makes free. Nothing
here can tell us whether it is a problem on real hardware, and it belongs
next to "judge the feel" on the human list.

**People get out of the way of robots; robots are unaffected by people.** The
avoidance radius grows with the robot's speed, so a machine crossing the hall
opens a path ahead of itself and a parked one is walked around. That bow wave
is the only place a player sees the crowd react to the mass they are driving,
and it costs a subtraction per person per tick.

Deliberately NOT built: any force from the crowd back onto the robots.
Movement is tuned, measured and worth 20 points, and a drag term would change
every figure in §2 while being invisible to `npm run physics`, which
measures in an empty world. If the crowd should push back, it needs its own
measurement first.

## 6. What this changes elsewhere

| File | Change |
|---|---|
| `core/Body.ts` | `payload` kg; every force divides by `mass + payload` |
| `core/RobotSpec.ts` | `payload` capacity: Voxxy 10, Droid 90, Biggy 400 |
| `core/Activity.ts` | **new** — the five kinds, capability checks, zone tests |
| `core/Objective.ts` | **new** — activity set, clock, end rule, progress |
| `core/Sim.ts` | implement `Obstacle.movable` / `mass` for `shove` |
| `chapters/Chapter.ts` | `objective: Objective`, not `string` |
| `app/ChapterScreen.ts` | run the objective, draw the clock and the card |
| `render/BlockoutRenderer.ts` | per-zone light level (Chapter I), lamp on the cast |
| `tools/traverse.mjs` | loaded-robot cases, including the ramp assertion |
| `tools/physics.mjs` | measure the loaded envelopes in the table in §2 |
| `tools/objectives.mjs` | **new** — `npm run objectives`, see below |
| `core/Crowd.ts` | **new** — the population, seeded and deterministic |
| `chapters/Chapter.ts` | a `crowd` palette entry; the era colours its people |

Nothing here needs pathfinding, crowd AI, an order vocabulary or a behaviour
tree. That is deliberate: every one of those was considered and cut, and the
schedule is the reason.

### `npm run objectives`

An objective is coordinates, and coordinates are what this project gets wrong
most often and notices last. A zone two metres out sits inside a seat bank,
and the only symptom is a chapter that cannot be finished by a player doing
everything right — the worst possible thing to discover on the last day, and
invisible in a screenshot of anywhere else.

So every activity in every chapter is held against the building: it is inside
a room on the storey it claims, its centre is not inside a solid, at least one
robot in that chapter's cast passes its gates AND can reach that storey, and a
haul's drop zone gets all of the same. Windows are checked for being possible
to be present for.

It found four on its first run — the keg inside an exhibition stand, and the
Room 5, Room 11 and keynote zones all centred in the seating. Three of those
were the same mistake: "be in the room" has to mean the cross aisle, because
the rest of an auditorium is seat banks and a four-metre rake.

## 7. Order of work

Unchanged from `ROADMAP.md`, and now cheaper than the plan it replaces:

1. Payload + Activity + Objective in `core/`, with `npm run physics` extended
   to the loaded cases. Everything below is configuration.
2. **Chapter I** (Tue 22) — three activities and the zone lighting.
3. **Chapter III** (Thu 24) — fifteen activities, the clock, the card. No crowd
   simulation to write, so the differentiator lands days earlier than feared.
4. **Chapter II** (Sat 26) — meters and the drain. Still the shrinkable one.

## 8. Still open

- Audio. Footfall per robot is still the highest-value sound, and a *loaded*
  footfall should be heavier — the payload mass is already there to scale it.
- How the crowd is drawn at density 1.0: instanced bodies that wander slowly,
  or static clusters. It is an obstacle field either way, and nothing in the
  objective system depends on the answer.
- Whether Chapter II's drain reads clearly as room light alone, or needs the
  meter after all. A playtest question, not a design one.
- Exact placement of the twelve Chapter III activities in metres. The rooms
  they belong to all exist; the coordinates do not yet.
