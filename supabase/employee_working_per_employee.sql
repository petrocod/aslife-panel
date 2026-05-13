-- ━═════════════════════════════════════════════════════════════════
-- ZORUNLU: Bu dosyayı Supabase Dashboard → SQL Editor’da komple çalıştırın.
-- Aksi halde uygulama PGRST205 (tablo yok) verir; kişi bazlı saatler kaydedilmez.
-- Çalıştırdıktan sonra 10–20 sn bekleyin veya sayfayı yenileyin.
-- ━═════════════════════════════════════════════════════════════════
-- ساعات per کارمند: Haftalık = employee_working_hours، Tekrarlanmaz = employee_working_by_date

CREATE TABLE IF NOT EXISTS public.employee_working_hours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open       BOOLEAN NOT NULL DEFAULT TRUE,
  start_time    TIME NOT NULL DEFAULT '09:00',
  end_time      TIME NOT NULL DEFAULT '18:00',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_working_hours_emp_dow_key UNIQUE (employee_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_ewh_employee
  ON public.employee_working_hours (company_id, employee_id);

ALTER TABLE public.employee_working_hours DISABLE ROW LEVEL SECURITY;

-- فقط همان هفته (Tekrarlanmaz)
CREATE TABLE IF NOT EXISTS public.employee_working_by_date (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  is_open       BOOLEAN NOT NULL DEFAULT TRUE,
  start_time    TIME NOT NULL DEFAULT '09:00',
  end_time      TIME NOT NULL DEFAULT '18:00',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_working_by_date_emp_date_key UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_ewbd_week
  ON public.employee_working_by_date (company_id, employee_id, work_date);

ALTER TABLE public.employee_working_by_date DISABLE ROW LEVEL SECURITY;

-- PostgREST / API şema önbelleğini yenile (gerekirse)
NOTIFY pgrst, 'reload schema';
