// ADS-GOLIVE-PREP-01 — unit tests for the outbound UTM builder.
// Run: npm test  (node --test, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdHref } from '../src/lib/ad-utm.js';

const params = (href) => Object.fromEntries(new URL(href).searchParams);

test('propia gets the four utm params', () => {
  const out = buildAdHref('https://cedisman.mx/', 'propia', 'fundador-2026', 'home-top');
  assert.deepEqual(params(out), {
    utm_source: 'beisjoven',
    utm_medium: 'display',
    utm_campaign: 'fundador-2026',
    utm_content: 'home-top',
  });
});

test('aliado gets the four utm params and utm_content = clicked slot', () => {
  const out = buildAdHref('https://cedisman.mx/promo', 'aliado', 'fundador-2026', 'article-body');
  assert.equal(params(out).utm_content, 'article-body');
  assert.equal(params(out).utm_source, 'beisjoven');
});

test('casa and placeholder URLs stay untouched', () => {
  assert.equal(buildAdHref('/#newsletter-form', 'casa', null, 'home-mid'), '/#newsletter-form');
  assert.equal(
    buildAdHref('https://beisjoven.com/contacto', 'casa', 'fundador-2026', 'home-mid'),
    'https://beisjoven.com/contacto'
  );
  assert.equal(buildAdHref('/contacto', 'placeholder', null, 'home-top'), '/contacto');
});

test('existing utm_* in target_url wins — no duplication, no overwrite', () => {
  const out = buildAdHref(
    'https://cedisman.mx/?utm_source=partner&utm_campaign=custom',
    'aliado',
    'fundador-2026',
    'home-top'
  );
  const p = params(out);
  assert.equal(p.utm_source, 'partner'); // DB value wins
  assert.equal(p.utm_campaign, 'custom'); // DB value wins
  assert.equal(p.utm_medium, 'display'); // missing ones still added
  assert.equal(p.utm_content, 'home-top');
  // no duplicated keys
  const keys = [...new URL(out).searchParams.keys()];
  assert.equal(keys.length, new Set(keys).size);
});

test('null/empty campana omits utm_campaign but keeps the other three', () => {
  for (const campana of [null, '']) {
    const p = params(buildAdHref('https://example.com/', 'propia', campana, 'home-mid'));
    assert.equal('utm_campaign' in p, false);
    assert.deepEqual(
      { utm_source: p.utm_source, utm_medium: p.utm_medium, utm_content: p.utm_content },
      { utm_source: 'beisjoven', utm_medium: 'display', utm_content: 'home-mid' }
    );
  }
});

test('relative and non-http(s) target_url returned unchanged even for paid', () => {
  assert.equal(buildAdHref('/promo-interna', 'propia', 'x', 'home-top'), '/promo-interna');
  assert.equal(buildAdHref('mailto:ventas@cedisman.mx', 'aliado', 'x', 'home-top'), 'mailto:ventas@cedisman.mx');
});

test('preserves existing query and hash, UTMs before the fragment', () => {
  const out = buildAdHref('https://cedisman.mx/p?ref=1#seccion', 'aliado', 'fundador-2026', 'article-body');
  const url = new URL(out);
  assert.equal(url.hash, '#seccion');
  assert.equal(url.searchParams.get('ref'), '1');
  assert.equal(url.searchParams.get('utm_content'), 'article-body');
});
