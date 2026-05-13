-- ============================================================
-- Finans v2: hesap türleri genişletme, iç transfer (nakit→banka)
-- ÖNCE: finance_accounts_extension.sql çalışmış olmalı.
-- ============================================================

ALTER TABLE finance_accounts DROP CONSTRAINT IF EXISTS finance_accounts_kind_check;

ALTER TABLE finance_accounts
  ADD CONSTRAINT finance_accounts_kind_check
  CHECK (kind IN (
    'cash_register',
    'bank',
    'online_gateway',
    'pos_clearing',
    'receivable',
    'installment_ledger',
    'petty_cash',
    'other'
  ));

UPDATE finance_accounts SET kind = 'online_gateway' WHERE kind = 'bank';

CREATE TABLE IF NOT EXISTS finance_internal_transfers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  to_account_id   UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_internal_transfers_different_accounts
    CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_internal_transfers_company
  ON finance_internal_transfers (company_id, created_at DESC);

COMMENT ON TABLE finance_internal_transfers IS 'Kasadan bankaya virman vb.; gider değil, sadece hesaplar arası';
COMMENT ON COLUMN finance_accounts.kind IS 'online_gateway=portal/EFT tahsil; petty_cash=tenzile; cash_register= fiziki kasa';

ALTER TABLE finance_internal_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_transfers_select_admin" ON finance_internal_transfers;
CREATE POLICY "finance_transfers_select_admin"
  ON finance_internal_transfers FOR SELECT TO authenticated
  USING (
    company_id = get_user_company_id()
    AND is_company_finance_admin()
  );

DROP POLICY IF EXISTS "finance_transfers_insert_admin" ON finance_internal_transfers;
CREATE POLICY "finance_transfers_insert_admin"
  ON finance_internal_transfers FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND is_company_finance_admin()
  );

DROP POLICY IF EXISTS "finance_transfers_delete_admin" ON finance_internal_transfers;
CREATE POLICY "finance_transfers_delete_admin"
  ON finance_internal_transfers FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND is_company_finance_admin());
