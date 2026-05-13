-- ============================================================
-- Abonelik planları + şirket aboneliği (yükseltilebilir yapı)
-- Supabase SQL Editor'da çalıştırın. get_user_company_id() tanımlı olmalı (rls_policies.sql).
-- ============================================================

-- Plan kataloğu: max_users = sahip (1) + eklenebilecek max çalışan sayısı toplamı
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name_tr TEXT NOT NULL,
  max_users INT NOT NULL CHECK (max_users >= 1),
  features JSONB NOT NULL DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  monthly_price_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'canceled', 'past_due')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON public.company_subscriptions(company_id);

-- Varsayılan planlar (plan-sec sayfası ile uyumlu kodlar)
INSERT INTO public.subscription_plans (id, name_tr, max_users, features, sort_order, monthly_price_hint)
VALUES
  (
    'asistan',
    'ASİSTAN (Tek kullanıcı)',
    1,
    '{"upgradeable_to":["asistan_plus","asistan_pro"],"sms_included":250,"company_profile":true}'::jsonb,
    1,
    '₺750,00'
  ),
  (
    'asistan_plus',
    'ASİSTAN +',
    3,
    '{"upgradeable_to":["asistan_pro"],"sms_included":750}'::jsonb,
    2,
    '₺1.500,00'
  ),
  (
    'asistan_pro',
    'ASİSTAN PRO',
    6,
    '{"upgradeable_to":[],"sms_included":1500}'::jsonb,
    3,
    '₺2.100,00'
  )
ON CONFLICT (id) DO UPDATE SET
  name_tr = EXCLUDED.name_tr,
  max_users = EXCLUDED.max_users,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  monthly_price_hint = EXCLUDED.monthly_price_hint;

-- Yeni şirket: tek kullanıcı planı + 14 gün deneme
CREATE OR REPLACE FUNCTION public.trg_assign_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_subscriptions (company_id, plan_id, status, trial_ends_at)
  VALUES (NEW.id, 'asistan', 'trialing', NOW() + INTERVAL '14 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_default_subscription ON public.companies;
CREATE TRIGGER assign_default_subscription
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_default_subscription();

-- Mevcut şirketler (aboneliği olmayan)
INSERT INTO public.company_subscriptions (company_id, plan_id, status, trial_ends_at)
SELECT c.id, 'asistan', 'trialing', NOW() + INTERVAL '14 days'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_subscriptions s WHERE s.company_id = c.id
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "company_subscriptions_select_own" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_select_own"
  ON public.company_subscriptions FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());
