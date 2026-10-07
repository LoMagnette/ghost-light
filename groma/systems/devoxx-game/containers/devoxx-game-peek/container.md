---
type: C4 Container
title: Peek
status: stable
groma:
  id: devoxx-game-peek
  parent: devoxx-game
  technology: Node, Playwright
description: Serves the last build and renders one frame at an arbitrary position with arbitrary keys held, for inspecting one square metre of the building without a full playthrough.
---

The opposite of shoot: shoot drives a fixed tour for regression, peek answers an arbitrary visual question about one place in the 126 m building in a single headless-Chromium screenshot. It serves whatever is already in dist/ and does not build it.
