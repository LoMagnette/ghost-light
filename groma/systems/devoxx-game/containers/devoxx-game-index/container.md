---
type: C4 Container
title: Game client
status: stable
groma:
  id: devoxx-game-index
  parent: devoxx-game
  technology: TypeScript, three.js, Vite, Web Audio, vite-plugin-pwa
description: The browser single-page game players load and play.
---

Built with Vite and rendered with three.js from a fixed south-west isometric camera, with all UI as DOM laid over the canvas rather than drawn into the scene. One ChapterScreen runs every chapter; a chapter is data (Chapters group), not a dedicated screen class. Physics is a home-grown, fixed-timestep engine (Physics core group) that never imports rendering code, so the same simulation also runs headless inside the Node verification tools. The venue (Kinepolis) is modelled once, in metres, and dressed differently per chapter. Deployed to GitHub Pages as an installable, offline-capable PWA (Packaging group).
