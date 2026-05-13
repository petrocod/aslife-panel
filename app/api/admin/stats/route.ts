import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { verifyCron, verifyUserBearer } from "@/lib/sms-route-auth"

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  if (verifyCron(req)) return true

  const bearer = await verifyUserBearer(req)
  if (!bearer.ok) return false

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", bearer.userId)
    .maybeSingle()

  return !!data
}

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [
    orgCount,
    activeSubCount,
    mrrResult,
    trialConversion,
    newRegistrations,
    activeToday,
    openTickets,
    smsUsage,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),

    supabase
      .from("company_subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "trialing"]),

    supabase
      .from("subscription_payments")
      .select("amount")
      .gte("created_at", startOfMonth),

    Promise.all([
      supabase
        .from("company_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .not("trial_end", "is", null),
      supabase
        .from("company_subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing", "canceled", "past_due"]),
    ]),

    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("last_sign_in_at", todayStart),

    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed"),

    supabase.from("sms_packages").select("used_sms"),
  ])

  const mrr = (mrrResult.data || []).reduce(
    (sum: number, row: { amount: number }) => sum + (row.amount || 0),
    0
  )

  const [convertedResult, totalTrialResult] = trialConversion
  const converted = convertedResult.count || 0
  const totalTrial = totalTrialResult.count || 1
  const conversionRate = Math.round((converted / totalTrial) * 100)

  const totalSms = (smsUsage.data || []).reduce(
    (sum: number, row: { used_sms: number }) => sum + (row.used_sms || 0),
    0
  )

  return NextResponse.json({
    totalOrganizations: orgCount.count || 0,
    activeSubscriptions: activeSubCount.count || 0,
    mrr,
    trialConversionRate: conversionRate,
    newRegistrations7d: newRegistrations.count || 0,
    activeUsersToday: activeToday.count || 0,
    openTickets: openTickets.count || 0,
    smsUsage: totalSms,
  })
}
