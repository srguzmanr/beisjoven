-- ============================================================
-- ADS-GOLIVE-PREP-01 — Nomenclatura congelada de inventario +
-- columna campana (utm_campaign), pre-go-live CEDISMAN.
--
-- Prefijo 20260712 solo para ordenar DESPUÉS de 20260711_ads_track_01.sql
-- (este archivo hace UPDATE sobre ad_eventos, que esa migración crea).
--
-- DIAGNÓSTICO previo al rename (código + DB, 2026-07-11):
--   · El 4º espacio en artículos (bajo "Artículos relacionados") es
--     'slot-c': AdSlot end-of-note, renderizado INACTIVO (Fase 2) en
--     src/pages/articulo/[...slug].astro. Sin filas en anuncios ni
--     en ad_eventos.
--   · 'slot-top' existe SOLO como fila placeholder en anuncios
--     (activo=true); ningún AdSlot del código la invoca y no tiene
--     eventos → dato muerto, se elimina en el paso 4.
--
-- Renames (el código sirve los IDs nuevos a partir del mismo deploy):
--   home-leaderboard → home-top        (homepage, leaderboard bajo hero)
--   slot-b           → home-mid        (homepage, MPU in-feed)
--   slot-a           → article-body    (artículo, MPU mid-article)
--   slot-c           → article-footer  (artículo, end-of-note, Fase 2 inactivo)
--
-- GA4: el parámetro slot_id de ad_impression/ad_click cambia de valores
-- a partir del deploy — esperado y aceptado.
--
-- Ejecutar manualmente en el SQL Editor, de arriba a abajo, en una sola
-- corrida, idealmente junto con el deploy del rename de código (en el
-- intervalo entre uno y otro, los slots sirven su placeholder — no
-- colapsan). Idempotente (re-ejecutable).
-- ============================================================

-- ------------------------------------------------------------
-- 1) utm_campaign por trato comercial.
--    CEDISMAN usará 'fundador-2026' al go-live (UPDATE manual sobre sus
--    filas al cargar creativos). NULL = la URL de salida no lleva
--    utm_campaign (los otros 3 utm_* sí van en propia/aliado).
-- ------------------------------------------------------------
ALTER TABLE public.anuncios ADD COLUMN IF NOT EXISTS campana text;

-- ------------------------------------------------------------
-- 2) Rename de inventario (anuncios.slot_id).
-- ------------------------------------------------------------
UPDATE public.anuncios SET slot_id = 'home-top'       WHERE slot_id = 'home-leaderboard';
UPDATE public.anuncios SET slot_id = 'home-mid'       WHERE slot_id = 'slot-b';
UPDATE public.anuncios SET slot_id = 'article-body'   WHERE slot_id = 'slot-a';
UPDATE public.anuncios SET slot_id = 'article-footer' WHERE slot_id = 'slot-c';

-- ------------------------------------------------------------
-- 3) Rename del historial de eventos (~10 filas de prueba; la ventana
--    de rename sin migración de historial se cierra en el go-live).
-- ------------------------------------------------------------
UPDATE public.ad_eventos SET slot_id = 'home-top'       WHERE slot_id = 'home-leaderboard';
UPDATE public.ad_eventos SET slot_id = 'home-mid'       WHERE slot_id = 'slot-b';
UPDATE public.ad_eventos SET slot_id = 'article-body'   WHERE slot_id = 'slot-a';
UPDATE public.ad_eventos SET slot_id = 'article-footer' WHERE slot_id = 'slot-c';

-- ------------------------------------------------------------
-- 4) slot-top: dato muerto confirmado en el diagnóstico (ver header).
--    Fila placeholder sin posición renderizada y sin eventos asociados.
-- ------------------------------------------------------------
DELETE FROM public.anuncios WHERE slot_id = 'slot-top';

-- ------------------------------------------------------------
-- 5) Nomenclatura congelada, documentada en el schema.
-- ------------------------------------------------------------
COMMENT ON COLUMN public.anuncios.slot_id IS
  'Nomenclatura congelada ADS-GOLIVE-PREP-01: home-top | home-mid | article-body | article-footer';
COMMENT ON COLUMN public.anuncios.campana IS
  'utm_campaign por trato comercial (p. ej. fundador-2026 para CEDISMAN). NULL = sin utm_campaign en la URL de salida.';

-- ------------------------------------------------------------
-- Verificación (ambos deben devolver solo IDs de la nomenclatura nueva;
-- article-footer aún no tiene filas — es el slot Fase 2 inactivo):
--   SELECT DISTINCT slot_id FROM public.anuncios  ORDER BY 1;
--   SELECT DISTINCT slot_id FROM public.ad_eventos ORDER BY 1;
-- ------------------------------------------------------------
