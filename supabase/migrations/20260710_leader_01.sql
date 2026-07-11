-- LEADER-01 — Homepage leaderboard slot (970×90 desktop / 320×50 mobile).
-- Run this migration manually in the Supabase SQL Editor. Do NOT auto-apply.
--
-- 1. Art-direction column: mobile creative (<768px). Desktop keeps imagen_url.
-- 2. Seed the 'home-leaderboard' placeholder row (activo, prioridad 100).
--    imagen_url/target_url NULL → AdSlot renders the CSS placeholder,
--    non-clickable. The real creative activates via a plain UPDATE.

ALTER TABLE public.anuncios ADD COLUMN IF NOT EXISTS imagen_url_mobile text;

INSERT INTO public.anuncios
  (imagen_url, imagen_url_mobile, alt_text, target_url, slot_id, tipo, activo, prioridad, marca)
SELECT NULL, NULL, 'Espacio publicitario disponible', NULL,
       'home-leaderboard', 'placeholder', true, 100, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.anuncios
  WHERE slot_id = 'home-leaderboard' AND tipo = 'placeholder'
);
