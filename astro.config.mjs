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
      // the POST API endpoints (ADS-TRACK-01/02, SEC-02 P2) — Vercel's
      // ISR/prerender functions only serve GET/HEAD, so POST routes must stay
      // out of the ISR function entirely.
      exclude: ['/buscar', '/api/ad-event', '/api/enviar-historia', '/api/copiar-foto-historia', '/api/guardar-articulo'],
    },
  }),
  security: {
    // Keep Astro's CSRF origin check ON. Since the x-forwarded-host hardening
    // (Astro >=5.14, CVE-2025-61925) the serverless runtime only trusts
    // x-forwarded-proto/host — and even the plain Host header — when the host
    // matches this allowlist; with the (default) empty list the request URL is
    // rebuilt as https://localhost, so checkOrigin compared the browser's
    // `Origin: https://beisjoven.com` against `https://localhost` and 403'd
    // every same-origin multipart POST (/api/enviar-historia) before the
    // endpoint ran. Allowlisting the real serving hosts fixes the URL
    // reconstruction behind Vercel's proxy without loosening the check.
    checkOrigin: true,
    allowedDomains: [
      { protocol: 'https', hostname: 'beisjoven.com' },
      // Vercel preview/alias hosts (QA on branch deploys and *.vercel.app
      // production aliases). Vercel's edge sets x-forwarded-host itself, so
      // the wildcard doesn't let clients spoof the host.
      { protocol: 'https', hostname: '**.vercel.app' },
    ],
  },
  integrations: [],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // EDITOR-20-FIX-01: sanitize-html es CJS y hace require() de un
      // htmlparser2 que solo se distribuye como ESM — en el runtime Node de
      // Vercel eso explota con ERR_REQUIRE_ESM al inicializar la función
      // (500 en /api/guardar-articulo y en el render SSR de artículos).
      // Bundlearlo en el output SSR convierte esos require() en imports
      // resueltos en build. Se bundlea también su subárbol de parsing porque
      // sanitize-html depende de copias ANIDADAS (htmlparser2@12) distintas
      // de las hoisted en la raíz (htmlparser2@10): externalizarlas haría
      // que Node resolviera la versión equivocada en runtime.
      // is-plain-object también va bundleado: su condición `exports.import`
      // apunta a un .mjs SIN default export, y el interop CJS de Vite emite
      // un default-import que revienta en runtime si queda externo (el resto
      // de deps de sanitize-html — deepmerge, parse-srcset, postcss, launder —
      // sí interoperan bien como externos; auditado en EDITOR-20-FIX-01).
      noExternal: [
        'sanitize-html',
        'htmlparser2',
        'domhandler',
        'domutils',
        'dom-serializer',
        'domelementtype',
        'entities',
        'escape-string-regexp',
        'is-plain-object',
      ],
    },
  },
  redirects: {
    '/login': '/admin',
    '/post/[...slug]': '/articulo/[...slug]',
    '/noticias/[...slug]': '/articulo/[...slug]',
    '/beisjoven/[...slug]': '/articulo/[...slug]',
  },
});
