import { NextRequest, NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { isPublicSignupEnabled } from "@/lib/signup-config"

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) return `+90${cleaned}`
  if (cleaned.length === 11 && cleaned.startsWith("0")) return `+90${cleaned.slice(1)}`
  if (cleaned.length === 12) return `+${cleaned}`
  return `+90${cleaned}`
}

export async function POST(req: NextRequest) {
  try {
    if (!isPublicSignupEnabled()) {
      return NextResponse.json(
        { error: "Yeni kayıt şu anda kapalıdır. Yöneticinizden davet isteyin." },
        { status: 403 }
      )
    }

    const { email, password, fullName, phone } = await req.json()

    if (!email || !password || !fullName || !phone) {
      return NextResponse.json({ error: "Tüm alanlar zorunludur." }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Şifre en az 6 karakter olmalıdır." }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: String(fullName).trim(),
        phone: normalizePhone(String(phone)),
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return NextResponse.json(
          { error: "Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın." },
          { status: 400 }
        )
      }
      if (msg.includes("database")) {
        return NextResponse.json(
          {
            error:
              "Veritabanı hatası. Supabase SQL Editor'da multi_tenant_saas.sql çalıştırıldığından emin olun.",
            detail: error.message,
          },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, userId: data.user?.id })
  } catch (e: unknown) {
    console.error("[register]", e)
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
