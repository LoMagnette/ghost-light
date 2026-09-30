/**
 * "A new version is ready": the installed game telling its player so.
 *
 * The service worker (see `vite.config.ts`) fetches a new build in the
 * background and holds it back, because switching workers under a running
 * game takes the old build's files out from under it. Held back with no
 * word, a new build reached a player one launch late, and on a desktop
 * with the tab left open, never. This says so, and UPDATE takes it at once.
 * LATER leaves it for the next launch, where it happens on its own.
 *
 * Fixed to the window, not put in `#ui` or the stage: `Game.show` empties
 * `#ui` on every screen change, and the phone controls are a layer over
 * the whole stage (z 20) that would take its taps. It sits above them and
 * below the rotate message, top right, clear of the SOUND and PAUSE pills
 * at the top centre. In real pixels, so it reads the same on any screen.
 * No key: every key is already somebody's, and a stray SPACE (Droid's DROP)
 * must not reload the game.
 */

import { registerSW } from 'virtual:pwa-register';
import { el, MONO, SANS } from './dom';

/** How often a game left open asks for a new build, ms. Pages deploys are minutes apart at most. */
const CHECK_EVERY = 30 * 60 * 1000;

const ACCENT = '#f24471';

export function installUpdateNotice(): void {
  let notice: HTMLElement | undefined;

  const update = registerSW({
    onNeedRefresh: () => {
      if (notice) return;
      notice = build(
        () => {
          // Tell the waiting worker to take over; the page reloads once it has.
          void update(true);
        },
        () => {
          notice?.remove();
          notice = undefined;
        },
      );
      document.body.append(notice);
    },
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      const check = (): void => {
        // A check with no network is a console error and nothing else.
        if (navigator.onLine && !registration.installing) void registration.update();
      };
      // A phone brings an installed game back from the background rather
      // than launching it again: that is when a player would expect news.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.setInterval(check, CHECK_EVERY);
    },
  });
}

function build(onUpdate: () => void, onLater: () => void): HTMLElement {
  const root = el('div', {
    position: 'fixed',
    top: 'calc(12px + env(safe-area-inset-top))',
    right: 'calc(12px + env(safe-area-inset-right))',
    zIndex: '25',
    width: '270px',
    padding: '14px 16px',
    background: 'rgba(11, 13, 15, 0.94)',
    border: `1px solid ${ACCENT}`,
    borderRadius: '4px',
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.55)',
    color: '#e6e9eb',
    font: `14px ${SANS}`,
    pointerEvents: 'auto',
  });
  root.setAttribute('role', 'status');

  root.append(
    el('div', { font: `11px ${MONO}`, letterSpacing: '0.12em', color: ACCENT, marginBottom: '6px' }, 'UPDATE READY'),
    el('div', { lineHeight: '1.4' }, 'A new version of Ghost Light is ready.'),
    el('div', { fontSize: '12px', color: '#8b9398', marginTop: '4px' }, 'Updating reloads the game to the menu.'),
  );

  const row = el('div', { display: 'flex', gap: '10px', marginTop: '12px' });
  row.append(action('Update', true, onUpdate), action('Later', false, onLater));
  root.append(row);
  return root;
}

function action(label: string, primary: boolean, act: () => void): HTMLButtonElement {
  const node = el(
    'button',
    {
      font: `14px ${SANS}`,
      color: primary ? '#0b0d0f' : '#e6e9eb',
      background: primary ? ACCENT : 'rgba(255, 255, 255, 0.06)',
      border: `1px solid ${primary ? ACCENT : 'rgba(255, 255, 255, 0.18)'}`,
      borderRadius: '3px',
      padding: '7px 16px',
      cursor: 'pointer',
    },
    label,
  );
  node.type = 'button';
  // The notice sits over the canvas; its clicks and taps are not the game's.
  node.addEventListener('pointerdown', (event) => event.stopPropagation());
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    act();
  });
  return node;
}
