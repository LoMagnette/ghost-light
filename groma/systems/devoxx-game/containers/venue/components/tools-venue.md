---
type: C4 Component
title: Venue
status: stable
groma:
  id: tools-venue
  parent: venue
  code:
    - scanner: javascript
      file: tools/venue.mjs
  technology: Node, tsc
description: Checks the surveyed building geometry against the published floor-plan figures and against itself; can also render both floors as an SVG plan.
---

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [tools/venue.mjs](../../../../../../tools/venue.mjs) | [src/venue/kinepolis.ts](../../../../../../src/venue/kinepolis.ts) | Checks geometry against the plans | Node, tsc |
| [tools/venue.mjs](../../../../../../tools/venue.mjs) | [src/core/Venue.ts](../../../../../../src/core/Venue.ts) | Checks geometry against itself | Node, tsc |
| [tools/venue.mjs](../../../../../../tools/venue.mjs) | [src/core/Traversal.ts](../../../../../../src/core/Traversal.ts) | Checks link reachability | Node, tsc |
