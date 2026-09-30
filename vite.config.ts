import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

// `base` matters for GitHub Pages: a project page is served from
// https://<user>.github.io/<repo>/ so assets must resolve relative to that.
// The deploy workflow sets VITE_BASE; local dev falls back to '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    // An installable game that plays with no network once it has been
    // opened once. Everything the build emits is stored on the first
    // visit (about 17 MB), not chapter by chapter: a player who installs it
    // at the venue and opens Chapter III on the train must not find its
    // music or its portraits missing.
    VitePWA({
      // A new build is fetched in the background and WAITS, and
      // `src/app/update.ts` tells the player: UPDATE takes it at once, and
      // otherwise it takes over once every window of the game is closed.
      // 'autoUpdate' would switch workers under a running game, and the old
      // build's hashed files (a chapter's track, a portrait not shown yet)
      // go with the old precache.
      registerType: 'prompt',
      // Registered by update.ts through `virtual:pwa-register`, not by an
      // injected script, so the notice hears about the waiting worker.
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        id: './',
        name: 'Ghost Light',
        short_name: 'Ghost Light',
        description:
          'Three robots walk the Kinepolis Antwerp across three eras. A Devoxx Belgium Robot Games entry.',
        lang: 'en',
        start_url: './',
        scope: './',
        // Full screen where the platform allows it, else no browser bar.
        // The game is authored at 1280 × 720 and asks upright phones to
        // turn; locking landscape spares an installed player that message.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        theme_color: '#06080a',
        background_color: '#06080a',
        categories: ['games'],
      },
      workbox: {
        // Source maps are for us, not for a phone's storage.
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,webp,svg,ico,mp3,ogg,m4a,opus,wav,woff2}'],
        // The bundle is one large chunk and each chapter's track is a few MB;
        // workbox's 2 MB default would silently leave them out.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // The very first visit is in the worker's hands at once, so the
        // chapter opened straight after installing is already offline-safe.
        // An update never meets an open page, so this cannot swap one.
        clientsClaim: true,
        // `?chapter=…` and friends are the same page.
        navigateFallback: 'index.html',
        ignoreURLParametersMatching: [/.*/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
});
