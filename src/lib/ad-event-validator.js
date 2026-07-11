// ADS-TRACK-01 — pure validator for POST /api/ad-event payloads.
// Plain JS on purpose: importable from the Astro endpoint (TS/Vite) AND from
// `node --test` without flags. Must stay dependency-free and never touch
// import.meta.env.

const EVENTOS = new Set(['impression', 'viewable', 'click']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @typedef {Object} AdEventPayload
 * @property {string} slot_id
 * @property {string | null} anuncio_id
 * @property {'impression' | 'viewable' | 'click'} evento
 * @property {string | null} path
 */

/**
 * Validates an untrusted ad-event payload. Strict: any malformed field
 * rejects the whole payload (the endpoint answers 204 without inserting).
 *
 * @param {unknown} raw - parsed JSON body
 * @returns {AdEventPayload | null} normalized payload, or null if invalid
 */
export function validateAdEvent(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

  const { slot_id, anuncio_id, evento, path } = /** @type {Record<string, unknown>} */ (raw);

  if (typeof slot_id !== 'string' || slot_id.length < 1 || slot_id.length > 100) return null;
  if (typeof evento !== 'string' || !EVENTOS.has(evento)) return null;

  let anuncioId = null;
  if (anuncio_id !== undefined && anuncio_id !== null && anuncio_id !== '') {
    if (typeof anuncio_id !== 'string' || !UUID_RE.test(anuncio_id)) return null;
    anuncioId = anuncio_id.toLowerCase();
  }

  let cleanPath = null;
  if (path !== undefined && path !== null && path !== '') {
    if (typeof path !== 'string' || !path.startsWith('/') || path.length > 500) return null;
    cleanPath = path;
  }

  return {
    slot_id,
    anuncio_id: anuncioId,
    evento: /** @type {AdEventPayload['evento']} */ (evento),
    path: cleanPath,
  };
}
