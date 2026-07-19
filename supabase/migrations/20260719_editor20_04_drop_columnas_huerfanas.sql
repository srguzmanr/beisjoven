-- ============================================================
-- EDITOR-20 · 04 — DROP de columnas huérfanas de articulos
--
-- Diagnóstico (Fase 0, 19-jul; SELECTs vía MCP): 0 filas con valor en
-- kicker, photo_credit, imagen_portada_alt; 0 artículos con
-- hero_layout='split'. PR-1 retiró todo consumidor de código
-- (HeroSplit/HeroAmbitious borrados, selects del homepage limpiados,
-- select de hero_layout retirado del editor).
--
-- ⚠️ ORDEN: ejecutar SOLO DESPUÉS de que PR-1 esté desplegado en prod.
--    Antes del deploy, los SELECT del homepage aún piden
--    imagen_portada_alt y el drop rompería la portada.
--
-- `evento_id` NO se toca (decisión CEO 19-jul: FK estructural de costo
-- cero con uso potencial en el roadmap de eventos).
-- `destacado` NO se toca aquí — tiene su propio archivo (05), gated a
-- la verificación de la capa de curación en prod.
--
-- Ejecutar en el SQL Editor. Idempotente (re-ejecutable).
-- "Success. No rows returned" = éxito normal.
-- ============================================================

ALTER TABLE public.articulos DROP COLUMN IF EXISTS kicker;
ALTER TABLE public.articulos DROP COLUMN IF EXISTS photo_credit;
ALTER TABLE public.articulos DROP COLUMN IF EXISTS imagen_portada_alt;
ALTER TABLE public.articulos DROP COLUMN IF EXISTS hero_layout;

-- ============================================================
-- VERIFICACIÓN (ejecutar después; resultado esperado al lado)
-- ============================================================
-- a) Las 4 columnas ya no existen → 0 filas:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'articulos'
--      AND column_name IN ('kicker','photo_credit','imagen_portada_alt','hero_layout');
--
-- b) evento_id sobrevive → 1 fila:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'articulos'
--      AND column_name = 'evento_id';
--
-- c) Humo de portada tras el drop: el homepage renderiza (ISR ≤60s).
-- ============================================================
