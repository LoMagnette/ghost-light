---
type: C4 Component
title: Wormhole
status: stable
groma:
  id: wormhole
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/render/Wormhole.ts
  group: Rendering
description: The vortex-and-light-column effect a chapter's exit uses to end a run.
---

Purely visual: it never collides and the simulation never hears of it. The robot that passes through is animated by a pose on the renderer rather than actually moved, so the fixed-step simulation stays deterministic right up to the moment a chapter hands over. Drawn flat on the floor, in keeping with the fixed isometric view, rather than standing up facing the camera.
