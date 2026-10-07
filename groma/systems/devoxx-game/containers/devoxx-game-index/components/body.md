---
type: C4 Component
title: Body
status: stable
groma:
  id: body
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/core/Body.ts
  group: Physics core
description: 'A physical body on the floor plane: the home-grown, mass-aware integrator every robot and crowd member moves with.'
---

Deliberately not an off-the-shelf 2D physics engine, since those are AABB/velocity systems with no real concept of mass, and 'robots that move like machines with weight' is part of what is being judged. Gives force-based acceleration, honest braking, grip-limited turning and momentum transfer on impact, integrated with semi-implicit Euler at Sim's fixed timestep; never stepped with a variable frame delta.
