import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /login
Disallow: /buscar

Sitemap: https://beisjoven.com/sitemap.xml`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
