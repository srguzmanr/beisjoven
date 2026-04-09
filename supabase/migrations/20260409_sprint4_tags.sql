-- ============================================================
-- SPRINT 4 — Tag System
-- Tables: tags, articulo_tags
-- RLS: public read on both, authenticated write
-- Seed: 12 initial tags
-- ============================================================

-- ==================== TAGS TABLE ====================

CREATE TABLE IF NOT EXISTS tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_public_read"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "tags_authenticated_insert"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tags_authenticated_update"
  ON tags FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "tags_authenticated_delete"
  ON tags FOR DELETE
  TO authenticated
  USING (true);

-- ==================== ARTICULO_TAGS JUNCTION TABLE ====================

CREATE TABLE IF NOT EXISTS articulo_tags (
  articulo_id integer   NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
  tag_id      uuid      NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (articulo_id, tag_id)
);

-- RLS
ALTER TABLE articulo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articulo_tags_public_read"
  ON articulo_tags FOR SELECT
  USING (true);

CREATE POLICY "articulo_tags_authenticated_insert"
  ON articulo_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "articulo_tags_authenticated_delete"
  ON articulo_tags FOR DELETE
  TO authenticated
  USING (true);

-- ==================== SEED TAGS ====================

INSERT INTO tags (nombre, slug) VALUES
  ('Desarrollo',              'desarrollo'),
  ('College',                 'college'),
  ('Frontera',                'frontera'),
  ('Prospectos',              'prospectos'),
  ('Selección Menor',         'seleccion-menor'),
  ('Softbol Universitario',   'softbol-universitario'),
  ('Historia',                'historia'),
  ('Estadísticas',            'estadisticas'),
  ('WBC',                     'wbc'),
  ('Serie del Caribe',        'serie-del-caribe'),
  ('LMP',                     'lmp'),
  ('CONADEIP',                'conadeip')
ON CONFLICT (slug) DO NOTHING;
