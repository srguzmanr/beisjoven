-- ============================================================
-- SEC-ROLES-01 · 03 — HOTFIX: eventos escribible por ANÓNIMOS
--
-- HALLAZGO NUEVO DE FASE 0 (no estaba en los 5 conocidos y es MÁS
-- grave que todos ellos): las policies de escritura de public.eventos
-- son rol {public} con qual/with_check = true:
--   · "Admin: insertar eventos"   — INSERT, public, WITH CHECK true
--   · "Admin: actualizar eventos" — UPDATE, public, USING true
--   · "Admin: eliminar eventos"   — DELETE, public, USING true
-- → cualquier visitante CON SOLO EL ANON KEY (público por diseño,
-- está en el JS del sitio) puede insertar, alterar o vaciar la tabla
-- eventos. La mitigación "signup OFF" NO aplica aquí: no hace falta
-- cuenta. Por eso este fix entra en la misión aunque eventos no
-- estaba en el alcance original — vulnerabilidad activa sin
-- autenticación.
--
-- El sitio público solo LEE eventos (src/lib/supabase.ts); el CRUD
-- es del panel (cliente authenticated) → escritura pasa a
-- is_admin(), lectura pública intacta.
--
-- Ejecutar en el SQL Editor, de arriba a abajo, en una sola corrida.
-- Idempotente. "Success. No rows returned" = éxito normal.
-- ============================================================

DROP POLICY IF EXISTS "Admin: insertar eventos"   ON public.eventos;
DROP POLICY IF EXISTS "Admin: actualizar eventos" ON public.eventos;
DROP POLICY IF EXISTS "Admin: eliminar eventos"   ON public.eventos;

DROP POLICY IF EXISTS "eventos_admin_insert" ON public.eventos;
CREATE POLICY "eventos_admin_insert"
  ON public.eventos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "eventos_admin_update" ON public.eventos;
CREATE POLICY "eventos_admin_update"
  ON public.eventos FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "eventos_admin_delete" ON public.eventos;
CREATE POLICY "eventos_admin_delete"
  ON public.eventos FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- "Lectura pública de eventos" (SELECT, public, true) — INTACTA.


-- ============================================================
-- VERIFICACIÓN (ejecutar después)
-- ============================================================
-- a) Escritura de eventos solo admin → 0 filas:
--    SELECT policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'eventos'
--      AND cmd IN ('INSERT','UPDATE','DELETE')
--      AND coalesce(qual,'') || coalesce(with_check,'') NOT ILIKE '%is_admin%';
--
-- b) Curl negativo (anon INSERT → debe fallar con 401/403 RLS);
--    comando exacto en docs/SEC-ROLES-01.md, Fase F.
--
-- c) Página pública de eventos sigue renderizando.
-- ============================================================
