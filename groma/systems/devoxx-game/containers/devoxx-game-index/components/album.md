---
type: C4 Component
title: Album
status: stable
groma:
  id: album
  parent: devoxx-game-index
  code:
    - scanner: typescript
      file: src/app/album.ts
  group: Souvenirs
description: Every photograph a player has earned, kept between visits.
---

Which prints exist is read off the chapters rather than listed separately: any activity with a photo becomes a page, with blanks drawn for the ones still to find. A print from a build asset is remembered by id; a selfie is the picture of the moment it was taken and is kept as its own small image.

## Derived relationships

| Source | Target | Description | Technology |
| --- | --- | --- | --- |
| [src/app/album.ts](../../../../../../src/app/album.ts) | [src/app/souvenirs.ts](../../../../../../src/app/souvenirs.ts) | Invokes supplied callback: go | typescript |
