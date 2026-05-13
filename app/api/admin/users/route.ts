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
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        phone,
        role,
        is_active,
        last_login,
        created_at,
        company_id,
        organization_id,
        companies!left(id, name),
        organizations!left(id, name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      users: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const body = await req.json()
    const { email, fullName, phone, companyId, role } = body

    if (!email || !companyId) {
      return NextResponse.json({ error: "E-posta ve şirket zorunludur." }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const tempPassword = Math.random().toString(36).slice(-10) + "A1!"

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName || "", phone: phone || "" },
    })

    if (authError) {
      if (authError.message.includes("already")) {
        return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: "Kullanıcı oluşturulamadı." }, { status: 500 })
    }

    const { data: company } = await supabase
      .from("companies")
      .select("organization_id")
      .eq("id", companyId)
      .single()

    await supabase.from("profiles").upsert({
      id: authUser.user.id,
      email,
      full_name: fullName || "",
      phone: phone || "",
      company_id: companyId,
      organization_id: company?.organization_id || null,
      role: role || "member",
    })

    if (company?.organization_id) {
      await supabase.from("organization_members").upsert({
        organization_id: company.organization_id,
        user_id: authUser.user.id,
        role: role || "member",
        status: "active",
        accepted_at: new Date().toISOString(),
      })
    }

    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    })

    return NextResponse.json({
      ok: true,
      userId: authUser.user.id,
      tempPassword,
      resetLinkSent: !resetError,
      message: `Kullanıcı oluşturuldu. Geçici şifre: ${tempPassword}`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
