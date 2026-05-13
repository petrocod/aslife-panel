-- Yetkili kişi alanı (uygulama companies.authorized bekler)
-- Supabase SQL Editor'da bir kez çalıştırın.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS authorized TEXT;
