-- ============================================================
-- EDITOR-20 · 06 — Data-fix: iframe de Streamable → enlace (artículo 528)
--
-- Decisión CEO (GO 19-jul, punto ③): el allowlist de SEC-04 solo admite
-- iframes de YouTube; el único iframe ajeno del catálogo (528, jugada de
-- Logan Webb en Streamable) se degrada a enlace. Sin este fix, la capa
-- de sanitización en render omitiría el video sin dejar rastro.
--
-- El bloque almacenado además tenía anidación inválida (<h2><p><iframe…):
-- el reemplazo la corrige dejando el enlace en su propio párrafo antes
-- del subtítulo.
--
-- Nivel 3 de la doctrina: UPDATE persistente — lo ejecuta Sergio en el
-- SQL Editor. Idempotente: si el iframe ya no está, replace() no cambia
-- nada. "Success. No rows returned" = éxito normal.
-- Independiente del deploy de PR-2 (puede ir antes o después; lo ideal
-- es ANTES del deploy para que el video-enlace nunca desaparezca).
-- ============================================================

UPDATE public.articulos
SET contenido = replace(
  contenido,
  '<h2><p><iframe src="https://streamable.com/m/logan-webb-in-play-run-s-to-trent-grisham-1ec819?lang=es&amp;partnerId=web_video-playback-page_video-share" width="560" height="315"></iframe></p>La segunda entrada fue letal</h2>',
  '<p><a href="https://streamable.com/m/logan-webb-in-play-run-s-to-trent-grisham-1ec819" target="_blank" rel="noopener noreferrer">📹 Video: el rally de los Yankees ante Logan Webb (Streamable)</a></p><h2>La segunda entrada fue letal</h2>'
)
WHERE id = 528
  AND contenido LIKE '%streamable.com%';

-- ============================================================
-- VERIFICACIÓN (ejecutar después; resultado esperado al lado)
-- ============================================================
-- a) Cero iframes que no sean de YouTube en todo el catálogo → 0 filas:
--    SELECT id FROM public.articulos
--    WHERE contenido ~* '<iframe' AND contenido NOT LIKE '%youtube%';
--
-- b) El enlace quedó en 528 → 1 fila:
--    SELECT id FROM public.articulos
--    WHERE id = 528 AND contenido LIKE '%streamable.com%<%/a>%' ESCAPE '~';
--    -- (o simplemente: contenido LIKE '%📹 Video: el rally%')
-- ============================================================
