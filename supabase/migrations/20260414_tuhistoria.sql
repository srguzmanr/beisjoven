-- ============================================================
-- TU HISTORIA — Community Story Submissions
-- Tables: historias_enviadas
-- Storage: tu-historia bucket
-- RLS: anon INSERT only; authenticated SELECT/UPDATE
-- ============================================================

-- ==================== TABLE ====================

CREATE TABLE IF NOT EXISTS historias_enviadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Submitter info (private — never exposed publicly)
  nombre    TEXT NOT NULL,
  email     TEXT NOT NULL,
  telefono  TEXT,
  relacion  TEXT NOT NULL,
  -- Valid values: entrenador, jugador, padre_madre,
  -- directivo_liga, periodista, aficionado, otro

  -- Story info
  categoria_sugerida  TEXT NOT NULL,
  -- Valid values match category slugs: juvenil, softbol,
  -- liga-mexicana, mlb, seleccion, opinion
  titulo              TEXT NOT NULL,
  descripcion         TEXT NOT NULL,
  liga_organizacion   TEXT,
  ciudad_estado       TEXT NOT NULL,

  -- Media
  fotos TEXT[] DEFAULT '{}',
  -- Array of Storage paths: {submission-uuid}/{filename}

  -- Consent
  autorizacion_general BOOLEAN NOT NULL DEFAULT false,
  autorizacion_menores BOOLEAN DEFAULT NULL,
  -- NULL = no minors indicated, true = consent given

  -- Attribution
  permitir_credito BOOLEAN NOT NULL DEFAULT true,
  -- true = "Con información proporcionada por [nombre]"
  -- false = anonymous submission

  -- Editorial workflow
  estado TEXT NOT NULL DEFAULT 'nueva',
  -- Valid: nueva, en_revision, verificada, publicada, descartada
  notas_editoriales TEXT,
  articulo_id INTEGER REFERENCES articulos(id),
  -- Links to the published article, if any

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_historias_estado
  ON historias_enviadas(estado);
CREATE INDEX IF NOT EXISTS idx_historias_created
  ON historias_enviadas(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_historias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS historias_updated_at ON historias_enviadas;
CREATE TRIGGER historias_updated_at
  BEFORE UPDATE ON historias_enviadas
  FOR EACH ROW EXECUTE FUNCTION update_historias_updated_at();

-- ==================== RLS ====================

ALTER TABLE historias_enviadas ENABLE ROW LEVEL SECURITY;

-- Public can INSERT (submit stories)
DROP POLICY IF EXISTS "historias_public_insert" ON historias_enviadas;
CREATE POLICY "historias_public_insert"
  ON historias_enviadas FOR INSERT
  TO anon
  WITH CHECK (true);

-- Public CANNOT read submissions (privacy). No SELECT policy for anon.

-- Authenticated can read all submissions
DROP POLICY IF EXISTS "historias_authenticated_read" ON historias_enviadas;
CREATE POLICY "historias_authenticated_read"
  ON historias_enviadas FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated can update status and editorial fields
DROP POLICY IF EXISTS "historias_authenticated_update" ON historias_enviadas;
CREATE POLICY "historias_authenticated_update"
  ON historias_enviadas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- No DELETE policy — submissions are never deleted,
-- only marked as descartada.

-- ==================== STORAGE BUCKET ====================

-- Create bucket tu-historia (public read so photos can appear in published articles)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tu-historia', 'tu-historia', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload to tu-historia bucket
DROP POLICY IF EXISTS "tu_historia_public_upload" ON storage.objects;
CREATE POLICY "tu_historia_public_upload"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'tu-historia');

-- Anyone can view story photos (for published articles)
DROP POLICY IF EXISTS "tu_historia_public_read" ON storage.objects;
CREATE POLICY "tu_historia_public_read"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'tu-historia');

-- Only authenticated can delete
DROP POLICY IF EXISTS "tu_historia_authenticated_delete" ON storage.objects;
CREATE POLICY "tu_historia_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tu-historia');
