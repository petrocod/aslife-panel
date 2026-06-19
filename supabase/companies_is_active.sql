-- Opsiyonel: companies.is_active (admin panel durum sütunu)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

NOTIFY pgrst, 'reload schema';
