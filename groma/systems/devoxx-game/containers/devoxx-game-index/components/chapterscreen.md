---
type: C4 Component
title: ChapterScreen
status: stable
groma:
  id: chapterscreen
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/ChapterScreen.ts
      symbol: ChapterScreen
  group: Screens
description: The one screen every chapter runs in.
---

Reads a chapter's data (palette, crowd density, control mode, objective) and sets up the scene accordingly; there is no per-chapter screen class. Runs both control modes (direct: one robot and WASD; switch: adds Tab) and drives the chapter's Objective, the only thing that can end the round. Also owns the presentation layer on top of the simulation: camera lead, impact shake, footfall kick and telemetry, none of which changes the simulation itself.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/core/Sim.ts](../../../../../../src/core/Sim.ts) | Advances the simulation | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/core/Objective.ts](../../../../../../src/core/Objective.ts) | Runs the objective | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/core/Traversal.ts](../../../../../../src/core/Traversal.ts) | Checks stair and ramp surfaces | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/core/Crowd.ts](../../../../../../src/core/Crowd.ts) | Builds the crowd | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/core/Decay.ts](../../../../../../src/core/Decay.ts) | Builds decay dressing | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/venue/kinepolis.ts](../../../../../../src/venue/kinepolis.ts) | Reads the chapter's venue | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | Builds and updates the scene | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/render/Wormhole.ts](../../../../../../src/render/Wormhole.ts) | Opens a chapter's exit | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/input/KeyboardController.ts](../../../../../../src/input/KeyboardController.ts) | Reads drive input | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/chapters/registry.ts](../../../../../../src/chapters/registry.ts) | Falls back to Chapter I | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/chapters/lab.ts](../../../../../../src/chapters/lab.ts) | Resolves the movement lab | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/app/Deck.ts](../../../../../../src/app/Deck.ts) | Shows a talk's slides | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/decks/index.ts](../../../../../../src/decks/index.ts) | Looks up a deck | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | Opens the souvenir book | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/app/sfx.ts](../../../../../../src/app/sfx.ts) | Plays synthesised sound effects | TypeScript |
| [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | [src/app/Routes.ts](../../../../../../src/app/Routes.ts) | Requests navigation | TypeScript |
