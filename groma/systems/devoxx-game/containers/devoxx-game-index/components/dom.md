---
type: C4 Component
title: DOM helper
status: stable
groma:
  id: dom
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/dom.ts
description: The smallest possible DOM helper for building the game's HTML UI.
---

All UI is HTML laid over the canvas rather than drawn into the three.js scene, since the browser already renders real text and widgets better than a from-scratch alternative would. The stage is scaled as one unit, so a panel positioned in design pixels here lands at the same place at any window size.
