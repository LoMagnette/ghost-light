---
type: C4 Component
title: Chapter
status: stable
groma:
  id: chapter
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/chapters/Chapter.ts
  group: Chapters
description: 'The Chapter interface: the four things a chapter is allowed to vary, and nothing else.'
---

A palette and light level, a crowd density, a control mode, and an objective. A chapter never ships its own renderer, physics or copy of the venue; ChapterScreen is the one engine all three run in.
