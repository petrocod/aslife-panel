CREATE TABLE IF NOT EXISTS public.customer_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(5,1),
  height NUMERIC(5,1),
  waist NUMERIC(5,1),
  hip NUMERIC(5,1),
  chest NUMERIC(5,1),
  arm NUMERIC(5,1),
  thigh NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  bmi NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view measurements"
  ON public.customer_measurements FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company members can manage measurements"
  ON public.customer_measurements FOR ALL
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE INDEX idx_customer_measurements_customer ON public.customer_measurements(customer_id, measured_at DESC);
