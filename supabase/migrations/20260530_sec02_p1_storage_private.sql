-- ============================================================
-- SEC-02 · Pase 2 · P1 — Tu Historia: bucket privado + lectura
-- admin-only (signed URLs).
--
-- PROBLEMA (F1/F2): el bucket tu-historia es public=true y anon tiene
-- SELECT amplio (+ una policy global USING(true) que abarca TODOS los
-- buckets) → cualquiera puede LISTAR y DESCARGAR todas las fotos
-- subidas, incluidas las de menores, con EXIF intacto.
--
-- SOLUCIÓN (P1, solo el vector de LECTURA):
--   · El bucket pasa a privado.
--   · Se elimina el SELECT de anon sobre tu-historia (policy de la
--     migración original + duplicado creado vía dashboard).
--   · La policy global "Permitir ver imagenes" se acota al bucket
--     imagenes (hoy expone todos los buckets).
--   · El admin lee/firma fotos vía una policy SELECT gated con
--     public.is_admin() (consistente con SEC-06). El panel admin pasa
--     a usar createSignedUrl (ver public/js/supabase.js +
--     public/js/admin.js).
--
-- NO SE TOCA AQUÍ: el INSERT de anon al bucket queda INTACTO para que
-- el formulario siga subiendo fotos. Se revoca en P2, cuando el upload
-- pasa a un endpoint server-side con service-role.
--
-- Verificado antes de aplicar: 0/639 artículos referencian tu-historia;
-- 0 historias publicadas; 0 historias con fotos. Hacer privado el bucket
-- NO rompe ninguna imagen pública existente. Únicos buckets: imagenes
-- (público, sigue público) y tu-historia.
--
-- Ejecutar manualmente en el SQL Editor de Supabase, de arriba a abajo,
-- en una sola corrida. Idempotente (re-ejecutable).
-- ============================================================


-- ------------------------------------------------------------
-- 1) Bucket privado.
--    Las URLs públicas (/object/public/tu-historia/...) dejan de
--    servir; el acceso pasa a ser por signed URL / service-role.
-- ------------------------------------------------------------
UPDATE storage.buckets
SET public = false
WHERE id = 'tu-historia';


-- ------------------------------------------------------------
-- 2) Quitar el SELECT de anon sobre tu-historia (lectura/listado
--    público). Son dos policies equivalentes: la de la migración
--    original (tu_historia_public_read) y un duplicado del dashboard
--    (Allow public uploads 1pl3ne1_1).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "tu_historia_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads 1pl3ne1_1" ON storage.objects;


-- ------------------------------------------------------------
-- 3) Acotar la policy global de lectura a SOLO el bucket imagenes.
--    Hoy es role public con USING(true) SIN filtro de bucket → da
--    lectura a TODOS los buckets (incluido tu-historia). Se redefine
--    con filtro de bucket, manteniendo el nombre.
--    (imagenes sigue siendo público y legible por cualquiera; es el
--     único bucket que depende de esta policy.)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir ver imagenes 1ktc4f5_0" ON storage.objects;
CREATE POLICY "Permitir ver imagenes 1ktc4f5_0"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'imagenes');


-- ------------------------------------------------------------
-- 4) Lectura admin-only sobre tu-historia, para que el panel admin
--    pueda generar signed URLs (createSignedUrl). public.is_admin()
--    lee app_metadata.role (SEC-06); EXECUTE ya está concedido a
--    authenticated. Un autenticado NO-admin no puede firmar/leer.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "tu_historia_admin_read" ON storage.objects;
CREATE POLICY "tu_historia_admin_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'tu-historia' AND public.is_admin());


-- ------------------------------------------------------------
-- INTACTO (NO ejecutar nada aquí): el INSERT de anon se mantiene —
--   · tu_historia_public_upload          (anon INSERT, tu-historia)
--   · "Allow public uploads 1pl3ne1_0"   (anon INSERT, tu-historia)
-- Se revoca en P2.
-- ------------------------------------------------------------


-- ============================================================
-- 5) VERIFICACIÓN (ejecutar después; resultados esperados al lado)
-- ============================================================
-- a) El bucket quedó privado → public = false:
--    SELECT id, public FROM storage.buckets WHERE id = 'tu-historia';
--
-- b) anon ya NO tiene ningún SELECT sobre tu-historia, y el SELECT
--    sobre objects queda solo en: imagenes (public) + tu-historia admin.
--    Debe devolver exactamente esas 2 filas SELECT:
--    SELECT policyname, roles, cmd, qual
--    FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'SELECT'
--    ORDER BY policyname;
--
-- c) El INSERT de anon sigue vivo → 2 filas (los dos uploads):
--    SELECT policyname, roles, cmd
--    FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT'
--    ORDER BY policyname;
--
-- d) Security Advisor: ya no debe aparecer
--    "public_bucket_allows_listing" para tu-historia.
-- ============================================================
