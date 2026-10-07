---
type: C4 Component
title: Souvenirs
status: stable
groma:
  id: souvenirs
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/souvenirs.ts
  group: Souvenirs
description: 'The souvenir book: prints, the who''s who and stickers in one place, one tab each. The single door every screen opens it by.'
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | [src/app/album.ts](../../../../../../src/app/album.ts) | Opens the prints tab | TypeScript |
| [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | [src/app/cast.ts](../../../../../../src/app/cast.ts) | Opens the who's who tab | TypeScript |
| [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | [src/app/stickers.ts](../../../../../../src/app/stickers.ts) | Opens the stickers tab | TypeScript |
