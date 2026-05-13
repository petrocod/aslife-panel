import { NextRequest, NextResponse } from "next/server"
import { verifyOtp } from "@/lib/otp"

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) {
      return NextResponse.json({ error: "Telefon ve kod gerekli." }, { status: 400 })
    }

    const result = await verifyOtp(phone, code)
    if (result.ok) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
