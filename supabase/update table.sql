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