-- BUG-PUB-01 — datos de prueba para verificar el caso negativo
--
-- NO es una migración: no toca esquema ni policies. Es un artículo desechable
-- con publicado = false para comprobar que su URL directa responde 404.
-- Prod tiene hoy 704 publicados / 0 despublicados, así que sin esta fila el
-- caso negativo no se puede ejercitar en el preview ni en producción.
--
-- Ejecutar en el SQL Editor (doctrina Nivel 3: Code propone, Sergio ejecuta).
-- Bloque 1 crea, bloque 3 borra. No dejar la fila viva más de lo necesario.
--
-- Nota: la fila NO se enlaza a ninguna historia, así que los triggers
-- articulos_sync_historia_estado y articulos_desvincular_historia son no-ops.

-- ============================================================
-- BLOQUE 1 — crear el artículo despublicado
-- ============================================================
INSERT INTO articulos (titulo, slug, extracto, contenido, imagen_url,
                       categoria_id, autor_id, publicado, read_time_minutes)
VALUES (
  'QA BUG-PUB-01 — no publicar',
  'qa-bug-pub-01-no-publicar',
  'Fila de prueba de BUG-PUB-01. Debe responder 404 en su URL directa.',
  '<p>Contenido de prueba. Si ves esto en el navegador, el fix no está activo.</p>',
  'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/public/imagenes/beisjoven-og-image.jpg',
  (SELECT id FROM categorias WHERE slug = 'juvenil'),
  (SELECT id FROM autores WHERE slug = 'redaccion-beisjoven'),
  false,
  1
);

-- ============================================================
-- BLOQUE 2 — verificación (correr después del deploy)
-- ============================================================
-- 2.a  La fila existe y está despublicada:
--        SELECT id, slug, publicado FROM articulos
--        WHERE slug = 'qa-bug-pub-01-no-publicar';
--      Esperado: 1 fila, publicado = false.
--
-- 2.b  La query que ejecuta la ruta pública tras el fix no la ve:
--        SELECT id FROM articulos
--        WHERE slug = 'qa-bug-pub-01-no-publicar' AND publicado = true;
--      Esperado: 0 filas ("Success. No rows returned").
--
-- 2.c  En el navegador / curl, pasada la ventana ISR de 60 s:
--        https://beisjoven.com/articulo/qa-bug-pub-01-no-publicar   → 404
--        https://beisjoven.com/articulo/beisbol-mexico-panama-jcc-2026 → 200
--        https://beisjoven.com/articulo/slug-que-no-existe-999       → 404
--      curl -o /dev/null -s -w "%{http_code}\n" <URL>
--
-- 2.d  El sitemap no la incluye:
--        curl -s https://beisjoven.com/sitemap.xml | grep -c qa-bug-pub-01
--      Esperado: 0.

-- ============================================================
-- BLOQUE 3 — limpieza (ejecutar al terminar la verificación)
-- ============================================================
-- DELETE FROM articulos WHERE slug = 'qa-bug-pub-01-no-publicar';
--   Esperado: "Success. No rows returned".
-- Comprobación final:
--   SELECT count(*) FROM articulos WHERE slug = 'qa-bug-pub-01-no-publicar';
--   Esperado: 0.
