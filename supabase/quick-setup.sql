-- ============================================================
-- Beeasist - Quick Setup SQL (بدون RLS - برای تست سریع)
-- این فایل را در Supabase SQL Editor اجرا کنید:
-- https://supabase.com/dashboard/project/nhnecizqphvnqwvjrxqt/sql/new
-- ============================================================

-- 1. COMPANIES (اختیاری - برای auth کامل)
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL DEFAULT 'Şirketim',
  phone      TEXT,
  email      TEXT,
  address    TEXT,
  currency   TEXT NOT NULL DEFAULT 'TRY',
  language   TEXT NOT NULL DEFAULT 'tr',
  timezone   TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL DEFAULT '',
  phone      TEXT,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SERVICE LOCATIONS
CREATE TABLE IF NOT EXISTS service_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL DEFAULT '',
  email                 TEXT NOT NULL DEFAULT '',
  birth_date            DATE,
  gender                TEXT,
  language              TEXT DEFAULT 'tr',
  start_date            DATE,
  location_id           UUID REFERENCES service_locations(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'active',
  color                 TEXT NOT NULL DEFAULT '#3b82f6',
  sms_notification      BOOLEAN DEFAULT TRUE,
  email_notification    BOOLEAN DEFAULT TRUE,
  whatsapp_notification BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SERVICES
CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID REFERENCES companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  duration_hours   INT NOT NULL DEFAULT 1,
  duration_minutes INT NOT NULL DEFAULT 0,
  vat_rate         NUMERIC(5,2) NOT NULL DEFAULT 20,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  location_id      UUID REFERENCES service_locations(id) ON DELETE SET NULL,
  employee_id      UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PACKAGES
CREATE TABLE IF NOT EXISTS packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  usage_period TEXT DEFAULT 'none',
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id       UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sessions         INT NOT NULL DEFAULT 1,
  price            NUMERIC(10,2),
  duration_hours   INT,
  duration_minutes INT
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  phone            TEXT NOT NULL DEFAULT '',
  email            TEXT,
  birth_date       DATE,
  gender           TEXT,
  tc_no            TEXT,
  language         TEXT DEFAULT 'tr',
  city             TEXT,
  district         TEXT,
  address          TEXT,
  sms_consent      BOOLEAN DEFAULT TRUE,
  email_consent    BOOLEAN DEFAULT TRUE,
  whatsapp_consent BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id) ON DELETE CASCADE,
  service_id       UUID REFERENCES services(id) ON DELETE CASCADE,
  employee_id      UUID REFERENCES employees(id) ON DELETE CASCADE,
  location_id      UUID REFERENCES service_locations(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  price            NUMERIC(10,2),
  discount         NUMERIC(10,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'approved',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  method         TEXT DEFAULT 'cash',
  paid_at        TIMESTAMPTZ DEFAULT NOW(),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CUSTOMER PACKAGES (packages sold to customers)
CREATE TABLE IF NOT EXISTS customer_packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id   UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  start_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date     DATE,
  status       TEXT NOT NULL DEFAULT 'active',  -- active, completed, cancelled
  total_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid   NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10b. CUSTOMER CREDITS (credit sales to customers)
CREATE TABLE IF NOT EXISTS customer_credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  last_payment_date DATE,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid      NUMERIC(10,2) NOT NULL DEFAULT 0,
  credit_count    INT NOT NULL DEFAULT 1,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  discount_type   TEXT DEFAULT 'amount',  -- amount, percent
  status          TEXT NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits  DISABLE ROW LEVEL SECURITY;

-- 11. WORKING HOURS
CREATE TABLE IF NOT EXISTS working_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun,1=Mon,...6=Sat
  is_open      BOOLEAN NOT NULL DEFAULT TRUE,
  start_time   TIME NOT NULL DEFAULT '09:00',
  end_time     TIME NOT NULL DEFAULT '18:00',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, day_of_week)
);

-- Default working hours for DEMO company
INSERT INTO working_hours (company_id, day_of_week, is_open, start_time, end_time) VALUES
  ('00000000-0000-0000-0000-000000000001', 0, FALSE, '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 1, TRUE,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 2, TRUE,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 3, TRUE,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 4, TRUE,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 5, TRUE,  '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 6, FALSE, '09:00', '18:00')
ON CONFLICT (company_id, day_of_week) DO NOTHING;

-- 11. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  appointment_reminder TEXT DEFAULT '1 Gün',
  payment_reminder     TEXT DEFAULT '2 Gün',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS غیرفعال (برای تست - در production فعال کنید)
-- ============================================================
ALTER TABLE companies         DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees         DISABLE ROW LEVEL SECURITY;
ALTER TABLE services          DISABLE ROW LEVEL SECURITY;
ALTER TABLE packages          DISABLE ROW LEVEL SECURITY;
ALTER TABLE package_services  DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers         DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments          DISABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours     DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings          DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- یک شرکت پیش‌فرض برای تست ایجاد می‌کنیم
-- ============================================================
INSERT INTO companies (id, name, phone, currency)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Şirket',
  '05001234567',
  'TRY'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- trigger: auto-create company+profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE new_company_id UUID;
BEGIN
  INSERT INTO companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Şirketim'))
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, full_name, email)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO settings (company_id) VALUES (new_company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
