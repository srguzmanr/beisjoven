-- SPRINT4-01: Author Pages
-- Ensure autores table exists with correct schema, seed Sergio's profile,
-- and default all unassigned articles to his author_id.

CREATE TABLE IF NOT EXISTS autores (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre      TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  bio         TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Sergio Guzmán's profile
INSERT INTO autores (nombre, slug, bio, avatar_url)
VALUES (
  'Sergio Guzmán',
  'sergio-guzman',
  'Periodista deportivo especializado en béisbol y softbol mexicano. Director de Beisjoven.',
  NULL
)
ON CONFLICT (slug) DO NOTHING;

-- Add autor_id FK to articulos if it doesn''t exist yet
ALTER TABLE articulos
  ADD COLUMN IF NOT EXISTS autor_id BIGINT REFERENCES autores(id);

-- Assign all articles without an author to Sergio Guzmán
UPDATE articulos
SET    autor_id = (SELECT id FROM autores WHERE slug = 'sergio-guzman')
WHERE  autor_id IS NULL;
