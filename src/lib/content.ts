/**
 * Content rendering utilities.
 * Mirrors the existing renderContent() logic from the vanilla JS site.
 * Supports both HTML legacy (Wix migration) and Markdown (new articles).
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ==================== EMBED PROVIDERS ==================== */

interface EmbedProvider {
  name: string;
  test: (url: string) => boolean;
  toHTML: (url: string) => string;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

const EMBED_PROVIDERS: EmbedProvider[] = [
  {
    name: 'youtube',
    test: (url) => /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)/.test(url),
    toHTML: (url) => {
      const id = extractYouTubeId(url);
      if (!id) return '';
      return `<div class="embed-container embed-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    },
  },
  {
    name: 'twitter',
    test: (url) => /(?:x\.com|twitter\.com)\/\w+\/status\/\d+/.test(url),
    toHTML: (url) => {
      const match = url.match(/status\/(\d+)/);
      if (!match) return '';
      const id = match[1];
      const clean = escapeHtml(url.split('?')[0]);
      return `<div class="twitter-embed" data-tweet-id="${id}" data-tweet-url="${clean}"></div>`;
    },
  },
  {
    name: 'instagram',
    test: (url) => /instagram\.com\/(p|reel)\/[\w-]+/.test(url),
    toHTML: (url) => {
      const clean = escapeHtml(url.split('?')[0].replace(/\/$/, '') + '/');
      return `<div class="embed-container embed-instagram"><blockquote class="instagram-media" data-instgrm-permalink="${clean}" data-instgrm-version="14" style="max-width:540px; width:100%;"><a href="${clean}"></a></blockquote></div>`;
    },
  },
  {
    name: 'tiktok',
    test: (url) => /tiktok\.com\/@[\w.-]+\/video\/\d+/.test(url),
    toHTML: (url) => {
      const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
      if (!match) return '';
      const clean = escapeHtml(url.split('?')[0]);
      return `<div class="embed-container embed-social"><blockquote class="tiktok-embed" cite="${clean}" data-video-id="${match[1]}"><a href="${clean}"></a></blockquote></div>`;
    },
  },
];

/**
 * Pre-process content: replace standalone URL occurrences with embed HTML.
 * Runs BEFORE the main markdown→HTML conversion.
 *
 * Uses TWO approaches to handle all WYSIWYG and markdown formats:
 *
 * APPROACH 1 (HTML content — may have NO newlines):
 *   Regex-replaces any block-level tag whose sole content is a URL.
 *   Matches: <p>URL</p>, <h3>URL</h3>, <p><a href="URL">URL</a></p>, etc.
 *   Works on the full string — doesn't depend on \n.
 *
 * APPROACH 2 (Raw markdown — newline-separated):
 *   Falls back to line-by-line scan for bare URLs.
 */
function preProcessEmbeds(raw: string): string {
  let result = raw;

  // APPROACH 1: HTML content — find <tag>URL</tag> patterns in the full string.
  // Pattern A: <tag>https://...</tag>  (plain URL)
  result = result.replace(
    /<(p|h[1-6]|blockquote|div|li|span)\b[^>]*>\s*(https?:\/\/[^\s<]+?)\s*<\/\1>/gi,
    (_match, _tag, url) => {
      const clean = url.trim();
      for (const provider of EMBED_PROVIDERS) {
        if (provider.test(clean)) {
          return provider.toHTML(clean) || _match;
        }
      }
      return _match;
    }
  );

  // Pattern B: <tag><a href="URL" ...>URL</a></tag>  (auto-linked URL)
  result = result.replace(
    /<(p|h[1-6]|blockquote|div|li|span)\b[^>]*>\s*<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>\s*https?:\/\/[^\s<]+?\s*<\/a>\s*<\/\1>/gi,
    (_match, _tag, hrefUrl) => {
      const clean = hrefUrl.trim();
      for (const provider of EMBED_PROVIDERS) {
        if (provider.test(clean)) {
          return provider.toHTML(clean) || _match;
        }
      }
      return _match;
    }
  );

  // APPROACH 2: Raw markdown — line by line for bare URLs with no HTML.
  const lines = result.split('\n');
  result = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('http') || trimmed.includes(' ')) return line;
    // Skip if this line already has HTML (already processed by Approach 1)
    if (trimmed.includes('<')) return line;
    for (const provider of EMBED_PROVIDERS) {
      if (provider.test(trimmed)) {
        return provider.toHTML(trimmed) || line;
      }
    }
    return line;
  }).join('\n');

  return result;
}

/* ==================== SHORTCODE EMBEDS ==================== */

function renderFallbackLink(url: string): string {
  const trimmed = url.trim();
  return `<p class="mb-4 leading-relaxed"><a href="${escapeHtml(trimmed)}" target="_blank" rel="noopener" class="text-steel-blue hover:underline">${escapeHtml(trimmed)}</a></p>`;
}

const shortcodeHandlers: Record<string, (url: string) => string> = {
  youtube: (url) => EMBED_PROVIDERS[0].toHTML(url.trim()) || renderFallbackLink(url),
  tweet: (url) => EMBED_PROVIDERS[1].toHTML(url.trim()) || renderFallbackLink(url),
  instagram: (url) => EMBED_PROVIDERS[2].toHTML(url.trim()) || renderFallbackLink(url),
  tiktok: (url) => EMBED_PROVIDERS[3].toHTML(url.trim()) || renderFallbackLink(url),
};

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

function processShortcodes(content: string): string {
  // Normalize shortcodes that the WYSIWYG editor split across HTML tags/lines.
  content = content.replace(
    /(?:<[^>]*>)*\s*\[(youtube|tweet|instagram|tiktok)\]\s*(?:<[^>]*>)*([\s\S]*?)(?:<[^>]*>)*\s*\[\/\1\]\s*(?:<[^>]*>)*/gi,
    (_, tag: string, inner: string) => `[${tag}]${stripHtmlTags(inner).trim()}[/${tag}]`
  );

  return content.replace(
    /\[(youtube|tweet|instagram|tiktok)\]([\s\S]*?)\[\/\1\]/gi,
    (_, tag: string, url: string) => {
      const handler = shortcodeHandlers[tag.toLowerCase()];
      return handler ? handler(url) : renderFallbackLink(url);
    }
  );
}

/* ==================== MAIN RENDER ==================== */

export function renderContent(content: string): string {
  if (!content) return '';

  // STEP 1: Replace standalone URL lines with embed HTML (raw text stage)
  content = preProcessEmbeds(content);

  // STEP 2: Process [shortcode] tags
  content = processShortcodes(content);

  // STEP 3: Detect HTML vs Markdown and parse accordingly
  const isHTML = /<[a-zA-Z][^>]*>/m.test(content);

  if (isHTML) {
    // HTML legacy (or content that already has embed divs from step 1):
    // only process inline markdown images
    return content.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt: string, url: string) =>
        `<figure class="my-6"><img src="${url}" alt="${escapeHtml(alt)}" loading="lazy" class="rounded-lg w-full"><figcaption class="text-sm text-gray-500 mt-2 text-center">${escapeHtml(alt)}</figcaption></figure>`
    );
  }

  // Pure Markdown content (no HTML tags at all — rare after step 1 inserts embeds)
  let html = content;

  // Images: ![caption||credit](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt: string, url: string) => {
      const parts = alt.split('||');
      const caption = parts[0].trim();
      const credit = parts[1] ? parts[1].trim() : '';
      const figcaption =
        caption || credit
          ? `<figcaption class="text-sm text-gray-500 mt-2 text-center">${caption ? escapeHtml(caption) : ''}${caption && credit ? ' ' : ''}${credit ? `<span class="text-gray-400">${escapeHtml(credit)}</span>` : ''}</figcaption>`
          : '';
      return `<figure class="my-6"><img src="${url}" alt="${escapeHtml(caption || alt)}" loading="lazy" class="rounded-lg w-full">${figcaption}</figure>`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold mt-8 mb-3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4">$1</h2>');

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-steel-blue hover:underline">$1</a>'
  );

  // Paragraphs
  const blocks = html.split(/\n\s*\n/);
  html = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|figure|ul|ol|li|blockquote|div|p class)/i.test(block)) return block;
      block = block.replace(/\n/g, '<br>');
      return `<p class="mb-4 leading-relaxed">${block}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Format date in Spanish locale.
 */
export function formatDate(dateStr: string): string {
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
 * Calculate read time from content.
 */
export function readTime(content: string): string {
  const words = (content || '').split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min lectura`;
}

/**
 * Relative time (e.g., "hace 2 horas", "hace 3 días").
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return formatDate(dateStr);
}
