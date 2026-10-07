---
type: C4 Component
title: Game shell
status: stable
groma:
  id: game
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/Game.ts
description: 'The app shell: one canvas, one renderer, one render loop, one screen active at a time.'
---

The part a game framework like Phaser used to provide; three.js is only a renderer, so the loop, canvas and screen lifecycle live here instead, kept deliberately small. A screen owns its own scene and DOM; Game owns only the things there can be just one of.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/Game.ts](../../../../../../src/app/Game.ts) | [src/input/Keyboard.ts](../../../../../../src/input/Keyboard.ts) | Reads keyboard state | TypeScript |
| [src/app/Game.ts](../../../../../../src/app/Game.ts) | [src/input/Touch.ts](../../../../../../src/input/Touch.ts) | Builds touch controls | TypeScript |
| [src/app/Game.ts](../../../../../../src/app/Game.ts) | [src/render/Mood.ts](../../../../../../src/render/Mood.ts) | Applies the post-process grade | TypeScript |
| [src/app/Game.ts](../../../../../../src/app/Game.ts) | [src/app/quality.ts](../../../../../../src/app/quality.ts) | Reads the quality setting | TypeScript |
