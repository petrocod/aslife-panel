-- STEP 3: Create product_sales and product_sale_items
-- Run this AFTER step2

CREATE TABLE IF NOT EXISTS product_sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  employee_id    UUID REFERENCES employees(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  notes          TEXT,
  sold_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES product_sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10,2) NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL
);

ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;
