// ADS-DISCLOSURE-01 — regression guard for the ad disclosure containment.
//
// Two jobs:
//   1. Prove the label map stays closed and coupled to the serve permission.
//   2. Fail if the wording Legal prohibited reappears in the repo or in the
//      build output.
//
// Run: npm test   (node --test, no flags, no dependencies)

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DISCLOSURE_LABELS,
  EMPTY_SLOT_NOTICE,
  labelForCreative,
  canServeCreative,
} from '../src/lib/ad-disclosure.js';

// --- The coupling -----------------------------------------------------------
// First assertion on purpose: that permission and label cannot diverge is the
// containment itself. Everything else is downstream of it.

test('canServeCreative() is exactly "has an approved label"', () => {
  const probes = [
    // the four anuncio_tipo enum values
    'propia', 'aliado', 'casa', 'placeholder',
    // values that do not exist in the enum but have been assumed to
    'pagado', 'patrocinado', 'sponsored',
    // prototype-chain probes: a bare object lookup would resolve these
    'constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty',
    // junk from a malformed row
    '', ' ', null, undefined, 0, false, [], {},
  ];
  for (const tipo of probes) {
    assert.equal(
      canServeCreative(tipo),
      labelForCreative(tipo) !== null,
      `permission/label drift for tipo: ${JSON.stringify(tipo)}`
    );
  }
});

test('a prototype-chain hit is not an approved label', () => {
  // Object.prototype.toString exists but is not a string label.
  assert.equal(labelForCreative('toString'), null);
  assert.equal(canServeCreative('constructor'), false);
});

// --- The closed map ---------------------------------------------------------

test('the approved map is exactly the two Legal-approved entries', () => {
  assert.deepEqual({ ...DISCLOSURE_LABELS }, {
    aliado: 'Publicidad / Advertisement',
    casa: 'De Beisjoven / By Beisjoven',
  });
  assert.ok(Object.isFrozen(DISCLOSURE_LABELS), 'map must be frozen');
});

test('CEDISMAN tier keeps the label production serves (criterio 5)', () => {
  // The paying advertiser runs as tipo 'aliado' in home-top and article-body.
  assert.equal(labelForCreative('aliado'), 'Publicidad / Advertisement');
  assert.equal(canServeCreative('aliado'), true);
});

test('house inventory keeps its label', () => {
  assert.equal(labelForCreative('casa'), 'De Beisjoven / By Beisjoven');
  assert.equal(canServeCreative('casa'), true);
});

// --- Criterio 8: a tipo with no entry is born non-servable ------------------

test('every tipo outside the map is non-servable (criterio 8)', () => {
  const unapproved = [
    'propia',       // related-party: no Legal-approved wording yet
    'placeholder',  // empty state, not an advertiser tier
    'pagado',       // does not exist in the enum
    'un_tipo_que_una_migracion_futura_agregue',
  ];
  for (const tipo of unapproved) {
    assert.equal(labelForCreative(tipo), null, `${tipo} must have no label`);
    assert.equal(canServeCreative(tipo), false, `${tipo} must not be servable`);
  }
});

// --- Criterio 4: the empty state is unchanged -------------------------------

test('the empty-slot notice is inventory copy, outside the disclosure map', () => {
  // Frozen by criterio 4: this is what article-footer has served all along.
  assert.equal(EMPTY_SLOT_NOTICE, 'Publicidad / Advertisement');
  // It is not keyed by a tipo, so it can never gate a creative.
  assert.equal(Object.keys(DISCLOSURE_LABELS).includes('placeholder'), false);
});

// --- The prohibited wording -------------------------------------------------
//
// The banned phrase is assembled from fragments so this file never contains
// the literal — otherwise the guard would trip on itself and be useless.
//
// Two patterns, deliberately different in tightness:
//   · STEM  — scanned over src/ only. That tree is our code; no editorial copy
//             lives there, so the bare stem is a zero-false-positive guard and
//             catches partial reintroductions (a variable name, a half-written
//             label).
//   · PHRASE — scanned over the whole repo and the build output. Whitespace-
//             separated, so it cannot trip on a legitimate hyphenated article
//             slug (beisjoven.com has published articles whose slugs contain
//             the stem) that reaches a generated artifact.

const STEM = ['ali', 'anz'].join('');
const BANNED_STEM = new RegExp(STEM, 'i');
const BANNED_PHRASE = new RegExp(['en', `${STEM}a`, 'con'].join('\\s+'), 'i');

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', 'dist', '.vercel']);
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.pdf',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm', '.zip', '.gz',
]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile() && !BINARY_EXT.has(extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

function offendingLines(file, pattern) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  if (!pattern.test(text)) return [];
  return text
    .split('\n')
    .map((line, i) => [i + 1, line])
    .filter(([, line]) => pattern.test(line))
    .map(([n, line]) => `${file.replace(REPO_ROOT, '')}:${n}: ${line.trim().slice(0, 160)}`);
}

test('the prohibited disclosure wording is absent from the repo', () => {
  const hits = [];
  for (const file of walk(REPO_ROOT)) {
    hits.push(...offendingLines(file, BANNED_PHRASE));
  }
  assert.deepEqual(hits, [], `prohibited disclosure wording found:\n${hits.join('\n')}`);
});

test('src/ carries no trace of the prohibited wording', () => {
  const hits = [];
  for (const file of walk(join(REPO_ROOT, 'src'))) {
    hits.push(...offendingLines(file, BANNED_STEM));
  }
  assert.deepEqual(hits, [], `prohibited stem found in src/:\n${hits.join('\n')}`);
});

test('the build output carries no prohibited wording', (t) => {
  // Build output is gitignored, so it is only here after `npx astro build`.
  // Absent output is reported, never silently passed over.
  const roots = [join(REPO_ROOT, 'dist'), join(REPO_ROOT, '.vercel', 'output')]
    .filter((dir) => existsSync(dir));

  if (roots.length === 0) {
    t.diagnostic('no build output present (dist/, .vercel/output/) — scan not run');
    return;
  }

  const hits = [];
  let scanned = 0;
  for (const root of roots) {
    // walk() skips dist/.vercel by name; scan their contents directly.
    for (const file of walkBuild(root)) {
      scanned++;
      hits.push(...offendingLines(file, BANNED_PHRASE));
    }
  }
  t.diagnostic(`scanned ${scanned} build artifacts across ${roots.length} root(s)`);
  assert.deepEqual(hits, [], `prohibited wording in build output:\n${hits.join('\n')}`);
});

function* walkBuild(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      yield* walkBuild(full);
    } else if (entry.isFile() && !BINARY_EXT.has(extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}
