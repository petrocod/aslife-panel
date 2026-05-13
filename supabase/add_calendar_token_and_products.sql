-- ============================================================
-- PART 1: Calendar Tokens
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS calendar_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS calendar_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

UPDATE employees SET calendar_token = gen_random_uuid()::text WHERE calendar_token IS NULL;
UPDATE customers SET calendar_token = gen_random_uuid()::text WHERE calendar_token IS NULL;


-- ============================================================
-- PART 2: Products table
-- ============================================================

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


-- ============================================================
-- PART 3: Product sales table
-- ============================================================

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

ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 4: Product sale items table
-- ============================================================

CREATE TABLE IF NOT EXISTS product_sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES product_sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(10,2) NOT NULL,
  total_price     NUMERIC(10,2) NOT NULL
);

ALTER TABLE product_sale_items ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PART 5: Demo seed data
-- ============================================================

INSERT INTO products (id, company_id, name, category, brand, price, cost_price, stock, min_stock)
VALUES
  ('b1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Keratin Şampuan 300ml', 'saç bakım', 'ProCare', 185.00, 90.00, 24, 5),
  ('b1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Nemlendirici Krem 50ml', 'cilt bakım', 'DermaSoft', 320.00, 150.00, 12, 3),
  ('b1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Saç Boyası No.7', 'saç boyası', 'ColorMax', 95.00, 40.00, 0, 10),
  ('b1000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001',
   'El Kremi 100ml', 'cilt bakım', 'DermaSoft', 120.00, 55.00, 8, 5),
  ('b1000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Saç Spreyi 200ml', 'saç şekillendirme', 'StylePro', 145.00, 65.00, 18, 5)
ON CONFLICT (id) DO NOTHING;
