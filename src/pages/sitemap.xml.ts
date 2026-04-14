import type { APIRoute } from 'astro';
import {
  getAllArticulos,
  getCategorias,
  getAutores,
  getAllEventoSlugs,
  getAllArticulosWbc2026,
  getTags,
  getAllArticulosByTag,
} from '@/lib/supabase';

const SITE = 'https://beisjoven.com';
const PAGE_SIZE = 20;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const [articles, categorias, autores, eventoSlugs, wbcArticles, tags] = await Promise.all([
    getAllArticulos(),
    getCategorias(),
    getAutores(),
    getAllEventoSlugs(),
    getAllArticulosWbc2026(),
    getTags(),
  ]);

  const entries: string[] = [];

  const addUrl = (
    loc: string,
    opts: { lastmod?: string; priority?: string; changefreq?: string } = {},
  ) => {
    const { lastmod, priority = '0.7', changefreq = 'monthly' } = opts;
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    entries.push(
      `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    );
  };

  // 1. Static pages
  addUrl(`${SITE}/`, { priority: '1.0', changefreq: 'daily' });
  addUrl(`${SITE}/nosotros`, { priority: '0.5', changefreq: 'yearly' });
  addUrl(`${SITE}/contacto`, { priority: '0.5', changefreq: 'yearly' });
  addUrl(`${SITE}/tu-historia`, { priority: '0.6', changefreq: 'monthly' });
  addUrl(`${SITE}/tu-historia/terminos`, { priority: '0.2', changefreq: 'yearly' });
  addUrl(`${SITE}/privacidad`, { priority: '0.2', changefreq: 'yearly' });

  // 2. Category pages — all pagination pages so Google can discover every article
  const countByCategoryId = new Map<number, number>();
  for (const a of articles) {
    countByCategoryId.set(a.categoria_id, (countByCategoryId.get(a.categoria_id) ?? 0) + 1);
  }

  for (const cat of categorias) {
    const total = countByCategoryId.get(cat.id) ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    // Page 1: no number in URL (Astro paginate convention)
    addUrl(`${SITE}/categoria/${cat.slug}`, { priority: '0.8', changefreq: 'daily' });
    for (let p = 2; p <= totalPages; p++) {
      addUrl(`${SITE}/categoria/${cat.slug}/${p}`, { priority: '0.6', changefreq: 'daily' });
    }
  }

  // 3. Author pages (with pagination)
  const countByAutorId = new Map<number, number>();
  for (const a of articles) {
    countByAutorId.set(a.autor_id, (countByAutorId.get(a.autor_id) ?? 0) + 1);
  }

  for (const autor of autores) {
    const total = countByAutorId.get(autor.id) ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    addUrl(`${SITE}/autor/${autor.slug}`, { priority: '0.6', changefreq: 'weekly' });
    for (let p = 2; p <= totalPages; p++) {
      addUrl(`${SITE}/autor/${autor.slug}/${p}`, { priority: '0.5', changefreq: 'weekly' });
    }
  }

  // 4. Event pages (all, not just active)
  for (const slug of eventoSlugs) {
    addUrl(`${SITE}/evento/${escapeXml(slug)}`, { priority: '0.7', changefreq: 'weekly' });
  }

  // 5. WBC 2026 pages
  if (wbcArticles.length > 0) {
    const totalWbcPages = Math.ceil(wbcArticles.length / PAGE_SIZE);
    addUrl(`${SITE}/wbc-2026`, { priority: '0.8', changefreq: 'daily' });
    for (let p = 2; p <= totalWbcPages; p++) {
      addUrl(`${SITE}/wbc-2026/${p}`, { priority: '0.6', changefreq: 'daily' });
    }
  }

  // 6. Tag pages (with pagination)
  for (const tag of tags) {
    const tagArticles = await getAllArticulosByTag(tag.slug);
    const totalTagPages = Math.max(1, Math.ceil(tagArticles.length / PAGE_SIZE));
    addUrl(`${SITE}/tag/${tag.slug}`, { priority: '0.7', changefreq: 'weekly' });
    for (let p = 2; p <= totalTagPages; p++) {
      addUrl(`${SITE}/tag/${tag.slug}/${p}`, { priority: '0.5', changefreq: 'weekly' });
    }
  }

  // 7. Article pages — only published articles fetched from Supabase (no stale/404/redirect URLs)
  for (const article of articles) {
    const rawDate = article.updated_at ?? article.fecha ?? article.created_at;
    const lastmod = rawDate ? rawDate.split('T')[0] : undefined;
    addUrl(`${SITE}/articulo/${article.slug}`, { lastmod, priority: '0.7', changefreq: 'monthly' });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
