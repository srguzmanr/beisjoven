// Vercel Serverless Function — sends two emails when a story is submitted
// via /tu-historia:
//   1. Internal notification to the editorial inbox (hola@beisjoven.com)
//   2. Confirmation email to the user who sent the story
//
// Triggered fire-and-forget from public/js/tu-historia.js after the
// Supabase INSERT succeeds. Failures must never block the submission —
// the success surface is already rendered by the time we run.

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function firstName(full) {
  const s = String(full || '').trim();
  if (!s) return 'amigo';
  return s.split(/\s+/)[0];
}

function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function sendInternalNotification({ nombre, titulo, categoria, ciudad }) {
  return resend.emails.send({
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
}

async function sendUserConfirmation({ nombre, email, titulo }) {
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

  return resend.emails.send({
    from: 'Beisjoven <hola@beisjoven.com>',
    to: email,
    replyTo: 'hola@beisjoven.com',
    subject,
    html,
    text,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, email, titulo, categoria, ciudad } = req.body || {};

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
    return res.status(500).json({ error: 'Email failed' });
  }

  return res.status(200).json({
    success: true,
    internal: internalOk,
    confirmation: confirmationOk,
  });
}
