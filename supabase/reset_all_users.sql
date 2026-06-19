-- ============================================================
-- SIFIRLAMA: Tüm kullanıcılar ve tenant verisi (DIKKAT!)
-- Supabase Dashboard > SQL Editor
--
-- Sonra:
-- 1) Authentication > Users > Add user (super admin e-posta/şifre)
-- 2) Aşağıdaki STEP 2 SQL ile super_admin ekleyin
-- ============================================================

-- STEP 0: Önizleme (isteğe bağlı)
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- STEP 1: Tüm kullanıcı verisini sil
DO $$
DECLARE
  r RECORD;
BEGIN
  DELETE FROM public.admin_audit_log;
  DELETE FROM public.admin_users;
  DELETE FROM public.organization_members;
  DELETE FROM public.verification_codes;

  -- Profil ve auth kullanıcıları
  FOR r IN SELECT id FROM auth.users LOOP
    DELETE FROM public.profiles WHERE id = r.id;
    DELETE FROM auth.users WHERE id = r.id;
  END LOOP;

  -- Abonelik ve şirket ayarları
  DELETE FROM public.company_subscriptions;
  DELETE FROM public.working_hours;
  DELETE FROM public.settings;

  -- Şirket / organizasyon (iş verisi — randevu vb. CASCADE ile silinir)
  DELETE FROM public.companies;
  DELETE FROM public.organizations;

  RAISE NOTICE 'Tüm kullanıcılar ve tenant kayıtları silindi.';
END;
$$;

-- STEP 2: Super admin (Authentication > Users'dan UUID kopyalayın)
/*
INSERT INTO public.admin_users (user_id, email, full_name, role, is_active)
VALUES (
  'BURAYA-AUTH-USER-UUID',
  'admin@asixtan.com',
  'Super Admin',
  'super_admin',
  true
);
*/

NOTIFY pgrst, 'reload schema';
