-- ============================================================
-- SEC-ROLES-01 · 02 — Storage: retiro de policies legacy pre-SEC-06
--
-- PROBLEMA (auditoría 18-jul, confirmado en pg_policies):
--   · "Admin: subir imagenes"    — INSERT, WITH CHECK
--     auth.role()='authenticated', SIN filtro de bucket → cualquier
--     autenticado sube a CUALQUIER bucket, incluido el privado
--     tu-historia (que debe recibir escrituras SOLO vía el endpoint
--     /api/enviar-historia con service role, SEC-02 P2).
--   · "Admin: eliminar imagenes" — DELETE, qual
--     auth.role()='authenticated', SIN filtro de bucket → cualquier
--     autenticado borra CUALQUIER objeto (media library completa).
--   · "tu_historia_authenticated_delete" — DELETE de cualquier
--     autenticado sobre tu-historia. Ningún flujo del panel borra en
--     tu-historia con el cliente authenticated (el único borrado es
--     el rollback del endpoint enviar-historia, que usa service role
--     y NO pasa por RLS) → se elimina sin reemplazo (menos superficie).
--
-- HALLAZGO FASE 0 QUE CONDICIONA EL DISEÑO: el panel de Medios sube
-- Y borra con el cliente authenticated (SupabaseStorage.subirImagen /
-- eliminarImagen en public/js/supabase.js) — NO usa endpoint con
-- service role. Por eso el DELETE NO se elimina: se reescribe
-- admin-only y scoped al bucket imagenes.
--
-- ESTADO FINAL en storage.objects:
--   · INSERT: imagenes_admin_insert  (is_admin() + bucket imagenes)
--   · DELETE: imagenes_admin_delete  (is_admin() + bucket imagenes)
--   · SELECT: "Permitir ver imagenes 1ktc4f5_0" (público, imagenes)
--             y tu_historia_admin_read (admin) — INTACTAS.
--   · tu-historia: escritura/borrado únicamente service role.
--
-- Requiere ejecutado el 01 (is_admin() ya existe desde SEC-06, así
-- que este archivo también funciona solo; el orden 01→02 es por el
-- re-login único al final).
--
-- Ejecutar en el SQL Editor, de arriba a abajo, en una sola corrida.
-- Idempotente. "Success. No rows returned" = éxito normal.
-- ============================================================


-- ------------------------------------------------------------
-- 1) DROP de las 3 policies legacy
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin: subir imagenes"            ON storage.objects;
DROP POLICY IF EXISTS "Admin: eliminar imagenes"         ON storage.objects;
DROP POLICY IF EXISTS "tu_historia_authenticated_delete" ON storage.objects;


-- ------------------------------------------------------------
-- 2) Escritura admin-only, scoped a imagenes (patrón SEC-06)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "imagenes_admin_insert" ON storage.objects;
CREATE POLICY "imagenes_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'imagenes' AND public.is_admin());

DROP POLICY IF EXISTS "imagenes_admin_delete" ON storage.objects;
CREATE POLICY "imagenes_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'imagenes' AND public.is_admin());


-- ============================================================
-- VERIFICACIÓN (ejecutar después)
-- ============================================================
-- a) Inventario final de storage.objects → exactamente 4 policies:
--    imagenes_admin_delete (DELETE), imagenes_admin_insert (INSERT),
--    "Permitir ver imagenes 1ktc4f5_0" (SELECT), tu_historia_admin_read (SELECT):
--    SELECT policyname, cmd, roles, qual, with_check
--    FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--    ORDER BY cmd, policyname;
--
-- b) Cero policies de escritura sin is_admin() en storage → 0 filas:
--    SELECT policyname FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND cmd IN ('INSERT','UPDATE','DELETE')
--      AND coalesce(qual,'') || coalesce(with_check,'') NOT ILIKE '%is_admin%';
--
-- c) Panel (tras re-login): subir una imagen en Medios y borrarla.
--    Ambas operaciones deben funcionar.
-- ============================================================
