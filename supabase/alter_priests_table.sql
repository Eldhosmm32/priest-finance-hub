-- Alter priests table to add profile details
-- Excludes email, phone, and full_name (those are in profiles table)

-- Add date_of_birth column
alter table public.priests
add column if not exists date_of_birth date;

-- Add photo column (URL to professional photo)
alter table public.priests
add column if not exists photo text;

-- Add pin_code column
alter table public.priests
add column if not exists pin_code text;

-- Add province column
alter table public.priests
add column if not exists province text;

-- Add diocese column
alter table public.priests
add column if not exists diocese text;

-- Add visa_number column
alter table public.priests
add column if not exists visa_number text;

-- Add visa_category column
alter table public.priests
add column if not exists visa_category text;

-- Add visa_expiry_date column
alter table public.priests
add column if not exists visa_expiry_date date;

-- Add passport_number column
alter table public.priests
add column if not exists passport_number text;

