-- ============================================================
-- TU HISTORIA — Persist the editorial checklist
-- Adds a JSONB column so checkbox state survives page reloads
-- and can drive the status workflow (all 5 checked → verificada).
-- ============================================================

ALTER TABLE historias_enviadas
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing rows to the default shape so the admin panel can
-- render the checkboxes without null-guards everywhere.
UPDATE historias_enviadas
SET checklist = jsonb_build_object(
  'org_exists',        false,
  'second_source',     false,
  'photos_match',      false,
  'sender_contactable',false,
  'enough_info',       false
)
WHERE checklist IS NULL OR checklist = '{}'::jsonb;
