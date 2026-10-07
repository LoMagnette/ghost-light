---
type: C4 Component
title: Crowd
status: stable
groma:
  id: tools-crowd
  parent: crowd
  code:
    - scanner: javascript
      file: tools/crowd.mjs
  technology: Node, tsc
description: Walks a simulated crowd for ten minutes and checks no room develops a persistent knot of people.
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [tools/crowd.mjs](../../../../../../tools/crowd.mjs) | [src/chapters/registry.ts](../../../../../../src/chapters/registry.ts) | Walks each chapter's crowd | Node, tsc |
| [tools/crowd.mjs](../../../../../../tools/crowd.mjs) | [src/core/Crowd.ts](../../../../../../src/core/Crowd.ts) | Checks for pile-ups | Node, tsc |
