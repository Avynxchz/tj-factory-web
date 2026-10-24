// Astro (Vite di dalam) — output 100% statis, siap deploy ke Cloudflare Pages.
// Cara deploy: hubungkan repo ini ke Cloudflare Pages (dashboard),
//   Framework preset: Astro, Build command: `npm run build`, Output directory: `dist`.
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
});
