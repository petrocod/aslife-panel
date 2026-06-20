import { NextRequest, NextResponse } from "next/server"

import { verifyAdmin } from "@/lib/admin-auth"
import {
  enrichAdminUsers,
  generateTempPassword,
  PROFILE_COLUMNS,
  upsertUserProfile,
} from "@/lib/admin-users-service"
import { getAuthCallbackBaseUrl } from "@/lib/auth-redirect"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const companyId = searchParams.get("companyId")?.trim() || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("profiles")
      .select(PROFILE_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const users = await enrichAdminUsers(supabase, data || [])

    return NextResponse.json({
      users,
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
    const normalizedEmail = String(email).trim().toLowerCase()
    const tempPassword = generateTempPassword()

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || "",
        phone: phone || "",
        invited_company_id: companyId,
        invited_role: role || "member",
      },
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

    const profileErr = await upsertUserProfile(supabase, {
      userId: authUser.user.id,
      email: normalizedEmail,
      fullName,
      phone,
      companyId,
      role: role || "member",
    })

    if (profileErr) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    const callbackUrl = `${getAuthCallbackBaseUrl()}/auth/callback`
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: callbackUrl },
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
