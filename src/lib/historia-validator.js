// SEC-02 P2 — pure validator for POST /api/enviar-historia form fields.
// Server-side mirror of the /tu-historia form rules (and of the retired
// enviar_historia RPC): the client's checks are UX, these are the contract.
// Plain JS on purpose: importable from the Astro endpoint (TS/Vite) AND from
// `node --test` without flags. Must stay dependency-free and never touch
// import.meta.env.

const RELACIONES = new Set([
  'entrenador', 'jugador', 'padre_madre', 'directivo_liga',
  'periodista', 'aficionado', 'otro',
]);

const CATEGORIAS = new Set([
  'juvenil', 'softbol', 'liga-mexicana', 'mlb', 'seleccion', 'opinion',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DESCRIPCION_MIN = 50;
const DESCRIPCION_MAX = 3000;
const TITULO_MAX = 200;

/**
 * @typedef {Object} HistoriaData
 * @property {string} nombre
 * @property {string} email            lowercased
 * @property {string | null} telefono
 * @property {string} relacion
 * @property {string} categoria_sugerida
 * @property {string} titulo
 * @property {string} descripcion
 * @property {string | null} liga_organizacion
 * @property {string} ciudad_estado
 * @property {boolean} autorizacion_general
 * @property {boolean | null} autorizacion_menores  null when no photos
 * @property {boolean} permitir_credito
 */

function str(raw, name) {
  const v = raw[name];
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Validates the untrusted scalar fields of a submission (photos are validated
 * separately by the endpoint: count, size and sharp decoding).
 *
 * FormData yields strings, so booleans arrive as 'true'/'false'.
 *
 * @param {Record<string, unknown>} raw - fields extracted from the multipart body
 * @param {number} fotoCount - number of photo files attached to the request
 * @returns {{ data: HistoriaData } | { error: { field: string, message: string } }}
 */
export function validateHistoria(raw, fotoCount) {
  const fail = (field, message) => ({ error: { field, message } });
  if (typeof raw !== 'object' || raw === null) return fail('body', 'payload inválido');

  const nombre = str(raw, 'nombre');
  if (nombre.length < 3) return fail('nombre', 'nombre requerido (mín. 3 caracteres)');
  if (nombre.length > 120) return fail('nombre', 'nombre demasiado largo (máx. 120)');

  const email = str(raw, 'email').toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return fail('email', 'email inválido');

  const telefono = str(raw, 'telefono');
  if (telefono.length > 30) return fail('telefono', 'teléfono demasiado largo (máx. 30)');

  const relacion = str(raw, 'relacion');
  if (!RELACIONES.has(relacion)) return fail('relacion', 'relación inválida');

  const categoria = str(raw, 'categoria_sugerida');
  if (!CATEGORIAS.has(categoria)) return fail('categoria_sugerida', 'categoría inválida');

  const titulo = str(raw, 'titulo');
  if (titulo.length === 0) return fail('titulo', 'título requerido');
  if (titulo.length > TITULO_MAX) return fail('titulo', `título demasiado largo (máx. ${TITULO_MAX})`);

  const descripcion = str(raw, 'descripcion');
  if (descripcion.length < DESCRIPCION_MIN) {
    return fail('descripcion', `descripción demasiado corta (mín. ${DESCRIPCION_MIN})`);
  }
  if (descripcion.length > DESCRIPCION_MAX) {
    return fail('descripcion', `descripción demasiado larga (máx. ${DESCRIPCION_MAX})`);
  }

  const ciudad = str(raw, 'ciudad_estado');
  if (ciudad.length === 0) return fail('ciudad_estado', 'ciudad/estado requerido');
  if (ciudad.length > 120) return fail('ciudad_estado', 'ciudad/estado demasiado largo (máx. 120)');

  const liga = str(raw, 'liga_organizacion');
  if (liga.length > 160) return fail('liga_organizacion', 'liga/organización demasiado larga (máx. 160)');

  if (str(raw, 'autorizacion_general') !== 'true') {
    return fail('autorizacion_general', 'debes aceptar las confirmaciones obligatorias');
  }

  // Only meaningful when photos are attached; whether they include minors is
  // the sender's declaration, so with photos it's an explicit boolean, not a
  // forced true (same contract as the retired client flow).
  let autorizacionMenores = null;
  if (fotoCount > 0) {
    autorizacionMenores = str(raw, 'autorizacion_menores') === 'true';
  }

  return {
    data: {
      nombre,
      email,
      telefono: telefono || null,
      relacion,
      categoria_sugerida: categoria,
      titulo,
      descripcion,
      liga_organizacion: liga || null,
      ciudad_estado: ciudad,
      autorizacion_general: true,
      autorizacion_menores: autorizacionMenores,
      permitir_credito: str(raw, 'permitir_credito') !== 'false',
    },
  };
}
