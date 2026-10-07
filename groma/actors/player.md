---
type: C4 Actor
title: Player
status: stable
groma:
  id: player
---

Plays Ghost Light in a desktop or mobile browser: picks a chapter from the menu and drives a robot through the Kinepolis using keyboard (WASD, Shift to brake, E to act, Tab to switch robots) or on-screen touch controls.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [player](player.md) | [src/app/MenuScreen.ts](../../src/app/MenuScreen.ts) | Selects a chapter | Keyboard, mouse, touch |
| [player](player.md) | [src/app/ChapterScreen.ts](../../src/app/ChapterScreen.ts) | Drives a robot | Keyboard, touch |
| [player](player.md) | [src/app/Deck.ts](../../src/app/Deck.ts) | Views a talk | Keyboard, mouse |
