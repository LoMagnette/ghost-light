---
type: C4 Component
title: Portraits
status: stable
groma:
  id: portraits
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/portraits.ts
description: Dialogue-box portraits, matched to a speaker's name by file name at build time.
---

The same bargain as audio and deck images: drop a picture into src/portraits/ named after the speaker (accents and punctuation stripped, spaces hyphenated) and it appears with no list to maintain. Uses import.meta.glob rather than a public/ path, so a missing portrait is simply absent rather than a 404 that npm run shoot would fail on.
