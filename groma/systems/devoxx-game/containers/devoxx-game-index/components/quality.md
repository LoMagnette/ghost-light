---
type: C4 Component
title: Quality
status: stable
groma:
  id: quality
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/quality.ts
description: 'The one graphics-quality switch: high (shadows and post-process mood) or low (the flat-lit blockout the game was built and measured in).'
---

Everything that costs fill rate sits behind this single switch, read from ?low/?high first and then from the player's last choice in storage, which may be missing or throw in a private window without the game caring.
