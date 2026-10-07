---
type: C4 Component
title: Kinepolis
status: stable
groma:
  id: kinepolis
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/venue/kinepolis.ts
description: 'The one authored instance of the venue: the Kinepolis Antwerp, surveyed from the competition floor plans and expressed in metres.'
---

Each floor was scaled independently from a physical measurement printed on its own plan (a labelled room area on floor 0, a seat row pitch on floor 1), then every wall and room was measured at that scale rather than estimated from rules of thumb. Defined once and read by three chapters, by the renderer, and by every Node verification tool, so there is exactly one copy of the building's numbers to keep true.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/venue/kinepolis.ts](../../../../../../src/venue/kinepolis.ts) | [src/core/Venue.ts](../../../../../../src/core/Venue.ts) | Implements venue types | TypeScript |
