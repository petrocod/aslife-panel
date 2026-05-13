-- ============================================================
-- ماژول مالی: finance_transactions + RLS
-- در Supabase SQL Editor اجرا کنید (قبل/بعد از rls_policies بدون تداخل).
-- company_id برای چندمؤجره‌ای و هم‌تراز با بقیه جداول است.
-- ============================================================

-- تابع موردنیاز RLS؛ اگر از قبل در پروژه دارید، REPLACE می‌شود (مثل rls_policies.sql)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

DO $$ BEGIN
  CREATE TYPE finance_transaction_type AS ENUM ('income', 'expense');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS finance_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type           finance_transaction_type NOT NULL,
  category       TEXT NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  description    TEXT,
  reference_id   UUID,
  payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'pos', 'online'))
);

CREATE INDEX IF NOT EXISTS idx_finance_tx_company_created
  ON finance_transactions (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_tx_company_type
  ON finance_transactions (company_id, type);

COMMENT ON TABLE finance_transactions IS 'درآمد/هزینه ثبت‌شده؛ reference_id اختیاری (مثلاً appointments.id یا customer_packages.id)';

-- فقط مالک/مدیر به گزارش و هزینه دسترسی کامل دارند؛ کارمندان فقط می‌توانند ردیف درآمد ثبت کنند (مثلاً پس از پرداخت).
CREATE OR REPLACE FUNCTION is_company_finance_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role::text FROM profiles WHERE id = auth.uid()),
    ''
  ) IN ('owner', 'manager');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_tx_select_admin" ON finance_transactions;
CREATE POLICY "finance_tx_select_admin"
  ON finance_transactions FOR SELECT TO authenticated
  USING (
    company_id = get_user_company_id()
    AND is_company_finance_admin()
  );

DROP POLICY IF EXISTS "finance_tx_insert_income_company" ON finance_transactions;
CREATE POLICY "finance_tx_insert_income_company"
  ON finance_transactions FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND type = 'income'::finance_transaction_type
  );

DROP POLICY IF EXISTS "finance_tx_insert_expense_admin" ON finance_transactions;
CREATE POLICY "finance_tx_insert_expense_admin"
  ON finance_transactions FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND type = 'expense'::finance_transaction_type
    AND is_company_finance_admin()
  );

DROP POLICY IF EXISTS "finance_tx_update_admin" ON finance_transactions;
CREATE POLICY "finance_tx_update_admin"
  ON finance_transactions FOR UPDATE TO authenticated
  USING (
    company_id = get_user_company_id()
    AND is_company_finance_admin()
  )
  WITH CHECK (
    company_id = get_user_company_id()
    AND is_company_finance_admin()
  );

DROP POLICY IF EXISTS "finance_tx_delete_admin" ON finance_transactions;
CREATE POLICY "finance_tx_delete_admin"
  ON finance_transactions FOR DELETE TO authenticated
  USING (
    company_id = get_user_company_id()
    AND is_company_finance_admin()
  );
