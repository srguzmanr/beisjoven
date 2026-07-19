// SEC-02-FIX-01 — copia la foto principal de una historia (Tu Historia,
// bucket privado tu-historia) al bucket público 'imagenes' al publicar el
// artículo. El bucket tu-historia es admin-only desde SEC-02 P1 (signed
// URLs) y el admin no tiene service role en cliente, así que la copia debe
// pasar por este endpoint server-side.
//
// Pipeline (mismo patrón que /api/enviar-historia): descargar con service
// role → sharp .rotate().jpeg() (re-encode sin metadata — cinturón y
// tirantes: el pipeline P2 ya sube sin EXIF, pero esto cubre fotos
// pre-P2 que sigan en tu-historia) → subir a 'imagenes' con nombre
// Date.now()-random.jpg → upsert de metadata (patrón LIMPIA-04) → devolver
// la URL pública estable. La foto original permanece intacta en
// tu-historia (archivo).
//
// Auth: esta es la primera ruta admin-autenticada del repo (las otras dos
// rutas de src/pages/api son públicas). El caller manda el access_token de
// su sesión de Supabase Auth; se valida contra Auth (getUser) y se exige
// app_metadata.role === 'admin' (SEC-06: nunca user_metadata, que el propio
// usuario puede editar).
import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';

export const prerender = false;

const SOURCE_BUCKET = 'tu-historia';
const DEST_BUCKET = 'imagenes';

const serviceKeyPresent = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
if (!serviceKeyPresent) {
  console.error('[copiar-foto-historia] SUPABASE_SERVICE_ROLE_KEY is not set — endpoint will fail');
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!serviceKeyPresent) {
    return json(500, { error: 'Error del servidor. Intenta más tarde.' });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json(401, { error: 'No autenticado' });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return json(401, { error: 'Sesión inválida o expirada' });
  }
  // SEC-ROLES-01: el rol real es 'superadmin' (app_metadata). El valor legacy
  // 'admin' dejó de existir cuando se aplicó la migración 01 — exigirlo aquí
  // dejaba el endpoint en 403 permanente para la única cuenta operativa.
  if (userData.user.app_metadata?.role !== 'superadmin') {
    return json(403, { error: 'No autorizado' });
  }

  let body: { path?: unknown; credito?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Solicitud inválida' });
  }

  const path = typeof body.path === 'string' ? body.path.trim() : '';
  if (!path || path.includes('..') || path.startsWith('/') || !/^[\w-]+\/[\w.-]+$/.test(path)) {
    return json(400, { error: 'Ruta de foto inválida', field: 'path' });
  }
  const credito = typeof body.credito === 'string' && body.credito.trim() ? body.credito.trim() : null;

  const { data: downloaded, error: downloadError } = await supabaseServer.storage
    .from(SOURCE_BUCKET)
    .download(path);
  if (downloadError || !downloaded) {
    console.error('[copiar-foto-historia] download failed:', downloadError);
    return json(404, { error: 'No se encontró la foto original' });
  }

  // Re-encode sin .withMetadata() — descarta EXIF/GPS igual que
  // /api/enviar-historia. .rotate() hornea la orientación antes de que el
  // strip la borre, para no dejar fotos de lado.
  let processed: Buffer;
  try {
    const sharp = (await import('sharp')).default;
    const input = Buffer.from(await downloaded.arrayBuffer());
    processed = await sharp(input).rotate().jpeg({ quality: 85 }).toBuffer();
  } catch (err) {
    console.error('[copiar-foto-historia] sharp failed:', err);
    return json(422, { error: 'La foto original no es una imagen válida' });
  }

  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}.jpg`;

  const { error: uploadError } = await supabaseServer.storage
    .from(DEST_BUCKET)
    .upload(nombre, processed, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) {
    console.error('[copiar-foto-historia] upload failed:', uploadError.message);
    return json(500, { error: 'No se pudo copiar la foto al bucket público' });
  }

  // No crítico (patrón LIMPIA-04): la imagen ya quedó pública y subida;
  // que falle la fila de metadata no debe romper la publicación.
  try {
    const { error: metaError } = await supabaseServer
      .from('imagenes_metadata')
      .upsert({ nombre, credito }, { onConflict: 'nombre' });
    if (metaError) throw metaError;
  } catch (metaErr) {
    console.error('[copiar-foto-historia] metadata upsert failed:', metaErr);
  }

  const { data: urlData } = supabaseServer.storage.from(DEST_BUCKET).getPublicUrl(nombre);
  return json(200, { url: urlData.publicUrl, nombre });
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
