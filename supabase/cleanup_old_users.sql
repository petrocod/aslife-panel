-- ============================================================
-- Cleanup: Delete users created before yesterday
-- Run in Supabase Dashboard > SQL Editor
-- WARNING: This deletes users permanently! Review before running.
-- ============================================================

-- Step 1: Check which users will be deleted (DRY RUN)
-- Run this first to see the impact:
/*
SELECT au.id, au.email, au.created_at, p.full_name, p.company_id
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE au.created_at < (CURRENT_DATE - INTERVAL '1 day')
ORDER BY au.created_at;
*/

-- Step 2: Delete related data and users
-- This uses CASCADE from foreign keys, but let's be explicit:

DO $$
DECLARE
  user_rec RECORD;
  deleted_count INT := 0;
BEGIN
  FOR user_rec IN
    SELECT au.id, au.email
    FROM auth.users au
    WHERE au.created_at < (CURRENT_DATE - INTERVAL '1 day')
  LOOP
    -- Delete from organization_members
    DELETE FROM public.organization_members WHERE user_id = user_rec.id;

    -- Delete from admin_users
    DELETE FROM public.admin_users WHERE user_id = user_rec.id;

    -- Delete profile (cascades to related data via company_id)
    DELETE FROM public.profiles WHERE id = user_rec.id;

    -- Delete the auth user
    DELETE FROM auth.users WHERE id = user_rec.id;

    deleted_count := deleted_count + 1;
    RAISE NOTICE 'Deleted user: % (%)', user_rec.email, user_rec.id;
  END LOOP;

  RAISE NOTICE 'Total users deleted: %', deleted_count;
END;
$$;

-- Step 3: Clean up orphan companies (no owner profile)
DELETE FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.company_id = c.id
);

-- Step 4: Clean up orphan organizations (no companies)
DELETE FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies c WHERE c.organization_id = o.id
);
