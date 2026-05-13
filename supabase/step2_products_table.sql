-- STEP 2: Create products table
-- Run this AFTER step1

CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  barcode      TEXT,
  category     TEXT DEFAULT 'genel',
  brand        TEXT,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_price   NUMERIC(10,2) DEFAULT 0,
  vat_rate     NUMERIC(5,2) DEFAULT 20,
  stock        INT NOT NULL DEFAULT 0,
  min_stock    INT DEFAULT 5,
  unit         TEXT DEFAULT 'adet',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
