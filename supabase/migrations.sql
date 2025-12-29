-- Priest Finance App - Supabase schema & RLS

-- 1) Profiles (auth.users mapping)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  active boolean default true,
  role text default 'priest', -- 'priest' | 'admin'
  created_at timestamptz default now()
);

UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'eldocrazy@gmail.com';

-- 2) Priests metadata
create table if not exists public.priests (
  id uuid primary key references public.profiles(id) on delete cascade,
  ordinal integer,
  address text,
  notes text
);

-- 3) Salary
create table if not exists public.salary (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text default 'EUR',
  month date not null, -- store as first day of month
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index if not exists salary_priest_idx on public.salary (priest_id);
create index if not exists salary_month_idx on public.salary (month);

-- 4) Insurance
create table if not exists public.insurance (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid references public.profiles(id) on delete cascade,
  type text not null, -- e.g. car, house, health
  amount numeric(12,2) not null,
  renewal_date date,
  status text default 'active', -- active / expired
  created_at timestamptz default now()
);

create index if not exists insurance_priest_idx on public.insurance (priest_id);

-- 5) Loans
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid references public.profiles(id) on delete cascade,
  principal numeric(12,2) not null,
  emi numeric(12,2),
  outstanding_balance numeric(12,2) not null,
  issued_on date,
  status text default 'active',
  created_at timestamptz default now()
);

create index if not exists loans_priest_idx on public.loans (priest_id);


-- 7) Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_en text,
  title_de text,
  body_en text,
  body_de text,
  visible_from timestamptz default now(),
  visible_until timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  is_published boolean default true
);

-- 8) Settings (generic key-value)
create table if not exists public.settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.priests enable row level security;
alter table public.salary enable row level security;
alter table public.insurance enable row level security;
alter table public.loans enable row level security;
alter table public.announcements enable row level security;

-- Drop existing policies if they exist
drop policy if exists "admin can see all profiles" on public.profiles;
drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_manage_admin" on public.profiles;
drop policy if exists "priests_select_self" on public.priests;
drop policy if exists "priests_select_admin" on public.priests;
drop policy if exists "priests_manage_admin" on public.priests;
drop policy if exists "salary_select_priest" on public.salary;
drop policy if exists "salary_select_admin" on public.salary;
drop policy if exists "salary_insert_admin" on public.salary;
drop policy if exists "salary_update_admin" on public.salary;
drop policy if exists "salary_delete_admin" on public.salary;
drop policy if exists "insurance_select_priest" on public.insurance;
drop policy if exists "insurance_select_admin" on public.insurance;
drop policy if exists "insurance_insert_admin" on public.insurance;
drop policy if exists "insurance_update_admin" on public.insurance;
drop policy if exists "insurance_delete_admin" on public.insurance;
drop policy if exists "loans_select_priest" on public.loans;
drop policy if exists "loans_select_admin" on public.loans;
drop policy if exists "loans_insert_admin" on public.loans;
drop policy if exists "loans_update_admin" on public.loans;
drop policy if exists "loans_delete_admin" on public.loans;
drop policy if exists "announcements_select_auth" on public.announcements;
drop policy if exists "announcements_insert_admin" on public.announcements;
drop policy if exists "announcements_update_admin" on public.announcements;
drop policy if exists "announcements_delete_admin" on public.announcements;

-- Helper: check if current user is admin
-- SECURITY DEFINER allows this function to bypass RLS when checking profiles
-- SET search_path ensures we're querying the right schema
create or replace function public.is_admin() returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  if auth.uid() is null then
    return false;
  end if;
  
  select role into user_role
  from public.profiles
  where id = auth.uid();
  
  -- Handle NULL role case - return false if role is NULL
  return coalesce(user_role, '') = 'admin';
end;
$$;

-- PROFILES policies
-- Admin can see all profiles - use is_admin() function which bypasses RLS
CREATE POLICY "admin can see all profiles"
ON profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND public.is_admin());

create policy "profiles_select_self" on public.profiles
  for select using ( auth.uid() is not null and auth.uid() = id );

create policy "profiles_update_self" on public.profiles
  for update using ( auth.uid() is not null and auth.uid() = id )
  with check ( auth.uid() is not null and auth.uid() = id );

create policy "profiles_manage_admin" on public.profiles
  for all using ( auth.uid() is not null and public.is_admin() );

-- PRIESTS policies
create policy "priests_select_self" on public.priests
  for select using ( auth.uid() is not null and auth.uid() = id );

create policy "priests_select_admin" on public.priests
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "priests_manage_admin" on public.priests
  for all using ( auth.uid() is not null and public.is_admin() );

-- SALARY policies
create policy "salary_select_priest" on public.salary
  for select using ( auth.uid() is not null and auth.uid() = priest_id );

create policy "salary_select_admin" on public.salary
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "salary_insert_admin" on public.salary
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "salary_update_admin" on public.salary
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "salary_delete_admin" on public.salary
  for delete using ( auth.uid() is not null and public.is_admin() );

-- INSURANCE policies
create policy "insurance_select_priest" on public.insurance
  for select using ( auth.uid() is not null and auth.uid() = priest_id );

create policy "insurance_select_admin" on public.insurance
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "insurance_insert_admin" on public.insurance
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "insurance_update_admin" on public.insurance
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "insurance_delete_admin" on public.insurance
  for delete using ( auth.uid() is not null and public.is_admin() );

-- LOANS policies
create policy "loans_select_priest" on public.loans
  for select using ( auth.uid() is not null and auth.uid() = priest_id );

create policy "loans_select_admin" on public.loans
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "loans_insert_admin" on public.loans
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "loans_update_admin" on public.loans
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "loans_delete_admin" on public.loans
  for delete using ( auth.uid() is not null and public.is_admin() );

-- ANNOUNCEMENTS policies
create policy "announcements_select_auth" on public.announcements
  for select using ( auth.role() is not null );

create policy "announcements_insert_admin" on public.announcements
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "announcements_update_admin" on public.announcements
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "announcements_delete_admin" on public.announcements
  for delete using ( auth.uid() is not null and public.is_admin() );

-- SALARY summary view (admin-only)
create or replace view public.admin_salary_summary as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.salary
group by month