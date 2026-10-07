---
type: C4 Component
title: Registry
status: stable
groma:
  id: registry
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/chapters/registry.ts
  group: Chapters
description: The three chapters, assembled and ordered for play.
---

Order is load-bearing: Chapter I is both the simplest to build (empty building, no crowd) and the best tutorial, so the playable milestone and the onboarding are the same work. Carries each era's palette and light level, tuned against measurements of photographs.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/chapters/registry.ts](../../../../../../src/chapters/registry.ts) | [src/chapters/objectives.ts](../../../../../../src/chapters/objectives.ts) | Assigns each chapter its objective | TypeScript |
| [src/chapters/registry.ts](../../../../../../src/chapters/registry.ts) | [src/chapters/Chapter.ts](../../../../../../src/chapters/Chapter.ts) | Implements the Chapter interface | TypeScript |
