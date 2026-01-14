-- Fix RLS policies for priests table to allow admins to insert and update
-- This matches the pattern used for other tables like salary, insurance, loans

-- Drop the existing manage_admin policy (if it exists)
drop policy if exists "priests_manage_admin" on public.priests;

-- Drop any conflicting policies that might exist
drop policy if exists "priests_insert_admin" on public.priests;
drop policy if exists "priests_update_admin" on public.priests;
drop policy if exists "priests_delete_admin" on public.priests;

-- Create separate policies for each operation (matching the pattern of other tables)
-- This ensures proper RLS behavior for INSERT and UPDATE operations

-- Admin can insert priest records
create policy "priests_insert_admin" on public.priests
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

-- Admin can update priest records
create policy "priests_update_admin" on public.priests
  for update 
  using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

-- Admin can delete priest records (if needed in the future)
create policy "priests_delete_admin" on public.priests
  for delete 
  using ( auth.uid() is not null and public.is_admin() );

-- Note: SELECT policies should already exist:
-- - priests_select_self (priests can see their own records)
-- - priests_select_admin (admins can see all records)
-- 
-- Note: Priest self-insert/update policies should also exist (from add_priests_rls_policies.sql):
-- - priests_insert_self (priests can insert their own record)
-- - priests_update_self (priests can update their own record)
