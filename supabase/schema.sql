-- ============================================================
-- Beeasist - Supabase Schema (Clean Version)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------
-- 1. COMPANIES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL DEFAULT 'Şirketim',
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  location     TEXT,
  authorized   TEXT,
  founded_at   DATE,
  website      TEXT,
  tc_no        TEXT,
  tax_number   TEXT,
  tax_office   TEXT,
  invoice_address TEXT,
  currency     TEXT NOT NULL DEFAULT 'TRY',
  service_type TEXT DEFAULT 'Sağlık Merkezi',
  language     TEXT NOT NULL DEFAULT 'tr',
  timezone     TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 2. PROFILES (linked to Supabase Auth)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  phone       TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'owner',
  language    TEXT DEFAULT 'tr',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 3. SERVICE LOCATIONS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS service_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 4. EMPLOYEES (no circular dep - location/service via separate tables)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  phone                 TEXT NOT NULL DEFAULT '',
  email                 TEXT NOT NULL DEFAULT '',
  birth_date            DATE,
  gender                TEXT,
  language              TEXT DEFAULT 'tr',
  start_date            DATE,
  location_id           UUID REFERENCES service_locations(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','passive')),
  color                 TEXT NOT NULL DEFAULT '#3b82f6',
  sms_notification      BOOLEAN DEFAULT TRUE,
  email_notification    BOOLEAN DEFAULT TRUE,
  whatsapp_notification BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 5. SERVICES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- ------------------------------------------------
-- 6. PACKAGES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- ------------------------------------------------
-- 7. CUSTOMERS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- ------------------------------------------------
-- 8. DYNAMIC FIELDS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS dynamic_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text',
  options     TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_field_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  field_id    UUID NOT NULL REFERENCES dynamic_fields(id) ON DELETE CASCADE,
  value       TEXT,
  UNIQUE(customer_id, field_id)
);

-- ------------------------------------------------
-- 9. APPOINTMENTS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id      UUID REFERENCES service_locations(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  price            NUMERIC(10,2),
  discount         NUMERIC(10,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'approved',
  recurrence       TEXT DEFAULT 'none',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 10. PAYMENTS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  method         TEXT DEFAULT 'cash',
  paid_at        TIMESTAMPTZ DEFAULT NOW(),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 11. WORKING HOURS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS working_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open     BOOLEAN NOT NULL DEFAULT TRUE,
  start_time  TIME NOT NULL DEFAULT '09:00',
  end_time    TIME NOT NULL DEFAULT '18:00'
);

-- ------------------------------------------------
-- 12. EMPLOYEE LEAVES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_leaves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  start_time  TIME DEFAULT '09:00',
  end_time    TIME DEFAULT '18:00',
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 13. COMMISSION RULES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS commission_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  service_id  UUID REFERENCES services(id) ON DELETE CASCADE,
  scope       TEXT NOT NULL DEFAULT 'service',
  rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 14. SMS PACKAGES
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_packages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  total_sms    INT NOT NULL DEFAULT 0,
  used_sms     INT NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 15. MARKETING
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS target_audiences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filters     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_audience_id UUID REFERENCES target_audiences(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  start_date         DATE,
  end_date           DATE,
  sms_content        TEXT,
  whatsapp_content   TEXT,
  status             TEXT DEFAULT 'draft',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------
-- 16. SETTINGS
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  appointment_reminder     TEXT DEFAULT '1 Gün',
  payment_reminder         TEXT DEFAULT '2 Gün',
  sms_threshold            INT DEFAULT 80,
  sms_reminder_enabled     BOOLEAN DEFAULT TRUE,
  notification_masking     BOOLEAN DEFAULT FALSE,
  attendance_mode          TEXT DEFAULT 'manual',
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- HELPER FUNCTION: get current user's company_id
-- ================================================
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ================================================
-- TRIGGER: Auto-create company + profile on signup
-- ================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
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

  -- Default working hours (Mon-Sat open, Sun closed)
  INSERT INTO working_hours (company_id, day_of_week, is_open, start_time, end_time)
  SELECT new_company_id, d, d < 6, '09:00', '18:00'
  FROM generate_series(0, 6) AS d;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================
-- UPDATED_AT TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'companies','profiles','service_locations','employees',
    'services','packages','customers','appointments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated ON %1$s;
       CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();', tbl
    );
  END LOOP;
END;
$$;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on all tables
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_fields   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours    ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leaves  ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_packages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings         ENABLE ROW LEVEL SECURITY;

-- PROFILES: users can only see/edit their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- COMPANIES: only the company's members
CREATE POLICY "companies_all" ON companies FOR ALL USING (id = get_my_company_id());

-- Generic policy for all company-scoped tables
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'service_locations','employees','services','packages',
    'customers','dynamic_fields','appointments','payments',
    'working_hours','employee_leaves','commission_rules',
    'sms_packages','target_audiences','campaigns','settings'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "%1$s_all" ON %1$s FOR ALL
       USING (company_id = get_my_company_id())
       WITH CHECK (company_id = get_my_company_id());', tbl
    );
  END LOOP;
END;
$$;

-- package_services: join via packages
CREATE POLICY "package_services_all" ON package_services FOR ALL
  USING (package_id IN (SELECT id FROM packages WHERE company_id = get_my_company_id()));

-- customer_field_values: join via customers
CREATE POLICY "customer_field_values_all" ON customer_field_values FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE company_id = get_my_company_id()));
