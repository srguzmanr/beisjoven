-- ============================================================
-- SEC-ROLES-01 · 04 — SEC-03: quick_hits y tags escritura admin-only
--
-- PROBLEMA: RLS de escritura pre-SEC-06 abierta a cualquier
-- authenticated (qual/with_check = true, sin is_admin()):
--   · quick_hits_authenticated_insert / _update / _delete
--   · tags_authenticated_insert / _update / _delete
--
-- QUIÉN CONSUME QUÉ (Fase 0):
--   · quick_hits: CRUD solo desde el panel (/admin/quick-hits,
--     cliente authenticated). Lectura pública en homepage
--     (src/lib/supabase.ts getQuickHits) → SELECT público se
--     conserva. Cerrar esto desbloquea el wiring del QuickHitsBar
--     en el header nuevo (nota en Header.astro:143).
--   · tags: creación desde el panel (createTag en el tag-picker,
--     cliente authenticated). Lectura pública en páginas de tag →
--     SELECT público se conserva.
--
-- Escritura pasa a is_admin() (= superadmin tras el 01). El panel
-- sigue funcionando porque Sergio es superadmin (re-login mediante).
--
-- Ejecutar en el SQL Editor, de arriba a abajo, en una sola corrida.
-- Idempotente. "Success. No rows returned" = éxito normal.
-- ============================================================


-- ------------------------------------------------------------
-- 1) quick_hits
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "quick_hits_authenticated_insert" ON public.quick_hits;
DROP POLICY IF EXISTS "quick_hits_authenticated_update" ON public.quick_hits;
DROP POLICY IF EXISTS "quick_hits_authenticated_delete" ON public.quick_hits;

DROP POLICY IF EXISTS "quick_hits_admin_insert" ON public.quick_hits;
CREATE POLICY "quick_hits_admin_insert"
  ON public.quick_hits FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "quick_hits_admin_update" ON public.quick_hits;
CREATE POLICY "quick_hits_admin_update"
  ON public.quick_hits FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "quick_hits_admin_delete" ON public.quick_hits;
CREATE POLICY "quick_hits_admin_delete"
  ON public.quick_hits FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- quick_hits_public_read (SELECT, public) — INTACTA (homepage).


-- ------------------------------------------------------------
-- 2) tags
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "tags_authenticated_insert" ON public.tags;
DROP POLICY IF EXISTS "tags_authenticated_update" ON public.tags;
DROP POLICY IF EXISTS "tags_authenticated_delete" ON public.tags;

DROP POLICY IF EXISTS "tags_admin_insert" ON public.tags;
CREATE POLICY "tags_admin_insert"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tags_admin_update" ON public.tags;
CREATE POLICY "tags_admin_update"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "tags_admin_delete" ON public.tags;
CREATE POLICY "tags_admin_delete"
  ON public.tags FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- tags_public_read (SELECT, public) — INTACTA.


-- ============================================================
-- VERIFICACIÓN (ejecutar después)
-- ============================================================
-- a) Escritura solo admin en ambas tablas → 0 filas:
--    SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename IN ('quick_hits','tags')
--      AND cmd IN ('INSERT','UPDATE','DELETE')
--      AND coalesce(qual,'') || coalesce(with_check,'') NOT ILIKE '%is_admin%';
--
-- b) Panel (tras re-login): crear/editar/borrar un Quick Hit en
--    /admin/quick-hits; crear un tag desde el tag-picker del editor.
--
-- c) Sitio público: homepage renderiza quick_hits; páginas de tag OK.
-- ============================================================
