---
type: C4 Component
title: Tint
status: stable
groma:
  id: tint
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/tint.ts
description: A speaker's colour, shared between the dialogue box and their who's who card so both read the same person the same way.
---

Lives outside ChapterScreen specifically so cast.ts can reuse the same rule. No longer simply the speaker's shirt colour, since real photographs put several speakers in the same black shirt; the current rule picks a colour that still tells people apart.
