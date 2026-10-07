---
type: C4 Component
title: Sfx
status: stable
groma:
  id: sfx
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/sfx.ts
  group: Audio
description: 'Every sound effect the game makes without a file: robot footfalls and interface sounds.'
---

Synthesised rather than sampled, because the simulation already knows what a recording cannot: how much momentum a foot came down with and which robot it belonged to. Each robot has its own footfall timbre (Voxxy ticks, Droid clanks, Biggy thuds), so mass is heard as well as felt through the camera. Built from a few oscillators and a noise burst per sound, shaped by an envelope and discarded once it stops; the one sound that persists is a motor hum, which a screen owns and must stop explicitly.
