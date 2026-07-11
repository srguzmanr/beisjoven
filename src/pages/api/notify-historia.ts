// ADS-TRACK-02 — migrated from the root /api/notify-historia.js Vercel
// function. A root-level /api directory makes Vercel claim the entire /api/*
// namespace for its native functions router: any path under /api without a
// matching file there dies in a platform NOT_FOUND before reaching Astro's
// routes (this is what 404'd /api/ad-event). Everything under /api must
// therefore live here, as Astro API routes.
//
// Contract is unchanged (caller: public/js/tu-historia.js, fire-and-forget):
//   POST JSON → 200 { success, internal, confirmation } | 500 { error }
//   other methods → 405 { error }
//
// Sends two emails when a story is submitted via /tu-historia:
//   1. Internal notification to the editorial inbox (hola@beisjoven.com)
//   2. Confirmation email to the user who sent the story
// Failures must never block the submission — the success surface is already
// rendered by the time we run.
import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// Lazy: the Resend constructor throws when no API key is available, and that
// must surface as the handler's 500 — not as a module-load crash.
let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY);
  }
  return resend;
}

function escapeHtml(value: unknown): string {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}

function firstName(full: unknown): string {
  const s = String(full || '').trim();
  if (!s) return 'amigo';
  return s.split(/\s+/)[0];
}

function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

interface HistoriaPayload {
  nombre?: unknown;
  email?: unknown;
  titulo?: unknown;
  categoria?: unknown;
  ciudad?: unknown;
}

async function sendInternalNotification({ nombre, titulo, categoria, ciudad }: HistoriaPayload) {
  const { error } = await getResend().emails.send({
    from: 'Beisjoven <noreply@beisjoven.com>',
    to: 'hola@beisjoven.com',
    subject: `Nueva historia: ${titulo || 'sin título'}`,
    html: `
      <h2>Nueva historia recibida en Tu Historia</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Título:</strong> ${escapeHtml(titulo)}</p>
      <p><strong>Categoría:</strong> ${escapeHtml(categoria)}</p>
      <p><strong>Ciudad:</strong> ${escapeHtml(ciudad)}</p>
      <p>
        <a href="https://beisjoven.com/admin/historias">
          Ver en el panel de administración →
        </a>
      </p>
    `,
  });
  // The SDK reports failures via the error field, it does not throw — rethrow
  // so the caller's try/catch (and the 500 contract) actually see them.
  if (error) throw new Error(error.message);
}

async function sendUserConfirmation({ nombre, email, titulo }: HistoriaPayload & { email: string }) {
  const fname = firstName(nombre);
  const safeName = escapeHtml(fname);
  const safeTitle = escapeHtml(titulo || 'tu historia');

  const subject = `Recibimos tu historia, ${fname}`;

  const text = [
    `Hola ${fname},`,
    '',
    `Gracias por enviarnos tu historia: "${titulo || 'tu historia'}"`,
    '',
    'La recibimos correctamente. Nuestra redacción la revisa en los próximos 1 a 3 días hábiles.',
    '',
    'Esto es lo que sigue:',
    '- Vamos a leerla con atención',
    '- Si decidimos publicarla, te contactamos primero para confirmar',
    '- Si no la publicamos, también te avisamos — toda historia merece respuesta',
    '- Podemos editar para claridad pero nunca cambiamos los hechos',
    '',
    'Si tienes alguna pregunta o quieres agregar algo, responde a este correo.',
    '',
    'Gracias por confiarnos tu historia.',
    '',
    '— Redacción Beisjoven',
    'beisjoven.com',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1B2A4A; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p>Hola ${safeName},</p>
      <p>Gracias por enviarnos tu historia: <strong>"${safeTitle}"</strong></p>
      <p>La recibimos correctamente. Nuestra redacción la revisa en los próximos <strong>1 a 3 días hábiles</strong>.</p>
      <p style="margin-bottom: 8px;"><strong>Esto es lo que sigue:</strong></p>
      <ul style="padding-left: 20px; margin-top: 0;">
        <li>Vamos a leerla con atención.</li>
        <li>Si decidimos publicarla, te contactamos primero para confirmar.</li>
        <li>Si no la publicamos, también te avisamos — toda historia merece respuesta.</li>
        <li>Podemos editar para claridad pero nunca cambiamos los hechos.</li>
      </ul>
      <p>Si tienes alguna pregunta o quieres agregar algo, responde a este correo.</p>
      <p>Gracias por confiarnos tu historia.</p>
      <p style="margin-top: 24px; color: #6B7280;">— Redacción Beisjoven<br/>
        <a href="https://beisjoven.com" style="color: #1B2A4A;">beisjoven.com</a>
      </p>
    </div>
  `;

  const { error } = await getResend().emails.send({
    from: 'Beisjoven <hola@beisjoven.com>',
    to: email,
    replyTo: 'hola@beisjoven.com',
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message);
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: HistoriaPayload;
  try {
    payload = ((await request.json()) ?? {}) as HistoriaPayload;
  } catch {
    // Unparseable or empty body: the real caller (public/js/tu-historia.js)
    // always sends JSON, so this is a stray probe — 400 (like the old Vercel
    // body parser did) instead of emailing the editorial inbox empty fields.
    return json(400, { error: 'Invalid JSON' });
  }
  const { nombre, email, titulo, categoria, ciudad } = payload;

  // 1. Internal notification — must succeed for the editorial team to act.
  let internalOk = false;
  try {
    await sendInternalNotification({ nombre, titulo, categoria, ciudad });
    internalOk = true;
  } catch (error) {
    console.error('[notify-historia] Internal notification failed:', error);
  }

  // 2. User confirmation — independent try/catch so a failure here doesn't
  //    swallow the internal notification or block the submission flow.
  let confirmationOk = false;
  if (isValidEmail(email)) {
    try {
      await sendUserConfirmation({ nombre, email, titulo });
      confirmationOk = true;
    } catch (error) {
      console.error('[TuHistoriaConfirmEmail] Send failed:', error);
    }
  } else {
    console.warn('[TuHistoriaConfirmEmail] Skipped: missing or invalid email');
  }

  if (!internalOk && !confirmationOk) {
    return json(500, { error: 'Email failed' });
  }

  return json(200, {
    success: true,
    internal: internalOk,
    confirmation: confirmationOk,
  });
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
