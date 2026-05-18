import { NextRequest, NextResponse } from "next/server"
import { verifyAdmin, logAdminAction } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { fetchCatalog } from "@/lib/catalog/resolve"

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
  }

  const catalog = await fetchCatalog(false)
  return NextResponse.json(catalog)
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
  }

  const body = await req.json()
  const { entity, id, updates } = body as {
    entity: "plan" | "product"
    id: string
    updates: Record<string, unknown>
  }

  if (!entity || !id || !updates) {
    return NextResponse.json({ error: "entity, id ve updates zorunludur." }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  if (entity === "plan") {
    const allowed = [
      "name_tr",
      "monthly_price",
      "annual_price",
      "monthly_price_hint",
      "max_users",
      "sms_included",
      "description_tr",
      "sort_order",
      "is_active",
    ]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key]
    }
    if (updates.highlighted !== undefined) {
      const { data: existing } = await supabase
        .from("subscription_plans")
        .select("features")
        .eq("id", id)
        .single()
      const features = (existing?.features as Record<string, unknown>) || {}
      patch.features = { ...features, highlighted: Boolean(updates.highlighted) }
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok." }, { status: 400 })
    }
    if (typeof patch.monthly_price === "number") {
      patch.monthly_price_hint = `₺${Number(patch.monthly_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`
    }

    const { error } = await supabase.from("subscription_plans").update(patch).eq("id", id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await logAdminAction(admin.adminId, "pricing_plan_update", "subscription_plan", id, patch, admin.email)
  } else if (entity === "product") {
    const allowed = ["title_tr", "price", "credits", "description_tr", "sort_order", "is_active"]
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key]
    }
    const { error } = await supabase.from("sellable_products").update(patch).eq("id", id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await logAdminAction(admin.adminId, "pricing_product_update", "sellable_product", id, patch, admin.email)
  } else {
    return NextResponse.json({ error: "Geçersiz entity." }, { status: 400 })
  }

  const catalog = await fetchCatalog(false)
  return NextResponse.json({ ok: true, ...catalog })
}
