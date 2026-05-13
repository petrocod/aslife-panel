import { NextRequest, NextResponse } from "next/server"

import {
  clearDemoSeedData,
  seedDemoSampleData,
  DEMO_COMPANY_UUID,
} from "@/lib/demo-seed"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/**
 * Demo şirketi için tohum yükleme / tek tıkta silme — service_role.
 * Yalnızca company_id = 00000000-...
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const op = body.op as "seed" | "clear"
    const companyId = String(body.companyId || "")
    if (companyId !== DEMO_COMPANY_UUID) {
      return NextResponse.json(
        { error: "Yalnızca demo şirket (00000000-0000-0000-0000-000000000001) için geçerlidir." },
        { status: 403 }
      )
    }
    const admin = getSupabaseAdmin()
    if (op === "clear") {
      await clearDemoSeedData(admin, companyId)
      return NextResponse.json({ ok: true, message: "Demo verileri silindi." })
    }
    if (op === "seed") {
      const stats = await seedDemoSampleData(admin, companyId)
      return NextResponse.json({ ok: true, stats })
    }
    return NextResponse.json({ error: 'op "seed" veya "clear" olmalı' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
