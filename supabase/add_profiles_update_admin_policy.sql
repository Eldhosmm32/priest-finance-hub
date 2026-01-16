-- Add RLS policy for admins to update profiles (specifically for full_name updates)
-- This follows the same pattern as other tables (salary, insurance, loans, priests)

-- Drop any existing admin update policy to avoid conflicts
drop policy if exists "profiles_update_admin" on public.profiles;

-- Create specific policy for admin to update profiles
-- This allows admins to update any profile, including full_name
-- The policy uses both USING (to check existing rows) and WITH CHECK (to validate new values)
create policy "profiles_update_admin" on public.profiles
  for update 
  using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

-- Note: Other existing policies should remain:
-- - "admin can see all profiles" (SELECT for admins)
-- - "profiles_select_self" (SELECT for own profile)
-- - "profiles_update_self" (UPDATE for own profile)
-- - "profiles_manage_admin" (FOR ALL - covers INSERT, UPDATE, DELETE, but we add specific UPDATE for clarity)
