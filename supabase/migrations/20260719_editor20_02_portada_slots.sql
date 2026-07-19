-- ============================================================
-- EDITOR-20 · 02 — Capa de curación de portada: portada_slots
--
-- Modelo (facia-tool del Guardian, reducido a escala solo-operator):
-- la curación vive SEPARADA del contenido — el artículo no sabe si
-- está en portada. 5 slots ordenados que referencian articulos:
--   slot 1  = Hero del homepage
--   slots 2-5 = las 4 posiciones de "Lo último" (MixedFeed)
--
-- Semántica de fallback (implementada en SSR, PR-1):
--   · slot vacío → esa posición se llena por recencia (comportamiento
--     actual). Si el CEO no cura, la portada vive sola.
--   · artículo despublicado → el JOIN publicado=true lo excluye solo.
--   · artículo borrado → ON DELETE CASCADE elimina la fila del slot.
--   → Cero mantenimiento obligatorio.
--
-- UNIQUE (articulo_id): un artículo ocupa a lo más un slot.
--
-- RLS: lectura pública (la portada es pública; solo referencia
-- artículos ya publicados), escritura is_admin() — patrón SEC-06.
--
-- Puede ejecutarse ANTES o DESPUÉS del deploy de PR-1: el SSR tolera
-- la ausencia de la tabla (cae a recencia pura) y el panel muestra
-- error accionable al intentar fijar sin la tabla.
--
-- ⚠️ Toca RLS: tras ejecutar, si el panel se comporta raro con
-- "Fijar a portada", logout/login ANTES de diagnosticar.
--
-- Ejecutar en el SQL Editor. Idempotente (re-ejecutable).
-- "Success. No rows returned" = éxito normal.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portada_slots (
  slot        smallint PRIMARY KEY CHECK (slot BETWEEN 1 AND 5),
  articulo_id integer  NOT NULL UNIQUE
              REFERENCES public.articulos(id) ON DELETE CASCADE,
  fijado_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portada_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portada_slots_public_read  ON public.portada_slots;
DROP POLICY IF EXISTS portada_slots_admin_insert ON public.portada_slots;
DROP POLICY IF EXISTS portada_slots_admin_update ON public.portada_slots;
DROP POLICY IF EXISTS portada_slots_admin_delete ON public.portada_slots;

CREATE POLICY portada_slots_public_read ON public.portada_slots
  FOR SELECT TO public USING (true);

CREATE POLICY portada_slots_admin_insert ON public.portada_slots
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY portada_slots_admin_update ON public.portada_slots
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY portada_slots_admin_delete ON public.portada_slots
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- VERIFICACIÓN (ejecutar después; resultado esperado al lado)
-- ============================================================
-- a) Tabla creada con RLS → 1 fila, relrowsecurity = true:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE oid = 'public.portada_slots'::regclass;
--
-- b) 4 policies, escritura toda con is_admin → 4 filas:
--    SELECT policyname, cmd FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'portada_slots';
--
-- c) Cero escrituras sin is_admin → 0 filas:
--    SELECT policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'portada_slots'
--      AND cmd IN ('INSERT','UPDATE','DELETE')
--      AND coalesce(qual,'') || coalesce(with_check,'') NOT ILIKE '%is_admin%';
--
-- d) Funcional (panel): lista de artículos → 📌 Portada en una nota
--    publicada → elegir slot → el homepage la muestra en ≤60s (ISR).
-- ============================================================
