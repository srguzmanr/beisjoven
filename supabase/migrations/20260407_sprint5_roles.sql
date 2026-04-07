-- SPRINT5-03: Sistema de Roles (Admin + Editor)
-- Run this migration in the Supabase SQL Editor
-- ================================================

-- 1. Add user_id column to articulos (links to auth.users for ownership)
-- Note: autor_id already exists and references the autores table (editorial byline).
-- user_id tracks which Supabase auth user created/owns the article.
ALTER TABLE articulos
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Backfill: set existing articles' user_id to Sergio's auth user
-- Replace <SERGIO_AUTH_UID> with the actual UUID from auth.users
-- UPDATE articulos SET user_id = '<SERGIO_AUTH_UID>' WHERE user_id IS NULL;

-- 3. RLS Policies for role-based access
-- Drop existing permissive policies if they exist (adjust names as needed)
-- DROP POLICY IF EXISTS "public_read" ON articulos;
-- DROP POLICY IF EXISTS "authenticated_all" ON articulos;

-- Allow anyone to read published articles
CREATE POLICY "public_read_published" ON articulos
FOR SELECT USING (publicado = true);

-- Authenticated users can read their own unpublished drafts
CREATE POLICY "own_drafts_read" ON articulos
FOR SELECT USING (
  auth.uid() = user_id AND publicado = false
);

-- Admins can read everything
CREATE POLICY "admin_read_all" ON articulos
FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Anyone authenticated can insert (editors create drafts, admins create published)
CREATE POLICY "authenticated_insert" ON articulos
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Editors can update only their own articles; admins can update any
CREATE POLICY "editors_update_own" ON articulos
FOR UPDATE USING (
  user_id = auth.uid()
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Only admins can delete
CREATE POLICY "admin_delete_only" ON articulos
FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 4. Similar policies for videos (admin-only delete)
CREATE POLICY "admin_delete_videos" ON videos
FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 5. Storage policies for imagenes bucket (admin-only delete)
-- In Supabase Dashboard > Storage > imagenes > Policies:
-- DELETE: (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
-- INSERT: auth.uid() IS NOT NULL

-- ================================================
-- USER CREATION (run manually for each new editor):
--
-- In Supabase Dashboard > Authentication > Users > Add User:
-- Email: editor@beisjoven.com
-- Password: (set a secure password)
-- User Metadata: { "role": "editor", "name": "Nombre del Editor" }
--
-- Or via the Admin API:
-- supabase.auth.admin.createUser({
--   email: 'editor@beisjoven.com',
--   password: 'secure-password',
--   email_confirm: true,
--   user_metadata: { role: 'editor', name: 'Nombre del Editor' }
-- })
-- ================================================
