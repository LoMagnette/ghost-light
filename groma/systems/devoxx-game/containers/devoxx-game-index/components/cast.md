---
type: C4 Component
title: Cast
status: stable
groma:
  id: cast
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/cast.ts
  group: Souvenirs
description: 'The who''s who: a card for everybody the robots have met, kept between visits.'
---

Who appears is read off the chapters: anyone named in an objective's who becomes a card, numbered from the start and shown as a silhouette until met. Someone is met once spoken to or, if they only pose, once photographed with.

## Derived relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/cast.ts](../../../../../../src/app/cast.ts) | [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | Invokes supplied callback: go | typescript |
