---
type: C4 Component
title: Touch
status: stable
groma:
  id: touch
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/input/Touch.ts
  group: Input
description: On-screen touch controls for playing on a phone.
---

Drives nothing directly: the virtual stick writes to Keyboard.stick and every button presses or holds a key code, so a chapter answers a thumb exactly as it answers WASD, Shift and E, with no second input path to keep in step. Laid out in real screen pixels outside the scaled 1280x720 stage, since a button scaled down with the stage would be too small to reliably hit.
