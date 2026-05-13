-- Notification Templates: controls which auto-SMS templates are active per company
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  custom_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, template_key)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nt_company_access" ON public.notification_templates
  FOR ALL USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Seed default templates for existing companies
INSERT INTO public.notification_templates (company_id, template_key, is_active)
SELECT c.id, t.key, false
FROM public.companies c
CROSS JOIN (VALUES
  ('new_customer'),
  ('appointment_created'),
  ('appointment_cancelled'),
  ('appointment_updated'),
  ('appointment_reminder'),
  ('appointment_attendance'),
  ('credit_used'),
  ('credit_expiry'),
  ('package_used'),
  ('package_expiry'),
  ('payment_reminder')
) AS t(key)
ON CONFLICT (company_id, template_key) DO NOTHING;

-- Google Calendar CID column in settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS google_calendar_cid TEXT;

NOTIFY pgrst, 'reload schema';
