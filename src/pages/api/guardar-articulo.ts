// SEC-04 (EDITOR-20 F6) — punto de persistencia de artículos con
// sanitización server-side. El panel (saveArticle Y autosave) escribe a
// través de este endpoint en lugar de INSERT/UPDATE directos con el
// cliente del navegador; el HTML del editor se filtra con la allowlist
// de sanitize-articulo antes de tocar la DB.
//
// Además refuerza server-side el slug lock (M1): si el artículo ya está
// publicado, cualquier slug entrante se descarta y se conserva el
// almacenado — los enlaces publicados no cambian ni por API directa.
//
// Auth: mismo patrón que copiar-foto-historia — Bearer token de la
// sesión, validado con getUser(); exige app_metadata.role='superadmin'.
// (El rol periodista se integrará aquí cuando sus policies existan.)
import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { sanitizeArticuloHtml, sanitizeTextoPlano } from '@/lib/sanitize-articulo';

export const prerender = false;

const serviceKeyPresent = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
if (!serviceKeyPresent) {
  console.error('[guardar-articulo] SUPABASE_SERVICE_ROLE_KEY is not set — endpoint will fail');
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Columnas que el panel puede escribir. Todo lo demás se ignora.
const COLUMNAS_TEXTO_PLANO = ['titulo', 'extracto', 'pie_de_foto', 'foto_credito'] as const;
const COLUMNAS_PASSTHROUGH = [
  'categoria_id', 'autor_id', 'imagen_url', 'publicado', 'read_time_minutes', 'user_id',
] as const;

export const POST: APIRoute = async ({ request }) => {
  if (!serviceKeyPresent) {
    return json(500, { error: 'Error del servidor. Intenta más tarde.' });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { error: 'No autenticado' });

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return json(401, { error: 'Sesión inválida o expirada' });
  }
  if (userData.user.app_metadata?.role !== 'superadmin') {
    return json(403, { error: 'No autorizado' });
  }

  let body: { id?: unknown; articulo?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Solicitud inválida' });
  }

  const id = typeof body.id === 'number' && Number.isInteger(body.id) ? body.id : null;
  const input = body.articulo;
  if (!input || typeof input !== 'object') {
    return json(400, { error: 'Falta el artículo', field: 'articulo' });
  }

  // Construir el payload saneado SOLO con las claves presentes — el
  // autosave manda payloads parciales (p.ej. nunca incluye 'publicado').
  const payload: Record<string, unknown> = {};
  for (const col of COLUMNAS_TEXTO_PLANO) {
    if (col in input) payload[col] = input[col] == null ? null : sanitizeTextoPlano(String(input[col])) || null;
  }
  for (const col of COLUMNAS_PASSTHROUGH) {
    if (col in input) payload[col] = input[col];
  }
  if ('contenido' in input) {
    payload.contenido = sanitizeArticuloHtml(String(input.contenido ?? ''));
  }
  if ('slug' in input && typeof input.slug === 'string') {
    const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/(^-|-$)/g, '');
    if (slug) payload.slug = slug;
  }
  if (payload.titulo === null) {
    return json(400, { error: 'Título vacío tras sanitizar', field: 'titulo' });
  }

  if (id != null) {
    // M1 server-side: artículo publicado ⇒ slug inmutable.
    const { data: current, error: curErr } = await supabaseServer
      .from('articulos')
      .select('id, publicado, slug')
      .eq('id', id)
      .single();
    if (curErr || !current) {
      return json(404, { error: 'Artículo no encontrado' });
    }
    if (current.publicado) delete payload.slug;

    const { data, error } = await supabaseServer
      .from('articulos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('[guardar-articulo] update failed:', error.message);
      return json(500, { error: error.message });
    }
    return json(200, { success: true, data });
  }

  const { data, error } = await supabaseServer
    .from('articulos')
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error('[guardar-articulo] insert failed:', error.message);
    return json(500, { error: error.message });
  }
  return json(200, { success: true, data });
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
