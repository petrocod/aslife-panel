-- ============================================================
-- FIX: RLS hatası için bu kodu Supabase SQL Editor'da çalıştırın
-- https://supabase.com/dashboard/project/nhnecizqphvnqwvjrxqt/sql/new
-- ============================================================

-- Tüm tablolar için RLS'yi kapat
ALTER TABLE IF EXISTS companies          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_locations  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS packages           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS package_services   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings           DISABLE ROW LEVEL SECURITY;

-- Mevcut politikaları sil (varsa)
DROP POLICY IF EXISTS "Enable all for service_role" ON services;
DROP POLICY IF EXISTS "Enable all for service_role" ON customers;
DROP POLICY IF EXISTS "Enable all for service_role" ON appointments;
DROP POLICY IF EXISTS "Enable all for service_role" ON employees;
DROP POLICY IF EXISTS "Enable all for service_role" ON service_locations;
DROP POLICY IF EXISTS "Enable all for service_role" ON packages;
DROP POLICY IF EXISTS "Enable all for service_role" ON payments;

SELECT 'RLS disabled successfully' as status;
