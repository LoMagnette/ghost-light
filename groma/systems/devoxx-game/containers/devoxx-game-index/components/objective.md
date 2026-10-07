---
type: C4 Component
title: Objective
status: stable
groma:
  id: objective
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Objective.ts
  group: Physics core
description: 'The state machine behind a chapter''s objective card: the only code that decides something has been done, missed, lost or won.'
---

Advances Activity's data against the live simulation one fixed frame at a time. Reads actors and writes exactly one thing back into the simulation, Body.payload, when something is picked up or put down: a robot carrying a keg is simply a heavier robot, not a robot in a special state. This narrow coupling is what lets all three chapters stay data.

## Relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/core/Objective.ts](../../../../../../src/core/Objective.ts) | [src/core/Activity.ts](../../../../../../src/core/Activity.ts) | Reads activity data | TypeScript |
