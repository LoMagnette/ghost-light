---
type: C4 Component
title: Boot
status: stable
groma:
  id: main
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/main.ts
description: 'Boot: builds the shell, wires the menu and chapter screens together through Routes, and starts the loop.'
---

Reads ?lab and ?chapter query parameters to jump straight into the movement lab or a named chapter, bypassing the menu, which both tuning and photographing need since each costs a full reload. In development, asserts the isometric camera matches Iso's projection before anything else runs.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/main.ts](../../../../../../src/main.ts) | [src/app/Game.ts](../../../../../../src/app/Game.ts) | Builds the shell | TypeScript |
| [src/main.ts](../../../../../../src/main.ts) | [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | Opens the menu | TypeScript |
| [src/main.ts](../../../../../../src/main.ts) | [src/app/ChapterScreen.ts](../../../../../../src/app/ChapterScreen.ts) | Opens a chapter | TypeScript |
| [src/main.ts](../../../../../../src/main.ts) | [src/app/audio.ts](../../../../../../src/app/audio.ts) | Installs audio | TypeScript |
| [src/main.ts](../../../../../../src/main.ts) | [src/app/update.ts](../../../../../../src/app/update.ts) | Installs the update notice | TypeScript |
| [src/main.ts](../../../../../../src/main.ts) | [src/render/IsoCamera.ts](../../../../../../src/render/IsoCamera.ts) | Checks the camera projection | TypeScript |
| [src/main.ts](../../../../../../src/main.ts) | [src/chapters/lab.ts](../../../../../../src/chapters/lab.ts) | Resolves ?lab | TypeScript |
