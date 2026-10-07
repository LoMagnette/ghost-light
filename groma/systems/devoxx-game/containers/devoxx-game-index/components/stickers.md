---
type: C4 Component
title: Stickers
status: stable
groma:
  id: stickers
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/stickers.ts
  group: Souvenirs
description: 'Stickers: the third tab of the souvenir book, earned by visiting stands in Chapter III.'
---

Which stickers exist is read off every activity in a chapter's stickers group. The stands represent nobody in particular, so their art is generic: a shape, a colour and a glyph, not a real company's mark.

## Derived relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/stickers.ts](../../../../../../src/app/stickers.ts) | [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | Invokes supplied callback: go | typescript |
