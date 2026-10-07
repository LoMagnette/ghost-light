---
type: C4 Container
title: Physics check
status: stable
groma:
  id: devoxx-game-physics
  parent: devoxx-game
  technology: Node, tsc
description: Runs the real fixed-timestep Sim outside the browser and holds each robot's measured acceleration, braking and stopping distance against RobotSpec's design envelope.
---

Compiles src/core with tsc and runs it in Node, with no browser involved, because core/ imports nothing outside itself. Exists because RobotSpec's published numbers are the textbook answer (v^2/2a with nothing else acting), while the robot a player actually drives is also fighting rolling resistance and a drive force that tapers near maxSpeed; this measures what is actually felt.
