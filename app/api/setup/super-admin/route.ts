import { NextRequest, NextResponse } from "next/server"

import { getAuthCallbackBaseUrl } from "@/lib/auth-redirect"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

function checkSetupSecret(req: NextRequest): boolean {
  const secret =
    (process.env.SETUP_SECRET || process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const header = req.headers.get("x-setup-secret")?.trim()
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
  return header === secret || auth === secret
}

/** Tek seferlik super_admin — VPS'ten CRON_SECRET ile çağırın. */
export async function POST(req: NextRequest) {
  if (!checkSetupSecret(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 })
  }

  try {
    const { email, password, fullName } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "email ve password zorunlu." }, { status: 400 })
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "Şifre en az 8 karakter olmalı." }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const admin = getSupabaseAdmin()

    const { data: existing } = await admin
      .from("admin_users")
      .select("user_id, email")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existing?.user_id) {
      await admin.auth.admin.updateUserById(existing.user_id, {
        password: String(password),
        email_confirm: true,
      })
      await admin.from("admin_users").upsert({
        user_id: existing.user_id,
        email: normalizedEmail,
        full_name: String(fullName || "Super Admin").trim(),
        role: "super_admin",
        is_active: true,
      })

      return NextResponse.json({
        ok: true,
        action: "updated",
        userId: existing.user_id,
        email: normalizedEmail,
        message: "Şifre güncellendi ve super_admin olarak ayarlandı.",
      })
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(fullName || "Super Admin").trim(),
      },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes("already")) {
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const found = list.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        )
        if (!found) {
          return NextResponse.json({ error: authError.message }, { status: 400 })
        }
        await admin.auth.admin.updateUserById(found.id, {
          password: String(password),
          email_confirm: true,
        })
        await admin.from("admin_users").upsert({
          user_id: found.id,
          email: normalizedEmail,
          full_name: String(fullName || "Super Admin").trim(),
          role: "super_admin",
          is_active: true,
        })
        return NextResponse.json({
          ok: true,
          action: "linked",
          userId: found.id,
          email: normalizedEmail,
        })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Kullanıcı oluşturulamadı." }, { status: 500 })
    }

    await admin.from("admin_users").upsert({
      user_id: userId,
      email: normalizedEmail,
      full_name: String(fullName || "Super Admin").trim(),
      role: "super_admin",
      is_active: true,
    })

    const callbackUrl = `${getAuthCallbackBaseUrl()}/auth/callback`
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: callbackUrl },
    })

    return NextResponse.json({
      ok: true,
      action: "created",
      userId,
      email: normalizedEmail,
      loginUrl: `${getAuthCallbackBaseUrl()}/login`,
      adminUrl: `${getAuthCallbackBaseUrl()}/admin`,
    })
  } catch (e: unknown) {
    console.error("[setup/super-admin]", e)
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
