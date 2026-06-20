import { NextRequest, NextResponse } from "next/server"

import {
  assignCompanySubscription,
  enrichSubscriptions,
  loadSubscriptionPlans,
} from "@/lib/admin-subscription-service"
import { verifyAdmin, logAdminAction } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")?.trim() || ""
    const plan = searchParams.get("plan")?.trim() || ""
    const companyId = searchParams.get("companyId")?.trim() || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const offset = (page - 1) * limit

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("company_subscriptions")
      .select(
        "id, company_id, plan_id, status, trial_ends_at, current_period_end, created_at, updated_at, organization_id",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)
    if (plan) query = query.eq("plan_id", plan)
    if (companyId) query = query.eq("company_id", companyId)

    const { data, error, count } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const plans = await loadSubscriptionPlans(supabase)
    const subscriptions = await enrichSubscriptions(supabase, data || [])

    return NextResponse.json({
      subscriptions,
      plans,
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

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 })
    }

    const body = await req.json()
    const companyId = String(body.companyId || "").trim()
    const planId = String(body.planId || "").trim()
    const status = (body.status || "active") as "trialing" | "active" | "canceled" | "past_due"
    const billing = (body.billing || "monthly") as "monthly" | "yearly"
    const trialDays = parseInt(String(body.trialDays || "14"), 10)

    if (!companyId || !planId) {
      return NextResponse.json({ error: "companyId ve planId zorunludur." }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const result = await assignCompanySubscription(supabase, {
      companyId,
      planId,
      status,
      billing,
      trialDays,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await logAdminAction(
      admin.adminId,
      "subscription_assigned",
      "company",
      companyId,
      { planId, status, billing },
      admin.email
    )

    const [enriched] = await enrichSubscriptions(supabase, [result.subscription])

    return NextResponse.json({
      ok: true,
      subscription: enriched,
      message: "Abonelik atandı.",
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

    if (action === "change_plan" || action === "assign") {
      const newPlanId = body.newPlanId || body.planId
      const billing = (body.billing || "monthly") as "monthly" | "yearly"
      if (!newPlanId) {
        return NextResponse.json({ error: "newPlanId zorunludur." }, { status: 400 })
      }

      const { data: sub } = await supabase
        .from("company_subscriptions")
        .select("company_id, status")
        .eq("id", subscriptionId)
        .single()

      if (!sub) {
        return NextResponse.json({ error: "Abonelik bulunamadı." }, { status: 404 })
      }

      const result = await assignCompanySubscription(supabase, {
        companyId: sub.company_id,
        planId: newPlanId,
        status: body.status || sub.status || "active",
        billing,
        trialDays: body.trialDays,
      })

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Plan güncellendi." })
    }

    if (action === "extend_trial") {
      const extendDays = parseInt(body.days || "7", 10)
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

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: `Trial ${extendDays} gün uzatıldı.` })
    }

    if (action === "cancel") {
      const { error } = await supabase
        .from("company_subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: "Abonelik iptal edildi." })
    }

    if (action === "reactivate") {
      const billing = (body.billing || "monthly") as "monthly" | "yearly"
      const { data: sub } = await supabase
        .from("company_subscriptions")
        .select("company_id, plan_id")
        .eq("id", subscriptionId)
        .single()

      if (!sub) {
        return NextResponse.json({ error: "Abonelik bulunamadı." }, { status: 404 })
      }

      const result = await assignCompanySubscription(supabase, {
        companyId: sub.company_id,
        planId: sub.plan_id,
        status: "active",
        billing,
      })

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Abonelik yeniden aktifleştirildi." })
    }

    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
