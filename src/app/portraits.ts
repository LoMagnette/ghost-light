/**
 * Portraits for the dialogue box: whoever is speaking, in a frame beside
 * what they say.
 *
 * Found by FILE NAME, at build time, so adding one is dropping a picture in
 * `src/portraits/` and nothing else — no list to keep in step with the
 * folder. The name is the speaker's name as the box prints it, lower-cased,
 * accents dropped, anything that is not a letter or a digit a hyphen:
 * "Stephan Janssen" is `stephan-janssen.jpeg`, "The cat" is `the-cat.jpeg`,
 * "Droid" is `droid.jpeg`. See `src/portraits/README.md` for all of them.
 *
 * `import.meta.glob` rather than paths under `public/`, for two reasons. A
 * missing portrait costs nothing — the glob simply has no entry — where a
 * missing file under `public/` is a 404 in the console, which `npm run
 * shoot` rightly fails on. And Vite fingerprints what it bundles, so a
 * replaced portrait is never stale in somebody's cache.
 */

const files = import.meta.glob('../portraits/*.{jpeg,jpg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const bySlug = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const name = path.split('/').pop() ?? '';
  bySlug.set(name.replace(/\.[^.]+$/, ''), url);
}

/** The file name a speaker's portrait is looked up by, without extension. */
export function portraitSlug(who: string): string {
  return who
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The URL of this speaker's portrait, if one has been supplied. */
export function portraitOf(who: string): string | undefined {
  return bySlug.get(portraitSlug(who));
}
