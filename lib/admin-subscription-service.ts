import type { SupabaseClient } from "@supabase/supabase-js"

import { fetchCatalog } from "@/lib/catalog/resolve"
import type { CatalogPlan } from "@/lib/catalog/types"

export const PLAN_LABELS: Record<string, string> = {
  asistan: "aSistan",
  asistan_plus: "aSistan Plus",
  asistan_pro: "aSistan Pro",
}

/** DB şeması: cancel_at_period_end / mrr bazı projelerde yok — yazmıyoruz */
export type CompanySubscriptionRow = {
  id: string
  company_id: string
  plan_id: string
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
  organization_id?: string | null
}

export function periodEndFromBilling(billing: "monthly" | "yearly", from = new Date()): string {
  const d = new Date(from)
  if (billing === "yearly") d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

export function trialEndFromDays(days: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export async function loadSubscriptionPlans(
  supabase: SupabaseClient
): Promise<CatalogPlan[]> {
  const { plans } = await fetchCatalog(false)
  if (plans.length) return plans

  const { data } = await supabase
    .from("subscription_plans")
    .select("id, name_tr, max_users, monthly_price, annual_price, sort_order, is_active")
    .order("sort_order")

  return (data || []).map((row) => ({
    id: String(row.id),
    name_tr: String(row.name_tr || row.id),
    max_users: Number(row.max_users) || 1,
    monthly_price: Number(row.monthly_price) || 0,
    annual_price: Number(row.annual_price) || 0,
    monthly_price_hint: null,
    description_tr: null,
    sms_included: 0,
    features: {},
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
  }))
}

export async function enrichSubscriptions(
  supabase: SupabaseClient,
  rows: CompanySubscriptionRow[]
) {
  const plans = await loadSubscriptionPlans(supabase)
  const planMap = new Map(plans.map((p) => [p.id, p]))

  const companyIds = [...new Set(rows.map((r) => r.company_id))]
  const { data: companies } = companyIds.length
    ? await supabase.from("companies").select("id, name").in("id", companyIds)
    : { data: [] }

  const companyMap = new Map((companies || []).map((c) => [c.id, c]))

  return rows.map((row) => ({
    ...row,
    companies: companyMap.get(row.company_id) || null,
    plan: planMap.get(row.plan_id) || {
      id: row.plan_id,
      name_tr: PLAN_LABELS[row.plan_id] || row.plan_id,
      max_users: 0,
      monthly_price: 0,
      annual_price: 0,
      monthly_price_hint: null,
      description_tr: null,
      sms_included: 0,
      features: {},
      sort_order: 0,
      is_active: true,
    },
  }))
}

export async function assignCompanySubscription(
  supabase: SupabaseClient,
  input: {
    companyId: string
    planId: string
    status: "trialing" | "active" | "canceled" | "past_due"
    billing?: "monthly" | "yearly"
    trialDays?: number
  }
) {
  const { companyId, planId, status } = input
  const billing = input.billing || "monthly"
  const trialDays = input.trialDays ?? 14

  const plans = await loadSubscriptionPlans(supabase)
  const plan = plans.find((p) => p.id === planId)
  if (!plan) {
    return { ok: false as const, error: "Plan bulunamadı." }
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, organization_id")
    .eq("id", companyId)
    .single()

  if (!company) {
    return { ok: false as const, error: "Şirket bulunamadı." }
  }

  const now = new Date().toISOString()

  const payload: Record<string, unknown> = {
    company_id: companyId,
    plan_id: planId,
    status,
    updated_at: now,
    organization_id: company.organization_id || null,
  }

  if (status === "trialing") {
    payload.trial_ends_at = trialEndFromDays(trialDays)
    payload.current_period_end = null
  } else if (status === "active") {
    payload.trial_ends_at = null
    payload.current_period_end = periodEndFromBilling(billing)
  } else if (status === "canceled") {
    payload.trial_ends_at = null
  }

  const { data: existing } = await supabase
    .from("company_subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle()

  let sub: CompanySubscriptionRow | null = null
  let error: { message: string } | null = null

  if (existing?.id) {
    const res = await supabase
      .from("company_subscriptions")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single()
    sub = res.data as CompanySubscriptionRow | null
    error = res.error
  } else {
    const res = await supabase
      .from("company_subscriptions")
      .insert({ ...payload, created_at: now })
      .select("*")
      .single()
    sub = res.data as CompanySubscriptionRow | null
    error = res.error
  }

  if (error || !sub) {
    return { ok: false as const, error: error?.message || "Abonelik kaydedilemedi." }
  }

  return { ok: true as const, subscription: sub, plan }
}
