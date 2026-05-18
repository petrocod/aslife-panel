import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyCron, verifyUserBearer } from "@/lib/sms-route-auth"
import { sendVerimorSms, type VerimorSendOptions } from "@/lib/verimor-sms"
import { canSendNotification } from "@/lib/notification-preferences"
import { logCustomerCommunication } from "@/lib/customer-communication"

export const runtime = "nodejs"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Body = {
  dest?: string | string[]
  msg?: string
  source_addr?: string
  valid_for?: string
  send_at?: string
  custom_id?: string
  datacoding?: "0" | "1" | "2"
  is_commercial?: boolean
  iys_recipient_type?: "BIREYSEL" | "TACIR"
  customerId?: string
  companyId?: string
}

/**
 * Verimor ile SMS gönderir.
 * - Oturum: `Authorization: Bearer <Supabase JWT>`
 * - Veya arka plan (hatırlatma/cron): `x-cron-secret: <CRON_SECRET>` (CRON_SECRET .env'de)
 */
export async function POST(req: NextRequest) {
  const cronOk = verifyCron(req)
  const userOk = cronOk ? { ok: false as const } : await verifyUserBearer(req)

  if (!cronOk && !userOk.ok) {
    return NextResponse.json(
      { error: "Yetkisiz: Bearer oturumu veya geçerli x-cron-secret gerekli." },
      { status: 401 },
    )
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 })
  }

  if (!body.dest || !body.msg) {
    return NextResponse.json({ error: "dest ve msg zorunludur." }, { status: 400 })
  }

  if (body.customerId && body.companyId) {
    const allowed = await canSendNotification(supabaseAdmin, body.customerId, body.companyId, "sms")
    if (!allowed) {
      return NextResponse.json({ error: "Müşteri SMS bildirimlerini devre dışı bırakmış.", skipped: true }, { status: 200 })
    }
  }

  const payload: VerimorSendOptions = {
    dest: body.dest,
    msg: body.msg,
    source_addr: body.source_addr,
    valid_for: body.valid_for,
    send_at: body.send_at,
    custom_id: body.custom_id,
    datacoding: body.datacoding,
    is_commercial: body.is_commercial,
    iys_recipient_type: body.iys_recipient_type,
  }

  try {
    const result = await sendVerimorSms(payload)
    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Verimor gönderim hatası",
          httpStatus: result.httpStatus,
          code: result.errorCode,
        },
        { status: 502 },
      )
    }
    if (body.customerId && body.companyId && body.msg) {
      await logCustomerCommunication({
        companyId: body.companyId,
        customerId: body.customerId,
        channel: "sms",
        messageBody: body.msg,
        templateKey: "manual",
        status: "sent",
      })
    }

    return NextResponse.json({
      ok: true,
      campaignId: result.campaignId,
      sentBy: cronOk ? "cron" : "user",
      userId: userOk.ok ? userOk.userId : undefined,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bilinmeyen hata"
    const isConfig = message.includes("VERIMOR_")
    return NextResponse.json({ error: message }, { status: isConfig ? 503 : 400 })
  }
}
