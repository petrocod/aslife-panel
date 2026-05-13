"use server"

import { sendNotification, type NotificationTemplateKey } from "./notification-sender"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

const OLD_KEY_TO_NEW: Record<string, NotificationTemplateKey> = {
  new_customer: "yeni-musteri",
  appointment_created: "randevu-onayi",
  appointment_cancelled: "randevu-iptali",
  appointment_reminder: "randevu-hatiratici",
  appointment_updated: "randevu-guncelleme",
  appointment_attendance: "randevu-katilim",
  credit_expiry: "kredi-bitis",
  credit_used: "kredi-kullanimi",
  package_expiry: "paket-bitis-hatiratici",
  package_used: "paket-kullanimi",
  payment_reminder: "musteri-odeme-hatiratici",
}

async function getCustomerInfo(phone: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("customers")
    .select("id, email, company_id")
    .or(`phone.eq.${phone},phone.eq.+${phone}`)
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Backward-compatible wrapper: accepts old template keys and dispatches
 * through the unified notification sender (SMS + Email + WhatsApp).
 */
export async function sendAutoSms(opts: {
  companyId: string
  templateKey: string
  phone: string
  params: Record<string, string>
}): Promise<{ ok: boolean }> {
  const { companyId, templateKey, phone, params } = opts

  if (!phone || phone.length < 10) return { ok: false }

  const newKey = OLD_KEY_TO_NEW[templateKey]
  if (!newKey) return { ok: false }

  const customerInfo = await getCustomerInfo(phone)

  const result = await sendNotification({
    companyId,
    templateKey: newKey,
    customerId: customerInfo?.id,
    customerName: params.customerName || "",
    customerPhone: phone,
    customerEmail: customerInfo?.email || null,
    params: {
      appointment_starting_at_date: params.date || "",
      appointment_starting_at_time: params.time || "",
      service_title: params.serviceName || "",
      remaining: params.remaining || "",
      packageName: params.packageName || "",
      payment_title: params.amount ? `${params.amount} TL` : "",
      endDate: params.endDate || "",
    },
  })

  return { ok: result.sms.ok || result.email.ok || result.whatsapp.ok }
}
