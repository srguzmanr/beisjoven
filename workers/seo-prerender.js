/**
 * Cloudflare Worker: SEO Pre-rendering + OG Tags for Beisjoven
 * Worker name: morning-hat-2e58 (or deploy as new worker for staging)
 *
 * PURPOSE:
 * - When a crawler (Googlebot, Twitterbot, Facebookbot, etc.) visits /articulo/*,
 *   return full HTML with article content pre-rendered.
 * - Normal users get passed through to the SPA (GitHub Pages origin).
 * - Also handles OG meta tags for social sharing (existing functionality).
 *
 * DEPLOYMENT NOTES:
 * 1. For staging: deploy as a separate worker (e.g., "beisjoven-prerender-staging")
 *    with a test route like staging.beisjoven.com/* or beisjoven.com/prerender-test/*
 * 2. Once verified, update the morning-hat-2e58 worker with this code.
 * 3. Route pattern: beisjoven.com/* (same as existing)
 *
 * ENVIRONMENT VARIABLES (set in Cloudflare Worker Settings):
 * - SUPABASE_URL: https://yulkbjpotfmwqkzzfegg.supabase.co
 * - SUPABASE_ANON_KEY: (the anon key)
 *
 * WHY THE PREVIOUS ATTEMPT FAILED (March 8, 2026):
 * Likely causes:
 * 1. The worker was trying to fetch from Supabase but the anon key wasn't set as
 *    an environment variable — it was hardcoded and possibly miscopied.
 * 2. The route trigger may have caught ALL requests (including static assets like
 *    CSS/JS/images), causing the worker to interfere with normal page loads.
 * 3. The worker may not have been passing through non-crawler requests properly,
 *    breaking the SPA for normal users.
 *
 * FIXES IN THIS VERSION:
 * - Only intercepts /articulo/* routes for crawlers; everything else passes through.
 * - Uses environment variables for Supabase credentials.
 * - Robust crawler detection with fallback to passthrough.
 * - Error handling: if Supabase fetch fails, falls through to origin.
 * - Static assets (CSS, JS, images, fonts) are always passed through.
 */

// Crawler User-Agent patterns
const CRAWLER_UA_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /ia_archiver/i,
  /pinterest/i,
];

// Static asset extensions that should always pass through
const STATIC_EXTENSIONS = /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|xml|txt|json)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Always pass through static assets
    if (STATIC_EXTENSIONS.test(pathname)) {
      return fetch(request);
    }

    // 2. Check if this is a crawler
    const userAgent = request.headers.get('User-Agent') || '';
    const isCrawler = CRAWLER_UA_PATTERNS.some(pattern => pattern.test(userAgent));

    // 3. Only pre-render for crawlers on article pages
    if (!isCrawler || !pathname.startsWith('/articulo/')) {
      // Pass through to origin (GitHub Pages)
      return fetch(request);
    }

    // 4. Extract slug and fetch article from Supabase
    const slug = pathname.replace('/articulo/', '').replace(/\/$/, '');

    try {
      const supabaseUrl = env.SUPABASE_URL || 'https://yulkbjpotfmwqkzzfegg.supabase.co';
      const supabaseKey = env.SUPABASE_ANON_KEY;

      if (!supabaseKey) {
        console.error('SUPABASE_ANON_KEY not set — falling through to origin');
        return fetch(request);
      }

      const apiUrl = `${supabaseUrl}/rest/v1/articulos?slug=eq.${encodeURIComponent(slug)}&select=*,categoria:categorias(nombre,slug),autor:autores(nombre,slug)&limit=1`;

      const supaResponse = await fetch(apiUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json',
        },
      });

      if (!supaResponse.ok) {
        console.error('Supabase API error:', supaResponse.status);
        return fetch(request);
      }

      const articles = await supaResponse.json();

      if (!articles || articles.length === 0) {
        // Article not found — pass through to origin (SPA will show 404)
        return fetch(request);
      }

      const article = articles[0];
      const fullUrl = `https://beisjoven.com/articulo/${article.slug}`;
      const imageUrl = article.imagen_url || 'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-image.jpg';
      const publishDate = article.fecha || article.created_at || '';
      const modifiedDate = article.updated_at || article.fecha || article.created_at || '';
      const categoryName = article.categoria?.nombre || 'Noticias';
      const authorName = article.autor?.nombre || 'Redacción Beisjoven';
      const authorSlug = article.autor?.slug || 'redaccion';
      const excerpt = article.extracto || '';

      // 5. Render the article content
      const renderedContent = renderArticleContent(article.contenido || '');

      // 6. Build JSON-LD structured data
      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article.titulo,
        "description": excerpt,
        "image": [imageUrl],
        "datePublished": publishDate,
        "dateModified": modifiedDate,
        "author": {
          "@type": "Person",
          "name": authorName,
          "url": `https://beisjoven.com/autor/${authorSlug}`
        },
        "publisher": {
          "@type": "Organization",
          "name": "Beisjoven",
          "logo": {
            "@type": "ImageObject",
            "url": "https://beisjoven.com/BJ-Logo-H2-WEB.png"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": fullUrl
        },
        "url": fullUrl,
        "articleSection": categoryName,
        "inLanguage": "es-MX"
      });

      // 7. Build full HTML page for crawlers
      const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(article.titulo)} - Beisjoven</title>
    <meta name="description" content="${escapeHtml(excerpt)}">
    <meta name="author" content="${escapeHtml(authorName)}">
    <link rel="canonical" href="${fullUrl}">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${fullUrl}">
    <meta property="og:title" content="${escapeHtml(article.titulo)} - Beisjoven">
    <meta property="og:description" content="${escapeHtml(excerpt)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:site_name" content="Beisjoven">
    <meta property="og:locale" content="es_MX">
    <meta property="article:published_time" content="${publishDate}">
    <meta property="article:modified_time" content="${modifiedDate}">
    <meta property="article:section" content="${escapeHtml(categoryName)}">
    <meta property="article:author" content="${escapeHtml(authorName)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(article.titulo)} - Beisjoven">
    <meta name="twitter:description" content="${escapeHtml(excerpt)}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Structured Data -->
    <script type="application/ld+json">${jsonLd}</script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "NewsMediaOrganization",
        "name": "Beisjoven",
        "url": "https://beisjoven.com",
        "description": "La revista digital de referencia para el béisbol y softbol mexicano.",
        "logo": "https://beisjoven.com/BJ-Logo-H2-WEB.png",
        "sameAs": [
            "https://facebook.com/beisjoven",
            "https://instagram.com/beisjoven",
            "https://twitter.com/beisjoven"
        ]
    }
    </script>
</head>
<body>
    <header>
        <nav>
            <a href="https://beisjoven.com/">Beisjoven - La Revista Digital de Béisbol y Softbol Mexicano</a>
            <ul>
                <li><a href="/categoria/mlb">MLB</a></li>
                <li><a href="/categoria/liga-mexicana">Ligas Mexicanas</a></li>
                <li><a href="/categoria/seleccion">Selección</a></li>
                <li><a href="/categoria/softbol">Softbol</a></li>
                <li><a href="/categoria/juvenil">Juvenil</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <article>
            <header>
                <a href="/categoria/${article.categoria?.slug || ''}">${escapeHtml(categoryName)}</a>
                <h1>${escapeHtml(article.titulo)}</h1>
                <p>Por <a href="/autor/${authorSlug}">${escapeHtml(authorName)}</a></p>
                <time datetime="${publishDate}">${formatDate(publishDate)}</time>
            </header>
            <figure>
                <img src="${imageUrl}" alt="${escapeHtml(article.titulo)}">
            </figure>
            <div class="article-content">
                ${renderedContent}
            </div>
        </article>
    </main>
    <footer>
        <p>&copy; ${new Date().getFullYear()} Beisjoven. Todos los derechos reservados.</p>
    </footer>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'X-Robots-Tag': 'index, follow',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      // On any error, fall through to origin
      return fetch(request);
    }
  },
};

// ==================== HELPERS ====================

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Render article content — supports both HTML (legacy Wix) and Markdown (new articles).
 * Mirrors the client-side renderContent() function in pages.js.
 */
function renderArticleContent(content) {
  if (!content) return '';

  // Detect if content is HTML (contains tags like <p>, <h2>, <strong>)
  const isHTML = /<[a-zA-Z][^>]*>/m.test(content);

  if (isHTML) {
    // HTML legacy: convert any inline markdown images
    return content.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt, url) => `<figure><img src="${url}" alt="${escapeHtml(alt)}" loading="lazy"><figcaption>${escapeHtml(alt)}</figcaption></figure>`
    );
  }

  // Markdown content: parse to HTML
  let html = content;

  // Images: ![caption||credit](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) => {
      const parts = alt.split('||');
      const caption = parts[0].trim();
      const credit = parts[1] ? parts[1].trim() : '';
      const figcaption = caption || credit
        ? `<figcaption>${caption ? escapeHtml(caption) : ''}${caption && credit ? ' ' : ''}${credit ? `<span>${escapeHtml(credit)}</span>` : ''}</figcaption>`
        : '';
      return `<figure><img src="${url}" alt="${escapeHtml(caption || alt)}" loading="lazy">${figcaption}</figure>`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" rel="noopener">$1</a>'
  );

  // Paragraphs
  const blocks = html.split(/\n\s*\n/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|figure|ul|ol|li|blockquote|div)/i.test(block)) return block;
    block = block.replace(/\n/g, '<br>');
    return `<p>${block}</p>`;
  }).join('\n');

  return html;
}
