/**
 * How much the graphics card is asked to do.
 *
 * Two settings and no more. `high` is shadows and the post-processing mood;
 * `low` is the flat-lit blockout the game was built and measured in, which is
 * the guarantee that a judge on a laptop can still play it. Nobody has
 * measured this game on real hardware yet — the agent renders in software —
 * so everything that costs fill rate sits behind this one switch.
 *
 * Read from `?low` / `?high` first, for looking at either without changing
 * anything, then from what the player last chose. Storage can be missing or
 * throw in a private window, and the game must not care.
 */

export type Quality = 'high' | 'low';

const KEY = 'ghost-light:quality';

export function quality(): Quality {
  const query = new URLSearchParams(window.location.search);
  if (query.has('low')) return 'low';
  if (query.has('high')) return 'high';
  try {
    return window.localStorage.getItem(KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

export function setQuality(next: Quality): void {
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // Nowhere to remember it. It still applies to this session's next screen.
  }
  chosen = next;
}

/** What was chosen this session, so a failed write still takes effect. */
let chosen: Quality | undefined;

export function currentQuality(): Quality {
  return chosen ?? quality();
}
