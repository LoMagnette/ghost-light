---
type: C4 Component
title: MenuScreen
status: stable
groma:
  id: menuscreen
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/MenuScreen.ts
      symbol: MenuScreen
  group: Screens
description: 'Chapter select: title, three cards, one key to start.'
---

Deliberately plain and keyboard- and pointer-driven, so a judge can be playing within seconds. Behind the cards is the building itself, Chapter I's empty Kinepolis with a drifting pool of ghost light; choosing a card eases the lens into that chapter's grade so each one previews its own look before it opens.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/chapters/registry.ts](../../../../../../src/chapters/registry.ts) | Lists chapters | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | Builds the backdrop scene | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/core/Crowd.ts](../../../../../../src/core/Crowd.ts) | Builds a preview crowd | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/core/Decay.ts](../../../../../../src/core/Decay.ts) | Builds preview decay | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/venue/kinepolis.ts](../../../../../../src/venue/kinepolis.ts) | Reads the venue | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/app/Intro.ts](../../../../../../src/app/Intro.ts) | Plays the title sequence | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | Opens the souvenir book | TypeScript |
| [src/app/MenuScreen.ts](../../../../../../src/app/MenuScreen.ts) | [src/app/Routes.ts](../../../../../../src/app/Routes.ts) | Requests navigation | TypeScript |
