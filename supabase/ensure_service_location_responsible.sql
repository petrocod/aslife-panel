-- Sorumlu kişi alanı: Ayarlar > Hizmet yerleri formları
-- (Opsiyonel) Supabase SQL Editor’da bir kez çalıştırın.

ALTER TABLE public.service_locations
  ADD COLUMN IF NOT EXISTS responsible_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
