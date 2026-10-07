---
type: C4 Component
title: Deck registry
status: stable
groma:
  id: decks-index
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/decks/index.ts
  group: Decks
description: 'Slide decks as data: the Deck and Slide types, the registry a conversation''s talk activity looks a deck up in, and its image lookup.'
---

A conversation can end in a talk, and a talk is one of these: slides, each a background picture and some words. Pictures are found by file name at build time from src/decks/images/, the same bargain as portraits and audio; a slide naming a picture that does not exist shows a dashed placeholder rather than a 404.
