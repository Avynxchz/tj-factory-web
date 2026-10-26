import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  // GitHub Pages project site: disajikan dari subpath /tj-factory-web/,
  // jadi semua aset emit Astro harus berprefix subpath itu (tanpa ini chunk _astro 404 di live).
  base: '/tj-factory-web/',
  build: { inlineStylesheets: 'always' },
  integrations: [tailwind({ applyBaseStyles: false })],
});
