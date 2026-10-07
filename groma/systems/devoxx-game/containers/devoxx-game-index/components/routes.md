---
type: C4 Component
title: Routes
status: stable
groma:
  id: routes
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/Routes.ts
      symbol: Routes
description: The Routes interface screens use to navigate, so screens never import one another directly.
---

The menu starting a chapter and a chapter returning to the menu is a two-way cycle; two ES modules that construct each other at import time would see a live binding that is undefined at the one moment it matters, at boot. One Routes object, built once in main.ts where both screens are already in scope, removes the cycle.
