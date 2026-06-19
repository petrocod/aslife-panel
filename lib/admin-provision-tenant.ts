import type { SupabaseClient } from "@supabase/supabase-js"

import { getAuthCallbackBaseUrl } from "@/lib/auth-redirect"

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `${base || "musteri"}-${Date.now().toString(36).slice(-5)}`
}

export type ProvisionTenantInput = {
  name: string
  phone?: string
  email?: string
  service_type?: string
  owner_email?: string
  owner_full_name?: string
  owner_phone?: string
}

export type ProvisionTenantResult =
  | {
      ok: true
      organizationId: string
      companyId: string
      ownerUserId?: string
      ownerTempPassword?: string
    }
  | { ok: false; error: string }

async function seedCompanyDefaults(
  admin: SupabaseClient,
  companyId: string,
  organizationId: string
) {
  await admin.from("settings").upsert({ company_id: companyId })
  const hours = Array.from({ length: 7 }, (_, d) => ({
    company_id: companyId,
    day_of_week: d,
    is_open: d < 6,
    start_time: "09:00",
    end_time: "18:00",
  }))
  await admin.from("working_hours").upsert(hours, {
    onConflict: "company_id,day_of_week",
  })
  await admin.from("company_subscriptions").upsert({
    company_id: companyId,
    organization_id: organizationId,
    plan_id: "asistan",
    status: "trialing",
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  })
}

export async function provisionNewTenant(
  admin: SupabaseClient,
  input: ProvisionTenantInput
): Promise<ProvisionTenantResult> {
  const name = input.name?.trim()
  if (!name) return { ok: false, error: "Şirket adı zorunludur." }

  const ownerEmail = input.owner_email?.trim().toLowerCase()
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name,
      owner_email: ownerEmail || input.email?.trim() || null,
      slug: slugify(name),
      max_branches: 1,
      is_active: true,
    })
    .select("id")
    .single()

  if (orgErr || !org) {
    return { ok: false, error: orgErr?.message || "Organizasyon oluşturulamadı." }
  }

  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({
      name,
      phone: input.phone?.trim() || "",
      email: input.email?.trim() || ownerEmail || "",
      service_type: input.service_type || "beauty_salon",
      organization_id: org.id,
      currency: "TRY",
    })
    .select("id")
    .single()

  if (companyErr || !company) {
    await admin.from("organizations").delete().eq("id", org.id)
    return { ok: false, error: companyErr?.message || "Şirket oluşturulamadı." }
  }

  await seedCompanyDefaults(admin, company.id, org.id)

  if (!ownerEmail) {
    return { ok: true, organizationId: org.id, companyId: company.id }
  }

  const tempPassword = Math.random().toString(36).slice(-10) + "A1!"
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: input.owner_full_name?.trim() || name,
      phone: input.owner_phone?.trim() || input.phone?.trim() || "",
      invited_company_id: company.id,
      invited_role: "owner",
    },
  })

  if (authError || !authUser.user) {
    return {
      ok: true,
      organizationId: org.id,
      companyId: company.id,
    }
  }

  const callbackUrl = `${getAuthCallbackBaseUrl()}/auth/callback`
  await admin.auth.admin.generateLink({
    type: "recovery",
    email: ownerEmail,
    options: { redirectTo: callbackUrl },
  })

  return {
    ok: true,
    organizationId: org.id,
    companyId: company.id,
    ownerUserId: authUser.user.id,
    ownerTempPassword: tempPassword,
  }
}
