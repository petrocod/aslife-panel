import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim() || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10))
  const offset = (page - 1) * limit

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from("organizations")
    .select("id, name, slug, owner_email, is_active, max_branches, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,owner_email.ilike.%${search}%`)
  }

  const { data: orgs, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orgIds = (orgs || []).map((o) => o.id)
  const enriched = await Promise.all(
    (orgs || []).map(async (org) => {
      const [companyCount, memberCount, sub] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
        supabase.from("company_subscriptions").select("plan_id, status").eq("organization_id", org.id).limit(1).maybeSingle(),
      ])
      return {
        ...org,
        companyCount: companyCount.count || 0,
        memberCount: memberCount.count || 0,
        subscription: sub.data || null,
      }
    })
  )

  return NextResponse.json({
    organizations: enriched,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
