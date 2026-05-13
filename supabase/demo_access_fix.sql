-- ============================================================
-- Demo şirket + anon (giriş yok) erişimi
-- Uygulama DEMO_COMPANY_ID kullanırken RLS engelini kaldırır.
-- Üretimde demo kullanmıyorsanız bu politikaları kaldırın.
-- ============================================================

INSERT INTO public.companies (id, name, phone, currency)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Şirket',
  '',
  'TRY'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (company_id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO public.working_hours (company_id, day_of_week, is_open, start_time, end_time)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, v.d, v.o, v.st::time, v.et::time
FROM (VALUES
  (0, FALSE, '09:00', '18:00'),
  (1, TRUE,  '09:00', '18:00'),
  (2, TRUE,  '09:00', '18:00'),
  (3, TRUE,  '09:00', '18:00'),
  (4, TRUE,  '09:00', '18:00'),
  (5, TRUE,  '09:00', '18:00'),
  (6, FALSE, '09:00', '18:00')
) AS v(d, o, st, et)
WHERE NOT EXISTS (
  SELECT 1 FROM public.working_hours w
  WHERE w.company_id = '00000000-0000-0000-0000-000000000001'::uuid AND w.day_of_week = v.d
);

-- ----------------------------------------------------------------
-- Anon: sadece demo company_id
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "companies_anon_demo_select" ON public.companies;
CREATE POLICY "companies_anon_demo_select"
  ON public.companies FOR SELECT TO anon
  USING (id = '00000000-0000-0000-0000-000000000001'::uuid);

DROP POLICY IF EXISTS "companies_anon_demo_update" ON public.companies;
CREATE POLICY "companies_anon_demo_update"
  ON public.companies FOR UPDATE TO anon
  USING (id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Tablolar: company_id ile
DO $$
DECLARE
  demo uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'service_locations',
    'employees',
    'services',
    'packages',
    'customers',
    'dynamic_fields',
    'appointments',
    'payments',
    'working_hours',
    'employee_leaves',
    'commission_rules',
    'sms_packages',
    'target_audiences',
    'campaigns',
    'settings',
    'finance_transactions',
    'finance_accounts'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'DROP POLICY IF EXISTS "%1$s_anon_demo_all" ON public.%1$s;
         CREATE POLICY "%1$s_anon_demo_all"
           ON public.%1$s FOR ALL TO anon
           USING (company_id = %2$L::uuid)
           WITH CHECK (company_id = %2$L::uuid);',
        tbl,
        demo
      );
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "package_services_anon_demo_all" ON public.package_services;
CREATE POLICY "package_services_anon_demo_all"
  ON public.package_services FOR ALL TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_id AND p.company_id = '00000000-0000-0000-0000-000000000001'::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = package_id AND p.company_id = '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

DROP POLICY IF EXISTS "customer_field_values_anon_demo_all" ON public.customer_field_values;
CREATE POLICY "customer_field_values_anon_demo_all"
  ON public.customer_field_values FOR ALL TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id AND c.company_id = '00000000-0000-0000-0000-000000000001'::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id AND c.company_id = '00000000-0000-0000-0000-000000000001'::uuid
    )
  );
