import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://beisjoven.com',
  // On-demand rendering with ISR edge caching. Content pages are rendered by a
  // serverless function on first request and cached at the edge; a published
  // change goes live within `expiration` seconds — no rebuild. Builds now run
  // only on code/git pushes, not on content changes. Truly-static pages opt
  // back into prerendering with `export const prerender = true`.
  output: 'server',
  adapter: vercel({
    isr: {
      // Re-generate a cached page at most once per this many seconds.
      expiration: 60,
      // Always render fresh (never ISR-cached): per-query search results and
      // the POST API endpoints (ADS-TRACK-01/02) — Vercel's ISR/prerender
      // functions only serve GET/HEAD, so POST routes must stay out of the
      // ISR function entirely.
      exclude: ['/buscar', '/api/ad-event', '/api/notify-historia'],
    },
  }),
  integrations: [],
  vite: {
    plugins: [tailwindcss()],
  },
  redirects: {
    '/login': '/admin',
    '/post/[...slug]': '/articulo/[...slug]',
    '/noticias/[...slug]': '/articulo/[...slug]',
    '/beisjoven/[...slug]': '/articulo/[...slug]',
  },
});
