// ADS-DISCLOSURE-01 — single source of truth for ad disclosure labels.
//
// Two rules, one lever:
//
//   1. DISCLOSURE_LABELS is a CLOSED map of `anuncios.tipo` → the label Legal
//      approved for it. Exactly those entries. There is no default branch and
//      no fallback: a tipo that is not a key here has no approved label.
//
//   2. A creative may only reach a reader if its tipo has an entry here.
//      canServeCreative() is DEFINED as "labelForCreative() !== null", so
//      permission and label cannot drift apart. That coupling — not the
//      absence of any particular string — is what makes the defect
//      unrepeatable: you cannot enable a tipo without also stating, in the
//      same edit, the exact words that will appear above its creative.
//
// Fail-closed by construction: any tipo absent from the map is born
// non-servable, including a value added to the `anuncio_tipo` enum by a
// future migration. Enabling one is a single edit — add its Legal-approved
// entry below.
//
// This replaces the previous `if (tipo === 'casa') … else <default>` in
// AdSlot.astro, which was fail-OPEN: every tipo except `casa` inherited the
// paid-advertising label automatically, so a rewrite of that one default
// line silently relabelled every paying advertiser.
//
// Plain JS on purpose (same pattern as ad-utm.js / ad-event-validator.js):
// importable from Astro (TS/Vite) AND from `node --test` without flags.
// Dependency-free.

/**
 * Legal-approved disclosure labels, keyed by `anuncios.tipo`.
 * Rendered uppercase by CSS (`.bj-adslot__label`), and used verbatim as the
 * slot's aria-label.
 *
 * DELIBERATELY ABSENT — do not add without an approved wording:
 *
 *   · `propia` (Rafiki, Black Koi 360) — related-party inventory. Serving it
 *     requires a related-party disclosure label approved by Legal. None
 *     exists, so it stays non-servable. This is the intended state, not a
 *     bug and not an oversight: when Legal approves the wording, add the
 *     entry here and `propia` serves again from its existing waterfall tier
 *     in AdSlot.astro — no other edit needed.
 *
 *   · `placeholder` — not an advertiser tier at all. It is the unsold-
 *     inventory empty state; see EMPTY_SLOT_NOTICE below.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const DISCLOSURE_LABELS = Object.freeze({
  aliado: 'Publicidad / Advertisement',
  casa: 'De Beisjoven / By Beisjoven',
});

/**
 * INVENTORY NOTICE — not a disclosure. Read this before "fixing" it.
 *
 * Rendered above the empty box when a slot has no servable creative. There is
 * no advertiser here and no paid placement, so there is nothing to disclose:
 * what this labels is a block of unsold inventory. Showing that empty state
 * is a deliberate commercial decision — it is a sales argument — not a
 * rendering bug.
 *
 * It lives OUTSIDE DISCLOSURE_LABELS on purpose. Do not fold it into the map
 * (it is not keyed by a tipo and must never gate a creative), and do not
 * delete it as an orphaned disclosure. It is neither.
 *
 * The copy is identical to what production has served since ADS-GOLIVE-PREP-01
 * and is frozen by acceptance criterion 4. Today it renders on `article-footer`
 * only, which has no rows in `anuncios`.
 */
export const EMPTY_SLOT_NOTICE = 'Publicidad / Advertisement';

/**
 * The Legal-approved label for a served creative.
 *
 * @param {string} tipo - `anuncios.tipo`
 * @returns {string|null} the approved label, or null when the tipo has none.
 *   Never returns an empty string: a blank label is treated as no label.
 */
export function labelForCreative(tipo) {
  // hasOwnProperty, not `in` or a bare lookup: `tipo` comes from the database,
  // and a plain-object lookup for 'constructor' / 'toString' would otherwise
  // resolve up the prototype chain and read as an approved label.
  const label = Object.prototype.hasOwnProperty.call(DISCLOSURE_LABELS, tipo)
    ? DISCLOSURE_LABELS[tipo]
    : null;
  return typeof label === 'string' && label.length > 0 ? label : null;
}

/**
 * May a creative of this tipo be served to a reader?
 *
 * Defined as "has an approved label" so that permission and label can never
 * diverge. Do not reimplement this as its own list of tipos.
 *
 * @param {string} tipo - `anuncios.tipo`
 * @returns {boolean}
 */
export function canServeCreative(tipo) {
  return labelForCreative(tipo) !== null;
}
