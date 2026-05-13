-- ============================================================
-- داده نمونه برای شرکت دمو (پس از quick-setup.sql و demo_access_fix.sql)
-- company_id ثابت: 00000000-0000-0000-0000-000000000001
-- اجرای چندباره امن است (ON CONFLICT)
-- در SQL Editor سوپابیس قابل اجراست (بدون دستور psql)
-- ============================================================

INSERT INTO public.companies (id, name, phone, currency)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Demo Şirket',
  '05001234567',
  'TRY'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = COALESCE(EXCLUDED.phone, public.companies.phone);

-- Lokasyon
INSERT INTO public.service_locations (id, company_id, name, description)
VALUES (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Ana Şube',
  'Demo lokasyon'
)
ON CONFLICT (id) DO NOTHING;

-- Çalışanlar
INSERT INTO public.employees (id, company_id, full_name, phone, email, location_id, status, color)
VALUES
  (
    'a2000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Ayşe Yılmaz',
    '05001111111',
    'ayse@demo.local',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'active',
    '#3b82f6'
  ),
  (
    'a2000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Mehmet Kaya',
    '05002222222',
    'mehmet@demo.local',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'active',
    '#22c55e'
  )
ON CONFLICT (id) DO NOTHING;

-- Hizmetler
INSERT INTO public.services (
  id, company_id, name, duration_hours, duration_minutes, vat_rate, price,
  location_id, employee_id
)
VALUES
  (
    'a3000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Genel muayene',
    0, 45, 20, 350.00,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'a2000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'a3000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Kontrol seansı',
    0, 30, 20, 200.00,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'a2000000-0000-4000-8000-000000000002'::uuid
  )
ON CONFLICT (id) DO NOTHING;

-- Paket
INSERT INTO public.packages (id, company_id, name, description, usage_period, price)
VALUES (
  'a4000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  '5 Seanslı Bakım Paketi',
  'Demo paket',
  '3_months',
  1200.00
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.package_services (id, package_id, service_id, sessions, price)
VALUES
  (
    'a5000000-0000-4000-8000-000000000001'::uuid,
    'a4000000-0000-4000-8000-000000000001'::uuid,
    'a3000000-0000-4000-8000-000000000001'::uuid,
    5,
    1200.00
  )
ON CONFLICT (id) DO NOTHING;

-- Müşteriler
INSERT INTO public.customers (id, company_id, full_name, phone, email, city)
VALUES
  (
    'a6000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Zeynep Demir',
    '05003333333',
    'zeynep@demo.local',
    'İstanbul'
  ),
  (
    'a6000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Can Öztürk',
    '05004444444',
    'can@demo.local',
    'Ankara'
  ),
  (
    'a6000000-0000-4000-8000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Elif Şahin',
    '05005555555',
    'elif@demo.local',
    'İzmir'
  )
ON CONFLICT (id) DO NOTHING;

-- Yakın tarihlerde randevular (takvim / asistan için)
INSERT INTO public.appointments (
  id, company_id, customer_id, service_id, employee_id, location_id,
  appointment_date, start_time, end_time, price, discount, status, notes
)
VALUES
  (
    'a7000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'a6000000-0000-4000-8000-000000000001'::uuid,
    'a3000000-0000-4000-8000-000000000001'::uuid,
    'a2000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    (CURRENT_DATE + 1),
    '10:00'::time,
    '10:45'::time,
    350.00,
    0,
    'approved',
    'Demo randevu'
  ),
  (
    'a7000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'a6000000-0000-4000-8000-000000000002'::uuid,
    'a3000000-0000-4000-8000-000000000002'::uuid,
    'a2000000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    CURRENT_DATE,
    '14:00'::time,
    '14:30'::time,
    200.00,
    20.00,
    'approved',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payments (id, company_id, customer_id, appointment_id, amount, method, notes)
VALUES (
  'a8000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'a6000000-0000-4000-8000-000000000002'::uuid,
  'a7000000-0000-4000-8000-000000000002'::uuid,
  180.00,
  'card',
  'Demo ödeme'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (company_id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (company_id) DO NOTHING;
