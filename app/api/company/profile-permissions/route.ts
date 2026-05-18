import { NextRequest, NextResponse } from "next/server"
import { verifyUserBearer } from "@/lib/sms-route-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function PATCH(req: NextRequest) {
  const auth = await verifyUserBearer(req)
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const profileId = body.profileId as string
  const permissions = body.permissions as Record<string, boolean>

  if (!profileId || !permissions) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: actor } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", auth.userId)
    .single()

  if (!actor?.company_id || !["owner", "manager"].includes(actor.role || "")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", profileId)
    .single()

  if (!target || target.company_id !== actor.company_id) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })
  }

  const { error } = await supabase
    .from("profiles")
    .update({ feature_permissions: permissions })
    .eq("id", profileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
