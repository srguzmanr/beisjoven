-- ============================================================
-- HOUSE-ADS-01 — Sistema de slots publicitarios (AdSlot) Fase 1
-- Table: anuncios
-- RLS: public SELECT; INSERT/UPDATE/DELETE admin-only (patrón SEC-03)
-- Run this migration manually in the Supabase SQL Editor.
-- ============================================================

-- ---- Enum de tipo de creativo -------------------------------------------
-- propia      → empresa propia (Tier 1)        → etiqueta "Publicidad"
-- aliado      → empresa aliada (Tier 2)        → etiqueta "Publicidad"
-- casa        → producto propio Beisjoven      → etiqueta "De Beisjoven"
-- placeholder → último recurso anti-colapso     → "Publicidad — Tu marca aquí"
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anuncio_tipo') THEN
    CREATE TYPE anuncio_tipo AS ENUM ('propia', 'aliado', 'casa', 'placeholder');
  END IF;
END$$;

-- ---- Tabla --------------------------------------------------------------
-- Sin device-targeting. Sin geo-targeting (un solo render, estándar US+MX).
CREATE TABLE IF NOT EXISTS anuncios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imagen_url  text,                       -- nullable: placeholder no usa imagen
  alt_text    text NOT NULL,              -- alt enforcement (accesibilidad)
  target_url  text,                       -- destino del clic (nullable para inactivos)
  slot_id     text NOT NULL,              -- 'slot-a' | 'slot-b' | 'slot-c'
  tipo        anuncio_tipo NOT NULL,
  activo      boolean NOT NULL DEFAULT false,
  prioridad   integer NOT NULL DEFAULT 100, -- menor = se ocupa primero
  marca       text,                       -- nombre del anunciante (nullable)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anuncios_slot_activo_prioridad_idx
  ON anuncios (slot_id, activo, prioridad);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION anuncios_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS anuncios_updated_at ON anuncios;
CREATE TRIGGER anuncios_updated_at
  BEFORE UPDATE ON anuncios
  FOR EACH ROW
  EXECUTE FUNCTION anuncios_set_updated_at();

-- ---- RLS (patrón SEC-03: SELECT público, escritura solo admin) ----------
ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anuncios_public_read" ON anuncios;
CREATE POLICY "anuncios_public_read"
  ON anuncios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "anuncios_admin_insert" ON anuncios;
CREATE POLICY "anuncios_admin_insert"
  ON anuncios FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "anuncios_admin_update" ON anuncios;
CREATE POLICY "anuncios_admin_update"
  ON anuncios FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "anuncios_admin_delete" ON anuncios;
CREATE POLICY "anuncios_admin_delete"
  ON anuncios FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- SEED — Orden de ocupación por prioridad
--   Tier 1 propias (10-19) · Tier 2 aliados (20-29)
--   Tier 3 casa (30-39)     · Tier 4 placeholder (100, último recurso)
-- Fase 1 activa SOLO Tier 3 + Tier 4 (sin riesgo legal).
-- Tier 1/2 quedan listos pero INACTIVOS (activo=false) hasta carga
-- manual de creativos reales (sustituir imagen_url/target_url).
-- ============================================================

-- ---- Tier 1: propias (INACTIVO) ----------------------------------------
INSERT INTO anuncios (imagen_url, alt_text, target_url, slot_id, tipo, activo, prioridad, marca) VALUES
  (NULL, 'Anuncio de Rafiki',        NULL, 'slot-a', 'propia', false, 10, 'Rafiki'),
  (NULL, 'Anuncio de Rafiki',        NULL, 'slot-b', 'propia', false, 10, 'Rafiki'),
  (NULL, 'Anuncio de Black Koi 360', NULL, 'slot-a', 'propia', false, 11, 'Black Koi 360'),
  (NULL, 'Anuncio de Black Koi 360', NULL, 'slot-b', 'propia', false, 11, 'Black Koi 360');

-- ---- Tier 2: aliados (INACTIVO) ----------------------------------------
INSERT INTO anuncios (imagen_url, alt_text, target_url, slot_id, tipo, activo, prioridad, marca) VALUES
  (NULL, 'Anuncio de Caja Inmaculada', NULL, 'slot-a', 'aliado', false, 20, 'Caja Inmaculada'),
  (NULL, 'Anuncio de Caja Inmaculada', NULL, 'slot-b', 'aliado', false, 20, 'Caja Inmaculada'),
  (NULL, 'Anuncio de CEDISMAN',        NULL, 'slot-a', 'aliado', false, 21, 'CEDISMAN'),
  (NULL, 'Anuncio de CEDISMAN',        NULL, 'slot-b', 'aliado', false, 21, 'CEDISMAN'),
  (NULL, 'Anuncio de Multiclosets',    NULL, 'slot-a', 'aliado', false, 22, 'Multiclosets'),
  (NULL, 'Anuncio de Multiclosets',    NULL, 'slot-b', 'aliado', false, 22, 'Multiclosets');

-- ---- Tier 3: casa / producto propio (ACTIVO) ---------------------------
INSERT INTO anuncios (imagen_url, alt_text, target_url, slot_id, tipo, activo, prioridad, marca) VALUES
  ('/ads/el-diamante-300x250.svg', 'El Diamante — el newsletter de Beisjoven, gratis cada mañana', '/#newsletter-form', 'slot-a', 'casa', true, 30, 'El Diamante'),
  ('/ads/el-diamante-300x250.svg', 'El Diamante — el newsletter de Beisjoven, gratis cada mañana', '/#newsletter-form', 'slot-b', 'casa', true, 30, 'El Diamante'),
  ('/ads/tu-historia-300x250.svg', 'Tu Historia — cuéntanos tu historia del beis y publícala en Beisjoven', '/tu-historia', 'slot-a', 'casa', true, 31, 'Tu Historia'),
  ('/ads/tu-historia-300x250.svg', 'Tu Historia — cuéntanos tu historia del beis y publícala en Beisjoven', '/tu-historia', 'slot-b', 'casa', true, 31, 'Tu Historia'),
  ('/ads/whatsapp-300x250.svg',    'Comunidad Beisjoven — únete y recibe el beis en tu chat',           '/contacto',   'slot-a', 'casa', true, 32, 'Comunidad Beisjoven'),
  ('/ads/whatsapp-300x250.svg',    'Comunidad Beisjoven — únete y recibe el beis en tu chat',           '/contacto',   'slot-b', 'casa', true, 32, 'Comunidad Beisjoven');

-- ---- Tier 4: placeholder último recurso (ACTIVO) -----------------------
-- imagen_url NULL → AdSlot renderiza el marco "Tu marca aquí" en CSS.
INSERT INTO anuncios (imagen_url, alt_text, target_url, slot_id, tipo, activo, prioridad, marca) VALUES
  (NULL, 'Espacio publicitario disponible en Beisjoven', '/contacto', 'slot-a', 'placeholder', true, 100, NULL),
  (NULL, 'Espacio publicitario disponible en Beisjoven', '/contacto', 'slot-b', 'placeholder', true, 100, NULL);
