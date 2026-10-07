---
type: C4 Component
title: RobotSpec
status: stable
groma:
  id: robotspec
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/RobotSpec.ts
  group: Physics core
description: 'Physical specifications for Voxxy, Droid and Biggy: mass, drive, brake and grip.'
---

The single most important tuning surface in the project, since 'do the robots move like machines with mass' is 20 of the 100 judging points. The feel of each robot is the ratio between drive, brake and mass rather than any one number; momentum (mass times speed) is why Biggy is frightening and Voxxy is nimble, and why their masses sit an order of magnitude apart.
