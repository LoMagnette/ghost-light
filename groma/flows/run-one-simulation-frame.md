---
type: Groma Flow
title: Run one simulation frame
groma:
  id: run-one-simulation-frame
---

ChapterScreen is the only place these collaborate: physics, objective progress, traversal and rendering are each a separate component that ChapterScreen drives once per fixed 120 Hz step, so the simulation stays deterministic and never imports the renderer.

## Steps

| From | To | Action |
| --- | --- | --- |
| [ChapterScreen](../systems/devoxx-game/containers/devoxx-game-index/components/chapterscreen.md) | [Sim](../systems/devoxx-game/containers/devoxx-game-index/components/sim.md) | Advances physics one fixed step |
| [ChapterScreen](../systems/devoxx-game/containers/devoxx-game-index/components/chapterscreen.md) | [Objective](../systems/devoxx-game/containers/devoxx-game-index/components/objective.md) | Checks objective progress |
| [ChapterScreen](../systems/devoxx-game/containers/devoxx-game-index/components/chapterscreen.md) | [Traversal](../systems/devoxx-game/containers/devoxx-game-index/components/traversal.md) | Resolves stair and ramp contact |
| [ChapterScreen](../systems/devoxx-game/containers/devoxx-game-index/components/chapterscreen.md) | [BlockoutRenderer](../systems/devoxx-game/containers/devoxx-game-index/components/blockoutrenderer.md) | Redraws the scene from the new state |
