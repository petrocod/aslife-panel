import { NextRequest, NextResponse } from "next/server"

import { logAdminAction, verifyAdmin } from "@/lib/admin-auth"
import { COMPANY_TABLE_FIELDS } from "@/lib/company-db"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const COMPANY_SELECT = [
  "id",
  "name",
  "phone",
  "email",
  "address",
  "location",
  "authorized",
  "founded_at",
  "website",
  "tc_no",
  "tax_number",
  "tax_office",
  "invoice_address",
  "currency",
  "service_type",
  "language",
  "timezone",
  "logo_url",
  "created_at",
  "organization_id",
  "organizations(id, name, slug, owner_email, is_active)",
].join(", ")

const PATCH_ALLOWED = new Set<string>(COMPANY_TABLE_FIELDS)

const PLAN_LABELS: Record<string, string> = {
  asistan: "aSistan",
  asistan_plus: "aSistan Plus",
  asistan_pro: "aSistan Pro",
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { id: companyId } = await params
  const supabase = getSupabaseAdmin()

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select(COMPANY_SELECT)
    .eq("id", companyId)
    .single()

  if (companyErr || !company) {
    return NextResponse.json(
      { error: companyErr?.message || "Şirket bulunamadı." },
      { status: 404 }
    )
  }

  const [
    profilesRes,
    subRes,
    customerCountRes,
    appointmentCountRes,
    financeRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("company_subscriptions")
      .select(
        "id, plan_id, status, trial_ends_at, current_period_end, created_at, updated_at"
      )
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("finance_transactions")
      .select("amount")
      .eq("company_id", companyId)
      .eq("type", "income"),
  ])

  const profiles = (profilesRes.data || []).map((p) => ({
    ...p,
    is_active: true,
    last_login: null as string | null,
  }))

  let subscription = subRes.data || null
  if (subscription?.plan_id) {
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id, name_tr, monthly_price, annual_price")
      .eq("id", subscription.plan_id)
      .maybeSingle()

    subscription = {
      ...subscription,
      subscription_plans: plan || {
        id: subscription.plan_id,
        name_tr: PLAN_LABELS[subscription.plan_id] || subscription.plan_id,
        monthly_price: null,
        annual_price: null,
      },
    }
  }

  const revenue = (financeRes.data || []).reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  )

  const org = company.organizations as
    | {
        id: string
        name: string
        slug: string
        owner_email: string | null
        is_active: boolean
      }
    | {
        id: string
        name: string
        slug: string
        owner_email: string | null
        is_active: boolean
      }[]
    | null

  const normalizedOrg = Array.isArray(org) ? org[0] || null : org
  const { organizations: _orgJoin, ...companyRow } = company

  const owner =
    profiles.find((p) => p.role === "owner") ||
    profiles[0] ||
    null

  return NextResponse.json({
    company: companyRow,
    organization: normalizedOrg,
    owner,
    users: profiles,
    subscription,
    stats: {
      users: profiles.length,
      customers: customerCountRes.count || 0,
      appointments: appointmentCountRes.count || 0,
      revenue,
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { id: companyId } = await params
  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (!PATCH_ALLOWED.has(key)) continue
    if (key === "founded_at") {
      updates[key] = value ? String(value).slice(0, 10) : null
    } else if (value === null || value === "") {
      updates[key] = key === "name" ? "Şirketim" : null
    } else {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", companyId)
    .select(COMPANY_SELECT.replace(", organizations(id, name, slug, owner_email, is_active)", ""))
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAdminAction(
    admin.adminId,
    "company_updated",
    "company",
    companyId,
    { fields: Object.keys(updates).filter((k) => k !== "updated_at") },
    admin.email
  )

  return NextResponse.json({ ok: true, company: data })
}
