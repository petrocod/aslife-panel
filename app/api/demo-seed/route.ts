import { NextRequest, NextResponse } from "next/server"

import {
  clearDemoSeedData,
  seedDemoSampleData,
  DEMO_COMPANY_UUID,
} from "@/lib/demo-seed"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdmin } from "@/lib/admin-auth"
import { verifyUserBearer } from "@/lib/sms-route-auth"

/**
 * Demo şirketi için tohum yükleme / silme — yalnızca admin veya demo şirket owner/manager.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    let allowed = !!admin

    if (!allowed) {
      const bearer = await verifyUserBearer(req)
      if (bearer.ok) {
        const supabase = getSupabaseAdmin()
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, role")
          .eq("id", bearer.userId)
          .maybeSingle()
        allowed =
          profile?.company_id === DEMO_COMPANY_UUID &&
          (profile.role === "owner" || profile.role === "manager")
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await req.json()
    const op = body.op as "seed" | "clear"
    const companyId = String(body.companyId || "")
    if (companyId !== DEMO_COMPANY_UUID) {
      return NextResponse.json(
        { error: "Yalnızca demo şirket (00000000-0000-0000-0000-000000000001) için geçerlidir." },
        { status: 403 }
      )
    }
    const adminClient = getSupabaseAdmin()
    if (op === "clear") {
      await clearDemoSeedData(adminClient, companyId)
      return NextResponse.json({ ok: true, message: "Demo verileri silindi." })
    }
    if (op === "seed") {
      const stats = await seedDemoSampleData(adminClient, companyId)
      return NextResponse.json({ ok: true, stats })
    }
    return NextResponse.json({ error: 'op "seed" veya "clear" olmalı' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
