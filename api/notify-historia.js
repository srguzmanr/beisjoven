// Vercel Serverless Function — sends an email notification to the
// editorial inbox whenever a new story is submitted via /tu-historia.
//
// Triggered fire-and-forget from public/js/tu-historia.js after the
// Supabase INSERT succeeds. Failures must never block the submission.

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { nombre, titulo, categoria, ciudad } = req.body || {};

    await resend.emails.send({
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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[notify-historia] Failed:', error);
    return res.status(500).json({ error: 'Email failed' });
  }
}
