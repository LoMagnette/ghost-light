---
type: C4 Component
title: Physics
status: stable
groma:
  id: physics
  parent: devoxx-game-physics
  code:
    - scanner: javascript
      file: tools/physics.mjs
  technology: Node, tsc
description: Measures real movement against RobotSpec's design envelope.
---

Compiles and runs src/core directly under Node, with no browser, since core/ imports nothing outside itself.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [tools/physics.mjs](../../../../../../tools/physics.mjs) | [src/core/Sim.ts](../../../../../../src/core/Sim.ts) | Runs the real sim | Node, tsc |
| [tools/physics.mjs](../../../../../../tools/physics.mjs) | [src/core/RobotSpec.ts](../../../../../../src/core/RobotSpec.ts) | Checks against the design envelope | Node, tsc |
| [tools/physics.mjs](../../../../../../tools/physics.mjs) | [src/core/Body.ts](../../../../../../src/core/Body.ts) | Measures real movement | Node, tsc |
