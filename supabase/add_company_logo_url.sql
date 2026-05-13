-- Logo yükleme (Next.js):
-- A) Önerilen: .env.local → SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role)
--    Uygulama /api/company-logo ile yükler; Storage RLS politikası zorunlu değildir.
-- B) Sadece tarayıcıdan yükleme: bucket + aşağıdaki RLS (bölüm 3) şart.
--
-- Bucket oluşturma: Storage → "+ New bucket" → ad: company-logos → Public: açık.
-- (Bölüm 2 SQL bazı projelerde yetki hatası verirse bucket'ı sadece Dashboard'dan oluşturun.)

-- ============================================================
-- 1) companies.logo_url sütunu
-- ============================================================
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================================
-- 2) Storage bucket (isteğe bağlı SQL; hata alırsanız Dashboard'dan oluşturun)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 3) Storage RLS politikaları (bunlar OLMADAN yükleme "new row violates rls" verir)
-- ============================================================
DROP POLICY IF EXISTS "company_logos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_auth_delete" ON storage.objects;

-- Herkes okuyabilsin (bucket public)
CREATE POLICY "company_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

-- Giriş yapmış kullanıcı yükleyebilsin
CREATE POLICY "company_logos_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "company_logos_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos');

CREATE POLICY "company_logos_auth_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos');
