-- DESIGN-03 articulos.hero_layout enum column
-- Per-story hero treatment selector consumed by homepage and article page.
-- NULL = default behavior; no backfill of existing rows.

ALTER TABLE articulos
  ADD COLUMN hero_layout text;

ALTER TABLE articulos
  ADD CONSTRAINT articulos_hero_layout_check
  CHECK (hero_layout IS NULL OR hero_layout IN ('default', 'overlay', 'split'));
