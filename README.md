# Priest Finance App

Simple financial management portal for priests with admin + priest roles, built with:

- Next.js (pages router)
- React
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Basic i18n (English / German)

## Getting started

1. Create a Supabase project.
2. Open `supabase/migrations.sql` in the Supabase SQL editor and run it.
3. Copy `.env.local.example` to `.env.local` and fill in values from Supabase.
4. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   ```

5. Run dev server:

   ```bash
   npm run dev
   ```

Visit http://localhost:3000.

## Notes

- RLS is enabled on all tables; review `supabase/migrations.sql`.
- This scaffold is a starting point; you should review security, UI, error handling and logging before production.
