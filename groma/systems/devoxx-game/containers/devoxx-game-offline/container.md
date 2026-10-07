---
type: C4 Container
title: Offline check
status: stable
groma:
  id: devoxx-game-offline
  parent: devoxx-game
  technology: Node, Playwright
description: Builds the game for its GitHub Pages sub-path, lets the service worker finish precaching, cuts the network, then confirms every chapter and asset still loads and that an update notice appears for a later build.
---
