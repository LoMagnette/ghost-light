---
type: C4 Component
title: Objectives
status: stable
groma:
  id: tools-objectives
  parent: objectives
  code:
    - scanner: javascript
      file: tools/objectives.mjs
  technology: Node, tsc
description: Holds every chapter activity's coordinates against the building it claims to be in.
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [tools/objectives.mjs](../../../../../../tools/objectives.mjs) | [src/chapters/registry.ts](../../../../../../src/chapters/registry.ts) | Checks every chapter's activities | Node, tsc |
| [tools/objectives.mjs](../../../../../../tools/objectives.mjs) | [src/core/Activity.ts](../../../../../../src/core/Activity.ts) | Checks activity zone placement | Node, tsc |
| [tools/objectives.mjs](../../../../../../tools/objectives.mjs) | [src/core/RobotSpec.ts](../../../../../../src/core/RobotSpec.ts) | Checks who can pass each gate | Node, tsc |
