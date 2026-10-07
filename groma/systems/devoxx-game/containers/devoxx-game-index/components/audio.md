---
type: C4 Component
title: Audio
status: stable
groma:
  id: audio
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/audio.ts
  group: Audio
description: 'Music: one Web Audio context, a bus per kind of sound, and the author''s music files.'
---

Files are found by file name at build time, the same bargain as portraits: drop music-silence.ogg into src/audio/ and Chapter I has music, with nothing to wire by hand. A missing file is silence, not an error, though npm run shoot still fails on an actual 404. The context is created on the first key or click, since browsers refuse sound before a user gesture.
