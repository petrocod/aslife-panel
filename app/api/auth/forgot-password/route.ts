import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAuthCallbackBaseUrl(): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "")
  if (base) return base
  return "http://localhost:3000"
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-posta adresi gerekli." }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      return NextResponse.json({ error: "Sunucu yapılandırması eksik." }, { status: 500 })
    }

    const supabase = createClient(url, key)
    const redirectTo = `${getAuthCallbackBaseUrl()}/auth/callback`

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
