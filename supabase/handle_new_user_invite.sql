-- ============================================================
-- Davetli kullanıcı: mevcut şirkete bağlan (yeni org/şirket açma)
-- Supabase SQL Editor'da çalıştırın (multi_tenant_saas.sql sonrası)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  new_company_id UUID;
  user_name TEXT;
  invited_company UUID;
  invited_role TEXT;
BEGIN
  invited_company := NULLIF(TRIM(NEW.raw_user_meta_data->>'invited_company_id'), '')::UUID;

  IF invited_company IS NOT NULL THEN
    SELECT organization_id INTO new_org_id
    FROM public.companies
    WHERE id = invited_company;

    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    invited_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'invited_role', ''), 'member');

    INSERT INTO public.profiles (id, company_id, organization_id, full_name, email, phone, role)
    VALUES (
      NEW.id,
      invited_company,
      new_org_id,
      user_name,
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      invited_role
    )
    ON CONFLICT (id) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      organization_id = EXCLUDED.organization_id,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role;

    IF new_org_id IS NOT NULL THEN
      INSERT INTO public.organization_members (organization_id, user_id, role, status, accepted_at)
      VALUES (new_org_id, NEW.id, invited_role, 'active', NOW())
      ON CONFLICT (organization_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = 'active',
        accepted_at = NOW();
    END IF;

    RETURN NEW;
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Şirketim');

  INSERT INTO public.organizations (name, owner_email)
  VALUES (user_name, NEW.email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.companies (name, organization_id)
  VALUES (user_name, new_org_id)
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, organization_id, full_name, email, phone)
  VALUES (
    NEW.id,
    new_company_id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );

  INSERT INTO public.organization_members (organization_id, user_id, role, status, accepted_at)
  VALUES (new_org_id, NEW.id, 'owner', 'active', NOW());

  INSERT INTO public.settings (company_id) VALUES (new_company_id);
  INSERT INTO public.working_hours (company_id, day_of_week, is_open, start_time, end_time)
  SELECT new_company_id, d, d < 6, '09:00', '18:00'
  FROM generate_series(0, 6) AS d;

  INSERT INTO public.company_subscriptions (company_id, organization_id, plan_id, status, trial_ends_at)
  VALUES (new_company_id, new_org_id, 'asistan', 'trialing', NOW() + INTERVAL '14 days')
  ON CONFLICT (company_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
