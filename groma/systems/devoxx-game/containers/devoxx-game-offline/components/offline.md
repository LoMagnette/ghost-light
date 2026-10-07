---
type: C4 Component
title: Offline
status: stable
groma:
  id: offline
  parent: devoxx-game-offline
  code:
    - scanner: javascript
      file: tools/offline.mjs
  technology: Node, Playwright
description: Serves a built copy from GitHub Pages' sub-path, waits for the service worker to finish precaching, then cuts the network to prove every chapter and asset still load.
---
