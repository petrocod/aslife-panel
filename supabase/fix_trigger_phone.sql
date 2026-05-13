-- Fix: Update handle_new_user trigger to also store phone and create default subscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Şirketim'))
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, full_name, email, phone)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );

  INSERT INTO settings (company_id) VALUES (new_company_id);

  INSERT INTO working_hours (company_id, day_of_week, is_open, start_time, end_time)
  SELECT new_company_id, d, d BETWEEN 1 AND 5, '09:00', '18:00'
  FROM generate_series(0, 6) AS d
  ON CONFLICT DO NOTHING;

  -- Create trial subscription
  INSERT INTO company_subscriptions (company_id, plan_id, status, trial_ends_at)
  VALUES (
    new_company_id,
    'asistan',
    'trialing',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (company_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure company_subscriptions table exists
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'asistan',
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company subscription"
  ON public.company_subscriptions FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
