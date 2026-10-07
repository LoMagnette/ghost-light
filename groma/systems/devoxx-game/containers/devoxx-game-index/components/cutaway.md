---
type: C4 Component
title: Cutaway
status: stable
groma:
  id: cutaway
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/render/Cutaway.ts
  group: Rendering
description: Makes the building fade around a robot the fixed camera cannot otherwise see past.
---

With a real depth buffer the wall correctly wins over the robot behind it, so this fades anything between the camera and a tracked robot to CUTAWAY_FADE in a soft disc, leaving the rest of the wall solid, rather than fading the whole wall as the old 2D painter's-algorithm renderer could get away with.
