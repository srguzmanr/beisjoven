/**
 * BUG-PUB-01 — guarda de regresión: ninguna superficie pública puede leer
 * `articulos` sin filtrar `publicado`.
 *
 * Por qué un test estático y no de integración: todas las lecturas del sitio
 * usan `supabaseServer` (service role), que BYPASEA RLS. La red del contenedor
 * no alcanza Supabase, así que la única verificación automática posible es
 * sobre el código fuente. El test lee cada cadena que arranca en
 * `.from('articulos')` dentro de las superficies públicas y exige que el
 * token `publicado` aparezca en ella (cubre `.eq('publicado', true)` y
 * `.eq('articulo.publicado', true)` de los joins).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Raíces con código que se ejecuta para visitantes anónimos.
const SCAN_DIRS = ['src/lib', 'src/pages', 'src/components'];
const SCAN_FILES = [
  // Único JS de navegador que consume `articulos` en una página pública
  // (el resto de public/js sólo lo carga /admin, con sesión y RLS).
  'public/js/category-load-more.js',
];
const SCAN_EXTS = ['.ts', '.astro', '.js'];

// Exenciones documentadas: rutas de escritura del panel, no lectura pública.
const EXEMPT = new Map([
  [
    'src/pages/api/guardar-articulo.ts',
    'endpoint de escritura del panel: exige Bearer token con app_metadata.role=superadmin',
  ],
]);

const MARKER = ".from('articulos')";

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (SCAN_EXTS.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

function collectFiles() {
  const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
  files.push(...SCAN_FILES.map((f) => join(ROOT, f)));
  return files.filter((f) => !EXEMPT.has(relative(ROOT, f)));
}

/** Cadena de query: del `.from('articulos')` al `;` o al siguiente `.from`. */
function chainsFor(source) {
  const chains = [];
  let index = source.indexOf(MARKER);
  while (index !== -1) {
    const next = source.indexOf(MARKER, index + MARKER.length);
    const semi = source.indexOf(';', index);
    const candidates = [next, semi].filter((i) => i !== -1);
    const end = candidates.length ? Math.min(...candidates) : source.length;
    chains.push({ index, text: source.slice(index, end) });
    index = next;
  }
  return chains;
}

test('toda lectura pública de articulos filtra publicado', () => {
  const offenders = [];
  let checked = 0;

  for (const file of collectFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const chain of chainsFor(source)) {
      checked++;
      if (!chain.text.includes('publicado')) {
        const line = source.slice(0, chain.index).split('\n').length;
        offenders.push(`${relative(ROOT, file)}:${line}`);
      }
    }
  }

  assert.ok(checked > 0, 'el scanner no encontró ninguna query de articulos');
  assert.deepEqual(
    offenders,
    [],
    `queries públicas de articulos sin filtro publicado:\n  ${offenders.join('\n  ')}`,
  );
});

test('la ruta de detalle responde 404 real, no redirect a /404', () => {
  const route = readFileSync(join(ROOT, 'src/pages/articulo/[...slug].astro'), 'utf8');
  assert.match(
    route,
    /new Response\(null, \{ status: 404 \}\)/,
    'la ruta de artículo debe devolver un 404 real cuando el artículo no existe o no está publicado',
  );
  assert.doesNotMatch(
    route,
    /Astro\.redirect\('\/404'\)/,
    "Astro.redirect('/404') produce 302 → 200 (soft 404)",
  );
});
