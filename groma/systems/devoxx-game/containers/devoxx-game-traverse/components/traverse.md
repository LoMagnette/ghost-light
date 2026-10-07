---
type: C4 Component
title: Traverse
status: stable
groma:
  id: traverse
  parent: devoxx-game-traverse
  code:
    - scanner: javascript
      file: tools/traverse.mjs
  technology: Node, tsc
description: Drives real robots at real stairs and ramps in the real Sim and asserts where each one ends up.
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [tools/traverse.mjs](../../../../../../tools/traverse.mjs) | [src/venue/kinepolis.ts](../../../../../../src/venue/kinepolis.ts) | Drives robots at real stairs | Node, tsc |
| [tools/traverse.mjs](../../../../../../tools/traverse.mjs) | [src/core/Sim.ts](../../../../../../src/core/Sim.ts) | Runs the real sim | Node, tsc |
| [tools/traverse.mjs](../../../../../../tools/traverse.mjs) | [src/core/RobotSpec.ts](../../../../../../src/core/RobotSpec.ts) | Checks each robot's step limit | Node, tsc |
| [tools/traverse.mjs](../../../../../../tools/traverse.mjs) | [src/core/Traversal.ts](../../../../../../src/core/Traversal.ts) | Asserts who reaches where | Node, tsc |
