-- ============================================================
-- ADS-TRACK-01 — Medición first-party de anuncios.
--
-- Tabla public.ad_eventos: registro propio de impresiones,
-- viewability (IAB: >=50% visible >=1s) y clics por creativo,
-- escrita SOLO server-side (service role via POST /api/ad-event).
-- Vista reporte_mensual_anuncios: mes x slot x marca con
-- impresiones, viewables, viewable_rate, clics y ctr — la fuente
-- del reporte mensual al anunciante (CEDISMAN).
--
-- RLS: SELECT solo public.is_admin() (definida en SEC-06).
-- SIN policies de INSERT/UPDATE/DELETE: con RLS habilitado y cero
-- policies de escritura, anon/authenticated NO pueden escribir;
-- el service role (endpoint) bypassa RLS. Coherente con SEC-06.
--
-- Sin PII: ua_movil es un boolean derivado del user-agent; no se
-- guarda user-agent completo ni IP.
--
-- Ejecutar manualmente en el SQL Editor de Supabase, de arriba a
-- abajo, en una sola corrida. Idempotente (re-ejecutable).
--
-- NOTA de negocio: la FK usa ON DELETE SET NULL — si se borra un
-- anuncio, sus eventos quedan sin atribución de marca en el
-- reporte. Anuncios con historial de campaña se desactivan con
-- activo=false, NO se borran.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Tabla de eventos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_eventos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id  uuid NULL REFERENCES public.anuncios(id) ON DELETE SET NULL,
  slot_id     text NOT NULL,
  evento      text NOT NULL CHECK (evento IN ('impression', 'viewable', 'click')),
  path        text,
  ua_movil    boolean,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_eventos_slot_created_idx
  ON public.ad_eventos (slot_id, created_at);

CREATE INDEX IF NOT EXISTS ad_eventos_anuncio_created_idx
  ON public.ad_eventos (anuncio_id, created_at);


-- ------------------------------------------------------------
-- 2) RLS: lectura solo admin; escritura solo service role
--    (cero policies de INSERT/UPDATE/DELETE a propósito).
-- ------------------------------------------------------------
ALTER TABLE public.ad_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_eventos_admin_read" ON public.ad_eventos;
CREATE POLICY "ad_eventos_admin_read" ON public.ad_eventos
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Cinturón y tirantes: los default privileges de Supabase otorgan
-- GRANTs sobre objetos nuevos; sin policies el RLS ya bloquea, pero
-- revocamos la escritura igualmente.
REVOKE INSERT, UPDATE, DELETE ON public.ad_eventos FROM anon, authenticated;


-- ------------------------------------------------------------
-- 3) Vista de reporte mensual: mes x slot x marca.
--    security_invoker = true es OBLIGATORIO: sin él la vista
--    ejecutaría con permisos del owner (postgres) y saltaría el
--    RLS de ad_eventos. Con él, un no-admin obtiene 0 filas.
--    Mes en hora de Ciudad de México (reporte de negocio), no UTC.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.reporte_mensual_anuncios
  WITH (security_invoker = true) AS
SELECT
  date_trunc('month', e.created_at AT TIME ZONE 'America/Mexico_City')::date AS mes,
  e.slot_id,
  a.marca,
  count(*) FILTER (WHERE e.evento = 'impression')                    AS impresiones,
  count(*) FILTER (WHERE e.evento = 'viewable')                      AS viewables,
  round(
    count(*) FILTER (WHERE e.evento = 'viewable')::numeric
      / NULLIF(count(*) FILTER (WHERE e.evento = 'impression'), 0),
    4
  )                                                                  AS viewable_rate,
  count(*) FILTER (WHERE e.evento = 'click')                         AS clics,
  round(
    count(*) FILTER (WHERE e.evento = 'click')::numeric
      / NULLIF(count(*) FILTER (WHERE e.evento = 'impression'), 0),
    4
  )                                                                  AS ctr
FROM public.ad_eventos e
LEFT JOIN public.anuncios a ON a.id = e.anuncio_id
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

-- La vista hereda GRANTs por default privileges; con security_invoker
-- el RLS de ad_eventos ya deja en 0 filas a anon, pero revocamos
-- para que ni siquiera pueda invocarla.
REVOKE ALL ON public.reporte_mensual_anuncios FROM anon;
GRANT SELECT ON public.reporte_mensual_anuncios TO authenticated;
