// ADS-GOLIVE-PREP-01 — pure builder for the outbound (click-through) URL of
// an ad creative. Server-side only: AdSlot.astro calls this at build/render
// time so the cached HTML already carries the UTMs.
//
// Rules (spec NOMENCLATURA-Y-TRAZABILIDAD, ratified by PM):
//   · Only paid creatives (propia | aliado) are tagged. casa and placeholder
//     leave the URL untouched — no UTMs toward our own properties.
//   · Params appended: utm_source=beisjoven, utm_medium=display,
//     utm_campaign=<anuncios.campana> (omitted when NULL/empty),
//     utm_content=<slot_id>.
//   · If target_url already carries a given utm_* param, the DB value wins —
//     never duplicated, never overwritten.
//   · target_url is stored clean once; tagging happens at serve time via the
//     URL API (no string concatenation). Relative or non-http(s) URLs are
//     returned unchanged.
//
// Plain JS on purpose (same pattern as ad-event-validator.js): importable
// from Astro (TS/Vite) AND from `node --test` without flags. Dependency-free.

const PAID_TIPOS = new Set(['propia', 'aliado']);

/**
 * Builds the outbound href for an ad creative.
 *
 * @param {string} targetUrl - clean destination URL from anuncios.target_url
 * @param {'propia' | 'aliado' | 'casa' | 'placeholder'} tipo
 * @param {string | null} campana - anuncios.campana (utm_campaign), nullable
 * @param {string} slotId - slot serving the creative (utm_content)
 * @returns {string} tagged URL for paid tipos; targetUrl unchanged otherwise
 */
export function buildAdHref(targetUrl, tipo, campana, slotId) {
  if (!PAID_TIPOS.has(tipo)) return targetUrl;

  let url;
  try {
    url = new URL(targetUrl);
  } catch {
    return targetUrl; // relative path or malformed — leave clean
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return targetUrl;

  const params = [
    ['utm_source', 'beisjoven'],
    ['utm_medium', 'display'],
    ['utm_campaign', campana || null],
    ['utm_content', slotId],
  ];
  for (const [key, value] of params) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}
