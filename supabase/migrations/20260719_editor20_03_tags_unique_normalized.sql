-- ============================================================
-- EDITOR-20 · 03 — Unicidad de tags por forma normalizada (preventivo)
--
-- Diagnóstico (Fase 0, 19-jul; SELECT vía MCP): los 164 tags están
-- limpios — 0 nombres en forma NFD, 0 duplicados por forma normalizada
-- y 0 duplicados ignorando acentos. NO hay fusión de duplicados ni
-- redirects 301 que aplicar. Este índice es el candado que impide que
-- vuelvan a nacer: "Selección" y "seleccion" (o su variante NFD tecleada
-- desde iOS) chocan a nivel DB aunque algún cliente se salte el picker.
--
-- lower() y normalize() son IMMUTABLE → válidas en índice de expresión.
-- El UNIQUE existente sobre slug (tags_slug_key) se conserva.
--
-- Ejecutar en el SQL Editor. Idempotente (re-ejecutable).
-- "Success. No rows returned" = éxito normal.
-- Independiente del deploy de PR-1 (puede ejecutarse antes o después).
-- ============================================================

-- Pre-check embebido: si esto devuelve filas, hay duplicados nuevos
-- posteriores al diagnóstico — detener y reportar antes de crear el
-- índice (la creación fallaría). Esperado hoy: 0 filas.
--   SELECT lower(normalize(nombre, NFC)) AS forma, count(*),
--          string_agg(nombre || ' (' || slug || ')', ' | ')
--   FROM public.tags
--   GROUP BY 1 HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS tags_nombre_normalizado_key
  ON public.tags (lower(normalize(nombre, NFC)));

-- ============================================================
-- VERIFICACIÓN (ejecutar después; resultado esperado al lado)
-- ============================================================
-- a) El índice existe → 1 fila:
--    SELECT indexname FROM pg_indexes
--    WHERE schemaname = 'public' AND tablename = 'tags'
--      AND indexname = 'tags_nombre_normalizado_key';
--
-- b) El candado funciona → debe FALLAR con unique violation (probar y
--    NO commitear; envolver en BEGIN; ... ROLLBACK; si se desea):
--    BEGIN;
--    INSERT INTO public.tags (nombre, slug)
--    VALUES ('SELECCIÓN MENOR', 'seleccion-menor-x');
--    ROLLBACK;
-- ============================================================
