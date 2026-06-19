import { NextRequest, NextResponse } from "next/server"

import {
  clearDemoSeedData,
  seedDemoSampleData,
  DEMO_COMPANY_UUID,
} from "@/lib/demo-seed"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdmin } from "@/lib/admin-auth"
import { verifyUserBearer } from "@/lib/sms-route-auth"

function isLocalDevRequest(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "development") return false
  if (process.env.DEMO_SEED_OPEN_IN_DEV !== "true") return false
  const host = (req.headers.get("host") || "").split(":")[0]
  return host === "localhost" || host === "127.0.0.1"
}

async function canManageDemoSeed(req: NextRequest): Promise<boolean> {
  const admin = await verifyAdmin(req)
  if (admin) return true

  const bearer = await verifyUserBearer(req)
  if (bearer.ok) {
    const supabase = getSupabaseAdmin()
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", bearer.userId)
      .maybeSingle()
    if (
      profile?.company_id === DEMO_COMPANY_UUID &&
      (profile.role === "owner" || profile.role === "manager")
    ) {
      return true
    }
  }

  return isLocalDevRequest(req)
}

/** Demo şirkette yüklü veri var mı (köşe anahtarı için). */
export async function GET(req: NextRequest) {
  try {
    const companyId = new URL(req.url).searchParams.get("companyId") || ""
    if (companyId !== DEMO_COMPANY_UUID) {
      return NextResponse.json({ error: "Geçersiz şirket" }, { status: 400 })
    }
    const adminClient = getSupabaseAdmin()
    const { count, error } = await adminClient
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const n = count ?? 0
    return NextResponse.json({ hasData: n > 0, appointmentCount: n })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * Demo şirketi için tohum yükleme / silme — admin, demo owner/manager veya yerel dev.
 */
export async function POST(req: NextRequest) {
  try {
    const allowed = await canManageDemoSeed(req)

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
