-- ============================================================
-- SEC-ROLES-01 · 01 — Fundación de roles: superadmin / periodista
--
-- DECISIÓN DE PRODUCTO (CEO, 18-jul): dos roles.
--   · superadmin  → Sergio. Todos los privilegios.
--   · periodista  → colaboradores futuros. Privilegios reducidos
--                   (matriz propuesta en docs/SEC-ROLES-01.md;
--                   sus policies RLS se implementan en Editor 2.0).
--
-- QUÉ HACE ESTE ARCHIVO:
--   1. Crea public.is_superadmin() y public.is_periodista()
--      (mismo patrón SEC-06: leen app_metadata.role del JWT,
--      NUNCA user_metadata; SECURITY INVOKER; search_path '').
--   2. Redefine public.is_admin() como alias de is_superadmin()
--      → TODAS las policies existentes que consumen is_admin()
--      siguen funcionando sin reescritura (compatibilidad total).
--   3. Migra el rol de Sergio: app_metadata.role 'admin' → 'superadmin'.
--
-- IMPORTANTE — tras ejecutar: CERRAR SESIÓN y volver a entrar en el
-- panel. El JWT activo aún dice role='admin' y is_admin() ahora exige
-- 'superadmin' → hasta re-login el panel no podrá leer/escribir nada
-- gated por rol (fotos tu-historia, borradores, etc.). Es esperado.
--
-- Ejecutar manualmente en el SQL Editor, de arriba a abajo, en una
-- sola corrida. Idempotente (re-ejecutable).
-- "Success. No rows returned" = éxito normal.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Helpers de rol
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_periodista()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'periodista',
    false
  );
$$;

-- is_admin() pasa a ser alias de is_superadmin(). Las ~20 policies
-- que hoy lo consumen quedan intactas y pasan a exigir superadmin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.is_superadmin();
$$;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM public;
REVOKE ALL ON FUNCTION public.is_periodista() FROM public;
REVOKE ALL ON FUNCTION public.is_admin()      FROM public;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_periodista() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin()      TO authenticated, anon;


-- ------------------------------------------------------------
-- 2) Sergio → superadmin (única cuenta con rol; admin@beisjoven.com
--    no tiene rol y se retira en la Fase C de esta misión).
-- ------------------------------------------------------------
UPDATE auth.users
SET raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'superadmin')
WHERE email = 'sergioguzmanrodriguez@gmail.com';


-- ============================================================
-- VERIFICACIÓN (ejecutar después; resultado esperado al lado)
-- ============================================================
-- a) Sergio tiene el rol nuevo → 1 fila con role='superadmin':
--    SELECT email, raw_app_meta_data->>'role' AS role
--    FROM auth.users
--    WHERE email = 'sergioguzmanrodriguez@gmail.com';
--
-- b) Nadie conserva el rol legacy 'admin' → 0 filas:
--    SELECT email FROM auth.users
--    WHERE raw_app_meta_data->>'role' = 'admin';
--
-- c) Los 3 helpers existen → 3 filas:
--    SELECT proname FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public'
--      AND proname IN ('is_admin','is_superadmin','is_periodista');
--
-- d) Tras RE-LOGIN en el panel: abrir /admin/historias y confirmar
--    que las fotos de tu-historia cargan (SELECT gated por is_admin()).
-- ============================================================
