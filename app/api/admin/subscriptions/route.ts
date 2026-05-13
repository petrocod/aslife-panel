import { NextRequest, NextResponse } from "next/server"
import { verifyUserBearer } from "@/lib/sms-route-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

async function verifyAdmin(req: NextRequest) {
  const userResult = await verifyUserBearer(req)
  if (!userResult.ok) return null
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("user_id", userResult.userId)
    .eq("is_active", true)
    .single()
  if (!data) return null
  return { userId: userResult.userId, adminId: data.id, role: data.role }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")?.trim() || ""
    const plan = searchParams.get("plan")?.trim() || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("company_subscriptions")
      .select(
        `
        id,
        company_id,
        plan_id,
        status,
        trial_ends_at,
        current_period_end,
        cancel_at_period_end,
        mrr,
        created_at,
        updated_at,
        companies(id, name),
        subscription_plans(id, name_tr, monthly_price)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }
    if (plan) {
      query = query.eq("plan_id", plan)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("id, name_tr, monthly_price")
      .order("sort_order", { ascending: true })

    return NextResponse.json({
      subscriptions: data || [],
      plans: plans || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const body = await req.json()
    const { subscriptionId, action } = body

    if (!subscriptionId || !action) {
      return NextResponse.json({ error: "subscriptionId ve action zorunludur." }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    if (action === "change_plan") {
      const { newPlanId } = body
      if (!newPlanId) {
        return NextResponse.json({ error: "newPlanId zorunludur." }, { status: 400 })
      }

      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id, monthly_price")
        .eq("id", newPlanId)
        .single()

      if (!plan) {
        return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 })
      }

      const { error } = await supabase
        .from("company_subscriptions")
        .update({
          plan_id: newPlanId,
          mrr: plan.monthly_price || 0,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Plan değiştirildi." })
    }

    if (action === "extend_trial") {
      const { days } = body
      const extendDays = parseInt(days || "7", 10)

      const { data: sub } = await supabase
        .from("company_subscriptions")
        .select("trial_ends_at")
        .eq("id", subscriptionId)
        .single()

      if (!sub) {
        return NextResponse.json({ error: "Abonelik bulunamadı." }, { status: 404 })
      }

      const base = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date()
      base.setDate(base.getDate() + extendDays)

      const { error } = await supabase
        .from("company_subscriptions")
        .update({
          trial_ends_at: base.toISOString(),
          status: "trialing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: `Trial ${extendDays} gün uzatıldı.` })
    }

    if (action === "cancel") {
      const { error } = await supabase
        .from("company_subscriptions")
        .update({
          status: "canceled",
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Abonelik iptal edildi." })
    }

    if (action === "reactivate") {
      const { error } = await supabase
        .from("company_subscriptions")
        .update({
          status: "active",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Abonelik yeniden aktifleştirildi." })
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
