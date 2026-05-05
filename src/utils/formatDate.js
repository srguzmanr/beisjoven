// Single source of truth for date formats across the site (BJ-008-FOLLOW-UP-01).
// Cards (homepage feed, category pages, juvenil rail, list cards): formatCardDate
// Article page byline: formatArticleDate
// Relative time ("hace Xd") is intentionally NOT exported — see ticket.

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function parseLocal(iso) {
  if (!iso) return null;
  const [datePart] = String(iso).split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) {
    const fallback = new Date(iso);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(y, m - 1, d);
}

export function formatCardDate(iso) {
  const d = parseLocal(iso);
  if (!d) return '';
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatArticleDate(iso) {
  const d = parseLocal(iso);
  if (!d) return '';
  return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]} de ${d.getFullYear()}`;
}
