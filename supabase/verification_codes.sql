CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.verification_codes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_verification_codes_phone ON public.verification_codes(phone, verified);
CREATE INDEX idx_verification_codes_expires ON public.verification_codes(expires_at);
