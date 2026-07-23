-- HYGIENE-01 · Item 1 — Copy condicional §5.2 en el alt_text del casa Tu Historia.
-- El alt_text vigente ("...y publícala en Beisjoven") promete publicación en seco,
-- igual que el cuerpo del SVG corregido en este mismo ticket. Se alinea al formato
-- condicional aprobado en ONSITE-TUHISTORIA-01-FIX01.
-- Afecta las 2 filas casa "Tu Historia" (home-mid y article-body).
-- Ejecutar en el SQL Editor. "Success. No rows returned" = éxito normal.

UPDATE anuncios
SET alt_text = 'Tu Historia — cuéntanos tu historia del beis y, si la elegimos, la publicamos en Beisjoven'
WHERE tipo = 'casa'
  AND marca = 'Tu Historia';

-- Verificación (debe devolver 2 filas, ambas con el alt_text condicional):
-- SELECT slot_id, alt_text FROM anuncios WHERE tipo = 'casa' AND marca = 'Tu Historia';
-- Verificación negativa (0 filas con la promesa vieja en cualquier anuncio):
-- SELECT id, slot_id, alt_text FROM anuncios WHERE alt_text ILIKE '%publícala%';
