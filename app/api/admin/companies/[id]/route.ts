import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
    .select(
      "id, name, phone, email, address, city, currency, service_type, created_at, organization_id, organizations(id, name, slug, owner_email, is_active)"
    )
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
    plansRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, role, is_active, last_login, created_at"
      )
      .eq("company_id", companyId)
      .order("role"),
    supabase
      .from("company_subscriptions")
      .select(
        "id, plan_id, status, trial_ends_at, current_period_end, cancel_at_period_end, mrr, created_at, updated_at, subscription_plans(id, name_tr, monthly_price, annual_price)"
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
    supabase
      .from("subscription_plans")
      .select("id, name_tr, monthly_price")
      .order("sort_order", { ascending: true }),
  ])

  const revenue = (financeRes.data || []).reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  )

  const org = company.organizations as
    | { id: string; name: string; slug: string; owner_email: string | null; is_active: boolean }
    | { id: string; name: string; slug: string; owner_email: string | null; is_active: boolean }[]
    | null

  const normalizedOrg = Array.isArray(org) ? org[0] || null : org

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      phone: company.phone,
      email: company.email,
      address: company.address,
      city: company.city,
      currency: company.currency,
      service_type: company.service_type,
      created_at: company.created_at,
      organization_id: company.organization_id,
    },
    organization: normalizedOrg,
    users: profilesRes.data || [],
    subscription: subRes.data || null,
    plans: plansRes.data || [],
    stats: {
      users: profilesRes.data?.length || 0,
      customers: customerCountRes.count || 0,
      appointments: appointmentCountRes.count || 0,
      revenue,
    },
  })
}
