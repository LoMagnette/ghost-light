---
type: C4 Component
title: Keyboard controller
status: stable
groma:
  id: keyboardcontroller
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/input/KeyboardController.ts
      symbol: KeyboardController
  group: Input
description: Turns Keyboard state into a robot's DriveInput.
---

Deliberately screen-relative rather than world-relative: W always moves the robot up the screen, which in a fixed isometric view means north-east in world space, matching what every isometric game player already expects. Shift is a real brake, applying the robot's full braking force rather than merely cutting throttle; releasing the stick lets the robot coast on its own momentum.
