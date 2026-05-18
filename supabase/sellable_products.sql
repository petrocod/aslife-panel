-- Ek paketler (SMS, WhatsApp, kullanıcı) — admin panelden güncellenebilir
CREATE TABLE IF NOT EXISTS public.sellable_products (
  id TEXT PRIMARY KEY,
  product_type TEXT NOT NULL
    CHECK (product_type IN ('sms_package', 'whatsapp_package', 'user_package')),
  title_tr TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  credits INT,
  description_tr TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_price NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description_tr TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

INSERT INTO public.sellable_products (id, product_type, title_tr, price, credits, description_tr, sort_order)
VALUES
  ('sms_500', 'sms_package', '500 SMS Kredisi', 275, 500, NULL, 1),
  ('sms_1000', 'sms_package', '1.000 SMS Kredisi', 500, 1000, NULL, 2),
  ('sms_3000', 'sms_package', '3.000 SMS Kredisi', 1350, 3000, NULL, 3),
  ('wp_500', 'whatsapp_package', '500 WhatsApp Kredisi', 275, 500, NULL, 1),
  ('wp_1000', 'whatsapp_package', '1.000 WhatsApp Kredisi', 500, 1000, NULL, 2),
  ('wp_3000', 'whatsapp_package', '3.000 WhatsApp Kredisi', 1350, 3000, NULL, 3),
  ('user_1', 'user_package', '1 Ek Kullanıcı', 2592, NULL, 'Aylık', 1),
  ('user_2', 'user_package', '2 Ek Kullanıcı', 5184, NULL, 'Aylık', 2)
ON CONFLICT (id) DO NOTHING;

UPDATE public.subscription_plans SET
  monthly_price = COALESCE(monthly_price, 750),
  annual_price = COALESCE(NULLIF(annual_price, 0), 7500),
  description_tr = COALESCE(description_tr, 'Tek kişilik küçük bir işletmenin günlük faaliyetlerini yönetmek için ideal!')
WHERE id = 'asistan';

UPDATE public.subscription_plans SET
  monthly_price = COALESCE(monthly_price, 1500),
  annual_price = COALESCE(NULLIF(annual_price, 0), 15000),
  description_tr = COALESCE(description_tr, 'Günlük randevu operasyonlarını rahat yönetin ve kolayca büyütün!')
WHERE id = 'asistan_plus';

UPDATE public.subscription_plans SET
  monthly_price = COALESCE(monthly_price, 2100),
  annual_price = COALESCE(NULLIF(annual_price, 0), 21000),
  description_tr = COALESCE(description_tr, 'Profesyonel bir işletme için gereken her şey limitsiz. Rekabette fark yaratın!')
WHERE id = 'asistan_pro';

ALTER TABLE public.sellable_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellable_products_read" ON public.sellable_products;
CREATE POLICY "sellable_products_read"
  ON public.sellable_products FOR SELECT
  TO authenticated
  USING (is_active = TRUE);
