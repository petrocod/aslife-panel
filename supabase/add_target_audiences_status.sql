-- target_audiences yoksa önce oluştur
CREATE TABLE IF NOT EXISTS public.target_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- target_audiences için durum alanı (draft / active)
ALTER TABLE public.target_audiences
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'target_audiences_status_check'
  ) THEN
    ALTER TABLE public.target_audiences
    ADD CONSTRAINT target_audiences_status_check
    CHECK (status IN ('draft', 'active'));
  END IF;
END $$;
