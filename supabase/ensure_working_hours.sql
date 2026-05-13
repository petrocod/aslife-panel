-- اجرا در: Supabase Dashboard → SQL Editor
-- اگر companies از قبل ندارید، ابتدا schema.sql کامل یا quick-setup.sql را اجرا کرده‌اید.

-- جدول ساعات کاری (روز 0=یکشنبه … 6=شنبه)
CREATE TABLE IF NOT EXISTS public.working_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open      BOOLEAN NOT NULL DEFAULT TRUE,
  start_time   TIME NOT NULL DEFAULT '09:00',
  end_time     TIME NOT NULL DEFAULT '18:00',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- یک ردیف به ازای هر (شرکت + روز هفته)
CREATE UNIQUE INDEX IF NOT EXISTS working_hours_company_id_day_of_week_key
  ON public.working_hours (company_id, day_of_week);

-- برای تست با کلاینت supabaseData (سرویس): اجازهٔ خواندن/نوشتن
ALTER TABLE public.working_hours DISABLE ROW LEVEL SECURITY;

-- اگر RLS فعال می‌کنید، به‌جای DISABLE بالا، این policy را اضافه کنید (مثال):
-- ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "dev_all_working_hours" ON public.working_hours FOR ALL USING (true) WITH CHECK (true);

-- بارگذاری داده نمونه برای شناسه دمو (باید companies با این id وجود داشته باشد)
INSERT INTO public.working_hours (company_id, day_of_week, is_open, start_time, end_time) VALUES
  ('00000000-0000-0000-0000-000000000001', 0, false, '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 1, true,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 2, true,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 3, true,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 4, true,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 5, true,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 6, false, '09:00', '18:00')
ON CONFLICT (company_id, day_of_week) DO NOTHING;
