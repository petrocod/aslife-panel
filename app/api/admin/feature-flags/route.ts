import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin, logAdminAction } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { SUPER_ADMIN_ONLY_FLAGS, type PlatformFlagKey } from "@/lib/platform-flags"

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from("feature_flags").select("*").order("key")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flags: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const key = body.key as string
  const enabled = Boolean(body.enabled)

  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 })

  if (
    SUPER_ADMIN_ONLY_FLAGS.includes(key as PlatformFlagKey) &&
    admin.role !== "super_admin"
  ) {
    return NextResponse.json(
      { error: "Bu bayrak yalnızca super_admin tarafından değiştirilebilir." },
      { status: 403 }
    )
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("feature_flags")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAdminAction(admin.adminId, `feature_flag_${enabled ? "on" : "off"}`, "feature_flag", key, { enabled }, admin.email)

  return NextResponse.json({ flag: data })
}
