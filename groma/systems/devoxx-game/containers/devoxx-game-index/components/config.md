---
type: C4 Component
title: Build config
status: stable
groma:
  id: config
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/config.ts
description: 'Build-wide presentation constants: camera lead, follow smoothing, shake weights.'
---

Gameplay tuning deliberately does not live here; it lives in core/RobotSpec.ts. Nothing in src/core may read from this file, so a constant that could change where a robot ends up never ends up here by accident.
