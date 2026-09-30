import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Every icon the installed game needs is cut from ONE square image,
// `public/icon.svg`, at build time: swap that file and rebuild, nothing
// else to touch. It has to live under `public/`, because the generator
// writes its icons to the same path under `dist/`; from `src/` they landed
// back in `src/`.
//
// The icon is full bleed: its own dark ground, with Voxxy already inside
// the middle 80% that a maskable crop keeps. So the maskable and Apple
// icons take it as it is. The preset would pad it a further 30% on white,
// a small robot on a sticker on a phone's home screen.
//
// And full colour: the generator's default PNG quality of 60 makes sharp
// quantise to a palette, which bands the glow under the head into rings.
const png = { compressionLevel: 9, palette: false };
const asDrawn = { padding: 0, resizeOptions: { background: '#06080a' } };

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    png,
    maskable: { ...minimal2023Preset.maskable, ...asDrawn },
    apple: { ...minimal2023Preset.apple, ...asDrawn },
  },
  images: ['public/icon.svg'],
});
