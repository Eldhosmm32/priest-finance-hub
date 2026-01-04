-- Add RLS policies for priests table to allow priests to insert and update their own records

-- Drop existing policies if they exist (to avoid conflicts)
drop policy if exists "priests_insert_self" on public.priests;
drop policy if exists "priests_update_self" on public.priests;

-- Allow priests to insert their own record
create policy "priests_insert_self" on public.priests
  for insert
  with check ( auth.uid() is not null and auth.uid() = id );

-- Allow priests to update their own record
create policy "priests_update_self" on public.priests
  for update
  using ( auth.uid() is not null and auth.uid() = id )
  with check ( auth.uid() is not null and auth.uid() = id );

