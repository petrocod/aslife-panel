-- ============================================================
-- Architecture V2: RLS Fix + Feature Flags + Event Log
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 1: Fix RLS on unprotected tables                 ║
-- ╚══════════════════════════════════════════════════════════╝

-- 1a) employee_working_hours
ALTER TABLE public.employee_working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ewh_company_access" ON public.employee_working_hours;
CREATE POLICY "ewh_company_access" ON public.employee_working_hours
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 1b) employee_working_by_date
ALTER TABLE public.employee_working_by_date ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ewbd_company_access" ON public.employee_working_by_date;
CREATE POLICY "ewbd_company_access" ON public.employee_working_by_date
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 1c) customer_packages
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp_company_access" ON public.customer_packages;
CREATE POLICY "cp_company_access" ON public.customer_packages
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 1d) customer_credits
ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cc_company_access" ON public.customer_credits;
CREATE POLICY "cc_company_access" ON public.customer_credits
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 2: Feature Flag (has_accounting_module)          ║
-- ╚══════════════════════════════════════════════════════════╝

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS has_accounting_module BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.settings.has_accounting_module IS
  'When FALSE, accounting UI and recording are disabled (Null Object Pattern applies).';

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 3: Business Event Log                            ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.business_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_be_company_type
  ON public.business_events (company_id, event_type, created_at DESC);

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "be_company_access" ON public.business_events;
CREATE POLICY "be_company_access" ON public.business_events
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- Done. Refresh schema cache:
NOTIFY pgrst, 'reload schema';
