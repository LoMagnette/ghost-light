import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// `base` matters for GitHub Pages: a project page is served from
// https://<user>.github.io/<repo>/ so assets must resolve relative to that.
// The deploy workflow sets VITE_BASE; local dev falls back to '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
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
