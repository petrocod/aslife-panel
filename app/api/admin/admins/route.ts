import { NextRequest, NextResponse } from "next/server"

import { logAdminAction, verifyAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-10) + "A1!"
}

async function findAuthUserByEmail(email: string) {
  const supabase = getSupabaseAdmin()
  let page = 1
  const perPage = 200
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < perPage) break
    page++
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, user_id, email, full_name, role, is_active, created_at, last_login")
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ admins: data || [] })
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
    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Admin ekleme yalnızca super_admin tarafından yapılabilir." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()
    const fullName = String(body.fullName || "").trim()
    const role = String(body.role || "support_agent")
    const customPassword =
      typeof body.password === "string" && body.password.length >= 6
        ? body.password
        : null

    if (!email) {
      return NextResponse.json({ error: "E-posta zorunludur." }, { status: 400 })
    }
    if (!["super_admin", "support_agent", "sales"].includes(role)) {
      return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: existingAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingAdmin) {
      return NextResponse.json({ error: "Bu e-posta zaten admin listesinde." }, { status: 409 })
    }

    let userId: string
    let tempPassword: string | null = null

    const existingAuth = await findAuthUserByEmail(email)

    if (existingAuth) {
      userId = existingAuth.id
      if (customPassword) {
        const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, {
          password: customPassword,
        })
        if (pwErr) {
          return NextResponse.json({ error: pwErr.message }, { status: 500 })
        }
        tempPassword = customPassword
      }
    } else {
      tempPassword = customPassword || generateTempPassword()
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }
      if (!authUser.user) {
        return NextResponse.json({ error: "Kullanıcı oluşturulamadı." }, { status: 500 })
      }
      userId = authUser.user.id
    }

    const { data: row, error: insertError } = await supabase
      .from("admin_users")
      .insert({
        user_id: userId,
        email,
        full_name: fullName || email.split("@")[0],
        role,
        is_active: true,
      })
      .select("id, email, full_name, role")
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await logAdminAction(
      admin.adminId,
      "admin_user_created",
      "admin_user",
      row.id,
      { email, role },
      admin.email
    )

    return NextResponse.json({
      ok: true,
      admin: row,
      tempPassword,
      message: tempPassword
        ? "Admin eklendi. Geçici şifreyi güvenli kanaldan iletin."
        : "Mevcut hesap admin olarak eklendi.",
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
