---
type: C4 Component
title: Tabs
status: stable
groma:
  id: tabs
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/tabs.ts
  group: Souvenirs
description: 'The souvenir book''s shared header: one row naming all three tabs with their counts, and the keys that switch between them.'
---

Each tab (Album, Cast, Stickers) is still its own page with its own grid and keys; this is only the part they share, so turning a tab closes one page and opens the next in its place.
