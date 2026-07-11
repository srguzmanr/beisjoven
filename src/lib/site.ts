// SEO-01 — single source of truth for the site's absolute base URL.
//
// `import.meta.env.SITE` is inlined at build time from `site` in
// astro.config.mjs. It must NEVER be derived from the incoming request
// (Astro.url): under SSR on Vercel the internal request host is `localhost`,
// which is how canonical/og:url ended up as https://localhost in production.
// No Vercel env var is required; the config fallback below is belt-and-braces.
export const SITE_URL = (import.meta.env.SITE ?? 'https://beisjoven.com').replace(/\/$/, '');
