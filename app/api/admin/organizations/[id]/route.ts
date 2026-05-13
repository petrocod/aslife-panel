import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { id } = await params
  const supabase = getSupabaseAdmin()

  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !org) {
    return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 })
  }

  const [companiesRes, membersRes, subsRes, auditRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, phone, email, service_type, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("user_id, role, status, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_subscriptions")
      .select("id, plan_id, status, trial_ends_at, created_at, company_id")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("admin_audit_log")
      .select("id, action, admin_email, target_type, target_id, details, created_at")
      .eq("target_type", "organization")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const members = await Promise.all(
    (membersRes.data || []).map(async (m) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", m.user_id)
        .single()
      return { ...m, profile: profile || null }
    })
  )

  return NextResponse.json({
    organization: org,
    companies: companiesRes.data || [],
    members,
    subscriptions: subsRes.data || [],
    auditLog: auditRes.data || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from("organizations")
    .update({
      name: body.name,
      slug: body.slug,
      max_branches: body.max_branches,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
