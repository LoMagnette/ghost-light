---
type: C4 Component
title: Sim
status: stable
groma:
  id: sim
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Sim.ts
  group: Physics core
description: 'The fixed-timestep simulation loop: physics runs at a constant 120 Hz behind whatever rate the display renders at.'
---

An accumulator absorbs the variable frame delta so the physics itself never sees one; rendering interpolates between the last two simulation states for a smooth picture. This matters for scoring because heavy, force-limited-braking bodies are extremely sensitive to timestep: run Biggy at a variable delta and its stopping distance changes exactly when a judge is watching it slide into something.
