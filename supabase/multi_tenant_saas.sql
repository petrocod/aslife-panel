-- ============================================================
-- Multi-Tenant SaaS Migration
-- Adds: organizations layer, admin system, enhanced subscriptions
-- Run in Supabase Dashboard > SQL Editor
-- ============================================================

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 0: Ensure prerequisite tables exist               ║
-- ╚══════════════════════════════════════════════════════════╝

-- subscription_plans must exist before we ALTER it in Phase 3
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name_tr TEXT NOT NULL DEFAULT '',
  max_users INT NOT NULL DEFAULT 1 CHECK (max_users >= 1),
  features JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  monthly_price_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans if empty
INSERT INTO public.subscription_plans (id, name_tr, max_users, features, sort_order, monthly_price_hint)
VALUES
  ('asistan',      'ASİSTAN (Tek kullanıcı)', 1, '{"upgradeable_to":["asistan_plus","asistan_pro"],"sms_included":250,"company_profile":true}'::jsonb, 1, '₺750,00'),
  ('asistan_plus', 'ASİSTAN +',               3, '{"upgradeable_to":["asistan_pro"],"sms_included":750}'::jsonb,                                       2, '₺1.500,00'),
  ('asistan_pro',  'ASİSTAN PRO',             6, '{"upgradeable_to":[],"sms_included":1500}'::jsonb,                                                   3, '₺2.100,00')
ON CONFLICT (id) DO NOTHING;

-- company_subscriptions must exist before we ALTER it
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'canceled', 'past_due')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  mrr NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

-- Helper function used in RLS policies
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO anon;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 1: Organizations (parent of companies)           ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE,
  owner_email  TEXT,
  logo_url     TEXT,
  billing_email TEXT,
  tax_number   TEXT,
  address      TEXT,
  phone        TEXT,
  website      TEXT,
  max_branches INT NOT NULL DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- Link companies to organizations (each company = a branch)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_organization ON public.companies(organization_id);

-- Link profiles to organizations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Organization member roles
CREATE TABLE IF NOT EXISTS public.organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','manager','member')),
  invited_by      UUID REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- Move subscriptions to organization level
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 2: Admin System                                  ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.admin_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'support_agent'
    CHECK (role IN ('super_admin','support_agent','sales')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  admin_email TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_log(target_type, target_id);

-- Feature flags (system-wide)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  updated_by  UUID REFERENCES public.admin_users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System health checks log
CREATE TABLE IF NOT EXISTS public.system_health_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('ok','warning','error')),
  details    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_log_created ON public.system_health_log(created_at DESC);

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 3: Enhanced Subscriptions                        ║
-- ╚══════════════════════════════════════════════════════════╝

-- Add pricing & limits to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_customers INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_appointments_per_month INT DEFAULT 500,
  ADD COLUMN IF NOT EXISTS max_employees INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_branches INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sms_included INT DEFAULT 250,
  ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_email_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_finance_module BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_api_access BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing plans with pricing
UPDATE public.subscription_plans SET
  monthly_price = 750, annual_price = 7500,
  max_customers = 100, max_appointments_per_month = 300,
  max_employees = 1, max_branches = 1,
  sms_included = 250, has_whatsapp = FALSE,
  has_finance_module = FALSE, has_api_access = FALSE
WHERE id = 'asistan';

UPDATE public.subscription_plans SET
  monthly_price = 1500, annual_price = 15000,
  max_customers = 500, max_appointments_per_month = 1000,
  max_employees = 3, max_branches = 1,
  sms_included = 750, has_whatsapp = TRUE,
  has_finance_module = TRUE, has_api_access = FALSE
WHERE id = 'asistan_plus';

UPDATE public.subscription_plans SET
  monthly_price = 2100, annual_price = 21000,
  max_customers = -1, max_appointments_per_month = -1,
  max_employees = 6, max_branches = 3,
  sms_included = 1500, has_whatsapp = TRUE,
  has_finance_module = TRUE, has_api_access = TRUE
WHERE id = 'asistan_pro';

-- Payment history for subscriptions
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id         TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'TRY',
  payment_method  TEXT,
  payment_ref     TEXT,
  period_start    TIMESTAMPTZ,
  period_end      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed','refunded','failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_org ON public.subscription_payments(organization_id);

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 4: Helper Functions                              ║
-- ╚══════════════════════════════════════════════════════════╝

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_active = TRUE
  );
$$;

-- Get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.admin_users
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$;

-- Get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 5: RLS Policies                                  ║
-- ╚══════════════════════════════════════════════════════════╝

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_member_select" ON public.organizations;
CREATE POLICY "org_member_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "org_owner_update" ON public.organizations;
CREATE POLICY "org_owner_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner','admin'))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "org_admin_insert" ON public.organizations;
CREATE POLICY "org_admin_insert" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR TRUE);

-- Organization members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM public.organization_members om WHERE om.user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "org_members_manage" ON public.organization_members;
CREATE POLICY "org_members_manage" ON public.organization_members
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner','admin')
    )
    OR public.is_admin()
  );

-- Admin tables: only admins
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_self" ON public.admin_users;
CREATE POLICY "admin_users_self" ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin_users_manage" ON public.admin_users;
CREATE POLICY "admin_users_manage" ON public.admin_users
  FOR ALL TO authenticated
  USING (public.get_admin_role() = 'super_admin');

DROP POLICY IF EXISTS "audit_log_admin" ON public.admin_audit_log;
CREATE POLICY "audit_log_admin" ON public.admin_audit_log
  FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "feature_flags_read" ON public.feature_flags;
CREATE POLICY "feature_flags_read" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "feature_flags_manage" ON public.feature_flags;
CREATE POLICY "feature_flags_manage" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.get_admin_role() = 'super_admin');

DROP POLICY IF EXISTS "health_log_admin" ON public.system_health_log;
CREATE POLICY "health_log_admin" ON public.system_health_log
  FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "sub_payments_admin" ON public.subscription_payments;
CREATE POLICY "sub_payments_admin" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR company_id = public.get_user_company_id()
    OR public.is_admin()
  );

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 6: Update signup trigger for organizations       ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  new_company_id UUID;
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Şirketim');

  -- Create organization
  INSERT INTO public.organizations (name, owner_email)
  VALUES (user_name, NEW.email)
  RETURNING id INTO new_org_id;

  -- Create company under organization
  INSERT INTO public.companies (name, organization_id)
  VALUES (user_name, new_org_id)
  RETURNING id INTO new_company_id;

  -- Create profile
  INSERT INTO public.profiles (id, company_id, organization_id, full_name, email, phone)
  VALUES (
    NEW.id,
    new_company_id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );

  -- Add as organization owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status, accepted_at)
  VALUES (new_org_id, NEW.id, 'owner', 'active', NOW());

  -- Default settings & working hours
  INSERT INTO public.settings (company_id) VALUES (new_company_id);
  INSERT INTO public.working_hours (company_id, day_of_week, is_open, start_time, end_time)
  SELECT new_company_id, d, d < 6, '09:00', '18:00'
  FROM generate_series(0, 6) AS d;

  -- Trial subscription at org level
  INSERT INTO public.company_subscriptions (company_id, organization_id, plan_id, status, trial_ends_at)
  VALUES (new_company_id, new_org_id, 'asistan', 'trialing', NOW() + INTERVAL '14 days')
  ON CONFLICT (company_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ╔══════════════════════════════════════════════════════════╗
-- ║  PHASE 7: Backfill organizations for existing companies ║
-- ╚══════════════════════════════════════════════════════════╝

-- Create organizations for existing companies that don't have one
DO $$
DECLARE
  r RECORD;
  new_org_id UUID;
BEGIN
  FOR r IN
    SELECT c.id AS company_id, c.name, p.id AS user_id, p.email
    FROM public.companies c
    LEFT JOIN public.profiles p ON p.company_id = c.id AND p.role = 'owner'
    WHERE c.organization_id IS NULL
  LOOP
    INSERT INTO public.organizations (name, owner_email)
    VALUES (r.name, r.email)
    RETURNING id INTO new_org_id;

    UPDATE public.companies SET organization_id = new_org_id WHERE id = r.company_id;
    UPDATE public.profiles SET organization_id = new_org_id WHERE company_id = r.company_id;

    IF r.user_id IS NOT NULL THEN
      INSERT INTO public.organization_members (organization_id, user_id, role, status, accepted_at)
      VALUES (new_org_id, r.user_id, 'owner', 'active', NOW())
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;

    UPDATE public.company_subscriptions SET organization_id = new_org_id WHERE company_id = r.company_id;
  END LOOP;
END;
$$;

-- ============================================================
-- Done. Refresh schema cache:
NOTIFY pgrst, 'reload schema';

-- ╔══════════════════════════════════════════════════════════╗
-- ║  STEP 8: Add yourself as super_admin                    ║
-- ╚══════════════════════════════════════════════════════════╝
-- 
-- Run this AFTER the migration above succeeds.
-- Replace 'YOUR_AUTH_USER_UUID' with your actual user id from
-- Supabase Dashboard > Authentication > Users
--
-- INSERT INTO public.admin_users (user_id, email, full_name, role)
-- VALUES (
--   'YOUR_AUTH_USER_UUID',
--   'your@email.com',
--   'Adam',
--   'super_admin'
-- );
