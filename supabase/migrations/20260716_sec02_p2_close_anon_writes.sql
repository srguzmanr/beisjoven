-- ============================================================
-- SEC-02 · Pase 2 · P2-B — Cierre de los caminos de escritura anon
-- de Tu Historia. Completa lo que la migración P1
-- (20260530_sec02_p1_storage_private.sql) dejó explícitamente
-- pendiente: "Se revoca en P2".
--
-- EJECUTAR **DESPUÉS** de desplegar el código de P2 y de verificar
-- un envío legítimo end-to-end en producción (fila + foto + correos).
-- Desde ese deploy, TODA la escritura pasa por /api/enviar-historia
-- con service role; nada legítimo usa ya estos caminos.
--
-- Cambios de RLS/grants, declarados explícitamente:
--   1. RPC enviar_historia: se revoca EXECUTE a anon y authenticated.
--   2. storage.objects: se eliminan las DOS policies de INSERT anon
--      al bucket tu-historia (la de la migración original y el
--      duplicado creado vía dashboard).
--   3. historias_enviadas: se elimina la policy de INSERT anon
--      (también permitía INSERT directo vía PostgREST, no solo el RPC).
--
-- Ejecutar manualmente en el SQL Editor de Supabase, de arriba a
-- abajo, en una sola corrida. Idempotente (re-ejecutable).
-- ============================================================


-- ------------------------------------------------------------
-- 1) RPC enviar_historia: nadie expuesto por PostgREST puede
--    ejecutarla. Queda huérfana (el endpoint inserta directo con
--    service role); candidata a DROP en una limpieza futura una vez
--    confirmado que nada la llama.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.enviar_historia(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enviar_historia(jsonb) FROM authenticated;


-- ------------------------------------------------------------
-- 2) Bucket tu-historia: fuera el INSERT de anon (los dos duplicados).
--    El upload pasa a ser exclusivo del service role (bypassa RLS).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "tu_historia_public_upload"      ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads 1pl3ne1_0" ON storage.objects;


-- ------------------------------------------------------------
-- 3) Tabla historias_enviadas: fuera el INSERT de anon.
--    Quedan solo las policies de lectura/edición de authenticated
--    (panel admin); el INSERT lo hace el service role.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "historias_public_insert" ON public.historias_enviadas;


-- ============================================================
-- 4) VERIFICACIÓN (ejecutar después; resultados esperados al lado)
-- ============================================================
-- a) La RPC ya no es ejecutable por anon/authenticated (no deben
--    aparecer en la lista):
--    SELECT r.rolname, a.privilege_type
--    FROM pg_proc p
--    CROSS JOIN LATERAL aclexplode(p.proacl) a
--    JOIN pg_roles r ON r.oid = a.grantee
--    WHERE p.proname = 'enviar_historia';
--
-- b) Ninguna policy de INSERT menciona tu-historia en storage:
--    SELECT policyname, roles, cmd FROM pg_policies
--    WHERE schemaname='storage' AND tablename='objects' AND cmd='INSERT';
--    -- 0 filas con tu-historia
--
-- c) historias_enviadas queda sin policies anon (solo authenticated
--    SELECT/UPDATE):
--    SELECT policyname, roles, cmd FROM pg_policies
--    WHERE schemaname='public' AND tablename='historias_enviadas';
--
-- d) Prueba negativa con la ANON KEY (desde una terminal):
--    · RPC → debe responder 401/403 "permission denied for function":
--      curl -s -X POST \
--        'https://yulkbjpotfmwqkzzfegg.supabase.co/rest/v1/rpc/enviar_historia' \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--        -H 'Content-Type: application/json' -d '{"payload":{}}'
--    · INSERT directo → debe responder 42501:
--      curl -s -X POST \
--        'https://yulkbjpotfmwqkzzfegg.supabase.co/rest/v1/historias_enviadas' \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--        -H 'Content-Type: application/json' -H 'Prefer: return=minimal' \
--        -d '{"nombre":"x","email":"x@x.com","relacion":"otro","categoria_sugerida":"mlb","titulo":"x","descripcion":"x","ciudad_estado":"x","autorizacion_general":true}'
--    · Upload al bucket → debe responder 403:
--      curl -s -X POST \
--        'https://yulkbjpotfmwqkzzfegg.supabase.co/storage/v1/object/tu-historia/test/x.jpg' \
--        -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--        -H 'Content-Type: image/jpeg' --data-binary 'x'
-- ============================================================
