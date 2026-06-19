import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin } from "@/lib/admin-auth"
import { provisionNewTenant } from "@/lib/admin-provision-tenant"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim() || ""
  const orgId = searchParams.get("org_id")?.trim() || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10))
  const offset = (page - 1) * limit

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from("companies")
    .select("id, name, phone, email, organization_id, service_type, is_active, created_at, organizations(id, name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  if (orgId) query = query.eq("organization_id", orgId)

  const { data: companies, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await Promise.all(
    (companies || []).map(async (c) => {
      const [customerCount, owner, sub] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("company_id", c.id),
        supabase.from("profiles").select("full_name, email").eq("company_id", c.id).eq("role", "owner").limit(1).maybeSingle(),
        supabase.from("company_subscriptions").select("plan_id, status").eq("company_id", c.id).limit(1).maybeSingle(),
      ])
      return {
        ...c,
        customers_count: customerCount.count || 0,
        owner: owner.data || null,
        subscription: sub.data || null,
      }
    })
  )

  return NextResponse.json({
    companies: enriched,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  if (admin.role !== "super_admin") {
    return NextResponse.json(
      { error: "Müşteri oluşturma yalnızca super_admin tarafından yapılabilir." },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const {
      name,
      phone,
      email,
      service_type,
      organization_id,
      owner_email,
      owner_full_name,
      owner_phone,
    } = body

    const supabase = getSupabaseAdmin()

    if (!organization_id) {
      const result = await provisionNewTenant(supabase, {
        name,
        phone,
        email,
        service_type,
        owner_email,
        owner_full_name,
        owner_phone,
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json(
        {
          company: { id: result.companyId, organization_id: result.organizationId, name },
          ownerUserId: result.ownerUserId,
          ownerTempPassword: result.ownerTempPassword,
        },
        { status: 201 }
      )
    }

    if (!name || !organization_id) {
      return NextResponse.json(
        { error: "name ve organization_id zorunludur." },
        { status: 400 }
      )
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, max_branches")
      .eq("id", organization_id)
      .single()

    if (!org) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı." },
        { status: 404 }
      )
    }

    const { count } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization_id)

    if ((count || 0) >= org.max_branches) {
      return NextResponse.json(
        { error: "Maksimum şube limitine ulaşıldı." },
        { status: 400 }
      )
    }

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name,
        phone: phone || "",
        email: email || "",
        service_type: service_type || "beauty_salon",
        organization_id,
        is_active: true,
        currency: "TRY",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ company }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
