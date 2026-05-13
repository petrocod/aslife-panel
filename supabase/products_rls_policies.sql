-- ============================================================
-- RLS Policies for products / product_sales / product_sale_items
-- Run AFTER add_calendar_token_and_products.sql
-- If a policy already exists, just skip it (comment out that line)
-- ============================================================

-- Products: authenticated users
CREATE POLICY "products_company_all" ON products FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Products: anon (demo)
CREATE POLICY "products_anon_demo_all" ON products FOR ALL TO anon
  USING (company_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (company_id = '00000000-0000-0000-0000-000000000001');

-- Product sales: authenticated users
CREATE POLICY "product_sales_company_all" ON product_sales FOR ALL
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Product sales: anon (demo)
CREATE POLICY "product_sales_anon_demo_all" ON product_sales FOR ALL TO anon
  USING (company_id = '00000000-0000-0000-0000-000000000001')
  WITH CHECK (company_id = '00000000-0000-0000-0000-000000000001');

-- Product sale items: authenticated users (via sale)
CREATE POLICY "product_sale_items_via_sale" ON product_sale_items FOR ALL
  USING (sale_id IN (SELECT id FROM product_sales WHERE company_id = get_user_company_id()));

-- Product sale items: anon (demo)
CREATE POLICY "product_sale_items_anon_demo" ON product_sale_items FOR ALL TO anon
  USING (sale_id IN (
    SELECT id FROM product_sales WHERE company_id = '00000000-0000-0000-0000-000000000001'
  ));
