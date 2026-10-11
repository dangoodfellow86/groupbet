-- ====================================================================
-- 007_user_profile_customization.sql
-- Supports custom avatar uploads, custom avatar flag, and Supabase Storage bucket
-- ====================================================================

-- 1. Add custom_avatar column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_avatar BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Ensure public avatars bucket exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Storage RLS policies for avatars bucket
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Avatar Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Avatar Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Avatar Deletes" ON storage.objects;

CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Allow Avatar Uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow Avatar Updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Allow Avatar Deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'avatars');
