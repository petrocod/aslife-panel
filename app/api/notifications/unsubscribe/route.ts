import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { customerId, companyId, channel } = await req.json()

    if (!customerId || !companyId) {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 })
    }

    const updates: Record<string, boolean> = {}
    if (channel === "sms" || channel === "all") updates.sms_enabled = false
    if (channel === "email" || channel === "all") updates.email_enabled = false
    if (channel === "whatsapp" || channel === "all") updates.whatsapp_enabled = false

    const { error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert(
        {
          customer_id: customerId,
          company_id: companyId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "customer_id,company_id" }
      )

    if (error) {
      return NextResponse.json({ error: "İşlem başarısız." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 })
  }
}
