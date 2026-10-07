---
type: C4 Component
title: PWA assets config
status: stable
groma:
  id: pwa-assets-config
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: pwa-assets.config.ts
  group: Packaging
  technology: '@vite-pwa/assets-generator'
description: Generates every installed-app icon from one source image, public/icon.svg.
---

Full-bleed and full colour at build time: compression is tuned up and palette quantisation turned off so the glow under a robot's head does not band into rings, and the maskable/Apple icon crops are told the source already keeps its content inside the safe area rather than padding it further.
