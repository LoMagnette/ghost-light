---
type: C4 Component
title: Update notice
status: stable
groma:
  id: update
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/update.ts
      symbol: installUpdateNotice
description: 'The installed game''s own update notice: a new version is ready.'
---

The service worker (vite-config) fetches a new build in the background and holds it rather than swapping it under a running game; without this notice a held-back build would reach a player one launch late, or never on a desktop tab left open. UPDATE applies it immediately; LATER leaves it for the next launch. Positioned in a fixed window-level layer, clear of the touch controls and other HUD pills, in real pixels so it reads the same at any window size.
