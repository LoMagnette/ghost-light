import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Every icon the installed game needs is cut from ONE square image,
// `public/icon.png`, at build time: swap that file and rebuild, nothing
// else to touch. It has to live under `public/`, because the generator
// writes its icons to the same path under `dist/`; from `src/` they landed
// back in `src/`. The preset pads the maskable and Apple icons onto white,
// which on a dark game reads as a sticker on a phone's home screen; they
// sit on the page's own #06080a instead.
const dark = { background: '#06080a' };

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: dark },
    apple: { ...minimal2023Preset.apple, resizeOptions: dark },
  },
  images: ['public/icon.png'],
});
