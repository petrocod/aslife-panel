import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendNotification } from "@/lib/notification-sender"

export const runtime = "nodejs"
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type CustomerRelation = { id?: string; full_name: string; phone: string | null; email: string | null }
type NameRelation = { name: string }

function extractCustomer(rel: unknown): CustomerRelation | null {
  if (!rel) return null
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel as CustomerRelation
}

function extractName(rel: unknown): string {
  if (!rel) return ""
  if (Array.isArray(rel)) return (rel[0] as NameRelation)?.name ?? ""
  return (rel as NameRelation).name ?? ""
}

function verifyCronSecret(req: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || "").trim()
  if (!secret) return false
  const h = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "")
  return h === secret
}

/**
 * Cron-based notification dispatcher.
 * Called every hour (Vercel Cron or external service).
 *
 * Handles:
 * 1. Randevu Hatırlatıcı  – 24h before appointment
 * 2. Randevu Katılım       – 3h before appointment
 * 3. Kredi Bitiş           – 3 days before credit expiry
 * 4. Paket Bitiş           – 3 days before package expiry
 * 5. Ödeme Hatırlatıcı     – overdue payments
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = {
    reminders: 0,
    attendance: 0,
    creditExpiry: 0,
    packageExpiry: 0,
    paymentReminder: 0,
    errors: 0,
  }

  const now = new Date()

  // ── 1. Appointment Reminder (24h before) ──
  try {
    const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)
    const startDate = reminderStart.toISOString().split("T")[0]
    const endDate = reminderEnd.toISOString().split("T")[0]

    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, appointment_date, start_time, company_id, customers(id, full_name, phone, email), services(name)")
      .in("appointment_date", [startDate, endDate])
      .in("status", ["pending", "confirmed", "onaylandi"])
      .not("customers", "is", null)

    if (appointments) {
      for (const apt of appointments) {
        const customer = extractCustomer(apt.customers)
        if (!customer?.phone) continue

        const aptDateTime = new Date(`${apt.appointment_date}T${apt.start_time}`)
        const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        if (hoursUntil < 23 || hoursUntil > 25) continue

        const custId = customer.id || ""
        const alreadySent = await checkAlreadySent(apt.company_id, custId, "randevu-hatiratici")
        if (alreadySent) continue

        await sendNotification({
          companyId: apt.company_id,
          templateKey: "randevu-hatiratici",
          customerId: custId,
          customerName: customer.full_name || "",
          customerPhone: customer.phone,
          customerEmail: customer.email,
          params: {
            appointment_starting_at_date: apt.appointment_date,
            appointment_starting_at_time: apt.start_time?.slice(0, 5) || "",
            service_title: extractName(apt.services),
          },
        })
        results.reminders++
      }
    }
  } catch { results.errors++ }

  // ── 2. Attendance Confirmation (3h before) ──
  try {
    const attStart = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)
    const attEnd = new Date(now.getTime() + 3.5 * 60 * 60 * 1000)
    const attDate = attStart.toISOString().split("T")[0]
    const attDateEnd = attEnd.toISOString().split("T")[0]

    const { data: attAppts } = await supabase
      .from("appointments")
      .select("id, appointment_date, start_time, company_id, customers(id, full_name, phone, email), services(name)")
      .in("appointment_date", [attDate, attDateEnd])
      .in("status", ["pending", "confirmed", "onaylandi"])
      .not("customers", "is", null)

    if (attAppts) {
      for (const apt of attAppts) {
        const customer = extractCustomer(apt.customers)
        if (!customer?.phone) continue

        const aptDateTime = new Date(`${apt.appointment_date}T${apt.start_time}`)
        const hoursUntil = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        if (hoursUntil < 2.5 || hoursUntil > 3.5) continue

        const custId = customer.id || ""
        const alreadySent = await checkAlreadySent(apt.company_id, custId, "randevu-katilim")
        if (alreadySent) continue

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        await sendNotification({
          companyId: apt.company_id,
          templateKey: "randevu-katilim",
          customerId: custId,
          customerName: customer.full_name || "",
          customerPhone: customer.phone,
          customerEmail: customer.email,
          params: {
            appointment_starting_at_date: apt.appointment_date,
            appointment_starting_at_time: apt.start_time?.slice(0, 5) || "",
            service_title: extractName(apt.services),
            redirection_url: `${baseUrl}/r/katilim/${apt.id}`,
          },
        })
        results.attendance++
      }
    }
  } catch { results.errors++ }

  // ── 3. Credit Expiry (3 days before) ──
  try {
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const expiryDate = threeDaysLater.toISOString().split("T")[0]

    const { data: credits } = await supabase
      .from("customer_credits")
      .select("id, company_id, customer_id, end_date, remaining_sessions, customers(full_name, phone, email), services(name)")
      .eq("end_date", expiryDate)
      .gt("remaining_sessions", 0)

    if (credits) {
      for (const credit of credits) {
        const customer = extractCustomer(credit.customers)
        if (!customer?.phone) continue

        const alreadySent = await checkAlreadySent(credit.company_id, credit.customer_id, "kredi-bitis")
        if (alreadySent) continue

        await sendNotification({
          companyId: credit.company_id,
          templateKey: "kredi-bitis",
          customerId: credit.customer_id,
          customerName: customer.full_name || "",
          customerPhone: customer.phone,
          customerEmail: customer.email,
          params: {
            service_title: extractName(credit.services),
            endDate: credit.end_date,
          },
        })
        results.creditExpiry++
      }
    }
  } catch { results.errors++ }

  // ── 4. Package Expiry (3 days before) ──
  try {
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const expiryDate = threeDaysLater.toISOString().split("T")[0]

    const { data: packages } = await supabase
      .from("customer_packages")
      .select("id, company_id, customer_id, end_date, remaining_sessions, customers(full_name, phone, email), packages(name)")
      .eq("end_date", expiryDate)
      .gt("remaining_sessions", 0)

    if (packages) {
      for (const pkg of packages) {
        const customer = extractCustomer(pkg.customers)
        if (!customer?.phone) continue

        const alreadySent = await checkAlreadySent(pkg.company_id, pkg.customer_id, "paket-bitis-hatiratici")
        if (alreadySent) continue

        await sendNotification({
          companyId: pkg.company_id,
          templateKey: "paket-bitis-hatiratici",
          customerId: pkg.customer_id,
          customerName: customer.full_name || "",
          customerPhone: customer.phone,
          customerEmail: customer.email,
          params: {
            packageName: extractName(pkg.packages),
            endDate: pkg.end_date,
          },
        })
        results.packageExpiry++
      }
    }
  } catch { results.errors++ }

  // ── 5. Payment Reminder (overdue) ──
  try {
    const today = now.toISOString().split("T")[0]

    const { data: overduePayments } = await supabase
      .from("payment_transactions")
      .select("id, company_id, customer_id, amount, due_date, title, customers(full_name, phone, email)")
      .eq("status", "pending")
      .lt("due_date", today)
      .not("customers", "is", null)

    if (overduePayments) {
      for (const payment of overduePayments) {
        const customer = extractCustomer(payment.customers)
        if (!customer?.phone) continue

        const alreadySent = await checkAlreadySent(payment.company_id, payment.customer_id, "musteri-odeme-hatiratici")
        if (alreadySent) continue

        await sendNotification({
          companyId: payment.company_id,
          templateKey: "musteri-odeme-hatiratici",
          customerId: payment.customer_id,
          customerName: customer.full_name || "",
          customerPhone: customer.phone,
          customerEmail: customer.email,
          params: {
            payment_title: payment.title || `${payment.amount} TL`,
          },
        })
        results.paymentReminder++
      }
    }
  } catch { results.errors++ }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    results,
  })
}

async function checkAlreadySent(
  companyId: string,
  customerId: string,
  templateKey: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .eq("template_key", templateKey)
    .gte("created_at", twentyFourHoursAgo)
    .limit(1)

  return !!(data && data.length > 0)
}
