-- ============================================================
-- SEC-06 — Cerrar escalación de privilegios: RLS deja de confiar
-- en user_metadata.
--
-- PROBLEMA: 7 policies en public.articulos / public.videos /
-- public.anuncios autorizaban con (auth.jwt() -> 'user_metadata'
-- ->> 'role') = 'admin'. user_metadata ES EDITABLE por el propio
-- usuario autenticado vía la API de Auth → un editor podía
-- escribir role:'admin' en su metadata y la policy lo dejaba pasar
-- (escalación de privilegios = control total del CMS).
--
-- SOLUCIÓN: la fuente de verdad del rol pasa a app_metadata.role,
-- que SOLO es editable server-side / service_role (nunca por el
-- usuario). Todas las policies leen el rol vía public.is_admin(),
-- que consulta app_metadata — jamás user_metadata.
--
-- Ejecutar manualmente en el SQL Editor de Supabase, de arriba a
-- abajo, en una sola corrida. Idempotente (re-ejecutable).
--
-- IMPORTANTE — tras ejecutar: el admin debe CERRAR SESIÓN y volver
-- a entrar (o esperar el refresh del token ~1h) para que su nuevo
-- JWT incluya app_metadata.role. Su sesión activa NO tiene el claim
-- hasta refrescar el token.
-- ============================================================


-- ------------------------------------------------------------
-- 0) Fuente de verdad del rol: app_metadata.
--    Migrar SOLO al admin real (Sergio). admin@beisjoven.com queda
--    como NO-admin a nivel RLS (decisión SEC-06).
-- ------------------------------------------------------------
UPDATE auth.users
SET raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = 'sergioguzmanrodriguez@gmail.com';


-- ------------------------------------------------------------
-- 1) Helper centralizado de autorización.
--    Lee el rol del JWT desde app_metadata. NUNCA toca
--    user_metadata. SECURITY INVOKER (evalúa el JWT del llamante).
--    search_path bloqueado (cierra además el warning
--    function_search_path_mutable para esta función).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- ============================================================
-- 2) ARTICULOS
--    - Eliminar refs a user_metadata (admin_read_all,
--      admin_delete_only, editors_update_own).
--    - Eliminar las policies "always-true" que hoy permiten a
--      CUALQUIER autenticado actualizar/borrar/insertar TODO y que
--      eclipsaban por completo el gate por rol.
--    Modelo resultante:
--      · público          → lee publicados (sin cambios)
--      · autor del draft   → lee/edita los suyos
--      · admin             → lee/edita/borra todo
--      · cualquier auth    → inserta (editor crea borradores)
-- ============================================================
DROP POLICY IF EXISTS "admin_read_all"              ON public.articulos;
DROP POLICY IF EXISTS "admin_delete_only"           ON public.articulos;
DROP POLICY IF EXISTS "editors_update_own"          ON public.articulos;
DROP POLICY IF EXISTS "Admin: actualizar articulos" ON public.articulos;
DROP POLICY IF EXISTS "Admin: eliminar articulos"   ON public.articulos;
DROP POLICY IF EXISTS "Admin: insertar articulos"   ON public.articulos;

-- SELECT: el admin ve todo (los publicados y los borradores ajenos
-- ya los cubren public_read_published / own_drafts_read, intactas).
CREATE POLICY "admin_read_all" ON public.articulos
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- UPDATE: el autor edita los suyos; el admin edita todo.
-- WITH CHECK evita que un autor reasigne user_id para escaparse
-- de su propio ámbito.
CREATE POLICY "editors_update_own" ON public.articulos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DELETE: solo admin.
CREATE POLICY "admin_delete_only" ON public.articulos
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- INSERT: lo mantiene authenticated_insert (auth.uid() IS NOT NULL),
-- que ya existe y no referencia user_metadata. No se recrea.


-- ============================================================
-- 3) VIDEOS
--    - Eliminar ref a user_metadata (admin_delete_videos).
--    - El DELETE pasa a ser realmente admin-only: hoy convivía con
--      "Admin: eliminar videos" (always-true) que permitía a
--      cualquier autenticado borrar, anulando el gate admin.
--    - INSERT/UPDATE/SELECT se mantienen como están (flujo editorial
--      de videos por cualquier autenticado; SELECT público de
--      publicados). No referencian user_metadata.
-- ============================================================
DROP POLICY IF EXISTS "admin_delete_videos"    ON public.videos;
DROP POLICY IF EXISTS "Admin: eliminar videos" ON public.videos;

CREATE POLICY "admin_delete_videos" ON public.videos
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 4) ANUNCIOS
--    Aquí user_metadata ERA el ÚNICO gate de escritura (sin policy
--    always-true que lo eclipsara) → la escalación era plenamente
--    explotable. Reescribir las 3 contra la fuente segura.
--    SELECT público (anuncios_public_read) se mantiene intacto.
-- ============================================================
DROP POLICY IF EXISTS "anuncios_admin_insert" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_admin_update" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_admin_delete" ON public.anuncios;

CREATE POLICY "anuncios_admin_insert" ON public.anuncios
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "anuncios_admin_update" ON public.anuncios
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "anuncios_admin_delete" ON public.anuncios
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 5) VERIFICACIÓN (ejecutar después; deben devolver 0 filas / lo esperado)
-- ============================================================
-- a) Ninguna policy en public.* referencia user_metadata → 0 filas:
--    SELECT tablename, policyname FROM pg_policies
--    WHERE schemaname = 'public'
--      AND (coalesce(qual,'') ILIKE '%user_metadata%'
--        OR coalesce(with_check,'') ILIKE '%user_metadata%'
--        OR coalesce(qual,'') ILIKE '%raw_user_meta%'
--        OR coalesce(with_check,'') ILIKE '%raw_user_meta%');
--
-- b) El admin tiene el rol en la fuente segura → 1 fila (Sergio):
--    SELECT email, raw_app_meta_data->>'role' AS role
--    FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin';
--
-- c) Security Advisor: 0 errores "RLS references user metadata".
-- ============================================================
