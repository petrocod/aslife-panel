import { NextRequest, NextResponse } from "next/server"
import { verifyUserBearer } from "@/lib/sms-route-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

async function verifyAdmin(req: NextRequest) {
  const userResult = await verifyUserBearer(req)
  if (!userResult.ok) return null
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("user_id", userResult.userId)
    .eq("is_active", true)
    .single()
  if (!data) return null
  return { userId: userResult.userId, adminId: data.id, role: data.role }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const url = new URL(req.url)

  const status = url.searchParams.get("status")
  const priority = url.searchParams.get("priority")
  const search = url.searchParams.get("search")
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
  const offset = (page - 1) * limit

  let query = supabase
    .from("support_tickets")
    .select(
      `id, subject, status, priority, created_at, updated_at, company_id, user_id`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq("status", status)
  }
  if (priority) {
    query = query.eq("priority", priority)
  }
  if (search) {
    query = query.or(`subject.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tickets = await Promise.all(
    (data || []).map(async (t) => {
      const [companyRes, profileRes, msgRes] = await Promise.all([
        supabase.from("companies").select("name").eq("id", t.company_id).maybeSingle(),
        supabase.from("profiles").select("full_name, email").eq("id", t.user_id).maybeSingle(),
        supabase.from("ticket_messages").select("id").eq("ticket_id", t.id),
      ])
      return {
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        updated_at: t.updated_at,
        company_name: companyRes.data?.name || "—",
        user_name: profileRes.data?.full_name || "—",
        user_email: profileRes.data?.email || "—",
        message_count: msgRes.data?.length || 0,
      }
    })
  )

  return NextResponse.json({
    tickets,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
