-- ============================================================
-- Gider: 'Could not find the finance_account_id column ... schema cache'
-- Ödeme kaydedilirken Finans satırı için bu sütunlar gerekir.
--
-- ÖNCE: finance_transactions.sql çalışmış olmalı (tablo yoksa önce onu çalıştırın).
-- Bu dosya, finance_accounts_extension.sql ile AYNI sütun eklemelerini yapar;
-- tam modül (finance_accounts tablosu + RLS) için doğrudan
-- finance_accounts_extension.sql çalıştırmanız yeterlidir — tekrar etmeyin.
--
-- Sadece hızlı deneme: aşağıdaki blok yeterli DEĞİLSE tüm finance_accounts_extension.sql'i çalıştırın.
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

-- RLS policy'ler için finance_accounts_extension.sql dosyasının geri kalanını da çalıştırın.
