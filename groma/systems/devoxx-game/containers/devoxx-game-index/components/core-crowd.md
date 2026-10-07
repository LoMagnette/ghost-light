---
type: C4 Component
title: Crowd
status: stable
groma:
  id: core-crowd
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Crowd.ts
  group: Physics core
description: The people in the building, driven by a chapter's single crowdDensity number.
---

Two populations for affordability: seated people, who never move and are drawn once as static instanced geometry at zero per-frame cost, and a walking crowd, simulated through the same Body integrator as the robots. Seeded, so the crowd is deterministic between runs.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/core/Crowd.ts](../../../../../../src/core/Crowd.ts) | [src/core/Venue.ts](../../../../../../src/core/Venue.ts) | Reads rooms to seat and walk people | TypeScript |
