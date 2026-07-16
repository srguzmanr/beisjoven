// SEC-02 P2 — the single write path for Tu Historia submissions.
// Replaces three anon-key client paths (storage upload, enviar_historia RPC,
// /api/notify-historia): the browser now sends ONE multipart request here and
// the server does everything with the service role. Defense order is
// cheapest-first: size guard → honeypot → time-trap → per-IP rate limit
// (Supabase table, so it also shields the Cloudflare call) → Turnstile →
// field re-validation → EXIF strip (sharp re-encode) → storage upload →
// INSERT → the two Resend emails (non-critical, never block the INSERT).
//
// Contract with public/js/tu-historia.js:
//   200 { success, id }   — saved (honeypot hits get a fake 200 too)
//   400 { error, field? } — validation / malformed request
//   403 { error, code: 'turnstile' } — token missing or rejected
//   413 { error }         — body over the Vercel function limit
//   429 { error }         — per-IP rate limit
//   500 { error }         — storage/insert failure (photos cleaned up)
import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { supabaseServer } from '@/lib/supabase';
import { validateHistoria } from '@/lib/historia-validator.js';
import { sendInternalNotification, sendUserConfirmation } from '@/lib/historia-emails';

export const prerender = false;

const BUCKET = 'tu-historia';
// Vercel rejects function bodies over 4.5MB before we run; guard just under it
// so requests in the margin get a clean JSON 413 instead of a platform error.
const MAX_BODY_BYTES = 4_400_000;
const MAX_FOTOS = 5;
// Per photo AFTER client-side compression (client targets ≤700KB).
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const FOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Time-trap: a submission filled in under this is not a human.
const MIN_FILL_MS = 3_000;
// Per-IP limits (dual window: bursts AND slow drips). CGNAT means legit users
// share carrier IPs, so these are deliberately not aggressive.
const RATE_MAX_HOUR = 5;
const RATE_MAX_DAY = 20;

// Both evaluated at build time (Vite inlines import.meta.env) — a key added in
// Vercel takes effect on the next deploy. Refuse loudly in logs, not silently.
const serviceKeyPresent = Boolean(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
if (!serviceKeyPresent) {
  console.error('[enviar-historia] SUPABASE_SERVICE_ROLE_KEY is not set — submissions will fail');
}
const turnstileSecret: string | undefined =
  import.meta.env.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET_KEY;
if (!turnstileSecret) {
  console.error('[enviar-historia] TURNSTILE_SECRET_KEY is not set — submissions will be rejected');
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// The rate-limit table stores a SHA-256 of the IP, never the IP itself
// (pseudonymized, and rows are purged after 24h by check_rate_limit).
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

// True = over the limit. Fails OPEN: if the RPC is missing or errors, a legit
// submission must not be blocked by limiter infrastructure — log and continue
// (Turnstile remains the primary defense).
async function isRateLimited(ip: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer.rpc('check_rate_limit', {
      p_scope: 'tu-historia',
      p_key: hashIp(ip),
      p_max_hour: RATE_MAX_HOUR,
      p_max_day: RATE_MAX_DAY,
    });
    if (error) {
      console.error('[enviar-historia] check_rate_limit failed (fail-open):', error.message);
      return false;
    }
    return data === false; // RPC returns allowed:boolean
  } catch (err) {
    console.error('[enviar-historia] check_rate_limit threw (fail-open):', err);
    return false;
  }
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!turnstileSecret || !token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
    });
    const outcome = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn('[enviar-historia] turnstile rejected:', outcome['error-codes'] ?? []);
    }
    return outcome.success === true;
  } catch (err) {
    // Cloudflare unreachable → we cannot vouch for the caller; reject rather
    // than letting an outage disable the site's main bot defense.
    console.error('[enviar-historia] turnstile siteverify failed:', err);
    return false;
  }
}

function fieldStr(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
}

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json(413, { error: 'El envío es demasiado grande. Reduce el número o tamaño de las fotos.' });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'Solicitud inválida' });
  }

  // Honeypot: bots that fill the hidden field get the same success surface a
  // human would, and nothing is written (same silent-success the old client
  // flow used).
  if (fieldStr(form, 'website')) {
    console.warn('[enviar-historia] honeypot triggered — fake success');
    return json(200, { success: true, id: crypto.randomUUID() });
  }

  // Time-trap: the client stamps Date.now() when the form initializes. A
  // spoofable heuristic (Turnstile is the real defense) that still drops the
  // naive bots that POST the form instantly.
  const startedAt = Number(fieldStr(form, 'form_started_at'));
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || startedAt <= 0 || elapsed < MIN_FILL_MS) {
    return json(400, { error: 'Solicitud inválida' });
  }

  if (await isRateLimited(ip)) {
    return json(429, { error: 'Demasiados envíos desde tu conexión. Intenta de nuevo más tarde.' });
  }

  const turnstileOk = await verifyTurnstile(fieldStr(form, 'cf-turnstile-response'), ip);
  if (!turnstileOk) {
    return json(403, { error: 'No pudimos verificar que eres humano. Reintenta la verificación.', code: 'turnstile' });
  }

  const fotos = form.getAll('fotos').filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length > MAX_FOTOS) {
    return json(400, { error: `Máximo ${MAX_FOTOS} fotos`, field: 'fotos' });
  }

  const fields: Record<string, string> = {};
  for (const name of [
    'nombre', 'email', 'telefono', 'relacion', 'categoria_sugerida', 'titulo',
    'descripcion', 'liga_organizacion', 'ciudad_estado', 'autorizacion_general',
    'fotos_incluyen_menores', 'autorizacion_menores', 'permitir_credito',
  ]) {
    fields[name] = fieldStr(form, name);
  }
  const validated = validateHistoria(fields, fotos.length);
  if ('error' in validated) {
    return json(400, { error: validated.error.message, field: validated.error.field });
  }
  const data = validated.data;

  if (!serviceKeyPresent) {
    return json(500, { error: 'Error del servidor. Intenta más tarde.' });
  }

  const id = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  const cleanupUploads = async () => {
    if (uploadedPaths.length === 0) return;
    try {
      const { error } = await supabaseServer.storage.from(BUCKET).remove(uploadedPaths);
      if (error) console.error('[enviar-historia] cleanup failed:', error.message);
    } catch (err) {
      console.error('[enviar-historia] cleanup threw:', err);
    }
  };

  // Photos: re-encode with sharp before storing. Re-encoding without
  // .withMetadata() drops ALL metadata (EXIF/GPS — the point of P2), and
  // .rotate() first bakes the EXIF orientation in so the strip doesn't leave
  // photos sideways. sharp throwing on a non-image doubles as magic-byte
  // validation of the declared MIME type.
  for (let i = 0; i < fotos.length; i++) {
    const foto = fotos[i];
    if (!FOTO_TYPES.has(foto.type)) {
      return json(400, { error: 'Formato de foto no permitido (JPEG, PNG o WebP)', field: 'fotos' });
    }
    if (foto.size > MAX_FOTO_BYTES) {
      return json(400, { error: 'Una de las fotos es demasiado grande', field: 'fotos' });
    }

    let processed: Buffer;
    try {
      const sharp = (await import('sharp')).default;
      const input = Buffer.from(await foto.arrayBuffer());
      processed = await sharp(input).rotate().jpeg({ quality: 85 }).toBuffer();
    } catch (err) {
      console.error('[enviar-historia] sharp failed on photo', i, err);
      await cleanupUploads();
      return json(400, { error: 'Una de las fotos no es una imagen válida', field: 'fotos' });
    }

    const path = `${id}/${i + 1}.jpg`;
    const { error: uploadError } = await supabaseServer.storage
      .from(BUCKET)
      .upload(path, processed, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) {
      console.error('[enviar-historia] upload failed:', uploadError.message);
      await cleanupUploads();
      return json(500, { error: 'No pudimos guardar tus fotos. Intenta de nuevo.' });
    }
    uploadedPaths.push(path);
  }

  // Critical write. Service role bypasses RLS (the table keeps NO anon
  // policies after P2's migration B).
  const { error: insertError } = await supabaseServer.from('historias_enviadas').insert({
    id,
    ...data,
    fotos: uploadedPaths,
  });
  if (insertError) {
    console.error('[enviar-historia] insert failed:', insertError.message);
    await cleanupUploads();
    return json(500, { error: 'No pudimos guardar tu historia. Intenta de nuevo.' });
  }

  // Non-critical: the two emails. Independent try/catch — a Resend outage
  // must never fail a submission that is already saved.
  const emailData = {
    nombre: data.nombre,
    email: data.email,
    titulo: data.titulo,
    categoria: data.categoria_sugerida,
    ciudad: data.ciudad_estado,
  };
  try {
    await sendInternalNotification(emailData);
  } catch (err) {
    console.error('[enviar-historia] internal notification failed:', err);
  }
  try {
    await sendUserConfirmation(emailData);
  } catch (err) {
    console.error('[enviar-historia] user confirmation failed:', err);
  }

  return json(200, { success: true, id });
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
