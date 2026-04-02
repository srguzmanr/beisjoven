#!/usr/bin/env node
/**
 * SPRINT1-01: Migrar imágenes de Wix CDN → Supabase Storage
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-wix-images.mjs
 *
 * O con un archivo .env:
 *   node --env-file=.env scripts/migrate-wix-images.mjs
 *
 * El script es idempotente: si la imagen ya está en Supabase Storage,
 * reutiliza la URL existente sin volver a subir.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Configuración ───────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yulkbjpotfmwqkzzfegg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'imagenes';
const STORAGE_PATH_PREFIX = 'articulos';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY no está definida.');
  console.error('Usa: SUPABASE_SERVICE_ROLE_KEY=tu_clave node scripts/migrate-wix-images.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Determina la extensión a partir del Content-Type o la URL. */
function getExtension(contentType, url) {
  if (contentType) {
    if (contentType.includes('png'))  return 'png';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('gif'))  return 'gif';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  }
  // Fallback: extraer de la URL (antes de query params)
  const urlPath = url.split('?')[0];
  const match = urlPath.match(/\.(png|webp|gif|jpe?g)$/i);
  if (match) return match[1].toLowerCase().replace('jpeg', 'jpg');
  return 'jpg'; // default
}

/** Descarga una imagen y devuelve { buffer, contentType }. */
async function downloadImage(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Beisjoven-Migration/1.0)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al descargar ${url}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

/** Verifica si un archivo ya existe en Storage. */
async function fileExistsInStorage(storagePath) {
  const dir = storagePath.substring(0, storagePath.lastIndexOf('/'));
  const name = storagePath.substring(storagePath.lastIndexOf('/') + 1);
  const { data, error } = await supabase.storage.from(BUCKET).list(dir, {
    search: name,
  });
  if (error) return false;
  return data.some((f) => f.name === name);
}

/** Sube un buffer a Supabase Storage y devuelve la URL pública. */
async function uploadToStorage(storagePath, buffer, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false, // no sobreescribir si ya existe
    });

  if (error && !error.message.includes('already exists')) {
    throw new Error(`Error subiendo a Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Migración Wix → Supabase Storage ===\n');

  // 1. Verificar que el bucket existe y es público
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucket = buckets?.find((b) => b.name === BUCKET);
  if (!bucket) {
    console.log(`Bucket "${BUCKET}" no encontrado. Creando...`);
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) {
      console.error('ERROR creando bucket:', error.message);
      process.exit(1);
    }
    console.log(`Bucket "${BUCKET}" creado.\n`);
  } else if (!bucket.public) {
    console.warn(`AVISO: El bucket "${BUCKET}" no es público. Las imágenes podrían no cargar.`);
  } else {
    console.log(`Bucket "${BUCKET}" encontrado y público.\n`);
  }

  // 2. Obtener todos los artículos con imagen_url de Wix
  //    (excluir ytimg.com — thumbnails de YouTube, dejar intactos)
  console.log('Consultando artículos con imagen de Wix...');
  const { data: articulos, error: queryError } = await supabase
    .from('articulos')
    .select('id, slug, imagen_url')
    .like('imagen_url', '%wixstatic.com%')
    .order('id');

  if (queryError) {
    console.error('ERROR en query:', queryError.message);
    process.exit(1);
  }

  const total = articulos.length;
  console.log(`${total} artículos con imagen_url en Wix CDN.\n`);

  if (total === 0) {
    console.log('Nada que migrar. ¡Todo limpio!');
    return;
  }

  // 3. Migrar uno por uno
  let exitosos = 0;
  let omitidos = 0;
  const errores = [];

  for (let i = 0; i < total; i++) {
    const { id, slug, imagen_url } = articulos[i];
    const label = `[${i + 1}/${total}]`;

    // Skip de seguridad: si ya no contiene wixstatic
    if (!imagen_url.includes('wixstatic.com')) {
      console.log(`${label} SKIP (ya migrado): ${slug}`);
      omitidos++;
      continue;
    }

    try {
      // Descargar imagen para determinar extensión
      const { buffer, contentType } = await downloadImage(imagen_url);
      const ext = getExtension(contentType, imagen_url);
      const storagePath = `${STORAGE_PATH_PREFIX}/${slug}.${ext}`;
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

      // Verificar si ya existe en Storage (idempotencia)
      let publicUrl;
      const exists = await fileExistsInStorage(storagePath);
      if (exists) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
        console.log(`${label} Ya existe en Storage, reutilizando: ${slug}`);
      } else {
        publicUrl = await uploadToStorage(storagePath, buffer, mimeType);
        console.log(`${label} Subido: ${slug} → ${publicUrl}`);
      }

      // Actualizar imagen_url en la base de datos
      const { error: updateError } = await supabase
        .from('articulos')
        .update({ imagen_url: publicUrl })
        .eq('id', id);

      if (updateError) {
        throw new Error(`Error actualizando DB: ${updateError.message}`);
      }

      exitosos++;
    } catch (err) {
      console.error(`${label} ERROR (${slug}): ${err.message}`);
      errores.push({ id, slug, imagen_url, error: err.message });
    }
  }

  // 4. Reporte final
  console.log('\n=== REPORTE FINAL ===');
  console.log(`Total procesados : ${total}`);
  console.log(`Exitosos         : ${exitosos}`);
  console.log(`Omitidos (skip)  : ${omitidos}`);
  console.log(`Errores          : ${errores.length}`);

  if (errores.length > 0) {
    console.log('\nArticulos con error:');
    errores.forEach(({ id, slug, error }) => {
      console.log(`  - id=${id} slug=${slug}: ${error}`);
    });
  }

  // 5. Verificación post-migración
  const { data: restantes } = await supabase
    .from('articulos')
    .select('id', { count: 'exact', head: true })
    .like('imagen_url', '%wixstatic.com%');

  console.log(`\nArticulos con Wix restantes: ${restantes ?? '?'}`);

  if (errores.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
