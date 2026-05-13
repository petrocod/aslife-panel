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

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const [growthResult, revenueResult, churnResult, activeUsersResult, plansResult, smsResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, created_at")
        .gte("created_at", daysAgo(30))
        .order("created_at", { ascending: true }),

      supabase
        .from("subscription_payments")
        .select("amount, created_at")
        .gte("created_at", monthsAgo(6)),

      supabase
        .from("company_subscriptions")
        .select("status, canceled_at, created_at")
        .eq("status", "canceled")
        .gte("canceled_at", monthsAgo(6)),

      supabase
        .from("profiles")
        .select("id, last_sign_in_at")
        .gte("last_sign_in_at", daysAgo(30)),

      supabase
        .from("company_subscriptions")
        .select("plan_id, status")
        .in("status", ["active", "trialing"]),

      supabase
        .from("sms_packages")
        .select("total_sms, used_sms, created_at"),
    ])

  const growthByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    growthByDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const org of growthResult.data || []) {
    const day = (org.created_at as string).slice(0, 10)
    if (day in growthByDay) growthByDay[day]++
  }

  const revenueByMonth: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    revenueByMonth[key] = 0
  }
  for (const pay of revenueResult.data || []) {
    const month = (pay.created_at as string).slice(0, 7)
    if (month in revenueByMonth) revenueByMonth[month] += pay.amount || 0
  }

  const churnByMonth: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    churnByMonth[key] = 0
  }
  for (const sub of churnResult.data || []) {
    const month = (sub.canceled_at as string).slice(0, 7)
    if (month in churnByMonth) churnByMonth[month]++
  }

  const activeByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    activeByDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const p of activeUsersResult.data || []) {
    const day = (p.last_sign_in_at as string).slice(0, 10)
    if (day in activeByDay) activeByDay[day]++
  }

  const planCounts: Record<string, number> = {}
  for (const sub of plansResult.data || []) {
    const plan = (sub.plan_id as string) || "unknown"
    planCounts[plan] = (planCounts[plan] || 0) + 1
  }

  const totalSms = (smsResult.data || []).reduce(
    (sum: number, p: { total_sms: number; used_sms: number }) => sum + (p.used_sms || 0),
    0
  )
  const totalSmsCapacity = (smsResult.data || []).reduce(
    (sum: number, p: { total_sms: number; used_sms: number }) => sum + (p.total_sms || 0),
    0
  )

  return NextResponse.json({
    growth: Object.entries(growthByDay).map(([date, count]) => ({ date, count })),
    revenue: Object.entries(revenueByMonth).map(([month, amount]) => ({ month, amount })),
    churn: Object.entries(churnByMonth).map(([month, count]) => ({ month, count })),
    activeUsers: Object.entries(activeByDay).map(([date, count]) => ({ date, count })),
    plans: Object.entries(planCounts).map(([plan, count]) => ({ plan, count })),
    sms: { used: totalSms, capacity: totalSmsCapacity },
  })
}
