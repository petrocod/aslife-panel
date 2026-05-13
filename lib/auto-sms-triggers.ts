/**
 * Event-based notification triggers called from UI components.
 * When an appointment is completed, checks if the customer has active
 * credit/package subscriptions and sends usage notifications.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

type CompletionParams = {
  companyId: string
  customerId: string
  customerName: string
  customerPhone: string | null
  serviceId: string | null
}

export async function sendUsageSmsOnCompletion(
  supabase: SupabaseClient,
  params: CompletionParams
): Promise<void> {
  const { companyId, customerId, customerName, customerPhone, serviceId } = params
  if (!customerPhone) return

  const { data: customer } = await supabase
    .from("customers")
    .select("email, whatsapp_consent")
    .eq("id", customerId)
    .single()

  // Check for active credit packages
  if (serviceId) {
    const { data: credits } = await supabase
      .from("customer_credits")
      .select("id, remaining_sessions, service_id")
      .eq("customer_id", customerId)
      .eq("company_id", companyId)
      .eq("service_id", serviceId)
      .gt("remaining_sessions", 0)
      .limit(1)

    if (credits && credits.length > 0) {
      const credit = credits[0]
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET || "" },
        body: JSON.stringify({
          companyId,
          templateKey: "kredi-kullanimi",
          customerId,
          customerName,
          customerPhone: customerPhone.replace(/\+/g, ""),
          customerEmail: customer?.email || null,
          params: { remaining: String(credit.remaining_sessions) },
        }),
      }).catch(() => {})
    }
  }

  // Check for active packages
  const { data: packages } = await supabase
    .from("customer_packages")
    .select("id, remaining_sessions, packages(name)")
    .eq("customer_id", customerId)
    .eq("company_id", companyId)
    .gt("remaining_sessions", 0)
    .limit(1)

  if (packages && packages.length > 0) {
    const pkg = packages[0]
    const pkgName = (pkg as Record<string, unknown>).packages
      ? ((pkg as Record<string, unknown>).packages as { name: string })?.name
      : "Paket"
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET || "" },
      body: JSON.stringify({
        companyId,
        templateKey: "paket-kullanimi",
        customerId,
        customerName,
        customerPhone: customerPhone.replace(/\+/g, ""),
        customerEmail: customer?.email || null,
        params: {
          remaining: String(pkg.remaining_sessions),
          packageName: pkgName,
        },
      }),
    }).catch(() => {})
  }
}
