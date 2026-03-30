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

export function renderContent(content: string): string {
  if (!content) return '';

  // Detect HTML content (legacy from Wix)
  const isHTML = /<[a-zA-Z][^>]*>/m.test(content);

  if (isHTML) {
    // HTML legacy: only process inline markdown images
    return content.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt: string, url: string) =>
        `<figure class="my-6"><img src="${url}" alt="${escapeHtml(alt)}" loading="lazy" class="rounded-lg w-full"><figcaption class="text-sm text-gray-500 mt-2 text-center">${escapeHtml(alt)}</figcaption></figure>`
    );
  }

  // Markdown content: full parse
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
      if (/^<(h[1-6]|figure|ul|ol|li|blockquote|div)/i.test(block)) return block;
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
