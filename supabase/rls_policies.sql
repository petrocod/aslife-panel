-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Users can ONLY see data belonging to their own company
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: Get current user's company_id
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE companies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_services       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_fields         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_field_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leaves        ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_packages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_audiences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings               ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMPANIES TABLE POLICIES
-- ============================================================
-- Users can only view their own company
CREATE POLICY "companies_select_own"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

-- Users can update their own company
CREATE POLICY "companies_update_own"
  ON companies FOR UPDATE
  USING (id = get_user_company_id())
  WITH CHECK (id = get_user_company_id());

-- ============================================================
-- PROFILES TABLE POLICIES
-- ============================================================
-- Users can view profiles in their company
CREATE POLICY "profiles_select_company"
  ON profiles FOR SELECT
  USING (company_id = get_user_company_id());

-- Own row always visible (company_id NULL iken üstteki politika satırı gizler)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service: new users can insert their own profile (via trigger)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================
CREATE POLICY "employees_company_select"
  ON employees FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "employees_company_insert"
  ON employees FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "employees_company_update"
  ON employees FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "employees_company_delete"
  ON employees FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- SERVICE LOCATIONS TABLE POLICIES
-- ============================================================
CREATE POLICY "service_locations_company_select"
  ON service_locations FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "service_locations_company_insert"
  ON service_locations FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "service_locations_company_update"
  ON service_locations FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "service_locations_company_delete"
  ON service_locations FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- EMPLOYEE LOCATIONS TABLE POLICIES
-- ============================================================
CREATE POLICY "employee_locations_company_select"
  ON employee_locations FOR SELECT
  USING (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_user_company_id())
  );

CREATE POLICY "employee_locations_company_insert"
  ON employee_locations FOR INSERT
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_user_company_id())
  );

CREATE POLICY "employee_locations_company_delete"
  ON employee_locations FOR DELETE
  USING (
    employee_id IN (SELECT id FROM employees WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- SERVICES TABLE POLICIES
-- ============================================================
CREATE POLICY "services_company_select"
  ON services FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "services_company_insert"
  ON services FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "services_company_update"
  ON services FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "services_company_delete"
  ON services FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- PACKAGES TABLE POLICIES
-- ============================================================
CREATE POLICY "packages_company_select"
  ON packages FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "packages_company_insert"
  ON packages FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "packages_company_update"
  ON packages FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "packages_company_delete"
  ON packages FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- PACKAGE SERVICES TABLE POLICIES
-- ============================================================
CREATE POLICY "package_services_company_select"
  ON package_services FOR SELECT
  USING (
    package_id IN (SELECT id FROM packages WHERE company_id = get_user_company_id())
  );

CREATE POLICY "package_services_company_insert"
  ON package_services FOR INSERT
  WITH CHECK (
    package_id IN (SELECT id FROM packages WHERE company_id = get_user_company_id())
  );

CREATE POLICY "package_services_company_delete"
  ON package_services FOR DELETE
  USING (
    package_id IN (SELECT id FROM packages WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- CUSTOMERS TABLE POLICIES
-- ============================================================
CREATE POLICY "customers_company_select"
  ON customers FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "customers_company_insert"
  ON customers FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "customers_company_update"
  ON customers FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "customers_company_delete"
  ON customers FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- DYNAMIC FIELDS TABLE POLICIES
-- ============================================================
CREATE POLICY "dynamic_fields_company_select"
  ON dynamic_fields FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "dynamic_fields_company_insert"
  ON dynamic_fields FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "dynamic_fields_company_update"
  ON dynamic_fields FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "dynamic_fields_company_delete"
  ON dynamic_fields FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- CUSTOMER FIELD VALUES TABLE POLICIES
-- ============================================================
CREATE POLICY "customer_field_values_company_select"
  ON customer_field_values FOR SELECT
  USING (
    customer_id IN (SELECT id FROM customers WHERE company_id = get_user_company_id())
  );

CREATE POLICY "customer_field_values_company_insert"
  ON customer_field_values FOR INSERT
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE company_id = get_user_company_id())
  );

CREATE POLICY "customer_field_values_company_update"
  ON customer_field_values FOR UPDATE
  USING (
    customer_id IN (SELECT id FROM customers WHERE company_id = get_user_company_id())
  );

CREATE POLICY "customer_field_values_company_delete"
  ON customer_field_values FOR DELETE
  USING (
    customer_id IN (SELECT id FROM customers WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================
CREATE POLICY "appointments_company_select"
  ON appointments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "appointments_company_insert"
  ON appointments FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "appointments_company_update"
  ON appointments FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "appointments_company_delete"
  ON appointments FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- CLASSES TABLE POLICIES
-- ============================================================
CREATE POLICY "classes_company_select"
  ON classes FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "classes_company_insert"
  ON classes FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "classes_company_update"
  ON classes FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "classes_company_delete"
  ON classes FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- CLASS CUSTOMERS TABLE POLICIES
-- ============================================================
CREATE POLICY "class_customers_company_select"
  ON class_customers FOR SELECT
  USING (
    class_id IN (SELECT id FROM classes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "class_customers_company_insert"
  ON class_customers FOR INSERT
  WITH CHECK (
    class_id IN (SELECT id FROM classes WHERE company_id = get_user_company_id())
  );

CREATE POLICY "class_customers_company_delete"
  ON class_customers FOR DELETE
  USING (
    class_id IN (SELECT id FROM classes WHERE company_id = get_user_company_id())
  );

-- ============================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================
CREATE POLICY "payments_company_select"
  ON payments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "payments_company_insert"
  ON payments FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "payments_company_update"
  ON payments FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "payments_company_delete"
  ON payments FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- WORKING HOURS TABLE POLICIES
-- ============================================================
CREATE POLICY "working_hours_company_select"
  ON working_hours FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "working_hours_company_insert"
  ON working_hours FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "working_hours_company_update"
  ON working_hours FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "working_hours_company_delete"
  ON working_hours FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- EMPLOYEE LEAVES TABLE POLICIES
-- ============================================================
CREATE POLICY "employee_leaves_company_select"
  ON employee_leaves FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "employee_leaves_company_insert"
  ON employee_leaves FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "employee_leaves_company_update"
  ON employee_leaves FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "employee_leaves_company_delete"
  ON employee_leaves FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- COMMISSION RULES TABLE POLICIES
-- ============================================================
CREATE POLICY "commission_rules_company_select"
  ON commission_rules FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "commission_rules_company_insert"
  ON commission_rules FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "commission_rules_company_update"
  ON commission_rules FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "commission_rules_company_delete"
  ON commission_rules FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- SMS PACKAGES TABLE POLICIES
-- ============================================================
CREATE POLICY "sms_packages_company_select"
  ON sms_packages FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "sms_packages_company_insert"
  ON sms_packages FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "sms_packages_company_update"
  ON sms_packages FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- TARGET AUDIENCES TABLE POLICIES
-- ============================================================
CREATE POLICY "target_audiences_company_select"
  ON target_audiences FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "target_audiences_company_insert"
  ON target_audiences FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "target_audiences_company_update"
  ON target_audiences FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "target_audiences_company_delete"
  ON target_audiences FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- CAMPAIGNS TABLE POLICIES
-- ============================================================
CREATE POLICY "campaigns_company_select"
  ON campaigns FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "campaigns_company_insert"
  ON campaigns FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "campaigns_company_update"
  ON campaigns FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "campaigns_company_delete"
  ON campaigns FOR DELETE
  USING (company_id = get_user_company_id());

-- ============================================================
-- SETTINGS TABLE POLICIES
-- ============================================================
CREATE POLICY "settings_company_select"
  ON settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "settings_company_insert"
  ON settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "settings_company_update"
  ON settings FOR UPDATE
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
