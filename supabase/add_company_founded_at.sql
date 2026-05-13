-- Kuruluş tarihi (companies.founded_at)
-- Supabase SQL Editor'da bir kez çalıştırın.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS founded_at DATE;
