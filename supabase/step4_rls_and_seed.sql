-- STEP 4: RLS policies + demo data
-- Run this AFTER step3
-- If you get "policy already exists" error, that's OK - just skip it

CREATE POLICY "products_company_all" ON products FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "products_anon_demo_all" ON products FOR ALL TO anon
  USING (company_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (company_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "product_sales_company_all" ON product_sales FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "product_sales_anon_demo_all" ON product_sales FOR ALL TO anon
  USING (company_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (company_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "product_sale_items_via_sale" ON product_sale_items FOR ALL
  USING (sale_id IN (SELECT id FROM product_sales WHERE company_id = get_user_company_id()));

CREATE POLICY "product_sale_items_anon_demo" ON product_sale_items FOR ALL TO anon
  USING (sale_id IN (
    SELECT id FROM product_sales WHERE company_id = '00000000-0000-0000-0000-000000000001'
  ));

INSERT INTO products (id, company_id, name, category, brand, price, cost_price, stock, min_stock)
VALUES
  ('b1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Keratin Sampuan 300ml', 'sac bakim', 'ProCare', 185.00, 90.00, 24, 5),
  ('b1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Nemlendirici Krem 50ml', 'cilt bakim', 'DermaSoft', 320.00, 150.00, 12, 3),
  ('b1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Sac Boyasi No.7', 'sac boyasi', 'ColorMax', 95.00, 40.00, 0, 10),
  ('b1000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000001',
   'El Kremi 100ml', 'cilt bakim', 'DermaSoft', 120.00, 55.00, 8, 5),
  ('b1000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000001',
   'Sac Spreyi 200ml', 'sac sekillendirme', 'StylePro', 145.00, 65.00, 18, 5)
ON CONFLICT (id) DO NOTHING;
