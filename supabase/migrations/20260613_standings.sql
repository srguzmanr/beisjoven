-- ============================================================
-- STANDINGS-01 — Posiciones de liga (LMB + MLB)
-- Tables: ligas, equipos, posiciones
-- RLS: public SELECT; escritura admin (public.is_admin(), patrón SEC-06).
-- La sincronización automática escribe vía service_role (omite RLS).
-- Ejecutar manualmente en el SQL Editor de Supabase. Idempotente.
-- ============================================================

-- ---- ligas --------------------------------------------------------------
-- Una fila por liga cubierta. external_* alimenta el sync automático
-- (statsapi.mlb.com). MLB: sportId 1, leagueIds 103 (AL) + 104 (NL).
CREATE TABLE IF NOT EXISTS public.ligas (
  id                 serial PRIMARY KEY,
  slug               text UNIQUE NOT NULL,        -- 'lmb' | 'mlb'
  nombre             text NOT NULL,
  abreviatura        text NOT NULL,
  external_sport_id  integer,                      -- statsapi sportId
  external_league_ids text,                        -- statsapi leagueIds (CSV)
  temporada_actual   text,                         -- etiqueta de temporada vigente
  activa             boolean NOT NULL DEFAULT true,
  orden              integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---- equipos ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipos (
  id             serial PRIMARY KEY,
  liga_id        integer NOT NULL REFERENCES public.ligas(id) ON DELETE CASCADE,
  nombre         text NOT NULL,
  nombre_corto   text,
  abreviatura    text,
  ciudad         text,
  division       text,            -- 'Norte'/'Sur' (LMB) · 'Este'/'Centro'/'Oeste' (MLB)
  conferencia    text,            -- 'Americana'/'Nacional' (MLB) · NULL (LMB)
  logo_url       text,
  color_primario text,
  external_id    text,            -- statsapi team id (match para upsert)
  activo         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liga_id, nombre)
);
CREATE INDEX IF NOT EXISTS equipos_liga_idx ON public.equipos (liga_id);
CREATE UNIQUE INDEX IF NOT EXISTS equipos_external_idx
  ON public.equipos (liga_id, external_id) WHERE external_id IS NOT NULL;

-- ---- posiciones ---------------------------------------------------------
-- jj/jg/jp = juegos jugados/ganados/perdidos (mismo léxico que wbc_posiciones).
CREATE TABLE IF NOT EXISTS public.posiciones (
  id          serial PRIMARY KEY,
  equipo_id   integer NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
  temporada   text NOT NULL,
  jj          integer NOT NULL DEFAULT 0,
  jg          integer NOT NULL DEFAULT 0,
  jp          integer NOT NULL DEFAULT 0,
  pct         numeric(5,3) NOT NULL DEFAULT 0,
  gb          text NOT NULL DEFAULT '-',     -- juegos detrás ('-', '2.5', …)
  racha       text,                          -- racha ('G3' / 'P2')
  orden       integer NOT NULL DEFAULT 0,    -- orden dentro de la división
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (equipo_id, temporada)
);
CREATE INDEX IF NOT EXISTS posiciones_temporada_idx ON public.posiciones (temporada);

-- ---- auto-update updated_at en posiciones --------------------------------
CREATE OR REPLACE FUNCTION public.posiciones_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posiciones_updated_at ON public.posiciones;
CREATE TRIGGER posiciones_updated_at
  BEFORE UPDATE ON public.posiciones
  FOR EACH ROW
  EXECUTE FUNCTION public.posiciones_set_updated_at();

-- ---- RLS (SELECT público; escritura admin) ------------------------------
ALTER TABLE public.ligas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posiciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ligas_public_read" ON public.ligas;
CREATE POLICY "ligas_public_read" ON public.ligas FOR SELECT USING (true);
DROP POLICY IF EXISTS "ligas_admin_write" ON public.ligas;
CREATE POLICY "ligas_admin_write" ON public.ligas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "equipos_public_read" ON public.equipos;
CREATE POLICY "equipos_public_read" ON public.equipos FOR SELECT USING (true);
DROP POLICY IF EXISTS "equipos_admin_write" ON public.equipos;
CREATE POLICY "equipos_admin_write" ON public.equipos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "posiciones_public_read" ON public.posiciones;
CREATE POLICY "posiciones_public_read" ON public.posiciones FOR SELECT USING (true);
DROP POLICY IF EXISTS "posiciones_admin_write" ON public.posiciones;
CREATE POLICY "posiciones_admin_write" ON public.posiciones FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- SEED: ligas --------------------------------------------------------
-- LMB external_sport_id: confirmar el sportId de la Liga Mexicana en
-- statsapi (/api/v1/sports) antes de activar el sync. 23 es la hipótesis.
INSERT INTO public.ligas (slug, nombre, abreviatura, external_sport_id, external_league_ids, temporada_actual, activa, orden)
VALUES
  ('lmb', 'Liga Mexicana de Béisbol', 'LMB', 23,  NULL,      '2026', true, 1),
  ('mlb', 'Major League Baseball',     'MLB', 1,   '103,104', '2026', true, 2)
ON CONFLICT (slug) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      abreviatura = EXCLUDED.abreviatura,
      external_sport_id = EXCLUDED.external_sport_id,
      external_league_ids = EXCLUDED.external_league_ids,
      temporada_actual = EXCLUDED.temporada_actual;
