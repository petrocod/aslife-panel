import { NextRequest } from "next/server"
import { verifyUserBearer } from "@/lib/sms-route-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export type AdminSession = {
  userId: string
  adminId: string
  role: "super_admin" | "support_agent" | "sales"
  email: string
}

export async function verifyAdmin(
  req: NextRequest
): Promise<AdminSession | null> {
  const userResult = await verifyUserBearer(req)
  if (!userResult.ok) return null

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("admin_users")
    .select("id, role, email")
    .eq("user_id", userResult.userId)
    .eq("is_active", true)
    .single()

  if (!data) return null

  return {
    userId: userResult.userId,
    adminId: data.id,
    role: data.role as AdminSession["role"],
    email: data.email,
  }
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
  adminEmail?: string
) {
  try {
    const supabase = getSupabaseAdmin()
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      admin_email: adminEmail || null,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || {},
    })
  } catch {
    // audit log failures should not break operations
  }
}
