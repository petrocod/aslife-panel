import { NextRequest, NextResponse } from "next/server"
import { sendAutoSms } from "@/lib/auto-sms"

export async function POST(req: NextRequest) {
  try {
    const { companyId, templateKey, phone, params } = await req.json()
    if (!companyId || !templateKey || !phone) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const result = await sendAutoSms({ companyId, templateKey, phone, params: params || {} })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ ok: false })
  }
}
