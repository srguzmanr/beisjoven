// SEC-02 P2 — the two Tu Historia emails, moved verbatim from the retired
// public endpoint /api/notify-historia (which was unauthenticated and could be
// used to spam arbitrary addresses). Now callable ONLY from the server-side
// submission flow (src/pages/api/enviar-historia.ts), after the row is saved.
// Failures must never block the submission — callers wrap each send in its
// own try/catch.
import { Resend } from 'resend';

// Lazy: the Resend constructor throws when no API key is available, and that
// must surface in the caller's try/catch — not as a module-load crash.
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

export interface HistoriaEmailData {
  nombre: string;
  email: string;
  titulo: string;
  categoria: string;
  ciudad: string;
}

// Correo 1: aviso interno a la redacción.
export async function sendInternalNotification({ nombre, titulo, categoria, ciudad }: HistoriaEmailData) {
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
  // so the caller's try/catch actually sees them.
  if (error) throw new Error(error.message);
}

// Correo 2: confirmación al remitente.
export async function sendUserConfirmation({ nombre, email, titulo }: HistoriaEmailData) {
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
