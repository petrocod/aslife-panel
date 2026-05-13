import { NextRequest, NextResponse } from "next/server"
import { sendOtp } from "@/lib/otp"

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) {
      return NextResponse.json({ error: "Telefon numarası gerekli." }, { status: 400 })
    }

    const result = await sendOtp(phone)
    if (result.ok) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
