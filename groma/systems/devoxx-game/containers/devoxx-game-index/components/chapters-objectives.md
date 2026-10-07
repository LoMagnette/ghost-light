---
type: C4 Component
title: Objectives data
status: stable
groma:
  id: chapters-objectives
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/chapters/objectives.ts
  group: Chapters
description: The three chapters' objectives, written as data in Activity's vocabulary.
---

No chapter ships its own logic; only which activities sit where differs between the three. Positions are read out of the building's own room coordinates wherever possible, rather than duplicated, so there is only one copy of the venue's numbers to keep true.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/chapters/objectives.ts](../../../../../../src/chapters/objectives.ts) | [src/venue/kinepolis.ts](../../../../../../src/venue/kinepolis.ts) | Reads room coordinates | TypeScript |
| [src/chapters/objectives.ts](../../../../../../src/chapters/objectives.ts) | [src/core/Activity.ts](../../../../../../src/core/Activity.ts) | Writes activities | TypeScript |
| [src/chapters/objectives.ts](../../../../../../src/chapters/objectives.ts) | [src/core/Objective.ts](../../../../../../src/core/Objective.ts) | Builds each chapter's Objective | TypeScript |
