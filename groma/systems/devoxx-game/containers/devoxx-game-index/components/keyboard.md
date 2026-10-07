---
type: C4 Component
title: Keyboard
status: stable
groma:
  id: keyboard
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/input/Keyboard.ts
  group: Input
description: Raw keyboard state read straight off the DOM, replacing the keyboard plugin a game framework would otherwise supply.
---

Keys are identified by KeyboardEvent.code, physical position rather than character produced, so a player on an AZERTY layout pressing the key where W sits on QWERTY still drives north-east, matching every other game's behaviour.
