create or replace view public.admin_house_rent_summary as
select
  month as month,
  sum(rent_amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.house_rent
group by month

-- HOUSE RENT policies
create policy "house_rent_select_priest" on public.house_rent
  for select using ( auth.uid() is not null and auth.uid() = priest_id );

create policy "house_rent_select_admin" on public.house_rent
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "house_rent_insert_admin" on public.house_rent
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "house_rent_update_admin" on public.house_rent
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "house_rent_delete_admin" on public.house_rent
  for delete using ( auth.uid() is not null and public.is_admin() );

create or replace view public.admin_insurance_summary_1 
with (security_invoker = on) as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.insurance
where(type = 1)
group by month

create or replace view public.admin_insurance_summary_2
with (security_invoker = on) as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.insurance
where(type = 2)
group by month;

create or replace view public.admin_insurance_summary_3 
with (security_invoker = on) as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.insurance
where(type = 3)
group by month;

create or replace view public.admin_insurance_summary_4
with (security_invoker = on) as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.insurance
where(type = 4)
group by month;


create or replace view public.admin_insurance_summary_5 
with (security_invoker = on) as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.insurance
where(type = 5)
group by month;

create or replace view public.admin_insurance_summary_6 
with (security_invoker = on) as
select
  month as month,
  sum(amount) as total_payout,
  count(distinct priest_id) as priests_recorded
from public.insurance
where(type = 6)
group by month;

-- PROVINCE table
create table if not exists public.provinces (
  id uuid primary key default gen_random_uuid(),
  province_name text not null unique,
  created_at timestamptz default now(),
);

-- Enable RLS for provinces
alter table public.provinces enable row level security;

-- Province policies (all authenticated users can view provinces)
create policy "provinces_select_auth" on public.provinces
  for select using ( auth.uid() is not null );

create policy "provinces_insert_admin" on public.provinces
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "provinces_update_admin" on public.provinces
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "provinces_delete_admin" on public.provinces
  for delete using ( auth.uid() is not null and public.is_admin() );

-- FUND TRANSFER table
create table if not exists public.fund_transfer (
  id uuid default gen_random_uuid() primary key,
  province_id uuid references public.provinces(id) on delete restrict,
  transfer_date date not null,
  transferred_account text not null,
  amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.fund_transfer enable row level security;

-- FUND TRANSFER policies
create policy "fund_transfer_select_admin" on public.fund_transfer
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "fund_transfer_insert_admin" on public.fund_transfer
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "fund_transfer_update_admin" on public.fund_transfer
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "fund_transfer_delete_admin" on public.fund_transfer
  for delete using ( auth.uid() is not null and public.is_admin() );

-- Create index for faster queries
create index if not exists fund_transfer_transfer_date_idx on public.fund_transfer(transfer_date desc);
create index if not exists fund_transfer_province_id_idx on public.fund_transfer(province_id);

-- DONATIONS table
create table if not exists public.donations (
  id uuid default gen_random_uuid() primary key,
  sender text not null,
  amount numeric(10, 2) not null default 0,
  credited_date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.donations enable row level security;

-- DONATIONS policies
create policy "donations_select_admin" on public.donations
  for select using ( auth.uid() is not null and public.is_admin() );

create policy "donations_insert_admin" on public.donations
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

create policy "donations_update_admin" on public.donations
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

create policy "donations_delete_admin" on public.donations
  for delete using ( auth.uid() is not null and public.is_admin() );

-- Create index for faster queries
create index if not exists donations_credited_date_idx on public.donations(credited_date desc);

-- ANNOUNCEMENTS INDIVIDUAL table
create table if not exists public.announcements_individual (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text,
  lang text default 'en', -- 'en' or 'de'
  visible_until timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.announcements_individual enable row level security;

-- ANNOUNCEMENTS INDIVIDUAL policies
-- Priests can see their own announcements
create policy "announcements_individual_select_priest" on public.announcements_individual
  for select using ( auth.uid() is not null and auth.uid() = priest_id );

-- Admin can see all individual announcements
create policy "announcements_individual_select_admin" on public.announcements_individual
  for select using ( auth.uid() is not null and public.is_admin() );

-- Only admin can insert individual announcements
create policy "announcements_individual_insert_admin" on public.announcements_individual
  for insert
  with check ( auth.uid() is not null and public.is_admin() );

-- Only admin can update individual announcements
create policy "announcements_individual_update_admin" on public.announcements_individual
  for update using ( auth.uid() is not null and public.is_admin() )
  with check ( auth.uid() is not null and public.is_admin() );

-- Only admin can delete individual announcements
create policy "announcements_individual_delete_admin" on public.announcements_individual
  for delete using ( auth.uid() is not null and public.is_admin() );

-- Create indexes for faster queries
create index if not exists announcements_individual_priest_id_idx on public.announcements_individual(priest_id);
create index if not exists announcements_individual_created_at_idx on public.announcements_individual(created_at desc);
create index if not exists announcements_individual_visible_until_idx on public.announcements_individual(visible_until);