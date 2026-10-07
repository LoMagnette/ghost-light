---
type: C4 Component
title: Mood
status: stable
groma:
  id: mood
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/render/Mood.ts
  group: Rendering
description: 'The look an era is seen through, after its lights: grade, grain and bloom per chapter.'
---

Palette and light level say what the building IS in an era; this says how it is SEEN, for example Chapter I cold and grainy versus Chapter III clean and bright. Applied as one post-process pass plus bloom on genuinely bright surfaces, so it only runs on the high-quality setting; low quality draws the scene straight.
