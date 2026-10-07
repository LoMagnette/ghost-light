---
type: C4 Component
title: Activity
status: stable
groma:
  id: activity
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Activity.ts
  group: Physics core
description: 'The vocabulary a chapter''s objective is written in: six kinds of thing a robot can do to the building, and who is allowed to do it.'
---

Pure data and predicates with no knowledge of rendering, input or chapters, so all three chapters compose the same six primitives rather than shipping their own logic. Objective.ts is what runs it.
