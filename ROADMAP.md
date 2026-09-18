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

- **Stack** — Phaser 4.2.1, TypeScript strict, Vite 6. Typecheck and
  production build both pass.
- **Physics** — custom fixed-timestep 120 Hz simulation with real mass.
  Not Arcade Physics. See `src/core/`.
- **Venue** — the Kinepolis defined once in metres, both floors, as a
  blockout. See `src/venue/kinepolis.ts`.
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
- **Specs** — `SPEC.md` and `CLAUDE.md` written and committed.

Not yet existing: any art, any audio, any objective logic, and any chapter you
can actually finish.

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
| Tue 22 Sep | Chapter I objective and a finishable round. ~~Floor traversal~~ **done early** | Agent |
| Wed 23 Sep | Chapter I lighting, end card, first-run experience | Agent |
| Thu 24 Sep | Chapter III direct-order mode — the differentiator | Agent |
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

4. **Generate the robot art.** 8 facings × idle / walk / run per robot, plus
   one ability animation each. The references page has a usable starting
   prompt. Nothing derived from the Robot Lab robot — that is a zero on the 40
   originality points.
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
- Palette extraction from the photographs, same condition.
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
| What is "the power" in Chapter I? | Tue 22 Sep | A cached session recording in a projection booth; finding it opens the other chapters |
| How does issuing intent work in Chapter III? | Thu 24 Sep | Click a destination; the robot paths to it under its own momentum |
| Does the player ever drive Biggy directly? | Thu 24 Sep | No. Biggy is always directed, which is what makes it feel heavy |
| ~~How do robots climb stairs?~~ | ~~—~~ | **Settled 18 Sep: by `maxStepRise`. Voxxy 0.20 m, Droid 0.18 m, Biggy 0.00 — Biggy never climbs.** See SPEC § 5 |
| Does Biggy ever reach floor 1? | Thu 24 Sep | No — it stays on the exhibition floor, unless a goods lift goes in |
| What is the failure state in Chapter II? | Sat 26 Sep | A room empties if untended; lose three and the round ends |
| Audio: generated or library? | Mon 28 Sep | Generated, so it belongs in the prompt log |
| ~~Final title~~ | ~~Wed 30 Sep~~ | **Settled 18 Sep: _Ghost Light_** |

The Chapter III decision deserves real thought. It is the mechanic the entry
bets its originality on, and "click a destination" is the safe version rather
than the interesting one.

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
