-- Optional: run in Supabase SQL Editor if hosted DB lacks this column (see schema.sql).
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';
