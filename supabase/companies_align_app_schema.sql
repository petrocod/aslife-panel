-- ============================================================
-- companies tablosunu uygulama + supabase/schema.sql ile hizala
-- Supabase SQL Editor'da bir kez çalıştırın (güvenli: IF NOT EXISTS)
-- ============================================================

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS authorized TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS founded_at DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tc_no TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tax_office TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS invoice_address TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'Sağlık Merkezi';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- quick-setup'ta zaten olabilir; yine de:
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT;
