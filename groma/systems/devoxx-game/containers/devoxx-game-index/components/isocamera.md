---
type: C4 Component
title: Iso camera
status: stable
groma:
  id: isocamera
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/render/IsoCamera.ts
  group: Rendering
description: The orthographic isometric camera, derived entirely from the two constants in core/Iso.ts.
---

Replaced the old 2D projection function: the building is built at its own surveyed metre coordinates and this camera simply looks at it, so the simulation and the picture can no longer disagree about where anything is. Deliberately orthographic rather than perspective, since the venue was surveyed off floor plans with no scale bar and only an orthographic view keeps a metre the same size everywhere on screen. assertMatchesProjection checks this camera against Iso.project at boot, in development.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/render/IsoCamera.ts](../../../../../../src/render/IsoCamera.ts) | [src/core/Iso.ts](../../../../../../src/core/Iso.ts) | Derives the camera from the iso constants | TypeScript |
