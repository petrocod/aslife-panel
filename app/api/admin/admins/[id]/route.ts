import { NextRequest, NextResponse } from "next/server"

import { logAdminAction, verifyAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-10) + "A1!"
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
    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Bu işlem yalnızca super_admin tarafından yapılabilir." },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const { data: target, error: fetchErr } = await supabase
      .from("admin_users")
      .select("id, user_id, email, role, is_active")
      .eq("id", id)
      .single()

    if (fetchErr || !target) {
      return NextResponse.json({ error: "Admin bulunamadı." }, { status: 404 })
    }

    if (body.action === "set_password") {
      const password =
        typeof body.password === "string" && body.password.length >= 6
          ? body.password
          : generateTempPassword()

      if (!target.user_id) {
        return NextResponse.json({ error: "Auth kullanıcısı bağlı değil." }, { status: 400 })
      }

      const { error: pwErr } = await supabase.auth.admin.updateUserById(target.user_id, {
        password,
      })
      if (pwErr) {
        return NextResponse.json({ error: pwErr.message }, { status: 500 })
      }

      await logAdminAction(
        admin.adminId,
        "admin_password_reset",
        "admin_user",
        id,
        { email: target.email },
        admin.email
      )

      return NextResponse.json({
        ok: true,
        tempPassword: password,
        message: "Şifre güncellendi.",
      })
    }

    if (body.action === "deactivate") {
      if (target.id === admin.adminId) {
        return NextResponse.json({ error: "Kendi hesabınızı devre dışı bırakamazsınız." }, { status: 400 })
      }

      const { count } = await supabase
        .from("admin_users")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("role", "super_admin")

      if (target.role === "super_admin" && (count || 0) <= 1) {
        return NextResponse.json(
          { error: "Son super_admin devre dışı bırakılamaz." },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from("admin_users")
        .update({ is_active: false })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await logAdminAction(
        admin.adminId,
        "admin_deactivated",
        "admin_user",
        id,
        { email: target.email },
        admin.email
      )

      return NextResponse.json({ ok: true, message: "Admin devre dışı bırakıldı." })
    }

    if (body.action === "activate") {
      const { error } = await supabase
        .from("admin_users")
        .update({ is_active: true })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Admin aktifleştirildi." })
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
