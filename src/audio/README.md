# Sound files

Drop files here; they are found by **file name** when the game is built
(`src/app/audio.ts`). A name with no file is silence, not an error.

| File | Plays |
|---|---|
| `music-silence.ogg` | Chapter I: The Silence, and the menu if there is no `music-menu` |
| `music-javapolis.ogg` | Chapter II: JavaPolis |
| `music-capacity.ogg` | Chapter III: At Capacity |
| `music-menu.ogg` | The menu (optional) |
| `ambience-silence.ogg` / `-javapolis` / `-capacity` | Room tone under the music, per chapter (optional) |

- `.ogg`, `.mp3`, `.m4a`, `.opus` and `.wav` all work. Prefer `.ogg` or
  `.mp3`; a `.wav` is ten times the size.
- Every track **loops**, so cut it where the end runs back into the start.
- Tracks crossfade over about two seconds when the chapter changes,
  including through the wormholes.
- A file is fetched the first time it is needed, not at start-up.
- The repo is public and MIT-licensed: each file must be ours to publish.
  Note where each came from in `docs/PROMPTS.md`.
