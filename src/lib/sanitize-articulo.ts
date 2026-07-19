// SEC-04 (EDITOR-20 F6) — sanitización server-side del HTML de artículos.
// Allowlist derivada del output legítimo del editor Tiptap (inventario de
// Fase 0, docs/EDITOR-20-FASE0.md §6) + los formatos legacy que el
// frontend sabe renderizar. Todo lo demás se descarta.
//
// Decisiones aprobadas por el CEO (GO 19-jul):
//   · iframes SOLO de YouTube/youtube-nocookie — streamable (1 artículo)
//     se degradó a link vía SQL (20260719_editor20_06_streamable_a_link.sql).
//   · style= NO entra al allowlist (17 artículos legacy Wix lo pierden al
//     render; se limpia en DB al re-guardarlos).
//   · Se aplica en DOS capas: persistencia (/api/guardar-articulo) y
//     render SSR (renderContent) como defensa en profundidad para
//     contenido legacy o escrituras que no pasen por el endpoint.
import sanitizeHtml from 'sanitize-html';

export const ARTICULO_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'br', 'code', 'pre',
    'a', 'img', 'figure', 'figcaption', 'div', 'span', 'iframe',
  ],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    img: ['src', 'alt', 'loading'],
    figure: ['class'],
    figcaption: ['class'],
    // Nodos custom del editor: youtube wrapper, twitter, galería
    div: ['class', 'data-youtube-video', 'data-youtube-broken', 'data-gallery', 'data-tweet-id', 'data-tweet-url'],
    // Embeds de Instagram/TikTok (blockquote que hidrata el script oficial)
    blockquote: ['class', 'cite', 'data-instgrm-permalink', 'data-instgrm-version', 'data-video-id'],
    iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'allow', 'loading', 'title', 'start'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  allowProtocolRelative: false,
  // iframe válido = solo embeds de YouTube (incluye nocookie).
  allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com'],
  disallowedTagsMode: 'discard',
  // Un iframe cuyo src no pasó el filtro queda vacío — descartarlo entero
  // para no dejar bloques en blanco en el render.
  exclusiveFilter: (frame) => frame.tag === 'iframe' && !frame.attribs?.src,
};

/** HTML del cuerpo del artículo → HTML seguro (allowlist estricta). */
export function sanitizeArticuloHtml(html: string | null | undefined): string {
  return sanitizeHtml(html || '', ARTICULO_SANITIZE_OPTIONS);
}

/** Campos de texto plano (título, extracto, pies, créditos): cero tags. */
export function sanitizeTextoPlano(text: string | null | undefined): string {
  return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} }).trim();
}
