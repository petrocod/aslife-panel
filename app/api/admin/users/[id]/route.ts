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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
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
      `
      )
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ user: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    if (body.action === "reset_password") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", id)
        .single()

      if (!profile?.email) {
        return NextResponse.json({ error: "Kullanıcı e-postası bulunamadı." }, { status: 404 })
      }

      const { error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: profile.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://asixtan.com"}/auth/callback`,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Şifre sıfırlama bağlantısı oluşturuldu." })
    }

    if (body.action === "suspend") {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: "876000h",
      })
      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 })
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", id)

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Hesap askıya alındı." })
    }

    if (body.action === "activate") {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: "none",
      })
      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 })
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ is_active: true })
        .eq("id", id)

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Hesap aktifleştirildi." })
    }

    if (body.action === "change_role" && body.role) {
      const { error } = await supabase
        .from("profiles")
        .update({ role: body.role })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Rol güncellendi." })
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: "876000h",
    })
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 })
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: "Hesap deaktif edildi." })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
