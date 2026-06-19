import { NextRequest, NextResponse } from "next/server"
import { sendOtp } from "@/lib/otp"
import { isPublicSignupEnabled } from "@/lib/signup-config"

export async function POST(req: NextRequest) {
  try {
    if (!isPublicSignupEnabled()) {
      return NextResponse.json(
        { error: "Telefon doğrulama yalnızca açık kayıt döneminde kullanılır." },
        { status: 403 }
      )
    }

    const { phone } = await req.json()
    if (!phone) {
      return NextResponse.json({ error: "Telefon numarası gerekli." }, { status: 400 })
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    const result = await sendOtp(phone, ip)
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        ...(result.devCode ? { devCode: result.devCode } : {}),
      })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
