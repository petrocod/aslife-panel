-- ============================================================
-- Hesaplar (kasa / banka / POS / alacak) + finance_transactions genişletmesi
-- ÖNCE: finance_transactions.sql çalışmış olmalı.
-- Supabase SQL Editor’da tek seferde çalıştırın.
--
-- UI’da "Could not find the 'finance_account_id' column of 'finance_transactions'"
-- hatası alıyorsanız bu dosya (veya fix_finance_account_id_error.sql + alttaki RLS) eksiktir.
--
-- Tabloyu ESKİ sürümle oluşturduysanız ve varsayılan hesaplar eklenmiyorsa (Manuel gider:
-- "Kaynak hesap seçin" + boş liste): finance_v2_refine.sql ile kind CHECK genişletilir;
-- ayrıca iç virman tablosu için de aynı dosyayı çalıştırın.
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'cash_register',
    'bank',
    'online_gateway',
    'pos_clearing',
    'receivable',
    'installment_ledger',
    'petty_cash',
    'other'
  )),
  maps_payment_method TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT finance_accounts_maps_pm_chk
    CHECK (maps_payment_method IS NULL OR maps_payment_method IN ('cash', 'pos', 'online'))
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_accounts_company_pm_unique
  ON finance_accounts (company_id, maps_payment_method)
  WHERE maps_payment_method IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_accounts_company ON finance_accounts (company_id);

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS finance_account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL;

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS settlement_flow TEXT;

UPDATE finance_transactions
SET settlement_flow = COALESCE(settlement_flow, 'settled')
WHERE settlement_flow IS NULL;

ALTER TABLE finance_transactions
  ALTER COLUMN settlement_flow SET DEFAULT 'settled';

ALTER TABLE finance_transactions
  ALTER COLUMN settlement_flow SET NOT NULL;

ALTER TABLE finance_transactions DROP CONSTRAINT IF EXISTS finance_transactions_settlement_flow_chk;

ALTER TABLE finance_transactions
  ADD CONSTRAINT finance_transactions_settlement_flow_chk
  CHECK (settlement_flow IN ('settled', 'receivable', 'installment'));

COMMENT ON TABLE finance_accounts IS 'Tahsilat hedefi: nakit kasa, banka, POS mutabakat, müşteri alacağı vb.';
COMMENT ON COLUMN finance_accounts.maps_payment_method IS 'Randevu Ödeme şekli eşlemesi: nakit→cash, kart→pos, havale→online (şirket başına en fazla bir satır).';
COMMENT ON COLUMN finance_transactions.settlement_flow IS 'settled=tahsil; receivable=vadesiz alacak; installment=taksit planı / kısmi ödeme bağlamı';

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_accounts_select_company" ON finance_accounts;
CREATE POLICY "finance_accounts_select_company"
  ON finance_accounts FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "finance_accounts_insert_admin" ON finance_accounts;
CREATE POLICY "finance_accounts_insert_admin"
  ON finance_accounts FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id() AND is_company_finance_admin());

DROP POLICY IF EXISTS "finance_accounts_update_admin" ON finance_accounts;
CREATE POLICY "finance_accounts_update_admin"
  ON finance_accounts FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id() AND is_company_finance_admin())
  WITH CHECK (company_id = get_user_company_id() AND is_company_finance_admin());

DROP POLICY IF EXISTS "finance_accounts_delete_admin" ON finance_accounts;
CREATE POLICY "finance_accounts_delete_admin"
  ON finance_accounts FOR DELETE TO authenticated
  USING (company_id = get_user_company_id() AND is_company_finance_admin());
