-- ============================================================
-- EDITOR-20 · 01 — DROP de las 4 tablas wbc_* (micrositio muerto)
--
-- Diagnóstico (Fase 0, 19-jul): el único consumidor de wbc_galeria,
-- wbc_posiciones, wbc_resultados y wbc_videos era el sitio legacy
-- pre-Astro (public/js/pages.js), borrado en PR-1. La página viva
-- /wbc-2026 (opción A: archivo congelado) lee SOLO articulos.es_wbc2026,
-- que NO se toca. Con el drop mueren también sus policies inseguras
-- (escritura abierta a cualquier authenticated — reportadas en
-- SEC-ROLES-01 §0.1).
--
-- Datos que se pierden (respaldo implícito: nada los referencia):
--   wbc_galeria 11 filas · wbc_posiciones 5 · wbc_resultados 12 ·
--   wbc_videos 3.
--
-- Ejecutar en el SQL Editor. Idempotente (re-ejecutable).
-- "Success. No rows returned" = éxito normal.
-- Puede ejecutarse ANTES o DESPUÉS del deploy de PR-1 (nada vivo las lee).
-- ============================================================

DROP TABLE IF EXISTS public.wbc_galeria;
DROP TABLE IF EXISTS public.wbc_posiciones;
DROP TABLE IF EXISTS public.wbc_resultados;
DROP TABLE IF EXISTS public.wbc_videos;

-- ============================================================
-- VERIFICACIÓN (ejecutar después; resultado esperado al lado)
-- ============================================================
-- a) Cero tablas wbc_* → 0 filas:
--    SELECT tablename FROM pg_tables
--    WHERE schemaname = 'public' AND tablename LIKE 'wbc_%';
--
-- b) Cero policies wbc_* colgantes → 0 filas:
--    SELECT policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename LIKE 'wbc_%';
--
-- c) El archivo /wbc-2026 sigue teniendo su fuente → 50:
--    SELECT count(*) FROM public.articulos WHERE es_wbc2026;
-- ============================================================
