---
type: C4 Component
title: App intro
status: stable
groma:
  id: app-intro
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/Intro.ts
  group: Screens
description: 'The title sequence shown once before the menu: a few lines over the dark, empty building.'
---

Lives on the menu rather than as a screen of its own, because the backdrop IS the intro and a separate screen would build the building twice. Starts on its own; the first key or click also unmutes audio rather than skipping, since browsers will not play sound before a user gesture. Seen once per browser; replayable from the menu.
