-- Platform enhancements: feature flags, customer comm log, profile permissions, SLA, portal token

-- ── Feature flags (defaults OFF) ─────────────────────────────────────────────
INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('online_randevu', FALSE, 'Online randevu menüsü ve sayfaları'),
  ('siniflar_module', FALSE, 'Sınıflar (grup dersleri) modülü'),
  ('public_self_serve_trial', FALSE, 'Yeni kayıtlarda 14 günlük deneme (super_admin açar)')
ON CONFLICT (key) DO NOTHING;

-- ── Customer portal token ────────────────────────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_customers_portal_token ON public.customers(portal_token)
  WHERE portal_token IS NOT NULL;

-- ── Customer communication log (all channels) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_communication_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  message_body  TEXT NOT NULL,
  template_key  TEXT,
  status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_comm_company ON public.customer_communication_log(company_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_comm_customer ON public.customer_communication_log(customer_id, sent_at DESC);

ALTER TABLE public.customer_communication_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_comm_company_select" ON public.customer_communication_log;
CREATE POLICY "customer_comm_company_select" ON public.customer_communication_log
  FOR SELECT USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "customer_comm_company_insert" ON public.customer_communication_log;
CREATE POLICY "customer_comm_company_insert" ON public.customer_communication_log
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "customer_comm_service_role" ON public.customer_communication_log;
CREATE POLICY "customer_comm_service_role" ON public.customer_communication_log
  FOR ALL USING (true) WITH CHECK (true);

-- ── Profile feature permissions (JSON map) ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feature_permissions JSONB DEFAULT NULL;

-- ── Support ticket SLA ─────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

-- Backfill SLA for open tickets (24h from creation)
UPDATE public.support_tickets
SET sla_due_at = created_at + INTERVAL '24 hours'
WHERE sla_due_at IS NULL AND status IN ('open', 'in_progress');

-- ── Signup: no auto-trial unless flag enabled ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_public_trial_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.feature_flags WHERE key = 'public_self_serve_trial' LIMIT 1),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  new_company_id UUID;
  user_name TEXT;
  trial_on BOOLEAN;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Şirketim');
  trial_on := public.is_public_trial_enabled();

  INSERT INTO public.organizations (name, owner_email)
  VALUES (user_name, NEW.email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.companies (name, organization_id)
  VALUES (user_name, new_org_id)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, organization_id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    new_company_id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'owner'
  );

  INSERT INTO public.organization_members (organization_id, user_id, role, status, accepted_at)
  VALUES (new_org_id, NEW.id, 'owner', 'active', NOW());

  INSERT INTO public.settings (company_id) VALUES (new_company_id);
  INSERT INTO public.working_hours (company_id, day_of_week, is_open, start_time, end_time)
  SELECT new_company_id, d, d < 6, '09:00', '18:00'
  FROM generate_series(0, 6) AS d;

  IF trial_on THEN
    INSERT INTO public.company_subscriptions (company_id, organization_id, plan_id, status, trial_ends_at)
    VALUES (new_company_id, new_org_id, 'asistan', 'trialing', NOW() + INTERVAL '14 days')
    ON CONFLICT (company_id) DO NOTHING;
  ELSE
    INSERT INTO public.company_subscriptions (company_id, organization_id, plan_id, status, trial_ends_at)
    VALUES (new_company_id, new_org_id, 'asistan', 'active', NULL)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
