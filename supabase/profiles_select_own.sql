-- ============================================================
-- profiles: kullanıcı kendi satırını her zaman okuyabilsin
-- (company_id NULL iken "profiles_select_company" satırı gizliyordu)
-- Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());
