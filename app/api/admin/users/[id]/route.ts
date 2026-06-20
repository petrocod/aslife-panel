import { NextRequest, NextResponse } from "next/server"

import { verifyAdmin } from "@/lib/admin-auth"
import {
  enrichAdminUsers,
  generateTempPassword,
  PROFILE_COLUMNS,
} from "@/lib/admin-users-service"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    const [user] = await enrichAdminUsers(supabase, [data])
    return NextResponse.json({ user })
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

    if (body.action === "reset_password" || body.action === "set_password") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", id)
        .single()

      if (!profile?.email) {
        return NextResponse.json({ error: "Kullanıcı e-postası bulunamadı." }, { status: 404 })
      }

      if (body.action === "set_password") {
        const password =
          typeof body.password === "string" && body.password.length >= 6
            ? body.password
            : generateTempPassword()

        const { error: pwErr } = await supabase.auth.admin.updateUserById(id, { password })
        if (pwErr) {
          return NextResponse.json({ error: pwErr.message }, { status: 500 })
        }

        return NextResponse.json({
          ok: true,
          tempPassword: password,
          message: "Şifre güncellendi.",
        })
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

      return NextResponse.json({ ok: true, message: "Hesap askıya alındı." })
    }

    if (body.action === "activate") {
      const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: "none",
      })
      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Hesap aktifleştirildi." })
    }

    if (body.action === "change_role" && body.role) {
      const { error } = await supabase
        .from("profiles")
        .update({ role: body.role, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Rol güncellendi." })
    }

    if (body.action === "update_profile") {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (typeof body.fullName === "string") patch.full_name = body.fullName.trim()
      if (typeof body.phone === "string") patch.phone = body.phone.trim()
      if (typeof body.role === "string") patch.role = body.role

      const { error } = await supabase.from("profiles").update(patch).eq("id", id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Profil güncellendi." })
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

    const { error: profileErr } = await supabase.from("profiles").delete().eq("id", id)
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    const { error: authErr } = await supabase.auth.admin.deleteUser(id)
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: "Kullanıcı silindi." })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
