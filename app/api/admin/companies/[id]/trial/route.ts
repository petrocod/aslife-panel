import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin, logAdminAction } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/** Super admin: enable/disable 14-day trial for a company. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Yalnızca super_admin" }, { status: 403 })
  }

  const { id: companyId } = await params
  const body = await req.json()
  const enable = Boolean(body.enable)
  const days = Number(body.days) || 14

  const supabase = getSupabaseAdmin()

  if (enable) {
    const trialEnds = new Date(Date.now() + days * 86_400_000).toISOString()
    const { error } = await supabase
      .from("company_subscriptions")
      .update({ status: "trialing", trial_ends_at: trialEnds })
      .eq("company_id", companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from("company_subscriptions")
      .update({ status: "active", trial_ends_at: null })
      .eq("company_id", companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAdminAction(
    admin.adminId,
    enable ? "trial_enabled" : "trial_disabled",
    "company",
    companyId,
    { days },
    admin.email
  )

  return NextResponse.json({ ok: true, enable })
}
