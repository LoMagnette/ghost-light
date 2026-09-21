# Roadmap

Twelve days to the deadline: **Wed 30 September 2026, 23:59 CEST**.

`SPEC.md` § 7 holds the milestone view — what "done" means at each stage. This
file holds the dated view and, more usefully, **who owns what**. The short
version of the division of labour:

> The agent owns everything text-shaped. The human owns everything that needs
> eyes, ears, hands or credentials.

---

## Where things stand

As of 18 Sep 2026, the scaffold is committed and verified running, and movement
is tuned and measured.

- **Stack** — three.js, TypeScript strict, Vite 6. Typecheck and
  production build both pass.
- **Physics** — custom fixed-timestep 120 Hz simulation with real mass.
  Not Arcade Physics. See `src/core/`.
- **Venue** — the Kinepolis defined once in metres, both floors, as a
  blockout. See `src/venue/kinepolis.ts`. Fitted out: 5171 seats laid out row
  by row against the counts printed on the plan, a presenter's desk on all
  fourteen stages, and `#DEVOXX` on the two big ones. Seating is drawn per seat
  and collided as three blocks a room.
- **Levels** — a storey is not a plane. The reception concourse stands 1.2 m
  over the exhibition hall, and every auditorium floor DROPS from the corridor
  to its stage, one 0.18 m riser per row of seats — 4.50 m in Room 8. Those
  rakes are real staircases, so the stair rule decides who reaches a stage:
  Biggy gets to the back row of all fourteen rooms and the front of none.
- **Chapters** — three, as data, sharing one gameplay scene.
- **Movement** — measured, not assumed. Biggy carries 1366 kg·m/s at cruise,
  needs 3.8 m to brake and 10.6 m to coast down, and carves a 4.05 m turn where
  Voxxy pivots in 1.80 m. The first measurement found all three robots stopping
  within 0.2 m of each other; see `docs/PROMPTS.md`.
- **Verification** — `npm run shoot` boots the built game headless, drives all
  three chapters and exits non-zero on any console error. `npm run physics`
  measures movement in the real sim with no browser at all and fails when the
  cast stops being three distinguishable machines.
- **Feel** — camera leads by the robot's own stopping distance, impact shake
  and footfall kick scale with momentum, skid marks show the arc a robot
  actually took, and a floor marker shows where it would stop if you braked now.
- **Specs** — `SPEC.md`, `CLAUDE.md` and `docs/MECHANICS.md` written and
  committed.
- **Mechanics** — settled and built on 21 Sep. One activity vocabulary in
  `core/` (tap, dwell, haul, attend, shove, tend), an objective runner, and
  **payload as real mass**: what a robot carries is added to `Body.mass` and
  divides every force, so a laden machine accelerates, brakes, turns and
  climbs worse by arithmetic rather than by a rule.
- **The cast has faces.** Voxxy is a visored oval head on a teardrop body,
  Droid is two metres of slab torso and ochre shoulders, Biggy is an orange
  belly under a blue-grey cap. Built from primitives against the model
  sheets, so the drawing scales off `RobotSpec` and cannot drift from the
  body that collides.
- **Chapter I is finishable.** Three distribution boards, each lighting a
  zone of the building when it is tapped, and a lamp on Voxxy so the dark is
  something you carry a hole in. Chapters II and III are authored as data
  against the same vocabulary and pass the placement harness, but have not
  been played through.
- **Verification** — a fourth harness, `npm run objectives`, holds every
  activity against the building. It found four unreachable zones on its first
  run, and `npm run traverse` found that a laden Biggy could walk up a ramp
  it cannot climb.

Not yet existing: any art, any audio, and a played-through Chapter II or III.

**Next human step:** press `L` at the menu and drive all three. The numbers say
the robots differ; only you can say whether Biggy is *satisfying*, and that
judgement is 20 points and is not delegable.

---

## The twelve days

Risky work early, pretty work late. Chapter III comes before Chapter II
because it is the differentiator and its risk must be resolved while there are
still days left to react.

| Date | Focus | Who |
|---|---|---|
| Fri 18 Sep | Scaffold, specs, verification harness, **movement feel, title, repo + Pages live** — all done | Both |
| Sat 19 Sep | **Public repo + Pages live.** Still the only real blocker | Human |
| Sun 20 Sep | ~~Movement feel against grey boxes~~ — **done early.** Human to judge the feel in the lab and call the adjustments | Agent done, human judges |
| Mon 21 Sep | ~~Venue geometry refined from the real floor plans~~ — **done early**, then re-measured after review | Agent, human caught it |
| Tue 22 Sep | ~~Chapter I objective and a finishable round~~ — **done 21 Sep**, along with the whole mechanics spec and the objective system under it | Agent |
| Wed 23 Sep | Chapter I lighting, end card, first-run experience | Agent |
| Thu 24 Sep | Chapter III — the conference day. The differentiator, and cheaper than the mode it replaced | Agent |
| Fri 25 Sep | Chapter III finished. **First submission** | Both |
| Sat 26 Sep | Chapter II | Agent |
| Sun 27 Sep | Art pass: robot sprites from the model sheets | Human generates, agent integrates |
| Mon 28 Sep | Audio, lighting polish | Human generates, agent integrates |
| Tue 29 Sep | Playtest with someone who has never seen it | Human |
| Wed 30 Sep | README, prompt log, resubmit before 23:59 CEST | Both |

Assumes evenings plus both weekends. With less time available, cut in the
order given below rather than compressing every day.

---

## Human-only tasks

Nine items. The first three block everything else.

### Blocking

Both of the original blockers cleared on 18 Sep. Only the reference downloads
remain, and they gate real work: the agent can read images, so the venue and
the palettes stay guesses until the files are on disk.

1. ~~**Create the public repo and push.**~~ **Done 18 Sep** —
   <https://github.com/LoMagnette/ghost-light>.

2. ~~**Turn on Pages.**~~ **Done 18 Sep** —
   <https://lomagnette.github.io/ghost-light/> serves HTTP 200 and the bundle
   hash matches a local `VITE_BASE=/ghost-light/` build.

   Judges try a hosted build before cloning. This is the first impression, and
   it now exists on day one of twelve rather than day twelve.

3. ~~**Download the reference assets into `references/`.**~~ **Done 18 Sep** —
   plans, photographs and model sheets all on disk, and the venue has been
   rebuilt from the plans. The photographs are still unread; palettes are next.

   The original note, kept because it explains why this mattered: the agent's
   sandbox
   reaches only package registries and GitHub, so it cannot fetch from
   `game.devoxx.be`. See `docs/ASSETS.md` for the file list.

   Worth more than it looks: **the agent can read images**. Once the plans are
   on disk it can refine the venue against the real floor plans, and pull
   palettes straight from the photographs, rather than working from a
   description.

### Not blocking, but still human

4. ~~**Generate the robot art.**~~ **Largely answered in code, 21 Sep.** Each
   robot is a handful of primitives built from its model sheet's own
   proportions and flat-shaded in its livery, which matches the blockout the
   rest of the game is drawn in and needs no asset pipeline. Nothing is
   derived from the Robot Lab robot. What is left is animation — idle, walk,
   run, one ability each — which is moving parts of a group rather than
   rigging a mesh, and is agent work.
5. **Watch the four drone flights.** They give ceiling heights, room volumes
   and how one space opens into the next. Report anything that contradicts the
   blockout.
6. **Judge the feel.** The agent can tune mass and force numbers and read them
   back, but cannot feel whether Biggy is satisfying to drive. That judgement
   is 20 points and is not delegable.
7. **Audio.** Footfall per robot is the highest-value sound in the game — it is
   what sells mass.
8. **Playtest with a stranger.** Someone who has never seen it, while you stay
   completely silent. Write down every hesitation. This is the 15 playability
   points and it is the step people skip.
9. **Submit the form.** Name, email, repo URL, hosted URL, tech + genAI
   description. Submit on the 25th and again at the end — they judge the most
   recent entry, so an early one is free insurance.

---

## Agent-owned work

Needs no input beyond the three blockers above.

- All gameplay code: objectives, win/lose states, the two remaining control
  modes, robot abilities, crowd simulation, camera, HUD, end cards.
- Venue refinement from the floor plans, once on disk.
- ~~Palette extraction from the photographs.~~ **Done 18 Sep** — every colour
  in `registry.ts` traces to a photograph. See `docs/ASSETS.md`.
- Sprite integration once art exists — atlas packing, 8-direction facing
  logic, animation state machines.
- Movement tuning to a description. "Biggy should feel like it is on ice" is
  something the agent can turn into numbers; the human says whether it landed.
- All documentation: `README.md`, `SPEC.md`, `docs/PROMPTS.md`, the
  submission's tech description.
- Verification: typecheck, build, headless screenshot runs, reading frames back.

---

## Open decisions

Each has a default, so none of them stalls work. The first two are where a
human answer is genuinely better than the agent's guess.

| Decision | Needed by | Default if unanswered |
|---|---|---|
| ~~What is "the power" in Chapter I?~~ | ~~Tue 22 Sep~~ | **Settled 21 Sep: three distribution boards, each lighting one zone. The third brings up the ghost light and starts the recording that is Chapter II.** |
| ~~How does issuing intent work in Chapter III?~~ | ~~Thu 24 Sep~~ | **Settled 21 Sep: it does not. `direct-order` is cut. Chapter III is the conference — twelve activities against a six-minute day, and payload is real mass.** |
| ~~Does the player ever drive Biggy directly?~~ | ~~Thu 24 Sep~~ | **Settled 21 Sep: yes, in Chapter III and only there. Confined to storey 0 all chapter.** |
| ~~How do robots climb stairs?~~ | ~~—~~ | **Settled 18 Sep: by `maxStepRise`. Voxxy 0.20 m, Droid 0.18 m, Biggy 0.00 — Biggy never climbs.** See SPEC § 5 |
| ~~Does Biggy ever reach floor 1?~~ | ~~Thu 24 Sep~~ | **Settled 21 Sep: never. No goods lift. It is why Biggy cannot attend the keynote, and loaded it cannot even use the ramp.** |
| ~~What is the failure state in Chapter II?~~ | ~~Sat 26 Sep~~ | **Settled 21 Sep: a room drains, goes dark and never returns. Three dark rooms end the day early.** |
| Audio: generated or library? | Mon 28 Sep | Generated, so it belongs in the prompt log |
| ~~Final title~~ | ~~Wed 30 Sep~~ | **Settled 18 Sep: _Ghost Light_** |

All five closed on 21 Sep in one design pass; `docs/MECHANICS.md` is the
result and is now the authority on what the player does in each chapter. The
Chapter III decision took four rejected pitches to get right — every version
of "issue intent, the robots execute" was an RTS order queue wearing a hat.
What replaced it is the conference itself, and the mechanic the entry now bets
its originality on is that **everything you pick up is added to your mass.**

---

## Cut order

Cut in this order if behind. Each step still leaves a coherent entry — the
advantage of an anthology is that it degrades gracefully where a single deep
game does not.

1. **Chapter II shrinks to a 60-second set piece.** One room, one task. The
   three-part arc survives intact.
2. **Chapter II goes entirely.** Two chapters still show the control scheme
   evolving, which is the actual idea. Retitle so nothing dangles.
3. **Audio drops to footfall only.**
4. **Art stays partial.** Voxxy gets real sprites, the other two stay
   stylised blocks. A consistent grey-box look reads as deliberate style; a
   half-finished art pass reads as unfinished.
5. **One floor instead of two.** The brief permits it: *"You can use one level
   or both."*

### Never cut

Pass/fail, or cheap points where dropping them costs more than it saves:

- the live hosted build
- the MIT `LICENSE`
- a README that gets a judge from clone to playing
- all three robots doing distinct things
- `docs/PROMPTS.md`

**Submit a working version on 25 Sep regardless of how finished it feels.**
