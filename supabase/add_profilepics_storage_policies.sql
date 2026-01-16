-- Add storage bucket policies for ProfilePics bucket
-- This allows users to upload, read, and delete their own profile photos

-- Note: Make sure the bucket "ProfilePics" exists in Supabase Storage
-- If it doesn't exist, create it first in the Supabase dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ProfilePics', 'ProfilePics', true);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ProfilePics_select_own" ON storage.objects;
DROP POLICY IF EXISTS "ProfilePics_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "ProfilePics_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "ProfilePics_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "ProfilePics_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "ProfilePics_delete_admin" ON storage.objects;

-- Allow users to select (read) their own profile photos
-- Files are named as {user_id}-{timestamp}.{ext} (e.g., "uuid-1234567890.jpg")
CREATE POLICY "ProfilePics_select_own"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ProfilePics' 
  AND auth.uid() IS NOT NULL
  AND name LIKE auth.uid()::text || '-%'
);

-- Allow users to insert (upload) their own profile photos
-- Files must be named with their user ID as the first part (e.g., {user_id}-{timestamp}.{ext})
CREATE POLICY "ProfilePics_insert_own"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ProfilePics'
  AND auth.uid() IS NOT NULL
  AND name LIKE auth.uid()::text || '-%'
);

-- Allow users to delete their own profile photos
CREATE POLICY "ProfilePics_delete_own"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ProfilePics'
  AND auth.uid() IS NOT NULL
  AND name LIKE auth.uid()::text || '-%'
);

-- Allow admins to select (read) all profile photos
CREATE POLICY "ProfilePics_select_admin"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ProfilePics'
  AND auth.uid() IS NOT NULL
  AND public.is_admin()
);

-- Allow admins to insert (upload) profile photos
CREATE POLICY "ProfilePics_insert_admin"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ProfilePics'
  AND auth.uid() IS NOT NULL
  AND public.is_admin()
);

-- Allow admins to delete profile photos
CREATE POLICY "ProfilePics_delete_admin"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'ProfilePics'
  AND auth.uid() IS NOT NULL
  AND public.is_admin()
);
