---
type: C4 Component
title: Traversal
status: stable
groma:
  id: traversal
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Traversal.ts
  group: Physics core
description: 'Getting between levels: whether a given robot can climb a given flight or ramp.'
---

The rule is one number per robot, maxStepRise, measured against the building's actual riser height, rather than a per-robot flag; Voxxy clears the stairs, Droid matches them exactly, Biggy never climbs anything. A ramp has no step to get over, so maxSlope decides that case instead. The same flight is therefore a route for one robot and a wall for another by construction, not by a special case.
