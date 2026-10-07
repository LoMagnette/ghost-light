---
type: Groma Flow
title: Open a chapter from the menu
groma:
  id: open-a-chapter-from-the-menu
---

Screens never import one another, so starting a chapter passes through the Routes object main.ts builds at boot. The menu requests navigation; the boot code, where both screens are already in scope, constructs the chapter screen the player then plays.

## Steps

| From | To | Action |
| --- | --- | --- |
| [Player](../actors/player.md) | [MenuScreen](../systems/devoxx-game/containers/devoxx-game-index/components/menuscreen.md) | Picks a chapter card |
| [MenuScreen](../systems/devoxx-game/containers/devoxx-game-index/components/menuscreen.md) | [Routes](../systems/devoxx-game/containers/devoxx-game-index/components/routes.md) | Calls routes.chapter(id) |
| [Boot](../systems/devoxx-game/containers/devoxx-game-index/components/main.md) | [ChapterScreen](../systems/devoxx-game/containers/devoxx-game-index/components/chapterscreen.md) | Constructs the chapter screen |
| [Player](../actors/player.md) | [ChapterScreen](../systems/devoxx-game/containers/devoxx-game-index/components/chapterscreen.md) | Drives a robot through the chapter |
