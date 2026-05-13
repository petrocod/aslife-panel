CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('subscription','sms_package','whatsapp_package','user_package')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  iyzico_token TEXT,
  iyzico_payment_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view own transactions"
  ON public.payment_transactions FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Service role can manage transactions"
  ON public.payment_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_payment_transactions_company ON public.payment_transactions(company_id);
CREATE INDEX idx_payment_transactions_token ON public.payment_transactions(iyzico_token);
