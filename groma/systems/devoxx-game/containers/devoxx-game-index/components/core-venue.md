---
type: C4 Component
title: Venue types
status: stable
groma:
  id: core-venue
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Venue.ts
  group: Physics core
description: 'The venue''s own vocabulary: the Room, Link and Obstacle types the building is described in.'
---

Generic geometry types used by both the physics core (for collision and reachability) and the renderer; src/venue/kinepolis.ts is the one authored instance of this vocabulary, the actual surveyed Kinepolis.
