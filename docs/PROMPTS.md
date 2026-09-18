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

### _(pending)_ Auditorium and corridor geometry from the floor plans

### _(pending)_ Palette extraction from the venue photographs

---

## Audio

### _(pending)_ Footfall and ambience

Footsteps are the highest-value sound in the game — they are what sell mass,
and mass is 20 points.
