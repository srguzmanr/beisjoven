-- ============================================================
-- TU HISTORIA — Route anon submissions through a SECURITY DEFINER RPC
-- so that PostgREST's INSERT...RETURNING (which trips the absent
-- anon SELECT policy and surfaces as 42501) is bypassed entirely.
-- The function runs as the owner, validates the payload server-side,
-- and writes the row.
-- ============================================================

-- Remove the diagnostic policy added during investigation (USING false
-- did not satisfy RETURNING, so it served no purpose).
DROP POLICY IF EXISTS "historias_anon_select_none" ON public.historias_enviadas;

CREATE OR REPLACE FUNCTION public.enviar_historia(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  -- Required fields
  IF coalesce(length(trim(payload->>'nombre')), 0) < 3 THEN
    RAISE EXCEPTION 'nombre is required (min 3 chars)' USING ERRCODE = '22023';
  END IF;

  v_email := lower(trim(coalesce(payload->>'email', '')));
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'valid email is required' USING ERRCODE = '22023';
  END IF;

  IF coalesce(length(trim(payload->>'relacion')), 0) = 0 THEN
    RAISE EXCEPTION 'relacion is required' USING ERRCODE = '22023';
  END IF;

  IF coalesce(length(trim(payload->>'categoria_sugerida')), 0) = 0 THEN
    RAISE EXCEPTION 'categoria_sugerida is required' USING ERRCODE = '22023';
  END IF;

  IF coalesce(length(trim(payload->>'titulo')), 0) = 0 THEN
    RAISE EXCEPTION 'titulo is required' USING ERRCODE = '22023';
  END IF;
  IF length(payload->>'titulo') > 200 THEN
    RAISE EXCEPTION 'titulo too long (max 200)' USING ERRCODE = '22023';
  END IF;

  IF coalesce(length(trim(payload->>'descripcion')), 0) = 0 THEN
    RAISE EXCEPTION 'descripcion is required' USING ERRCODE = '22023';
  END IF;
  IF length(payload->>'descripcion') > 3000 THEN
    RAISE EXCEPTION 'descripcion too long (max 3000)' USING ERRCODE = '22023';
  END IF;

  IF coalesce(length(trim(payload->>'ciudad_estado')), 0) = 0 THEN
    RAISE EXCEPTION 'ciudad_estado is required' USING ERRCODE = '22023';
  END IF;

  IF coalesce((payload->>'autorizacion_general')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'autorizacion_general must be true' USING ERRCODE = '22023';
  END IF;

  INSERT INTO historias_enviadas (
    id,
    nombre, email, telefono,
    relacion, categoria_sugerida, titulo, descripcion,
    liga_organizacion, ciudad_estado, fotos,
    autorizacion_general, autorizacion_menores, permitir_credito
  ) VALUES (
    coalesce(nullif(payload->>'id','')::uuid, gen_random_uuid()),
    trim(payload->>'nombre'),
    v_email,
    nullif(trim(coalesce(payload->>'telefono','')), ''),
    payload->>'relacion',
    payload->>'categoria_sugerida',
    trim(payload->>'titulo'),
    trim(payload->>'descripcion'),
    nullif(trim(coalesce(payload->>'liga_organizacion','')), ''),
    trim(payload->>'ciudad_estado'),
    coalesce(
      (SELECT array_agg(value) FROM jsonb_array_elements_text(payload->'fotos')),
      '{}'::text[]
    ),
    true,
    CASE
      WHEN payload->'autorizacion_menores' IS NULL OR payload->>'autorizacion_menores' = 'null' THEN NULL
      ELSE (payload->>'autorizacion_menores')::boolean
    END,
    coalesce((payload->>'permitir_credito')::boolean, true)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enviar_historia(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enviar_historia(jsonb) TO anon, authenticated;
