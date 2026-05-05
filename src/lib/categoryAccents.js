// Single source of truth for category → accent token + display label.
// Consumers: StoryCard, ListCard, SectionHead, and homepage modules (DESIGN-04b–04e).
// Unknown / NULL slugs fall back to the brand red and the generic "NOTICIAS" label.

const ACCENTS = {
  'liga-mexicana': 'var(--cat-liga-mexicana)',
  'mlb': 'var(--cat-mlb)',
  'softbol': 'var(--cat-softbol)',
  'seleccion': 'var(--cat-seleccion)',
  'juvenil': 'var(--cat-juvenil)',
  'opinion': 'var(--cat-opinion)',
};

const LABELS = {
  'liga-mexicana': 'LIGAS',
  'mlb': 'MLB',
  'softbol': 'SOFTBOL',
  'seleccion': 'SELECCIÓN',
  'juvenil': 'JUVENIL',
  'opinion': 'OPINIÓN',
};

export function getCategoryAccent(slug) {
  return ACCENTS[slug] || 'var(--red)';
}

export function getCategoryLabel(slug) {
  return LABELS[slug] || 'NOTICIAS';
}
