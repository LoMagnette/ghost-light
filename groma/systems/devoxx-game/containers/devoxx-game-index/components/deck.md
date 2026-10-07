---
type: C4 Component
title: Deck
status: stable
groma:
  id: deck
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/Deck.ts
      symbol: DeckView
  group: Screens
description: A nearly full-screen slide deck shown over the building, for a chapter's in-game talk.
---

Reads the standard presentation keys plus the two a presenter's clicker sends (Page Up/Down). Captures the keyboard while open, ahead of Keyboard's own listener, so Esc, Tab and the arrow keys do not leak through to the pause menu or drive a robot off the stage.
