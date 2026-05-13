-- ============================================================
-- Demo şirket (00000000-0000-0000-0000-000000000001) — randevu üst sınırı
-- JWT ile (otomatik veya kullanıcı) eklemeler için max 200 randevu.
-- service_role (demo-seed API) sınırdan muaf.
--
-- Önceki sürümde SMS/kampanya blokları vardı; güncellemede kaldırıldı —
-- daha önce uyguladıysanız aşağıdaki DROP satırları tetikleri temizler.
-- ============================================================

DROP TRIGGER IF EXISTS tr_demo_no_sms_packages ON public.sms_packages;
DROP TRIGGER IF EXISTS tr_demo_no_campaigns ON public.campaigns;
DROP TRIGGER IF EXISTS tr_demo_no_target_audiences ON public.target_audiences;
DROP FUNCTION IF EXISTS public.enforce_demo_no_sms_packages();
DROP FUNCTION IF EXISTS public.enforce_demo_no_campaigns();
DROP FUNCTION IF EXISTS public.enforce_demo_no_target_audiences();

CREATE OR REPLACE FUNCTION public.is_demo_service_request()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt()->>'role'), '') = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.enforce_demo_appointment_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  demo_id uuid := '00000000-0000-0000-0000-000000000001';
  n int;
BEGIN
  IF NEW.company_id IS DISTINCT FROM demo_id THEN
    RETURN NEW;
  END IF;
  IF public.is_demo_service_request() THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*)::int INTO n FROM public.appointments WHERE company_id = demo_id;
  IF n >= 200 THEN
    RAISE EXCEPTION 'Demo şirketinde en fazla 200 randevu ekleyebilirsiniz.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_demo_appointment_cap ON public.appointments;
CREATE TRIGGER tr_demo_appointment_cap
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_demo_appointment_cap();
