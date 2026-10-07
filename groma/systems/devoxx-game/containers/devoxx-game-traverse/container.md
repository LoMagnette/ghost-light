---
type: C4 Container
title: Traversal check
status: stable
groma:
  id: devoxx-game-traverse
  parent: devoxx-game
  technology: Node, tsc
description: Drives real robots at real stairs and ramps inside the real Sim and asserts who reaches which storey.
---

The stair rule is decided across four places at once: the riser on a Link, maxStepRise on a RobotSpec, whether a tread collides in Sim, and whether the surface is reachable from where the robot stands. Any one of them can be right while the behaviour is wrong, and the failure is never an exception, so this exercises the real simulation rather than reading the rule back out of its inputs.
