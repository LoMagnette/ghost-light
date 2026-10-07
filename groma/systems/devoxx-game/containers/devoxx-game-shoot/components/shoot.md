---
type: C4 Component
title: Shoot
status: stable
groma:
  id: shoot
  parent: devoxx-game-shoot
  code:
    - scanner: javascript
      file: tools/shoot.mjs
      symbol: shot
  technology: Node, Playwright
description: Boots the built game in headless Chromium and scripts a fixed tour of the menu and every chapter.
---

Drives key presses through Playwright, captures frames, and reports any console error. Used both as the shoot/screenshot regression check and, via tools/peek.mjs, as the basis for one-off visual inspection.
