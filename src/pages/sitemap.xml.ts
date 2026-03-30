import type { APIRoute } from 'astro';
import { getArticulos, getCategorias, getAutores } from '@/lib/supabase';

export const GET: APIRoute = async () => {
  const [articulos, categorias, autores] = await Promise.all([
    getArticulos(1000),
    getCategorias(),
    getAutores(),
  ]);

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://beisjoven.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://beisjoven.com/contacto</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>https://beisjoven.com/nosotros</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`;

  // Categories
  for (const cat of categorias) {
    xml += `
  <url>
    <loc>https://beisjoven.com/categoria/${cat.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  // Authors
  for (const autor of autores) {
    xml += `
  <url>
    <loc>https://beisjoven.com/autor/${autor.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
  }

  // Articles
  for (const art of articulos) {
    const lastmod = art.updated_at || art.fecha || art.created_at;
    const date = lastmod ? new Date(lastmod).toISOString().split('T')[0] : today;
    xml += `
  <url>
    <loc>https://beisjoven.com/articulo/${art.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }

  xml += '\n</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
