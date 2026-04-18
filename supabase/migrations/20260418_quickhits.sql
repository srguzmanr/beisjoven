-- ============================================================
-- QUICKHITS-01 — Editable Live Headlines
-- Table: quick_hits
-- RLS: public read, authenticated write
-- ============================================================

CREATE TABLE IF NOT EXISTS quick_hits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texto      text NOT NULL CHECK (char_length(texto) <= 120),
  url        text NOT NULL,
  activo     boolean NOT NULL DEFAULT true,
  orden      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quick_hits_activo_orden_idx
  ON quick_hits (activo, orden);

-- Auto-update updated_at on row update
CREATE OR REPLACE FUNCTION quick_hits_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quick_hits_updated_at ON quick_hits;
CREATE TRIGGER quick_hits_updated_at
  BEFORE UPDATE ON quick_hits
  FOR EACH ROW
  EXECUTE FUNCTION quick_hits_set_updated_at();

-- RLS
ALTER TABLE quick_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_hits_public_read"
  ON quick_hits FOR SELECT
  USING (true);

CREATE POLICY "quick_hits_authenticated_insert"
  ON quick_hits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "quick_hits_authenticated_update"
  ON quick_hits FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "quick_hits_authenticated_delete"
  ON quick_hits FOR DELETE
  TO authenticated
  USING (true);
