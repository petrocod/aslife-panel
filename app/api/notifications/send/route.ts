import { NextRequest, NextResponse } from "next/server"
import { verifyCron, verifyUserBearer } from "@/lib/sms-route-auth"
import { sendNotification, type NotificationTemplateKey } from "@/lib/notification-sender"

export const runtime = "nodejs"

type Body = {
  companyId?: string
  templateKey?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  params?: Record<string, string>
}

/**
 * Unified notification endpoint — sends SMS + Email + WhatsApp.
 * Auth: Bearer (user session) or x-cron-secret (background jobs).
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

  if (!body.companyId || !body.templateKey || !body.customerName) {
    return NextResponse.json(
      { error: "companyId, templateKey ve customerName zorunludur." },
      { status: 400 },
    )
  }

  const result = await sendNotification({
    companyId: body.companyId,
    templateKey: body.templateKey as NotificationTemplateKey,
    customerId: body.customerId,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail,
    params: body.params,
  })

  return NextResponse.json({
    ok: true,
    sentBy: cronOk ? "cron" : "user",
    results: result,
  })
}
