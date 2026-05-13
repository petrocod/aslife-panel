-- ━═════════════════════════════════════════════════════════════════
-- ZORUNLU: Supabase → SQL Editor’da bu dosyanın tamamını çalıştırın.
-- Aksi halde Primler kaydı PGRST205 verir (commission_rules tablosu yok).
-- ━═════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  service_id  UUID REFERENCES public.services(id) ON DELETE CASCADE,
  scope       TEXT NOT NULL DEFAULT 'service',
  rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_company
  ON public.commission_rules (company_id);

ALTER TABLE public.commission_rules DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
