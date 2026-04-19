-- DESIGN-01b article page schema additions
-- Additive, nullable, zero impact on existing 572 articles.
-- Note: autores.bio and autores.avatar_url already exist (sprint 4);
-- avatar_url satisfies the spec's author-photo requirement.

ALTER TABLE articulos
  ADD COLUMN IF NOT EXISTS kicker text,
  ADD COLUMN IF NOT EXISTS photo_credit text,
  ADD COLUMN IF NOT EXISTS imagen_portada_alt text;
