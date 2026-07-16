-- ============================================================
-- SEC-02 · Pase 2 · P2-A — Rate-limit persistente por IP para el
-- endpoint único de Tu Historia (/api/enviar-historia).
--
-- EJECUTAR **ANTES** de desplegar el código de P2: el endpoint llama
-- a check_rate_limit() vía service role. Si la función no existe, el
-- endpoint hace fail-open (loguea y no limita) — no rompe envíos,
-- pero el criterio "ráfaga → 429" no se cumple hasta aplicar esto.
--
-- Diseño:
--   · Una fila por envío (hit). key = SHA-256 hex del IP, calculado
--     en el endpoint — el IP en claro NUNCA llega a la base.
--   · Doble ventana: máx p_max_hour en 60 min y p_max_day en 24 h.
--   · Purga oportunista: cada llamada borra hits > 24 h del scope,
--     así la tabla no crece y la retención efectiva es ≤ 24 h.
--   · RLS habilitado SIN policies: solo service role (bypassa RLS)
--     puede tocar la tabla. EXECUTE de la función revocado a
--     public/anon/authenticated — solo service_role puede llamarla.
--
-- Ejecutar manualmente en el SQL Editor de Supabase, de arriba a
-- abajo, en una sola corrida. Idempotente (re-ejecutable).
-- ============================================================


-- ------------------------------------------------------------
-- 1) Tabla de hits.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope      text        NOT NULL,
  key        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_scope_key_created_idx
  ON public.rate_limit_hits (scope, key, created_at);

ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- Sin policies a propósito: ningún rol expuesto por PostgREST (anon,
-- authenticated) puede leer ni escribir; el service role bypassa RLS.


-- ------------------------------------------------------------
-- 2) Función atómica: purga → cuenta ventanas → inserta si procede.
--    Devuelve true si el envío está permitido, false si excede.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope    text,
  p_key      text,
  p_max_hour integer,
  p_max_day  integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hour_count integer;
  v_day_count  integer;
BEGIN
  -- Purga oportunista: mantiene la tabla pequeña y limita la
  -- retención del key pseudonimizado a 24 h.
  DELETE FROM rate_limit_hits
  WHERE scope = p_scope
    AND created_at < now() - interval '24 hours';

  SELECT
    count(*) FILTER (WHERE created_at > now() - interval '1 hour'),
    count(*)
  INTO v_hour_count, v_day_count
  FROM rate_limit_hits
  WHERE scope = p_scope
    AND key = p_key;

  IF v_hour_count >= p_max_hour OR v_day_count >= p_max_day THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_hits (scope, key) VALUES (p_scope, p_key);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;


-- ============================================================
-- 3) VERIFICACIÓN (ejecutar después; resultados esperados al lado)
-- ============================================================
-- a) La tabla existe con RLS activo y sin policies:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE oid = 'public.rate_limit_hits'::regclass;      -- rowsecurity = true
--    SELECT count(*) FROM pg_policies
--    WHERE schemaname='public' AND tablename='rate_limit_hits';  -- 0
--
-- b) Solo service_role puede ejecutar la función (ni anon ni
--    authenticated deben aparecer):
--    SELECT r.rolname, a.privilege_type
--    FROM pg_proc p
--    CROSS JOIN LATERAL aclexplode(p.proacl) a
--    JOIN pg_roles r ON r.oid = a.grantee
--    WHERE p.proname = 'check_rate_limit';
--
-- c) Smoke test funcional (como postgres en el SQL Editor):
--    SELECT public.check_rate_limit('smoke-test', 'k1', 2, 5);  -- true
--    SELECT public.check_rate_limit('smoke-test', 'k1', 2, 5);  -- true
--    SELECT public.check_rate_limit('smoke-test', 'k1', 2, 5);  -- false (3º en 1h)
--    DELETE FROM public.rate_limit_hits WHERE scope = 'smoke-test';
-- ============================================================
