import type { APIRoute } from 'astro';
import { SITE_URL } from '@/lib/site';

export const prerender = true;

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /login
Disallow: /buscar

Sitemap: ${SITE_URL}/sitemap.xml`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
