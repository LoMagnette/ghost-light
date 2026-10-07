---
type: C4 Component
title: Vite config
status: stable
groma:
  id: vite-config
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: vite.config.ts
  group: Packaging
  technology: Vite, vite-plugin-pwa
description: 'Vite build configuration: GitHub Pages base path, the @/ alias, and the installable-PWA plugin.'
---

Registers the service worker in prompt mode rather than autoUpdate, so a new build is fetched and held back rather than swapped under a running game (app/update.ts tells the player when it is ready); install is registered manually through virtual:pwa-register so the update notice can hear about the waiting worker. Precaches every file type the game ships, including chapter music, at a 16 MB per-file ceiling well above workbox's 2 MB default.
