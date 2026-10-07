---
type: C4 Component
title: Decay
status: stable
groma:
  id: decay
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Decay.ts
  group: Physics core
description: 'What time leaves behind in a building nobody has returned to: Chapter I''s dereliction layer.'
---

Built to the same shape as Crowd, its mirror image: same single density number, same seeded generator, same static-and-instanced construction so ten thousand pieces cost one draw call. Exists because Chapter I originally read as the same rooms with the brightness turned down rather than the same rooms decades later; this gives it its own content instead.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/core/Decay.ts](../../../../../../src/core/Decay.ts) | [src/core/Venue.ts](../../../../../../src/core/Venue.ts) | Reads rooms to place decay | TypeScript |
