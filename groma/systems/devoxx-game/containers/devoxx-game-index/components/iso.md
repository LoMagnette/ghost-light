---
type: C4 Component
title: Iso
status: stable
groma:
  id: iso
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Iso.ts
  group: Physics core
description: 'The view: where the fixed isometric camera stands, and how big one metre is on screen.'
---

World space is metres (+x east, +y north, +z up) and is also the scene's own coordinate system, so there is no longer a projection function in the middle that the simulation and the picture could disagree about. The orthographic camera at a fixed 45-degree south-west azimuth is the whole of the classic isometric look that survived the move from the 2D renderer.
