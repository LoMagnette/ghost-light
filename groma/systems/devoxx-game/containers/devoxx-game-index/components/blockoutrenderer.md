---
type: C4 Component
title: Blockout renderer
status: stable
groma:
  id: blockoutrenderer
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/render/BlockoutRenderer.ts
  group: Rendering
  technology: three.js
description: 'The grey-box three.js renderer: the whole building and every robot drawn as extruded boxes from the venue data and a chapter''s palette.'
---

Lets movement, collision and level layout be tuned and judged before a single art asset exists, and is not throwaway: an eventual art pass would replace only the robot meshes and room materials, keeping the same scene graph, camera and venue construction. Builds every light a chapter will ever use at load time, dark, because changing how many lights exist recompiles every three.js material, a visible stutter; chapters instead switch lights by intensity. Scales light intensity by LAMBERT_SCALE to correct for three.js's physically-based light falloff, and applies a chapter's sRGB-tuned palette through SRGB_GAMMA rather than linearly, to match how it was colour-measured off photographs.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | [src/core/Crowd.ts](../../../../../../src/core/Crowd.ts) | Draws the crowd | TypeScript |
| [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | [src/core/Venue.ts](../../../../../../src/core/Venue.ts) | Builds geometry from rooms and links | TypeScript |
| [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | [src/core/Traversal.ts](../../../../../../src/core/Traversal.ts) | Poses a robot's climb | TypeScript |
| [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | [src/core/Decay.ts](../../../../../../src/core/Decay.ts) | Draws decay pieces | TypeScript |
| [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | [src/render/Cutaway.ts](../../../../../../src/render/Cutaway.ts) | Fades the wall around a tracked robot | TypeScript |
| [src/render/BlockoutRenderer.ts](../../../../../../src/render/BlockoutRenderer.ts) | [src/render/Props.ts](../../../../../../src/render/Props.ts) | Builds job props | TypeScript |
